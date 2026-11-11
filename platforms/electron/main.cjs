// @ts-check
'use strict';

/**
 * Dungeon Crusade desktop shell (Electron main process).
 *
 * The game itself is the regular web build (../../dist, copied into ./app by
 * `npm run prepare:web`). This file only adds what a browser cannot do:
 *
 *  - serves the build from a privileged custom scheme (app://dc/) so fetch(),
 *    module scripts and <audio> streaming work exactly like on a web server
 *    (file:// does not support fetch() in Chromium);
 *  - a fullscreen-friendly game window (F11 / Alt+Enter, no menu bar, no
 *    background throttling);
 *  - Steam via steamworks.js: user name, rich presence, friends-only lobbies
 *    used as invite carriers, overlay invite dialog, achievements;
 *  - "join" requests from Steam (lobby invites / "Join Game") and from a second
 *    launch (`+join CODE`, `+connect_lobby <id>`) forwarded to the renderer.
 *
 * The renderer talks to this file only through preload.cjs (window.dcNative,
 * see src/client/platform.ts -> NativeBridge).
 *
 * Command line / env:
 *   --dev                 load the Vite dev server (http://localhost:5173/)
 *   ELECTRON_START_URL    load this URL instead (implies dev mode)
 *   --fullscreen          start in fullscreen
 *   --no-steam            never initialise Steam (also DC_NO_STEAM=1)
 *   DC_NO_STEAM_OVERLAY=1 skip electronEnableSteamOverlay() (GPU workarounds)
 *   STEAM_APP_ID          Steam app id (else SteamAppId set by Steam, else steam_appid.txt)
 *   +join CODE            join room CODE on start (Steam rich presence "connect")
 *   +connect_lobby <id>   join the room advertised by a Steam lobby (Steam invites)
 */

const { app, BrowserWindow, Menu, ipcMain, protocol, session, shell, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');

// ------------------------------------------------------------------ config

const SCHEME = 'app';
const HOST = 'dc';
const APP_ORIGIN = `${SCHEME}://${HOST}`;
const APP_ENTRY = `${APP_ORIGIN}/index.html`;

const hasFlag = (/** @type {string} */ flag) => process.argv.includes(flag);

/** Vite dev server URL when running with --dev or ELECTRON_START_URL. */
const DEV_URL = process.env.ELECTRON_START_URL || (hasFlag('--dev') ? 'http://localhost:5173/' : '');
const IS_DEV = DEV_URL !== '';

/** Steam lobby settings (numeric values of steamworks.js `matchmaking.LobbyType`, a const enum). */
const LOBBY_TYPE_FRIENDS_ONLY = 1;
// Joiners only enter the lobby long enough to read the room code, then leave;
// a little headroom keeps invites working if someone is slow to leave.
const LOBBY_MAX_MEMBERS = 16;

const log = (/** @type {unknown[]} */ ...args) => console.log('[dc]', ...args);

// ------------------------------------------------------------- utilities

/**
 * Room codes are 4 letters (src/shared/protocol.ts CODE_LENGTH). Be a little
 * lenient so a future code length does not need a desktop update.
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/[^A-Z]/g, '');
  return code.length >= 4 && code.length <= 8 ? code : null;
}

/**
 * @typedef {{ join: string | null, lobby: string | null }} LaunchRequest
 * `lobby` is the Steam lobby id as a decimal string (BigInt is not serialisable
 * through requestSingleInstanceLock's additionalData).
 */

/**
 * Extracts a join request from a command line. Steam appends the rich presence
 * connect string (`+join CODE`) or `+connect_lobby <id>`; deep links
 * (dungeoncrusade://join/CODE, ...?join=CODE) are accepted as well.
 * @param {readonly string[]} argv
 * @returns {LaunchRequest}
 */
function parseLaunchArgs(argv) {
  /** @type {LaunchRequest} */
  const req = { join: null, lobby: null };
  // Steam sometimes passes "+join ABCD" as one argument; split everything.
  const tokens = argv.flatMap((a) => String(a).split(/\s+/)).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1] ?? '';
    if (t === '+join') req.join = normalizeCode(next) ?? req.join;
    else if (t.startsWith('+join=')) req.join = normalizeCode(t.slice(6)) ?? req.join;
    else if (t === '+connect_lobby' && /^\d+$/.test(next)) req.lobby = next;
    else {
      const m = /^dungeoncrusade:\/\/join\/([A-Za-z]+)/i.exec(t) ?? /[?&#]join=([A-Za-z]+)/.exec(t);
      if (m) req.join = normalizeCode(m[1]) ?? req.join;
    }
  }
  return req;
}

/** @param {unknown} v @returns {v is LaunchRequest} */
function isLaunchRequest(v) {
  return !!v && typeof v === 'object' && ('join' in v || 'lobby' in v);
}

/**
 * Steam app id: STEAM_APP_ID env (explicit override) > SteamAppId (set by the
 * Steam client when it launches the game) > steam_appid.txt (480 = Spacewar,
 * Valve's public test app). Returns undefined to let the Steam API decide.
 * @returns {number | undefined}
 */
function readSteamAppId() {
  for (const v of [process.env.STEAM_APP_ID, process.env.SteamAppId]) {
    if (v && /^\d+$/.test(v.trim())) return Number(v.trim());
  }
  const candidates = [
    process.resourcesPath && path.join(process.resourcesPath, 'steam_appid.txt'), // packaged (extraResources)
    path.join(path.dirname(process.execPath), 'steam_appid.txt'), // next to the executable
    path.join(__dirname, 'steam_appid.txt'), // `electron .` in platforms/electron
  ];
  for (const file of candidates) {
    try {
      if (!file) continue;
      const id = fs.readFileSync(file, 'utf8').trim();
      if (/^\d+$/.test(id)) return Number(id);
    } catch {
      /* try the next one */
    }
  }
  return undefined;
}

/** Where the web build lives: packaged -> resources/web, dev -> ./app or ../../dist. */
function resolveWebRoot() {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'web')]
    : [path.join(__dirname, 'app'), path.join(__dirname, '..', '..', 'dist')];
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? candidates[0];
}

// ------------------------------------------------------------------ Steam

/** @typedef {ReturnType<typeof import('steamworks.js').init>} SteamClient */
/** @typedef {import('steamworks.js/client').matchmaking.Lobby} SteamLobby */

/** @type {SteamClient | null} */
let steam = null;
/**
 * Runtime values of steamworks.js' SteamCallback enum (a `const enum` in its
 * typings, so it is read as a plain record here).
 * @type {Record<string, number>}
 */
let steamCallbackIds = {};
/**
 * steamworks.js 0.4.0 does not expose GameRichPresenceJoinRequested_t, so a
 * running game never hears about "Join Game" clicks that use the rich presence
 * `connect` key. Lobbies (GameLobbyJoinRequested) cover that case; `connect`
 * is only advertised when a newer steamworks.js supports the callback, or as a
 * fallback when the lobby could not be created. Feature-detected at runtime.
 */
let richPresenceJoinSupported = false;

function initSteam() {
  if (hasFlag('--no-steam') || process.env.DC_NO_STEAM === '1') {
    log('Steam disabled by flag');
    return;
  }
  try {
    const steamworks = require('steamworks.js');
    const appId = readSteamAppId();
    // Throws when Steam is not running / the user does not own the app.
    steam = steamworks.init(appId);
    steamCallbackIds = /** @type {any} */ (steamworks).SteamCallback ?? {};
    richPresenceJoinSupported = typeof steamCallbackIds.GameRichPresenceJoinRequested === 'number';
    // Must run before the app is ready (adds GPU command line switches) and
    // before any window is created (repaints windows so the overlay draws).
    if (process.env.DC_NO_STEAM_OVERLAY !== '1') steamworks.electronEnableSteamOverlay();
    log(`Steam ready (app ${appId ?? 'from Steam'}) as ${steam.localplayer.getName()}`);
  } catch (err) {
    steam = null;
    log('Steam unavailable, continuing without it:', err instanceof Error ? err.message : err);
  }
}

/** Current presence, re-applied whenever the lobby state changes. */
const presence = { status: '', code: /** @type {string | null} */ (null) };
/** Room code whose lobby could not be created -> advertise `connect` instead. */
let lobbyFailedFor = /** @type {string | null} */ (null);

function applyPresence() {
  if (!steam) return;
  const { status, code } = presence;
  const connect = code && (richPresenceJoinSupported || lobbyFailedFor === code) ? `+join ${code}` : null;
  try {
    const lp = steam.localplayer;
    lp.setRichPresence('status', status || null);
    // steam_display needs the "#Status" token from platforms/steam/rich_presence_english.vdf
    // uploaded in Steamworks; without it Steam just shows "Playing Dungeon Crusade".
    lp.setRichPresence('steam_display', status ? '#Status' : null);
    lp.setRichPresence('connect', connect);
    // Groups friends who are in the same room in the friends list.
    lp.setRichPresence('steam_player_group', code);
  } catch (err) {
    log('setRichPresence failed:', err);
  }
}

/**
 * @typedef {{ code: string, lobby: SteamLobby | null, promise: Promise<SteamLobby | null> }} LobbyState
 * @type {LobbyState | null}
 */
let lobbyState = null;

/**
 * Makes sure we own a friends-only Steam lobby whose data carries the room
 * code. The lobby is only an invite carrier: friends who accept an overlay
 * invite or click "Join Game" join it, read `code`, leave, and then meet us on
 * the relay server like every other platform.
 * @param {string} code
 * @returns {Promise<SteamLobby | null>}
 */
function ensureLobby(code) {
  if (!steam) return Promise.resolve(null);
  if (lobbyState && lobbyState.code === code) return lobbyState.promise;
  leaveLobby();
  /** @type {LobbyState} */
  const state = { code, lobby: null, promise: Promise.resolve(null) };
  lobbyState = state;
  state.promise = steam.matchmaking
    .createLobby(LOBBY_TYPE_FRIENDS_ONLY, LOBBY_MAX_MEMBERS)
    .then((lobby) => {
      if (lobbyState !== state) {
        // Superseded (room changed / left) while Steam was creating it.
        lobby.leave();
        return null;
      }
      lobby.mergeFullData({ code, game: 'dungeon-crusade', version: app.getVersion() });
      state.lobby = lobby;
      if (lobbyFailedFor === code) {
        lobbyFailedFor = null;
        applyPresence();
      }
      log(`Steam lobby ${lobby.id} carries room ${code}`);
      return lobby;
    })
    .catch((err) => {
      log('Could not create Steam lobby:', err);
      if (lobbyState === state) {
        lobbyState = null;
        lobbyFailedFor = code;
        applyPresence();
      }
      return null;
    });
  return state.promise;
}

function leaveLobby() {
  const state = lobbyState;
  lobbyState = null;
  try {
    state?.lobby?.leave();
  } catch {
    /* already gone */
  }
}

/**
 * Joins a Steam lobby just long enough to read the room code it advertises.
 * @param {bigint} lobbyId
 * @returns {Promise<string | null>}
 */
async function codeFromLobby(lobbyId) {
  if (!steam) return null;
  if (lobbyState?.lobby && lobbyState.lobby.id === lobbyId) return lobbyState.code; // our own lobby
  const lobby = await steam.matchmaking.joinLobby(lobbyId);
  try {
    return normalizeCode(lobby.getData('code'));
  } finally {
    if (lobbyState?.lobby?.id !== lobby.id) lobby.leave();
  }
}

function registerSteamCallbacks() {
  if (!steam) return;
  /** @type {import('steamworks.js/client').callback.SteamCallback.GameLobbyJoinRequested} */
  const lobbyJoinRequested = /** @type {any} */ (steamCallbackIds.GameLobbyJoinRequested ?? 8);
  // Overlay invite accepted, or "Join Game" on a friend who is in a lobby,
  // while the game is already running.
  steam.callback.register(lobbyJoinRequested, ({ lobby_steam_id }) => {
    log('GameLobbyJoinRequested', lobby_steam_id);
    handleJoinRequest({ join: null, lobby: lobby_steam_id.toString() });
  });
  // Newer steamworks.js versions may expose GameRichPresenceJoinRequested_t
  // (rich presence "connect" while running). Its payload carries the connect
  // string, i.e. "+join CODE"; parse it defensively.
  if (richPresenceJoinSupported) {
    const id = /** @type {any} */ (steamCallbackIds.GameRichPresenceJoinRequested);
    steam.callback.register(id, (/** @type {unknown} */ payload) => {
      const strings = payload && typeof payload === 'object' ? Object.values(payload).map(String) : [];
      handleJoinRequest(parseLaunchArgs(strings));
    });
  }
}

// --------------------------------------------------------- join plumbing

/** @type {BrowserWindow | null} */
let win = null;
/** True once the page finished loading (preload queues joins until onJoin). */
let rendererReady = false;
/** A join that arrived before the renderer was ready; handed out by launchJoinCode(). */
let pendingJoin = /** @type {string | null} */ (null);
/** Resolves the join request this process was launched with (once). */
let launchCode = /** @type {Promise<string | null> | null} */ (null);

/** @param {string} code */
function deliverJoin(code) {
  log('join request for room', code);
  focusWindow();
  if (win && rendererReady) win.webContents.send('dc:join', code);
  else pendingJoin = code;
}

/** @param {LaunchRequest} req */
function handleJoinRequest(req) {
  if (req.join) {
    deliverJoin(req.join);
  } else if (req.lobby && steam) {
    codeFromLobby(BigInt(req.lobby))
      .then((code) => code && deliverJoin(code))
      .catch((err) => log('Could not read Steam lobby', req.lobby, err));
  }
}

/** @param {LaunchRequest} req */
function launchCodeFrom(req) {
  if (req.join) return Promise.resolve(req.join);
  if (req.lobby && steam) return codeFromLobby(BigInt(req.lobby)).catch(() => null);
  return null;
}

function focusWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// --------------------------------------------------------- app:// scheme

/** @type {Record<string, string>} */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

/**
 * Serves the web build. Files are streamed from disk with HTTP range support
 * (the music uses streamed <audio> elements, which seek/loop with ranges).
 * The build sits outside app.asar (extraResources), so plain fs works.
 * @param {string} webRoot
 * @returns {(request: Request) => Promise<Response>}
 */
function createAppHandler(webRoot) {
  return async (request) => {
    const url = new URL(request.url);
    if (url.host !== HOST) return new Response('Not found', { status: 404 });
    let rel;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(webRoot, rel);
    const inside = path.relative(webRoot, file);
    if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) return new Response('Forbidden', { status: 403 });

    let stat;
    try {
      stat = await fs.promises.stat(file);
    } catch {
      return new Response('Not found', { status: 404 });
    }
    if (!stat.isFile()) return new Response('Not found', { status: 404 });

    /** @type {Record<string, string>} */
    const headers = {
      'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'accept-ranges': 'bytes',
      'cache-control': 'no-cache',
    };
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    const range = request.headers.get('range');
    const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
    if (range && m && (m[1] || m[2])) {
      if (m[1]) {
        start = Number(m[1]);
        if (m[2]) end = Math.min(Number(m[2]), stat.size - 1);
      } else {
        start = Math.max(0, stat.size - Number(m[2])); // suffix range: last N bytes
      }
      if (start > end || start >= stat.size) {
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${stat.size}` } });
      }
      status = 206;
      headers['content-range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['content-length'] = String(Math.max(0, end - start + 1));
    if (request.method === 'HEAD' || stat.size === 0) return new Response(null, { status, headers });
    const body = /** @type {any} */ (Readable.toWeb(fs.createReadStream(file, { start, end })));
    return new Response(body, { status, headers });
  };
}

// --------------------------------------------------------------- window

/** @param {string} url */
function isAppUrl(url) {
  if (url.startsWith(`${APP_ORIGIN}/`)) return true;
  if (!IS_DEV) return false;
  try {
    return new URL(url).origin === new URL(DEV_URL).origin;
  } catch {
    return false;
  }
}

/** @param {import('electron').IpcMainEvent | import('electron').IpcMainInvokeEvent} event */
function trusted(event) {
  return isAppUrl(event.senderFrame?.url ?? '');
}

function toggleFullscreen() {
  if (win) win.setFullScreen(!win.isFullScreen());
}

/** @param {string} url */
function openExternal(url) {
  if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    useContentSize: true,
    show: false,
    title: 'Dungeon Crusade',
    backgroundColor: '#0b0b16',
    autoHideMenuBar: true,
    fullscreenable: true,
    fullscreen: hasFlag('--fullscreen'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Keep the simulation, netcode and audio running at full rate when the
      // window is in the background (e.g. tabbed out during an online match).
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      spellcheck: false,
      devTools: IS_DEV || !app.isPackaged,
      // Read synchronously by the preload so window.dcNative.steam is a plain boolean.
      additionalArguments: [`--dc-steam=${steam ? 1 : 0}`],
    },
  });
  if (process.platform !== 'darwin') win.removeMenu();

  const shown = () => {
    if (win && !win.isDestroyed() && !win.isVisible()) win.show();
  };
  win.once('ready-to-show', shown);
  setTimeout(shown, 4000); // never stay invisible if ready-to-show is missed

  const wc = win.webContents;
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      toggleFullscreen();
      event.preventDefault();
    } else if ((IS_DEV || !app.isPackaged) && (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))) {
      wc.toggleDevTools();
      event.preventDefault();
    }
  });

  // The game never navigates away; anything else opens in the system browser.
  wc.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      openExternal(url);
    }
  });
  wc.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });

  wc.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument) rendererReady = false;
  });
  wc.on('did-finish-load', () => {
    rendererReady = true;
  });
  let crashes = 0;
  wc.on('render-process-gone', (_e, details) => {
    log('renderer gone:', details.reason);
    if (details.reason !== 'clean-exit' && details.reason !== 'killed' && ++crashes <= 3) wc.reload();
  });

  win.on('closed', () => {
    win = null;
  });

  if (IS_DEV) void win.loadURL(DEV_URL);
  else void win.loadURL(APP_ENTRY);
}

function setupMenu() {
  if (process.platform === 'darwin') {
    // macOS always shows a menu bar; keep the standard roles so Cmd+Q,
    // Cmd+C/V (text fields) and Ctrl+Cmd+F keep working.
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]));
  } else {
    Menu.setApplicationMenu(null);
  }
}

function registerIpc() {
  ipcMain.handle('dc:steam-user', (event) => {
    if (!trusted(event) || !steam) return null;
    try {
      return { name: steam.localplayer.getName(), id: steam.localplayer.getSteamId().steamId64.toString() };
    } catch {
      return null;
    }
  });

  ipcMain.on('dc:presence', (event, status, code) => {
    if (!trusted(event)) return;
    presence.status = typeof status === 'string' ? status.slice(0, 200) : '';
    presence.code = normalizeCode(code);
    applyPresence();
    // Presence updates are frequent; after a failed lobby creation only an
    // explicit invite retries (the `connect` fallback covers "Join Game").
    if (presence.code && lobbyFailedFor !== presence.code) void ensureLobby(presence.code);
    else if (!presence.code) leaveLobby();
  });

  ipcMain.handle('dc:invite', async (event, code) => {
    const room = normalizeCode(code);
    if (!trusted(event) || !steam || !room) return false;
    const lobby = await ensureLobby(room);
    if (!lobby) return false; // renderer falls back to share link / clipboard
    try {
      steam.overlay.activateInviteDialog(lobby.id);
      return true;
    } catch (err) {
      log('activateInviteDialog failed:', err);
      return false;
    }
  });

  ipcMain.handle('dc:launch-code', async (event) => {
    if (!trusted(event)) return null;
    const p = launchCode;
    launchCode = null; // consumed once
    const code = p ? await p : null;
    if (code) return code;
    const pending = pendingJoin;
    pendingJoin = null;
    return pending;
  });

  ipcMain.on('dc:achievement', (event, id) => {
    if (!trusted(event) || !steam || typeof id !== 'string' || !/^[\w.-]{1,128}$/.test(id)) return;
    try {
      if (!steam.achievement.isActivated(id)) steam.achievement.activate(id);
    } catch (err) {
      log('achievement failed:', id, err);
    }
  });

  ipcMain.on('dc:quit', (event) => {
    if (trusted(event)) app.quit();
  });

  ipcMain.on('dc:fullscreen', (event) => {
    if (trusted(event)) toggleFullscreen();
  });
}

// ------------------------------------------------------------------ main

function main() {
  const launch = parseLaunchArgs(process.argv);

  // One running copy only. A second launch (e.g. Steam "Join Game" with
  // `+join CODE`, or a deep link) forwards its request and exits.
  if (!app.requestSingleInstanceLock(launch)) {
    app.quit();
    return;
  }
  app.on('second-instance', (_event, argv, _cwd, data) => {
    focusWindow();
    handleJoinRequest(isLaunchRequest(data) ? data : parseLaunchArgs(argv));
  });

  if (process.platform === 'win32') app.setAppUserModelId('com.dungeoncrusade.game');

  initSteam();
  registerSteamCallbacks();
  launchCode = launchCodeFrom(launch);

  // Must happen before `ready`. standard+secure gives app://dc/ a real origin
  // and a secure context; supportFetchAPI lets the game fetch() its manifest,
  // images and audio; stream enables media streaming for <audio>.
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
    },
  ]);

  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => leaveLobby());

  void app.whenReady().then(() => {
    const webRoot = resolveWebRoot();
    if (!IS_DEV && !fs.existsSync(path.join(webRoot, 'index.html'))) {
      dialog.showErrorBox(
        'Dungeon Crusade',
        `The game files are missing (${webRoot}).\n\nBuild the web game first: "npm run build" in the repository root, then "npm run prepare:web" in platforms/electron.`,
      );
      app.quit();
      return;
    }
    protocol.handle(SCHEME, createAppHandler(webRoot));

    // Nothing in the game needs camera, microphone, notifications, ...
    const allowed = new Set(['fullscreen', 'pointerLock', 'keyboardLock', 'clipboard-sanitized-write']);
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));

    setupMenu();
    registerIpc();
    createWindow();
    log(IS_DEV ? `dev mode: ${DEV_URL}` : `serving ${webRoot} as ${APP_ORIGIN}/`);
  });
}

main();
