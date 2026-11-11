// Two emulated controllers (Xbox + DualSense) join the couch lobby and play.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.addInitScript(() => {
  const mk = (index, id) => ({
    index, id, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    vibrationActuator: { playEffect: async () => { window.__rumbles = (window.__rumbles || 0) + 1; return 'complete'; } },
  });
  window.__pads = [mk(0, 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'), mk(1, 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)')];
  navigator.getGamepads = () => window.__pads;
  window.__press = (i, b, on) => { const btn = window.__pads[i].buttons[b]; btn.pressed = on; btn.value = on ? 1 : 0; };
  window.__axis = (i, a, v) => { window.__pads[i].axes[a] = v; };
});
const press = async (pad, b, ms = 80) => {
  await page.evaluate(([p, x]) => window.__press(p, x, true), [pad, b]);
  await page.waitForTimeout(ms);
  await page.evaluate(([p, x]) => window.__press(p, x, false), [pad, b]);
  await page.waitForTimeout(60);
};
await page.goto(base);
await page.waitForSelector('#boot.done', { timeout: 20000 });
await page.waitForTimeout(800);
await press(0, 0); // title
await page.waitForTimeout(300);
await press(0, 0); // VERSUS (focused)
await page.waitForTimeout(400);
await press(1, 0); // second pad joins
await page.waitForTimeout(200);
await page.evaluate(() => window.__axis(1, 0, 1));
await page.waitForTimeout(120);
await page.evaluate(() => window.__axis(1, 0, 0));
await page.waitForTimeout(200);
const lobby = await page.evaluate(() => ({ couch: window.__app.couch, text: document.querySelector('.cards')?.innerText.replace(/\s+/g, ' ') }));
console.log('lobby', JSON.stringify(lobby));
await page.screenshot({ path: `${out}/pad-lobby.png` });
await press(0, 0); // P1 ready
await press(1, 0); // P2 ready -> stage screen
await page.waitForTimeout(400);
await press(0, 0); // FIGHT
await page.waitForTimeout(3600);
const before = await page.evaluate(() => window.__app.session.state.players.slice(0, 2).map((p) => ({ x: p.x, shots: p.shots })));
await page.evaluate(() => { window.__axis(0, 0, 1); window.__axis(1, 0, -1); });
for (let i = 0; i < 6; i++) { await press(0, 2, 60); await press(1, 0, 60); await press(1, 5, 60); }
await page.evaluate(() => { window.__axis(0, 0, 0); window.__axis(1, 0, 0); });
const after = await page.evaluate(() => ({ p: window.__app.session.state.players.slice(0, 2).map((p) => ({ x: p.x, shots: p.shots })), locals: [...window.__app.session.locals], rumbles: window.__rumbles || 0 }));
await page.screenshot({ path: `${out}/pad-game.png` });
// Start button pauses.
await press(1, 9);
await page.waitForTimeout(200);
const paused = await page.evaluate(() => !!document.querySelector('.screen h1')?.textContent.includes('PAUSED'));
console.log('before', JSON.stringify(before));
console.log('after', JSON.stringify(after), 'paused', paused);
console.log(logs.join('\n'));
await browser.close();
const ok = after.locals.length === 2 && after.p[0].x > before[0].x && after.p[1].x < before[1].x && after.p[0].shots > 0 && after.p[1].shots > 0 && paused && after.rumbles > 0
  && lobby.text.includes('PlayStation') && lobby.text.includes('Xbox');
console.log(ok ? 'GAMEPAD OK' : 'GAMEPAD FAIL');
process.exit(ok ? 0 : 1);
