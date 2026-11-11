# Dungeon Crusade: platform builds

There is one game codebase: the Vite web build in `dist/`. Every other target
wraps that build, so a fix in `src/` reaches all platforms at once.

| Target | Wrapper | Build | Output |
| --- | --- | --- | --- |
| Web | none | `npm run build` | `dist/` |
| Relay server | Node + `ws` | `npm run build:server`, `npm start` | `dist-server/index.mjs` |
| Desktop / Steam | Electron (`platforms/electron`) | `npm run dist` in `platforms/electron` | `platforms/electron/out/` |
| Android | Capacitor | `npm run android` | `android/` (generated) |
| iOS | Capacitor | `npm run ios` | `ios/` (generated) |

CI runs from `.github/workflows/ci.yml` on every push and pull request.
`.github/workflows/release.yml` packages everything on a `v*` tag or a manual run.

## Online play, invites and crossplay

- Every client, whatever it runs on, connects to the same relay server over a
  WebSocket (`/ws`). Rooms are identified by **4-letter codes**. The server
  relays inputs, and each client runs the deterministic simulation. Web,
  Steam, other desktop builds, Android and iOS players can all share a room.
- Invites only carry the room code:
  - **Share links** (web and mobile): `https://<public host>/?join=CODE`, sent
    through the native share sheet on phones or copied to the clipboard
    elsewhere. A link opens the web game, or the installed mobile app when
    App Links / Universal Links are verified. The app also accepts
    `dungeoncrusade://join/CODE`.
  - **Steam**: the in-game "Invite Steam friends" button creates a
    friends-only Steam lobby whose data holds `code=CODE` and opens the Steam
    overlay invite dialog. "Join Game" in the Steam friends list uses the same
    lobby. When a friend accepts, their desktop app joins the lobby, reads the
    code, leaves the lobby and joins the room on the relay. Players without
    Steam can join the same room by typing the code.
- In a browser, the client connects to its own origin (`wss://<host>/ws`).
  The Vite dev server is the exception: it connects to `ws://<host>:8787/ws`.
  Electron and Capacitor builds connect to `wss://dungeon-crusade.fly.dev/ws`
  unless `VITE_SERVER_URL` is set at build time.

## Environment variables

| Variable | When | Purpose |
| --- | --- | --- |
| `VITE_SERVER_URL` | web build | Relay WebSocket URL, e.g. `wss://dungeon-crusade.fly.dev/ws`. Default: same origin in a browser, the fly.dev relay in native wrappers. |
| `VITE_PUBLIC_URL` | web build | Public web URL used in invite links, e.g. `https://dungeon-crusade.fly.dev/`. It also sets the Android App Link host. |
| `STEAM_APP_ID` | desktop runtime | Steam app id. Overrides `SteamAppId` (which Steam sets when it launches the game) and `steam_appid.txt`. |
| `PORT`, `HOST`, `STATIC_DIR`, `ALLOWED_ORIGINS` | server runtime | Listen port (8787) and address, the web build to serve (`dist`), and an optional WebSocket origin allow-list. |
| `ELECTRON_START_URL`, `DC_NO_STEAM`, `DC_NO_STEAM_OVERLAY` | desktop runtime | Dev server URL; set `DC_NO_STEAM=1` to turn Steam off and `DC_NO_STEAM_OVERLAY=1` to skip the overlay's GPU switches. |
| `DC_PUBLIC_HOST`, `DC_VERSION`, `DC_BUILD_NUMBER` | mobile setup | App Link host, app version and store build number (`platforms/mobile/patch-native.mjs`). |

If you set `ALLOWED_ORIGINS`, also allow the native clients: `app://dc`
(Electron), `https://localhost` (Android) and `capacitor://localhost` (iOS).

## Web

```sh
npm ci
npm run dev           # Vite on :5173 (asset pipeline runs first if needed)
npm run dev:server    # relay on :8787 for online play during development
npm run build         # -> dist/ (static, relative paths)
```

`dist/` can be hosted on any static host. Serve it over http(s): the game
loads its manifest, images and audio with `fetch()`, which does not work from
`file://`. The asset pipeline needs `ffmpeg` on the PATH.

## Relay server

```sh
npm run build && npm run build:server
npm start                                  # http://localhost:8787 -> game, /ws, /health
```

- **Docker**: `docker build -t dungeon-crusade . && docker run --rm -p 8787:8787 dungeon-crusade`.
  The image is multi-stage: it builds the web game and the server, then runs
  `node dist-server/index.mjs` as the non-root `node` user with
  `STATIC_DIR=/app/dist` and `PORT=8787`.
- **Fly.io** (`fly.toml`): run `fly launch --copy-config --no-deploy` once,
  then `fly deploy --ha=false`. Keep **one machine**: rooms live in memory, so
  players on two machines could not find each other's codes. To handle more
  load, give that machine a bigger VM (`fly scale vm`); do not add machines.
- **Render / Railway**: both deploy the same `Dockerfile`, provide a `PORT`
  environment variable (the server reads it) and support WebSockets. Set the
  health check path to `/health` and run a single instance, for the same
  reason as on Fly.

## Desktop and Steam (Electron)

```sh
npm run build                          # in the repository root -> dist/
cd platforms/electron
npm ci                                 # set ELECTRON_SKIP_BINARY_DOWNLOAD=1 if you only package
npm start                              # runs ../../dist (or ./app after prepare:web)
npm run dev                            # uses the Vite dev server (npm run dev in the root)
npm run dist                           # prepare:web + installers for this OS -> out/
npm run check                          # node --check + type check against the Electron/steamworks typings
```

- `npm run prepare:web` copies `../../dist` into `./app`. electron-builder
  ships it as `resources/web`, and `main.cjs` serves it as `app://dc/`, a
  privileged scheme with `fetch()` support. It is not named `prepare`, because
  npm runs a script with that name on every install.
- Outputs:
  - Windows: NSIS installer, portable `.exe` and `.zip`.
  - macOS: universal `.dmg` and `.zip` (CI signs them ad hoc unless a
    Developer ID certificate is configured).
  - Linux: AppImage and `.tar.gz`.
  - Unpacked: `out/win-unpacked`, `out/mac-universal` and `out/linux-unpacked`.
    These folders are the Steam depots.
- Window: 1280x720 by default and resizable. F11 or Alt+Enter toggles
  fullscreen, and `--fullscreen` starts in fullscreen. There is no menu bar,
  background throttling is off, and gamepads work through the standard
  Gamepad API.
- A second launch hands its `+join CODE` (or `+connect_lobby <id>`) to the
  running instance through the single-instance lock, then exits.

### Steam

- `steam_appid.txt` contains **480**, Valve's public *Spacewar* test app. With
  the Steam client running and any account logged in, every Steam feature
  works during development, but you appear as "Spacewar". For a real release,
  set your app id in `steam_appid.txt`, in `STEAM_APP_ID`, or in the
  `STEAM_APP_ID` repository variable for CI. When Steam launches the game, it
  sets `SteamAppId`, and that value wins over the file.
- If Steam is not running, `steamworks.init` fails, the game runs normally and
  `window.dcNative.steam` is `false`, so the UI hides Steam buttons.
- Features (`main.cjs`):
  - Persona name and Steam id: `steamUser()`.
  - Rich presence: `status`, `steam_display=#Status` and `steam_player_group`.
    Upload `platforms/steam/rich_presence_english.vdf` in Steamworks so the
    status text appears.
  - Friends-only lobbies as invite carriers, opened with
    `overlay.activateInviteDialog`.
  - `GameLobbyJoinRequested` and `+connect_lobby` handling.
  - Achievements through `achievement.activate(id)`. Create them in Steamworks
    with the same API names the game uses.
- **Rich presence `connect`**: steamworks.js 0.4.0 does not expose
  `GameRichPresenceJoinRequested`. If `connect` were set, "Join Game" would do
  nothing for friends whose game is already running. So `connect = "+join
  CODE"` is only advertised in two cases: when the lobby could not be
  created, or automatically once a steamworks.js version with that callback is
  installed. `+join CODE` on the command line is always handled.
- **Steamworks app setup**:
  - Depots: Windows, macOS and Linux.
  - Launch options: `DungeonCrusade.exe`, `Dungeon Crusade.app`, and
    `dungeon-crusade` with the argument `--no-sandbox`. Steam does not keep
    the setuid bit of Electron's `chrome-sandbox`, and the Steam Linux Runtime
    can block user namespaces.
  - Rich presence localization, achievements, Steam Overlay and Steam Input.
  - Steam Deck can run the Linux depot, or the Windows depot through Proton.
- **Overlay**: `electronEnableSteamOverlay()` adds the `in-process-gpu` and
  `disable-direct-composition` switches and repaints the window every frame.
  It is reliable on Windows and limited on macOS and Linux for Chromium apps.
  Set `DC_NO_STEAM_OVERLAY=1` if it causes GPU trouble.
- **Uploading**: the `steam` job in `release.yml` uses
  [game-ci/steam-deploy](https://github.com/game-ci/steam-deploy). It needs
  the `STEAM_USERNAME` and `STEAM_CONFIG_VDF` secrets (a base64 `config.vdf`
  from a steamcmd login that passed Steam Guard) and the `STEAM_APP_ID`
  variable. Depots are the app id + 1 (Windows), + 2 (macOS) and + 3 (Linux).
  For manual uploads, or other depot ids, use `steamcmd` with
  `platforms/steam/app_build.vdf` (instructions inside).

### Achievements

The game unlocks two achievements through the bridge; create them with these
API names in Steamworks (App Admin -> Stats & Achievements):

| API name | When |
| --- | --- |
| `WIN_LOCAL` | Win a couch / CPU match |
| `WIN_ONLINE` | Win an online match |

## Android and iOS (Capacitor)

```sh
npm run android     # build + generate/patch/sync android/ + open Android Studio
npm run ios         # build + generate/patch/sync ios/ + open Xcode (macOS)
npm run cap:sync    # build + regenerate/patch/sync both
```

The native folders are generated by `platforms/mobile/setup.sh`, which runs
`npx cap add`, applies the manifest and Info.plist patches, then runs
`npx cap sync`. Details are in [mobile/README.md](mobile/README.md): deep
links, App Links / Universal Links, controllers, signing and store builds.

## CI and releases

- `ci.yml` runs on every push and pull request:
  - `npm ci`, `typecheck`, `test`, `build` and `build:server` (with ffmpeg),
    then uploads `dist/`.
  - Checks the platform scripts: the patcher self-test, the shell script
    syntax and the Electron type check.
- `release.yml` runs on a `v*` tag or a manual run:
  - `web`: builds the game and the server once. The other jobs reuse `dist/`.
  - `electron`: a Windows / macOS / Linux matrix producing the installers.
  - `android`: a debug APK, plus a signed AAB when keystore secrets exist.
  - `ios`: an unsigned simulator build.
  - `steam`: runs only when the Steam secrets are set.
  - `publish`: on tags, creates a **draft** GitHub release with the
    installers.
  - The header of `release.yml` lists every optional secret and variable
    (signing, notarisation, keystore, Steam).
