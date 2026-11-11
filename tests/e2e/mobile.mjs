// Mobile flow with touch only: title -> versus -> +CPU -> fight -> virtual stick.
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '.';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
const page = await ctx.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto(base);
await page.waitForSelector('#boot.done', { timeout: 20000 });
await page.waitForTimeout(800);
const vp = page.viewportSize();
await page.touchscreen.tap(vp.width / 2, vp.height / 2);
await page.waitForTimeout(500);
await page.tap('button:has-text("VERSUS")');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/m-fighters.png` });
await page.tap('.card:nth-child(2) button:has-text("CPU")');
await page.waitForTimeout(300);
await page.tap('button:has-text("NEXT")');
await page.waitForTimeout(400);
await page.tap('.stage:nth-child(2)');
await page.waitForTimeout(200);
await page.tap('button:has-text("FIGHT")');
await page.waitForTimeout(3500);
const state = () => page.evaluate(() => {
  const a = window.__app;
  return { session: a.session?.kind, locals: [...(a.session?.locals ?? [])], touchVisible: !a.touch.root.classList.contains('hidden'), p0: a.session && { x: +a.session.state.players[0].x.toFixed(2), y: +a.session.state.players[0].y.toFixed(2), shots: a.session.state.players[0].shots } };
});
const before = await state();
// Drag the virtual stick to the right and hold jump + throw with other fingers.
const cdp = await ctx.newCDPSession(page);
const pt = (id, x, y) => ({ x, y, id, radiusX: 5, radiusY: 5, force: 1 });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(1, 120, vp.height - 90)] });
for (let i = 1; i <= 8; i++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(1, 120 + i * 12, vp.height - 90)] });
  await page.waitForTimeout(30);
}
await page.waitForTimeout(500);
const jb = await page.locator('.tbtn-jump').boundingBox();
const ab = await page.locator('.tbtn-attack').boundingBox();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(1, 216, vp.height - 90), pt(2, jb.x + jb.width / 2, jb.y + jb.height / 2)] });
await page.waitForTimeout(250);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(1, 216, vp.height - 90), pt(2, jb.x + jb.width / 2, jb.y + jb.height / 2), pt(3, ab.x + ab.width / 2, ab.y + ab.height / 2)] });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/m-game.png` });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const after = await state();
console.log('before', JSON.stringify(before));
console.log('after ', JSON.stringify(after));
console.log(logs.join('\n'));
await browser.close();
const ok = after.session === 'local' && after.touchVisible && after.p0.x > before.p0.x + 1 && after.p0.shots > 0;
console.log(ok ? 'MOBILE OK' : 'MOBILE FAIL');
process.exit(ok ? 0 : 1);
