#!/usr/bin/env node
// Records gameplay footage (MP4 with sound) straight from the game.
//
// The browser's requestAnimationFrame is replaced with a virtual clock, so the
// game advances exactly 1/30 s per captured frame no matter how slow the
// machine is. Every sound the game plays is logged and mixed afterwards from
// the original sound files, together with the stage music.
//
// Usage: node tools/capture-footage.mjs [out.mp4] [--crusade | --highlights]
//
// --highlights records ~2.5 minutes of unscripted CPU play in both modes, scores
// every moment by what happens (KOs, parries, splats, bounties, explosions, the
// dragon) and cuts the best moments into a ~45 s reel.
// Needs: Playwright with Chromium, ffmpeg. Starts its own Vite dev server.

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HIGHLIGHTS = process.argv.includes('--highlights');
const MODE = HIGHLIGHTS ? 'highlights' : process.argv.includes('--crusade') ? 'crusade' : 'classic';
const argOut = process.argv.slice(2).find((a) => !a.startsWith('--'));
const OUT = path.resolve(argOut ?? path.join(ROOT, 'test-results', 'footage', `dungeon-crusade-${MODE}.mp4`));
const WORK = path.join(path.dirname(OUT), 'frames');
const FPS = 30;
const W = 1280;
const H = 720;
const PORT = 5179;
const RATE = 44100;

const { chromium } = createRequire(import.meta.url)('playwright');

fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });

execFileSync(process.execPath, [path.join(ROOT, 'tools/build-assets.mjs'), '--if-missing'], { stdio: 'inherit' });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => vite.kill();
process.on('exit', stop);

async function waitFor(url, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timeout waiting for ${url}`);
}
await waitFor(`http://localhost:${PORT}/`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.addInitScript(() => {
  localStorage.setItem('dungeon-crusade-settings-v2', JSON.stringify({ tutorialSeen: true, name: 'Gold' }));
  const cap = { t: 0, queue: [] };
  window.__capture = cap;
  window.requestAnimationFrame = (cb) => {
    cap.queue.push(cb);
    return cap.queue.length;
  };
  window.__tick = (ms) => {
    cap.t += ms;
    const q = cap.queue;
    cap.queue = [];
    for (const cb of q) cb(cap.t);
  };
});
await page.goto(`http://localhost:${PORT}/`);
await page.waitForSelector('#boot.done', { timeout: 30000 });
await page.waitForTimeout(700);

// Log sounds instead of playing them (headless has no audio output).
await page.evaluate(() => {
  const a = window.__audio;
  window.__sounds = [];
  // The title screen started the menu music before this hook existed.
  window.__music = [{ id: 'sound/music/mainmenu', t: window.__capture.t }];
  a.play = (id, o = {}) => {
    if (a.sfxMuted) return;
    const vary = o.vary ?? 0.06;
    window.__sounds.push({ id, t: window.__capture.t, v: o.volume ?? 1, r: (o.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * vary), pan: o.pan ?? 0, max: o.maxVoices ?? 4 });
  };
  a.playMusic = (id) => {
    if (a.musicId === id) return;
    a.musicId = id;
    window.__music.push({ id, t: window.__capture.t });
  };
  a.stopMusic = () => {
    a.musicId = '';
    window.__music.push({ id: null, t: window.__capture.t });
  };
  a.duckMusic = () => {};
  // Game events with their time, for picking highlights.
  window.__events = [];
  const fx = window.__app.fx;
  const handle = fx.handle.bind(fx);
  fx.handle = (events, st, ctx) => {
    if (window.__app.session) for (const e of events) window.__events.push({ t: e.t, k: e.k, w: e.w, b: e.b, time: window.__capture.t });
    handle(events, st, ctx);
  };
});

let frame = 0;
let captureStart = -1;
const cuts = [];
async function play(seconds, capture = true) {
  const n = Math.round(seconds * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((ms) => window.__tick(ms), 1000 / FPS);
    if (!capture) continue;
    if (captureStart < 0) captureStart = await page.evaluate(() => window.__capture.t);
    await page.screenshot({ path: path.join(WORK, `${String(frame++).padStart(5, '0')}.png`) });
    if (frame % 150 === 0) console.log(`  ${frame} frames`);
  }
}

async function scene(level, weapons, opts = {}) {
  cuts.push(frame);
  await page.evaluate(({ level, weapons, skipCountdown, seed, mode }) => {
    const lvl = level;
    const app = window.__app;
    const names = ['GOLD', 'SILVER', 'GREEN', 'RED'];
    const cfg = {
      level, mode, seed, targetScore: 40, timeLimit: 0, teams: false, items: true,
      slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: 3, team: 0, name: names[k] })),
    };
    app.startLocal(cfg, new Map(), names);
    const s = app.session.state;
    if (skipCountdown) s.phaseTimer = 2;
    window.__weapons = weapons;
    if (lvl === 'dragon' && mode === 'crusade' && window.__weakTemple) s.templeHp = window.__weakTemple;
  }, { level, weapons, skipCountdown: !!opts.skipCountdown, seed: opts.seed ?? 7, mode: opts.mode ?? MODE });
  // Hand out a mix of weapons once the fight starts so the clip shows them off.
  const arm = () => page.evaluate(() => {
    const s = window.__app.session.state;
    const crusade = window.__app.session.match.cfg.mode === 'crusade';
    s.players.forEach((p, i) => {
      p.weapon = window.__weapons[i];
      p.cdMax = 12;
      p.cd = 0;
      if (crusade) p.ammo = 6;
    });
  });
  return arm;
}

console.log('capturing...');
/** Highlight reel segments in captured frames: { from, to, caption }. */
let reel = null;
if (HIGHLIGHTS) {
  // Title, then long stretches of real CPU play; no staged weapons.
  const scenes = [];
  await play(2.2);
  const titleEnd = frame;
  const record = async (level, mode, seconds, seed, caption) => {
    const from = frame;
    await scene(level, null, { mode, seed, skipCountdown: true });
    await play(seconds);
    scenes.push({ from, to: frame, caption, picks: level === 'dragon' ? 3 : 2 });
  };
  await record('beach', 'classic', 32, 21, 'CLASSIC MODE');
  await record('dungeon', 'crusade', 40, 8, 'CRUSADE MODE');
  await record('beach', 'crusade', 32, 13, 'CRUSADE MODE');
  // A cracked temple so the dragon shows up within the recording.
  await page.evaluate(() => (window.__weakTemple = 12));
  await record('dragon', 'crusade', 45, 31, 'CRUSADE MODE');
  reel = { titleEnd, scenes };
} else {
// 1. Title screen with the attract-mode brawl behind it.
await play(2.5);
// 2. Dungeon: full 3-2-1 countdown, then a brawl.
let arm = await scene('dungeon', [3, 2, 4, 5], { seed: 11 });
await play(3.1);
await arm();
await play(11);
// 3. Wacky Beach.
arm = await scene('beach', [7, 6, 9, 1], { skipCountdown: true, seed: 5 });
await play(0.2);
await arm();
await play(9.5);
// 4. Dragon Temple: someone nukes the temple and the dragon wakes up.
arm = await scene('dragon', [8, 3, 9, 4], { skipCountdown: true, seed: 3 });
await play(0.2);
await arm();
await play(1.6);
await page.evaluate(() => {
  const s = window.__app.session.state;
  s.projs.push({ id: 99999, kind: 8, owner: 0, team: 0, x: 0.2, y: -1.6, vx: 0, vy: 0, age: 40, life: 1, bounces: 0, dead: false, p: 1, q: 0 });
});
await play(12.5);
}
const totalMs = await page.evaluate(() => window.__capture.t);
const events = await page.evaluate(() => window.__events);
const sounds = await page.evaluate(() => window.__sounds);
const music = await page.evaluate(() => window.__music);
const manifest = await page.evaluate(() => window.__app && fetch('gen/manifest.json').then((r) => r.json()));
await browser.close();
stop();

// ------------------------------------------------------------------ audio mix
console.log(`mixing ${sounds.length} sounds...`);
const decoded = new Map();
function decode(id) {
  if (decoded.has(id)) return decoded.get(id);
  const entry = manifest.audio[id];
  let data = null;
  if (entry) {
    const file = path.join(ROOT, 'public', entry.url);
    const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(RATE), '-'], { maxBuffer: 1 << 30 });
    data = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  }
  decoded.set(id, data);
  return data;
}
const durationS = frame / FPS;
const len = Math.ceil(durationS * RATE) + RATE;
const mix = new Float32Array(len * 2);
const startMs = captureStart;

// Music segments with short fades between scenes.
const segs = music.map((m, i) => ({ id: m.id, from: (m.t - startMs) / 1000, to: i + 1 < music.length ? (music[i + 1].t - startMs) / 1000 : durationS }));
for (const sg of segs) {
  if (!sg.id || sg.to <= 0) continue;
  const data = decode(sg.id);
  if (!data) continue;
  const from = Math.max(0, sg.from);
  const skip = from - sg.from; // music that started before the capture
  const n = Math.min(Math.floor((sg.to - from) * RATE), data.length / 2 - Math.floor(skip * RATE));
  const fade = 0.25 * RATE;
  for (let i = 0; i < n; i++) {
    const g = 0.38 * Math.min(1, i / fade, (n - i) / fade);
    const src = (Math.floor(skip * RATE) + i) * 2;
    const dst = (Math.floor(from * RATE) + i) * 2;
    if (dst + 1 >= mix.length) break;
    mix[dst] += data[src] * g;
    mix[dst + 1] += data[src + 1] * g;
  }
}

// Effects (respecting the game's per-sound voice limit).
const recent = new Map();
for (const s of sounds) {
  const t = (s.t - startMs) / 1000;
  if (t < 0 || t > durationS) continue;
  const list = (recent.get(s.id) ?? []).filter((x) => t - x < 0.25);
  if (list.length >= s.max) continue;
  list.push(t);
  recent.set(s.id, list);
  const data = decode(s.id);
  if (!data) continue;
  const frames = data.length / 2;
  const outN = Math.floor(frames / s.r);
  const ang = ((Math.max(-1, Math.min(1, s.pan)) + 1) * Math.PI) / 4;
  const gl = Math.cos(ang) * Math.SQRT2 * s.v * 0.8;
  const gr = Math.sin(ang) * Math.SQRT2 * s.v * 0.8;
  const base = Math.floor(t * RATE) * 2;
  for (let i = 0; i < outN; i++) {
    const pos = i * s.r;
    const j = Math.floor(pos);
    const f = pos - j;
    const k = j * 2;
    if (k + 3 >= data.length) break;
    const l = data[k] * (1 - f) + data[k + 2] * f;
    const r = data[k + 1] * (1 - f) + data[k + 3] * f;
    const d = base + i * 2;
    if (d + 1 >= mix.length) break;
    mix[d] += l * gl;
    mix[d + 1] += r * gr;
  }
}
// Soft limiter.
for (let i = 0; i < mix.length; i++) mix[i] = Math.tanh(mix[i] * 0.9);
const rawPath = path.join(path.dirname(OUT), 'mix.f32');
fs.writeFileSync(rawPath, Buffer.from(mix.buffer));

// ------------------------------------------------------------------ highlights
/** How exciting each game event is. */
const WEIGHT = { ko: 10, parry: 6, splat: 6, temple: 16, 'dragon-wake': 6, 'dragon-swoop': 14, stomp: 4, tile: 4, clash: 3, pickup: 2, hit: 2, armor: 2, quack: 1, sudden: 6, gull: 3 };
function eventScore(e) {
  if (e.t === 'points') return e.w === 1 ? 12 : e.w === 2 ? 3 : 0; // bounty / assist
  if (e.t === 'boom') return e.b === 2 ? 12 : 3; // nuke vs other blasts
  return WEIGHT[e.t] ?? 0;
}
function pickHighlights() {
  const perFrame = new Float32Array(frame);
  for (const e of events) {
    const f = Math.round(((e.time - startMs) / 1000) * FPS);
    if (f >= 0 && f < frame) perFrame[f] += eventScore(e);
  }
  const L = Math.round(4.5 * FPS);
  const segments = [{ from: 0, to: reel.titleEnd, caption: '' }];
  for (const sc of reel.scenes) {
    const chosen = [];
    for (let k = 0; k < sc.picks; k++) {
      let best = -1;
      let bestScore = 0;
      for (let st = sc.from + 15; st + L <= sc.to; st += 6) {
        if (chosen.some((c) => st < c + L + FPS && st + L + FPS > c)) continue;
        let score = 0;
        // Count the middle of the window most (action should be on screen).
        for (let f = st + 10; f < st + L - 10; f++) score += perFrame[f];
        if (score > bestScore) { bestScore = score; best = st; }
      }
      if (best >= 0) chosen.push(best);
    }
    chosen.sort((a, b) => a - b);
    chosen.forEach((st, i) => segments.push({ from: st, to: st + L, caption: i === 0 ? sc.caption : '' }));
  }
  return segments;
}

// ------------------------------------------------------------------ encode
// Each scene is encoded with its own fade in/out (an ffmpeg fade-out keeps
// everything after it black), then the clips are concatenated.
console.log(`encoding ${frame} frames (${durationS.toFixed(1)} s)...`);
const parts = [];
if (reel) {
  const segments = pickHighlights();
  const font = path.join(ROOT, 'Assets', 'Fonts', 'ka1.ttf').replace(/\\/g, '/').replace(/:/g, '\\:');
  segments.forEach((sg, i) => {
    const n = sg.to - sg.from;
    const d = n / FPS;
    const pcm = path.join(WORK, `seg${i}.f32`);
    fs.writeFileSync(pcm, Buffer.from(mix.slice(sg.from / FPS * RATE * 2 | 0, (sg.to / FPS * RATE * 2) | 0).buffer));
    const fades = `fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0, d - 0.2).toFixed(3)}:d=0.2`;
    const text = sg.caption
      ? `,drawtext=fontfile='${font}':text='${sg.caption}':fontsize=34:fontcolor=0xffc53d:borderw=4:bordercolor=black:x=40:y=h-80:enable='lt(t,2.2)'`
      : '';
    const part = path.join(WORK, `part${i}.mp4`);
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-framerate', String(FPS), '-start_number', String(sg.from), '-i', path.join(WORK, '%05d.png'),
      '-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', pcm,
      '-frames:v', String(n),
      '-vf', `${fades}${text},format=yuv420p`,
      '-af', `afade=t=in:st=0:d=0.12,afade=t=out:st=${Math.max(0, d - 0.15).toFixed(3)}:d=0.15`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-tune', 'animation', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '160k', '-shortest',
      part,
    ], { stdio: 'inherit' });
    parts.push(part);
  });
  const list = path.join(WORK, 'parts.txt');
  fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  console.log(`highlights: ${segments.map((sg) => `${(sg.from / FPS).toFixed(1)}-${(sg.to / FPS).toFixed(1)}s${sg.caption ? ` [${sg.caption}]` : ''}`).join(', ')}`);
} else {
const bounds = [0, ...cuts.filter((c) => c > 0), frame];
for (let i = 0; i + 1 < bounds.length; i++) {
  const n = bounds[i + 1] - bounds[i];
  if (n <= 0) continue;
  const d = n / FPS;
  const part = path.join(WORK, `part${i}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-framerate', String(FPS), '-start_number', String(bounds[i]), '-i', path.join(WORK, '%05d.png'),
    '-frames:v', String(n),
    '-vf', `fade=t=in:st=0:d=0.25,fade=t=out:st=${Math.max(0, d - 0.25).toFixed(3)}:d=0.25,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-tune', 'animation', '-r', String(FPS),
    part,
  ], { stdio: 'inherit' });
  parts.push(part);
}
const list = path.join(WORK, 'parts.txt');
fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-f', 'concat', '-safe', '0', '-i', list,
  '-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', rawPath,
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
  OUT,
], { stdio: 'inherit' });
}
fs.rmSync(rawPath);
console.log(`wrote ${OUT}`);
process.exit(0);
