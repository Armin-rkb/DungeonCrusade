#!/usr/bin/env node
// Asset pipeline: reuses the original Unity art, animation and audio.
//
// Reads the original Unity project in ./Assets (textures + .meta slicing data,
// .anim sprite animation clips, audio, fonts) and writes a web-friendly copy to
// ./public/gen together with manifest.json describing every sprite (sub-rect,
// pivot, pixels-per-unit) and every sprite animation (frames + timing).
//
// Sprite ids:   "<sanitized path without extension>"            single sprites
//               "<sanitized path without extension>#<index>"    sliced sheets
// Anim ids:     "<sanitized path of the .anim without extension>"
//
// Usage: node tools/build-assets.mjs [--if-missing]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Assets');
const OUT = path.join(ROOT, 'public', 'gen');
const MANIFEST = path.join(OUT, 'manifest.json');
const VERSION = 4; // bump to force a rebuild when the pipeline changes

if (process.argv.includes('--if-missing') && fs.existsSync(MANIFEST)) {
  try {
    const m = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    if (m.version === VERSION) process.exit(0);
  } catch { /* rebuild */ }
}

/** Lower-case, dash separated, safe for URLs and every file system. */
export function sanitize(rel) {
  return rel
    .split(/[\\/]/)
    .map((p) => p.toLowerCase().replace(/['"`]/g, '').replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''))
    .join('/');
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC).sort();
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');

// ---------------------------------------------------------------- guid map
const guidToPath = new Map();
for (const f of files) {
  if (!f.endsWith('.meta')) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const m = /^guid: ([0-9a-f]{32})/m.exec(txt);
  if (m) guidToPath.set(m[1], f.slice(0, -5));
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const ALIGN = {
  0: [0.5, 0.5], 1: [0, 1], 2: [0.5, 1], 3: [1, 1], 4: [0, 0.5], 5: [1, 0.5], 6: [0, 0], 7: [0.5, 0], 8: [1, 0],
};
const num = (s) => Number.parseFloat(s);

// ---------------------------------------------------------------- textures
const sprites = {}; // id -> sprite
const images = {}; // image id -> url
const unityIndex = {}; // "guid:fileID" -> sprite id
const imageCopies = [];

for (const f of files) {
  if (!/\.(png|jpg)$/i.test(f)) continue;
  const relPath = rel(f);
  // Two files can sanitize to the same id ("side tile left edge.png" vs
  // "side-tile-left-edge.png"): keep ids unique with a numeric suffix.
  let baseId = sanitize(relPath.replace(/\.(png|jpg)$/i, ''));
  if (images[baseId]) {
    let n = 2;
    while (images[`${baseId}-${n}`]) n++;
    baseId = `${baseId}-${n}`;
  }
  const ext = path.extname(f).toLowerCase();
  const url = `gen/img/${baseId}${ext}`;
  images[baseId] = url;
  imageCopies.push([f, path.join(OUT, 'img', baseId + ext)]);
  const size = pngSize(f) ?? { w: 0, h: 0 };
  const metaFile = f + '.meta';
  if (!fs.existsSync(metaFile)) continue;
  const meta = fs.readFileSync(metaFile, 'utf8');
  const guid = /^guid: ([0-9a-f]{32})/m.exec(meta)?.[1];
  const ppu = num(/spritePixelsToUnits: ([\d.]+)/.exec(meta)?.[1] ?? '100');
  const spriteMode = Number(/spriteMode: (\d+)/.exec(meta)?.[1] ?? '1');
  const recycle = new Map(); // name -> fileID
  const recBlock = /fileIDToRecycleName:\n((?:    \d+: .*\n)+)/.exec(meta);
  if (recBlock) {
    for (const line of recBlock[1].split('\n')) {
      const mm = /^\s+(\d+): (.*)$/.exec(line);
      if (mm) recycle.set(mm[2].trim(), mm[1]);
    }
  }

  if (spriteMode === 2) {
    const sheet = meta.split('spriteSheet:')[1] ?? '';
    const blocks = sheet.split(/\n    - name: /).slice(1);
    blocks.forEach((blk, index) => {
      const name = blk.split('\n')[0].trim();
      const x = num(/\n\s+x: ([-\d.]+)/.exec(blk)[1]);
      const y = num(/\n\s+y: ([-\d.]+)/.exec(blk)[1]);
      const w = num(/\n\s+width: ([-\d.]+)/.exec(blk)[1]);
      const h = num(/\n\s+height: ([-\d.]+)/.exec(blk)[1]);
      const align = Number(/\n\s+alignment: (\d+)/.exec(blk)?.[1] ?? '0');
      let piv = ALIGN[align];
      if (align === 9 || !piv) {
        const pm = /pivot: \{x: ([-\d.e]+), y: ([-\d.e]+)\}/.exec(blk);
        piv = pm ? [num(pm[1]), num(pm[2])] : [0.5, 0.5];
      }
      const id = `${baseId}#${index}`;
      // Unity rects are measured from the bottom-left corner of the texture.
      sprites[id] = {
        img: baseId, x, y: size.h - y - h, w, h,
        px: piv[0] * w, py: (1 - piv[1]) * h, ppu, name,
      };
      const fid = recycle.get(name) ?? String(21300000 + index * 2);
      if (guid) unityIndex[`${guid}:${fid}`] = id;
    });
    // A whole-image fallback is handy for previews.
    sprites[baseId] = { img: baseId, x: 0, y: 0, w: size.w, h: size.h, px: size.w / 2, py: size.h / 2, ppu };
  } else {
    const align = Number(/\n  alignment: (\d+)/.exec(meta)?.[1] ?? '0');
    let piv = ALIGN[align];
    if (align === 9 || !piv) {
      const pm = /spritePivot: \{x: ([-\d.e]+), y: ([-\d.e]+)\}/.exec(meta);
      piv = pm ? [num(pm[1]), num(pm[2])] : [0.5, 0.5];
    }
    sprites[baseId] = { img: baseId, x: 0, y: 0, w: size.w, h: size.h, px: piv[0] * size.w, py: (1 - piv[1]) * size.h, ppu };
    if (guid) unityIndex[`${guid}:21300000`] = baseId;
  }
}

// ---------------------------------------------------------------- animations
const anims = {};
for (const f of files) {
  if (!f.endsWith('.anim')) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const id = sanitize(rel(f).replace(/\.anim$/, ''));
  const pptr = txt.split('m_PPtrCurves:')[1]?.split(/\n  m_SampleRate:/)[0] ?? '';
  const curves = pptr.split(/\n  - curve:/).slice(1);
  let frames = null;
  for (const c of curves) {
    if (!/attribute: m_Sprite/.test(c)) continue;
    const pathM = /\n    path: ?(.*)/.exec(c);
    const keyRe = /- time: ([-\d.e]+)\n\s+value: \{fileID: (\d+), guid: ([0-9a-f]{32})/g;
    const fr = [];
    let k;
    while ((k = keyRe.exec(c))) {
      const sid = unityIndex[`${k[3]}:${k[2]}`];
      if (sid) fr.push({ s: sid, t: num(k[1]) });
    }
    // Prefer the curve on the root object.
    if (fr.length && (!frames || (pathM && pathM[1].trim() === ''))) frames = fr;
  }
  if (!frames) continue;
  const stop = num(/m_StopTime: ([-\d.e]+)/.exec(txt)?.[1] ?? '0');
  const sampleRate = num(/m_SampleRate: ([-\d.e]+)/.exec(txt)?.[1] ?? '60');
  const loop = /m_LoopTime: 1/.test(txt);
  const last = frames[frames.length - 1].t;
  const len = Math.max(stop, last + 1 / sampleRate);
  anims[id] = { frames, len: Math.round(len * 1000) / 1000, loop };
}

// ---------------------------------------------------------------- audio
const audio = {};
const audioJobs = [];
for (const f of files) {
  if (!/\.(wav|mp3|ogg)$/i.test(f)) continue;
  const relPath = rel(f);
  const id = sanitize(relPath.replace(/\.(wav|mp3|ogg)$/i, ''));
  const isMusic = relPath.startsWith('Sound/Music/');
  const big = fs.statSync(f).size > 200_000;
  const wav = /\.wav$/i.test(f);
  // Short sound effects stay WAV (zero-latency, exact). Large WAVs are
  // transcoded to MP3 so web/mobile downloads stay small.
  // Music is always re-encoded to a lean bitrate.
  const outExt = wav && !big && !isMusic ? '.wav' : '.mp3';
  const dst = path.join(OUT, 'audio', id + outExt);
  audio[id] = { url: `gen/audio/${id}${outExt}`, music: isMusic };
  audioJobs.push({ src: f, dst, transcode: (wav && big) || isMusic, music: isMusic });
}

// ---------------------------------------------------------------- fonts
const fonts = {};
for (const f of files) {
  if (!/\.(ttf|otf)$/i.test(f)) continue;
  const id = sanitize(path.basename(f).replace(/\.(ttf|otf)$/i, ''));
  const ext = path.extname(f).toLowerCase();
  fonts[id] = `gen/fonts/${id}${ext}`;
  imageCopies.push([f, path.join(OUT, 'fonts', id + ext)]);
}

// ---------------------------------------------------------------- write
function copyIfNewer(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) return;
  fs.copyFileSync(src, dst);
}
for (const [s, d] of imageCopies) copyIfNewer(s, d);

let hasFfmpeg = true;
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }
for (const j of audioJobs) {
  fs.mkdirSync(path.dirname(j.dst), { recursive: true });
  if (fs.existsSync(j.dst) && fs.statSync(j.dst).mtimeMs >= fs.statSync(j.src).mtimeMs) continue;
  if (j.transcode && hasFfmpeg) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', j.src, '-codec:a', 'libmp3lame',
      '-b:a', j.music ? '128k' : '112k', '-ac', j.music ? '2' : '1', j.dst]);
  } else if (j.transcode) {
    // No encoder available: ship the original WAV under the expected name is
    // not valid, so fall back to the WAV url instead.
    const wavDst = j.dst.replace(/\.mp3$/, '.wav');
    fs.copyFileSync(j.src, wavDst);
    const id = Object.keys(audio).find((k) => audio[k].url.endsWith(path.relative(OUT, j.dst).split(path.sep).join('/')));
    if (id) audio[id].url = audio[id].url.replace(/\.mp3$/, '.wav');
  } else {
    fs.copyFileSync(j.src, j.dst);
  }
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify({ version: VERSION, images, sprites, anims, audio, fonts }));
fs.writeFileSync(path.join(OUT, 'unity-sprite-index.json'), JSON.stringify(unityIndex, null, 0));
console.log(`assets: ${Object.keys(images).length} images, ${Object.keys(sprites).length} sprites, ` +
  `${Object.keys(anims).length} anims, ${Object.keys(audio).length} sounds, ${Object.keys(fonts).length} fonts`);
