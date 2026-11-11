// Capacitor (Android + iOS) wrapper around the web build in ./dist.
//
// Native projects are generated, not committed: run platforms/mobile/setup.sh
// (npx cap add + manifest/Info.plist patches for landscape, deep links and
// game controllers). See platforms/README.md.
//
// Orientation, URL schemes and controller support live in the native
// manifests (patched by platforms/mobile/patch-native.mjs), not here.

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dungeoncrusade.game',
  appName: 'Dungeon Crusade',
  webDir: 'dist',
  backgroundColor: '#0b0b16',
  server: {
    // Android serves the app from https://localhost (secure context: clipboard,
    // fullscreen, Gamepad API). iOS keeps Capacitor's default capacitor://localhost.
    // Online play always goes to the public relay (wss://), see VITE_SERVER_URL.
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0b0b16',
  },
  ios: {
    backgroundColor: '#0b0b16',
    contentInset: 'never',
    scrollEnabled: false,
    allowsLinkPreview: false,
  },
  plugins: {
    // Built-in (Capacitor 8): immersive full screen, safe-area insets exposed to CSS.
    SystemBars: {
      hidden: true,
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
