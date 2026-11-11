// Wire protocol between game clients and the relay / matchmaking server.
// JSON messages over a WebSocket. The server never simulates the game: it
// manages rooms (4-letter codes, quick match) and relays inputs between peers
// who each run the deterministic simulation with rollback.

import type { LevelId, MatchConfig } from './types';

export const PROTOCOL_VERSION = 2;
export const MAX_PEERS = 4;
export const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';
export const CODE_LENGTH = 4;

export type Platform = 'web' | 'steam' | 'desktop' | 'android' | 'ios';

export interface LobbyPlayer {
  name: string;
  knight: number;
}

export interface PeerInfo {
  id: string;
  name: string;
  platform: Platform;
  players: LobbyPlayer[];
  ready: boolean;
  ping: number;
}

export interface RoomSettings {
  level: LevelId;
  targetScore: number;
  timeLimit: number;
  items: boolean;
  teams: boolean;
  /** Fill empty slots with CPUs (difficulty 0 = none). */
  cpus: number;
  cpuLevel: number;
}

export interface RoomState {
  code: string;
  host: string;
  public: boolean;
  phase: 'lobby' | 'game';
  peers: PeerInfo[];
  settings: RoomSettings;
}

export interface StartInfo {
  cfg: MatchConfig;
  /** slot -> peer id (null for CPU / empty). */
  owners: Array<string | null>;
  /** Server time (ms) at which frame 0 begins. */
  startAt: number;
  matchId: number;
}

// ------------------------------------------------------------------ client -> server
export type ClientMsg =
  | { t: 'hello'; v: number; name: string; platform: Platform }
  | { t: 'ping'; c: number; rtt?: number }
  | { t: 'create'; public: boolean; players: LobbyPlayer[] }
  | { t: 'join'; code: string; players: LobbyPlayer[] }
  | { t: 'quick'; players: LobbyPlayer[] }
  | { t: 'leave' }
  | { t: 'players'; players: LobbyPlayer[] }
  | { t: 'ready'; ready: boolean }
  | { t: 'settings'; settings: Partial<RoomSettings> }
  | { t: 'start'; cfg: MatchConfig; owners: Array<string | null> }
  | { t: 'i'; f: number; d: number[] } // inputs of my slots for frame f
  | { t: 'h'; f: number; h: number } // state checksum at confirmed frame f
  | { t: 'sync'; to: string; f: number; s: string } // host -> peer full state
  | { t: 'needsync'; f: number }
  | { t: 'end' };

// ------------------------------------------------------------------ server -> client
export type ServerMsg =
  | { t: 'welcome'; id: string; time: number; motd?: string }
  | { t: 'pong'; c: number; s: number }
  | { t: 'room'; room: RoomState }
  | { t: 'left' }
  | { t: 'start'; start: StartInfo }
  | { t: 'i'; p: string; f: number; d: number[] }
  | { t: 'h'; p: string; f: number; h: number }
  | { t: 'sync'; f: number; s: string }
  | { t: 'needsync'; p: string; f: number }
  | { t: 'peer-left'; p: string; lastFrame: number }
  | { t: 'error'; code: string; msg: string };

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  level: 'dungeon',
  targetScore: 5,
  timeLimit: 0,
  items: true,
  teams: false,
  cpus: 0,
  cpuLevel: 2,
};

/** Input byte meaning "this player left: a CPU takes over". */
export const INPUT_DISCONNECTED = 255;

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, CODE_LENGTH);
}
