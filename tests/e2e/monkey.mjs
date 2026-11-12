// Monkey test: seeded random keyboard / gamepad / mouse / touch input across
// every screen of the real game in Chromium. Fails on any page error, a
// stalled game loop, or runaway UI state.
// Usage: node tests/e2e/monkey.mjs [baseUrl] [outDir] [seconds] [seed]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const seconds = Number(process.argv[4] ?? 60);
let seed = Number(process.argv[5] ?? 1337) >>> 0 || 1;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];

const KEYS = ['Space', 'KeyC', 'KeyF', 'KeyV', 'KeyG', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape', 'Tab', 'Enter', 'Backspace',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Period', 'Slash', 'Comma', 'KeyK', 'KeyL', 'KeyE'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 664 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
});
await page.addInitScript(() => {
  const mk = (index, id) => ({
    index, id, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
  });
  window.__pads = [mk(0, 'Xbox Wireless Controller (Vendor: 045e)'), mk(1, 'DualSense Wireless Controller (Vendor: 054c)')];
  navigator.getGamepads = () => window.__pads;
});
await page.goto(base);
await page.waitForSelector('#boot.done', { timeout: 30000 });

const t0 = Date.now();
let actions = 0;
let lastTime = 0;
let stalls = 0;
let matches = 0;
while (Date.now() - t0 < seconds * 1000) {
  const roll = rnd();
  try {
    if (roll < 0.35) {
      const k = pick(KEYS);
      await page.keyboard.down(k);
      await page.waitForTimeout(10 + rnd() * 120);
      await page.keyboard.up(k);
    } else if (roll < 0.6) {
      const pad = Math.floor(rnd() * 2);
      const b = Math.floor(rnd() * 16);
      await page.evaluate(([p, b, on]) => { const x = window.__pads[p].buttons[b]; x.pressed = on; x.value = on ? 1 : 0; }, [pad, b, true]);
      await page.waitForTimeout(30 + rnd() * 120);
      await page.evaluate(([p, b]) => { const x = window.__pads[p].buttons[b]; x.pressed = false; x.value = 0; }, [pad, b]);
      if (rnd() < 0.3) await page.evaluate(([p, a, v]) => { window.__pads[p].axes[a] = v; }, [pad, Math.floor(rnd() * 2), (rnd() * 2 - 1)]);
    } else if (roll < 0.85) {
      // Click a random visible interactive element (or anywhere).
      const handles = await page.$$('button:visible, [data-nav]:visible, .stage:visible, .arrow:visible');
      if (handles.length && rnd() < 0.85) {
        const h = pick(handles);
        const txt = ((await h.textContent()) ?? '').trim();
        // Avoid leaving the page / opening system dialogs.
        if (!/QUIT|FULLSCREEN|SHARE|COPY/.test(txt)) await h.click({ timeout: 500, force: true }).catch(() => {});
      } else {
        await page.mouse.click(rnd() * 1180, rnd() * 664);
      }
    } else if (roll < 0.95) {
      await page.touchscreen.tap(rnd() * 1180, rnd() * 664);
    } else {
      // Occasionally jump straight into a match so gameplay gets fuzzed too.
      await page.evaluate((mode) => {
        const app = window.__app;
        if (app.session) return;
        const cfg = { level: ['dungeon', 'beach', 'dragon', 'oubliette', 'tide', 'shrine', 'keeps'][Math.floor(Math.random() * 7)], mode, seed: 5, targetScore: 2, timeLimit: 0, teams: Math.random() < 0.3, items: true,
          slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: k < 2 ? 0 : 3, team: k % 2, name: `M${k}` })) };
        app.startLocal(cfg, new Map([[0, 'kb1'], [1, 'pad0']]), cfg.slots.map((s) => s.name));
      }, rnd() < 0.5 ? 'crusade' : 'classic');
      matches++;
    }
  } catch (e) {
    errors.push(`driver: ${e.message}`);
  }
  actions++;
  if (actions % 25 === 0) {
    const st = await page.evaluate(() => ({ t: window.__app.world.time, stack: window.__app.ui.stack.length, screens: document.querySelectorAll('#ui > .screen').length, toasts: document.querySelectorAll('.toast').length }));
    if (st.t <= lastTime) stalls++;
    lastTime = st.t;
    if (st.stack > 6 || st.screens !== st.stack || st.toasts > 1) errors.push(`ui state: ${JSON.stringify(st)}`);
  }
}
await page.screenshot({ path: `${out}/monkey-final.png` });
console.log(`monkey: ${actions} actions, ${matches} forced matches, ${stalls} loop stalls, ${errors.length} errors`);
for (const e of errors.slice(0, 15)) console.log('  ' + e);
await browser.close();
process.exit(errors.length || stalls ? 1 : 0);
