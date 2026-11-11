// @ts-check
'use strict';

/**
 * electron-builder configuration (auto-discovered as electron-builder.cjs).
 *
 * Outputs (in ./out):
 *   Windows  NSIS installer, portable .exe, .zip         + out/win-unpacked     (Steam depot)
 *   macOS    universal .dmg + .zip                       + out/mac-universal/   (Steam depot)
 *   Linux    AppImage + .tar.gz                          + out/linux-unpacked   (Steam depot)
 *
 * Signing is optional and driven by environment variables (never committed):
 *   Windows: CSC_LINK / CSC_KEY_PASSWORD (or WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD)
 *   macOS:   CSC_LINK / CSC_KEY_PASSWORD (Developer ID Application .p12) and, for
 *            notarisation, APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID.
 *            Without a certificate CI passes `-c.mac.identity=-` (ad-hoc signature)
 *            so the arm64 half still launches.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Icon: build/icon.png if you add one (512x512 or larger; electron-builder
 * derives .ico/.icns from it), otherwise the largest >=512px PNG icon that the
 * web build ships, otherwise Electron's default icon.
 * @returns {string | undefined}
 */
function pickIcon() {
  const candidates = ['build/icon.png', 'app/icon-1024.png', 'app/icon-512.png', 'app/icon.png'];
  for (const rel of candidates) {
    const file = path.join(__dirname, rel);
    try {
      const b = fs.readFileSync(file);
      const isPng = b.readUInt32BE(0) === 0x89504e47;
      if (isPng && b.readUInt32BE(16) >= 512 && b.readUInt32BE(20) >= 512) return rel;
    } catch {
      /* missing */
    }
  }
  return undefined;
}

/**
 * App code that goes into app.asar. Production node_modules (steamworks.js)
 * are added automatically.
 */
const appFiles = ['main.cjs', 'preload.cjs', 'package.json', '!**/*.{md,map,ts}', '!node_modules/steamworks.js/dist/**/*.lib'];

/**
 * steamworks.js ships binaries for every OS; keep only the target's. Note that
 * a platform's `files` replaces the top-level list for the app directory, so
 * it repeats appFiles.
 * @param {string} keep
 */
const filesFor = (keep) => [
  ...appFiles,
  ...['win64', 'osx', 'linux64'].filter((d) => d !== keep).map((d) => `!node_modules/steamworks.js/dist/${d}/**`),
];

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.dungeoncrusade.game',
  productName: 'Dungeon Crusade',
  executableName: 'DungeonCrusade',
  copyright: 'Copyright (c) Ferry Elbaghdadi and Armin Karimi Birgani',
  icon: pickIcon(),
  artifactName: 'dungeon-crusade-${version}-${os}-${arch}.${ext}',

  directories: { output: 'out', buildResources: 'build' },

  files: appFiles,
  // The web build stays loose on disk (resources/web): served by the app://
  // handler with plain fs streams, and Steam's delta patches stay small.
  extraResources: [
    { from: 'app', to: 'web', filter: ['**/*'] },
    // Read by main.cjs when Steam did not launch the game (dev / non-Steam stores).
    { from: 'steam_appid.txt', to: 'steam_appid.txt' },
  ],
  asar: true,
  // Native addon + the steam_api library it links against must be real files.
  asarUnpack: ['node_modules/steamworks.js/dist/**'],
  // steamworks.js ships prebuilt N-API binaries; there is nothing to rebuild.
  npmRebuild: false,
  // Chromium UI strings only (the game has its own UI); saves ~40 MB.
  electronLanguages: ['en-US'],
  publish: null,

  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
      { target: 'zip', arch: ['x64'] },
    ],
    files: filesFor('win64'),
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Dungeon Crusade',
    artifactName: 'dungeon-crusade-${version}-win-${arch}-setup.${ext}',
  },
  portable: {
    artifactName: 'dungeon-crusade-${version}-win-${arch}-portable.${ext}',
  },

  mac: {
    category: 'public.app-category.action-games',
    target: [
      { target: 'dmg', arch: ['universal'] },
      { target: 'zip', arch: ['universal'] },
    ],
    // steamworks.js has one thin binary per arch; both end up identical in the
    // x64 and arm64 halves of the universal app. Leave them alone instead of
    // lipo-merging (index.js loads the right one at runtime).
    x64ArchFiles: '**/steamworks.js/dist/osx/steamworksjs.darwin-*.node',
    hardenedRuntime: true,
    // JIT for V8, plus library validation off so the Valve-signed
    // libsteam_api.dylib loads and the Steam overlay can inject.
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    files: filesFor('osx'),
  },
  dmg: {
    writeUpdateInfo: false,
  },

  linux: {
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'tar.gz', arch: ['x64'] },
    ],
    executableName: 'dungeon-crusade',
    category: 'Game',
    synopsis: '2-4 player projectile arena brawler',
    description: 'Dungeon Crusade: couch versus and online crossplay arena brawler for 2-4 players.',
    files: filesFor('linux64'),
  },
};

module.exports = config;
