// Two browser clients play an online match through the relay server.
// Usage: node tests/e2e/online.mjs [baseUrl] [outDir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch();
const logs = [];

async function client(name) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${name}:${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[${name}:pageerror] ${e.message}`));
  await page.goto(base);
  await page.waitForSelector('#boot.done', { timeout: 20000 });
  await page.waitForTimeout(700);
  await page.keyboard.press('Space'); // title
  await page.waitForTimeout(600);
  await page.click('button:has-text("ONLINE")');
  await page.waitForFunction(() => window.__app?.conn?.status === 'open', null, { timeout: 8000 });
  return page;
}

const a = await client('A');
const b = await client('B');
await a.waitForTimeout(400);
await a.click('button:has-text("CREATE ROOM")');
await a.waitForSelector('.code', { timeout: 5000 });
const code = (await a.textContent('.code')).trim();
console.log('room code', code);
await b.fill('.code-input', code);
await b.waitForSelector('.code', { timeout: 5000 });
await a.waitForFunction(() => window.__app.conn.room.peers.length === 2);
await a.waitForTimeout(400);
await a.click('button:has-text("START MATCH")');
await a.waitForFunction(() => window.__app.session?.kind === 'online', null, { timeout: 5000 });
await b.waitForFunction(() => window.__app.session?.kind === 'online', null, { timeout: 5000 });

// Wait for the countdown, then both players move and shoot for a while.
await a.waitForFunction(() => window.__app.session.state.phase === 1, null, { timeout: 10000 });
const play = async (page, keys) => {
  for (let i = 0; i < 60; i++) {
    const k = keys[i % keys.length];
    await page.keyboard.down(k);
    await page.waitForTimeout(120);
    await page.keyboard.up(k);
  }
};
await Promise.all([
  play(a, ['KeyD', 'Space', 'KeyF', 'KeyA', 'KeyF', 'Space']),
  play(b, ['KeyA', 'KeyF', 'Space', 'KeyD', 'KeyF', 'KeyW']),
]);
await a.waitForTimeout(1500);
const info = async (p) => p.evaluate(() => {
  const s = window.__app.session;
  return { frame: s.current, desyncs: s.desyncs, rollbacks: s.rollbacks, maxRollback: s.maxRollback, delay: s.delay, shots: s.state.players.map((x) => x.shots), hp: s.state.players.map((x) => x.hp) };
});
const ia = await info(a);
const ib = await info(b);
console.log('A', JSON.stringify(ia));
console.log('B', JSON.stringify(ib));
// Compare checksums at a common confirmed frame.
const f = Math.min(ia.frame, ib.frame) - 20;
const hash = (p) => p.evaluate((fr) => {
  const s = window.__app.session;
  const snap = s.snaps[fr % 512];
  if (!snap || snap.frame !== fr) return null;
  const st = JSON.parse(JSON.stringify(snap));
  st.events = [];
  return JSON.stringify(st).length + ':' + [...JSON.stringify(st)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
}, f);
const ha = await hash(a);
const hb = await hash(b);
console.log('frame', f, 'hashA', ha, 'hashB', hb, ha === hb ? 'IN SYNC' : 'DESYNC');
await a.screenshot({ path: `${out}/online-a.png` });

// Player B quits: A keeps playing and B's knight is taken over by a CPU.
await b.close();
await a.waitForTimeout(2500);
const afterLeave = await a.evaluate(() => {
  const s = window.__app.session;
  return { frame: s.current, waiting: s.waitingFor, p1shots: s.state.players[1].shots, status: s.status() };
});
console.log('after B left', JSON.stringify(afterLeave));
const continued = afterLeave.frame > ia.frame + 100 && !afterLeave.waiting;

console.log(logs.filter((l) => !l.includes('[vite]')).slice(-20).join('\n'));
await browser.close();
const ok = ha && ha === hb && ia.desyncs === 0 && ib.desyncs === 0 && ia.shots[0] > 0 && ia.shots[1] > 0 && continued;
process.exit(ok ? 0 : 1);
