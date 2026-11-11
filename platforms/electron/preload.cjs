// @ts-check
'use strict';

/**
 * Preload bridge: exposes window.dcNative (the NativeBridge interface in
 * src/client/platform.ts) to the sandboxed, context-isolated renderer.
 * Everything goes through IPC to main.cjs; no Node APIs leak into the page.
 */

const { contextBridge, ipcRenderer } = require('electron');

// main.cjs passes --dc-steam=1|0 via webPreferences.additionalArguments, so
// `steam` is known synchronously before the game boots.
const steam = process.argv.includes('--dc-steam=1');

/** @type {Array<(code: string) => void>} */
const joinListeners = [];
/** Join requests that arrived before the game registered onJoin(). */
/** @type {string[]} */
const queuedJoins = [];

ipcRenderer.on('dc:join', (_event, code) => {
  if (typeof code !== 'string') return;
  if (joinListeners.length === 0) queuedJoins.push(code);
  for (const cb of joinListeners) cb(code);
});

contextBridge.exposeInMainWorld('dcNative', {
  platform: 'electron',
  steam,

  /** @returns {Promise<{ name: string, id: string } | null>} */
  steamUser: () => ipcRenderer.invoke('dc:steam-user'),

  /** Rich presence + the friends-only lobby that carries the room code. */
  setPresence: (/** @type {string} */ status, /** @type {string | null} */ code) =>
    ipcRenderer.send('dc:presence', String(status ?? ''), code == null ? null : String(code)),

  /** Opens the Steam overlay invite dialog. Resolves false when Steam cannot invite. */
  inviteFriends: (/** @type {string} */ code) => ipcRenderer.invoke('dc:invite', String(code)),

  onJoin: (/** @type {(code: string) => void} */ cb) => {
    if (typeof cb !== 'function') return;
    joinListeners.push(cb);
    while (queuedJoins.length) cb(/** @type {string} */ (queuedJoins.shift()));
  },

  /** Room code the game was launched with (`+join CODE`, Steam lobby), consumed once. */
  launchJoinCode: () => ipcRenderer.invoke('dc:launch-code'),

  achievement: (/** @type {string} */ id) => ipcRenderer.send('dc:achievement', String(id)),
  quit: () => ipcRenderer.send('dc:quit'),
  toggleFullscreen: () => ipcRenderer.send('dc:fullscreen'),
});
