# Android and iOS (Capacitor)

The mobile apps are Capacitor 8 shells around the web build in `dist/`. The
configuration is in `capacitor.config.ts` at the repository root. The native
projects (`android/`, `ios/`) are **generated**: `setup.sh` creates and patches
them, so they do not need to be committed. If you customise them by hand,
commit them. `setup.sh` keeps existing folders and only re-applies its
patches.

## Requirements

- Node 22 and `npm ci` in the repository root.
- Android: JDK 21 and the Android SDK (API 36), for example through Android Studio.
- iOS: macOS with a recent Xcode (Capacitor 8 uses Swift Package Manager; no CocoaPods needed).

## Commands

```sh
npm run android                   # npm run build + setup.sh android + open Android Studio
npm run ios                       # npm run build + setup.sh ios + open Xcode
npm run cap:sync                  # npm run build + setup.sh (both platforms)

bash platforms/mobile/setup.sh [android] [ios]       # after `npm run build`
node platforms/mobile/patch-native.mjs --self-test   # patcher tests (run in CI)
```

`setup.sh` does three things for each platform, and is safe to re-run:

1. Runs `npx cap add <platform>`, but only if the folder does not exist yet.
2. Runs `node platforms/mobile/patch-native.mjs <platform>`, which applies the patches below.
3. Runs `npx cap sync <platform>`, which copies `dist/` and wires the native plugins.

## What the patcher changes

**Android** (`android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`):

- `MainActivity` uses `android:screenOrientation="sensorLandscape"`.
- `android:configChanges` includes
  `keyboard|keyboardHidden|navigation|orientation|screenSize|...`, so a
  controller connecting or disconnecting does not restart the activity (and
  the match).
- Intent filters for `dungeoncrusade://join/CODE` and
  `https://<public host>/...` (App Link with `autoVerify`). The host comes
  from `DC_PUBLIC_HOST`, else from the `VITE_PUBLIC_URL` host, else
  `dungeon-crusade.fly.dev`.
- `android:appCategory="game"` and an optional
  `<uses-feature android.hardware.gamepad>`.
- `versionName` comes from `DC_VERSION` or `package.json`. `versionCode`
  comes from `DC_BUILD_NUMBER` or `GITHUB_RUN_NUMBER`.

**iOS** (`ios/App/App/Info.plist`, `project.pbxproj`):

- `UISupportedInterfaceOrientations` (iPhone and iPad) is landscape only, and
  `UIRequiresFullScreen` is set (iPad needs it to restrict orientations).
- `UIStatusBarHidden` is set.
- `CFBundleURLTypes` gets the `dungeoncrusade` scheme. Other schemes are kept.
- `GCSupportsControllerUserInteraction` and `GCSupportedGameControllers`
  (`ExtendedGamepad`) are set, so MFi, Xbox and PlayStation controllers show
  up in WKWebView's Gamepad API.
- `LSApplicationCategoryType` (action games) and `GCSupportsGameMode` turn on
  Game Mode on iOS 18 and later.
- `ITSAppUsesNonExemptEncryption` is `false`, so the export-compliance
  question is skipped.
- `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` are set like on Android.

All edits are idempotent. A second run leaves the files byte-identical.

## Native features used by the game

`src/client/platform.ts` reaches the plugins through `window.Capacitor.Plugins`
(no JS imports needed: the native bridge exposes every installed plugin):

| Plugin | Use |
| --- | --- |
| `@capacitor/app` | `appUrlOpen`: join links while the app runs |
| `@capacitor/share` | native share sheet for invite links |
| `@capacitor/haptics` | vibration feedback (touch controls, rumble) |
| `@capacitor/status-bar` | hide the status bar |
| `@capacitor-community/keep-awake` | keep the screen on during play |
| `SystemBars` (core, Capacitor 8) | immersive fullscreen (`plugins.SystemBars.hidden` in `capacitor.config.ts`) |

On Android, the WebView origin is `https://localhost` (`androidScheme:
'https'`). On iOS, it is `capacitor://localhost`. Online play goes to the
public relay. The release workflow bakes `VITE_SERVER_URL` into the build.

## Deep links: what needs extra setup

- `dungeoncrusade://join/CODE` works right after install on both platforms.
- **Android App Links** (`https://<host>/?join=CODE` opening the app instead of
  the browser) need `https://<host>/.well-known/assetlinks.json`. That file
  lists the SHA-256 fingerprint of the signing certificate (Play App Signing
  shows it). Put the file in `public/.well-known/` so the relay serves it.
  Without it, the link opens the web version of the game, which still joins
  the room.
- **iOS Universal Links** need the Associated Domains capability
  (`applinks:<host>`) in a signed build, plus
  `/.well-known/apple-app-site-association` on the host. Both depend on an
  Apple Developer account, so `setup.sh` does not set them up.

## Release builds

- **Android**: CI (`release.yml`) always builds a debug APK. When the
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
  and `ANDROID_KEY_PASSWORD` secrets exist, it also runs `./gradlew
  bundleRelease` and signs the AAB with `jarsigner`. To build locally, run
  `npx cap build android` with the `--keystorepath ...` options, or use
  Android Studio > Generate Signed Bundle.
- **iOS**: CI compiles an unsigned simulator build to prove that the project
  builds. Device, TestFlight and App Store builds need a signing certificate
  and a provisioning profile. Archive in Xcode, or in CI with `xcodebuild
  archive` and `-exportArchive` after importing the certificate.
- **Icons and splash screens**: by default you get the Capacitor
  placeholders. Generate real ones from a 1024 px source with
  `npx @capacitor/assets generate` (not installed by default).
