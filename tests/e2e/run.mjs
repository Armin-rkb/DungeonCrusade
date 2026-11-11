// Runs every end-to-end scenario: starts the Vite dev server and the relay
// server (with simulated latency so rollback is exercised), then runs the
// online, gamepad and mobile scripts. Usage: npm run e2e
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'test-results');
mkdirSync(out, { recursive: true });
const procs = [];
const start = (cmd, args, env = {}) => {
  const p = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: 'ignore' });
  procs.push(p);
  return p;
};
const waitFor = async (url, ms = 30000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timeout waiting for ${url}`);
};
const run = (script) => new Promise((resolve) => {
  const p = spawn(process.execPath, [path.join(root, 'tests/e2e', script), 'http://localhost:5173/', out], { cwd: root, stdio: 'inherit' });
  p.on('exit', (code) => resolve(code ?? 1));
});

let failed = 0;
try {
  start(process.execPath, ['tools/build-assets.mjs', '--if-missing']);
  start('npx', ['vite', '--port', '5173', '--strictPort']);
  start('npx', ['tsx', 'server/index.ts'], { LAG_MS: '50', JITTER_MS: '30', PORT: '8787' });
  await waitFor('http://localhost:5173/');
  await waitFor('http://localhost:8787/health');
  for (const s of ['online.mjs', 'gamepad.mjs', 'mobile.mjs']) {
    console.log(`\n=== ${s}`);
    const code = await run(s);
    if (code !== 0) failed++;
  }
} finally {
  for (const p of procs) p.kill();
}
console.log(failed ? `\n${failed} e2e scenario(s) failed` : '\nall e2e scenarios passed');
process.exit(failed ? 1 : 0);
