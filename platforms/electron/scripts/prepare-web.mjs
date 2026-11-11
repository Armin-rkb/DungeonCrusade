#!/usr/bin/env node
// Copies the web build (../../dist by default, or $DC_WEB_DIST) into ./app,
// which electron-builder ships as resources/web. Run `npm run build` in the
// repository root first.
//
// Deliberately not named `prepare`: npm runs a script with that name on every
// `npm install`, before the web build exists.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const electronDir = path.resolve(here, '..');
const src = path.resolve(electronDir, process.env.DC_WEB_DIST ?? '../../dist');
const dest = path.join(electronDir, 'app');

for (const required of ['index.html', 'gen/manifest.json']) {
  if (!fs.existsSync(path.join(src, required))) {
    console.error(`prepare-web: ${path.join(src, required)} is missing.`);
    console.error('Build the web game first: run `npm run build` in the repository root.');
    process.exit(1);
  }
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

let files = 0;
let bytes = 0;
/** @param {string} dir */
const count = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) count(p);
    else {
      files++;
      bytes += fs.statSync(p).size;
    }
  }
};
count(dest);
console.log(`prepare-web: copied ${files} files (${(bytes / 1048576).toFixed(1)} MB) from ${src} to ${dest}`);
