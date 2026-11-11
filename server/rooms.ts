// Room / matchmaking logic, independent of the transport so it can be unit
// tested without sockets.

import {
  CODE_ALPHABET,
  CODE_LENGTH,
  DEFAULT_ROOM_SETTINGS,
  MAX_PEERS,
  PROTOCOL_VERSION,
  type ClientMsg,
  type LobbyPlayer,
  type PeerInfo,
  type Platform,
  type RoomSettings,
  type RoomState,
  type ServerMsg,
} from '../src/shared/protocol';

export interface Client {
  id: string;
  name: string;
  platform: Platform;
  players: LobbyPlayer[];
  ready: boolean;
  ping: number;
  room: Room | null;
  send: (m: ServerMsg) => void;
  hello: boolean;
  lastFrame: number;
}

export interface Room {
  code: string;
  host: string;
  public: boolean;
  phase: 'lobby' | 'game';
  clients: Client[];
  settings: RoomSettings;
  matchId: number;
  created: number;
}

const LEVELS = ['dungeon', 'beach', 'dragon'];
const MAX_PLAYERS = 4;

function clampPlayers(list: unknown): LobbyPlayer[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, MAX_PLAYERS).map((p) => {
    const o = (p ?? {}) as Partial<LobbyPlayer>;
    return {
      name: String(o.name ?? 'Knight').replace(/[^\p{L}\p{N} _.\-!?]/gu, '').slice(0, 16) || 'Knight',
      knight: Math.max(0, Math.min(3, Math.floor(Number(o.knight) || 0))),
    };
  });
}

export class RoomManager {
  rooms = new Map<string, Room>();
  clients = new Set<Client>();
  private nextId = 1;
  now: () => number = () => Date.now();

  connect(send: (m: ServerMsg) => void): Client {
    const c: Client = {
      id: (this.nextId++).toString(36) + Math.random().toString(36).slice(2, 6),
      name: 'Knight', platform: 'web', players: [], ready: false, ping: 0, room: null, send, hello: false, lastFrame: -1,
    };
    this.clients.add(c);
    return c;
  }

  disconnect(c: Client) {
    this.leave(c);
    this.clients.delete(c);
  }

  stats() {
    let players = 0;
    for (const r of this.rooms.values()) for (const c of r.clients) players += Math.max(1, c.players.length);
    return { clients: this.clients.size, rooms: this.rooms.size, players };
  }

  private code(): string {
    for (let tries = 0; tries < 1000; tries++) {
      let s = '';
      for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (!this.rooms.has(s)) return s;
    }
    throw new Error('no free room codes');
  }

  private playerCount(r: Room): number {
    let n = 0;
    for (const c of r.clients) n += Math.max(1, c.players.length);
    return n;
  }

  private roomState(r: Room): RoomState {
    const peers: PeerInfo[] = r.clients.map((c) => ({
      id: c.id, name: c.name, platform: c.platform, players: c.players, ready: c.ready, ping: c.ping,
    }));
    return { code: r.code, host: r.host, public: r.public, phase: r.phase, peers, settings: r.settings };
  }

  broadcast(r: Room, m: ServerMsg, except?: Client) {
    for (const c of r.clients) if (c !== except) c.send(m);
  }

  private sync(r: Room) {
    this.broadcast(r, { t: 'room', room: this.roomState(r) });
  }

  private err(c: Client, code: string, msg: string) {
    c.send({ t: 'error', code, msg });
  }

  private createRoom(c: Client, pub: boolean): Room {
    const r: Room = {
      code: this.code(), host: c.id, public: pub, phase: 'lobby', clients: [], settings: { ...DEFAULT_ROOM_SETTINGS },
      matchId: 0, created: this.now(),
    };
    this.rooms.set(r.code, r);
    return r;
  }

  private enter(c: Client, r: Room) {
    if (c.room) this.leave(c);
    c.room = r;
    c.ready = false;
    c.lastFrame = -1;
    r.clients.push(c);
    this.sync(r);
  }

  leave(c: Client) {
    const r = c.room;
    if (!r) return;
    r.clients = r.clients.filter((x) => x !== c);
    c.room = null;
    c.ready = false;
    if (r.phase === 'game') this.broadcast(r, { t: 'peer-left', p: c.id, lastFrame: c.lastFrame });
    if (r.clients.length === 0) {
      this.rooms.delete(r.code);
      return;
    }
    if (r.host === c.id) r.host = r.clients[0].id;
    // A match keeps running for the others: the leaver is replaced by a CPU.
    this.sync(r);
  }

  handle(c: Client, raw: unknown) {
    if (!raw || typeof raw !== 'object') return;
    const m = raw as ClientMsg;
    if (m.t !== 'hello' && !c.hello) return;
    switch (m.t) {
      case 'hello': {
        if (m.v !== PROTOCOL_VERSION) {
          this.err(c, 'version', 'Please update the game to play online.');
          return;
        }
        c.hello = true;
        c.name = String(m.name ?? 'Knight').slice(0, 16) || 'Knight';
        c.platform = (['web', 'steam', 'desktop', 'android', 'ios'] as const).includes(m.platform) ? m.platform : 'web';
        c.send({ t: 'welcome', id: c.id, time: this.now() });
        return;
      }
      case 'ping':
        c.send({ t: 'pong', c: m.c, s: this.now() });
        if (typeof m.rtt === 'number' && Number.isFinite(m.rtt)) {
          const before = c.ping;
          c.ping = Math.max(0, Math.min(9999, Math.round(m.rtt)));
          if (c.room && c.room.phase === 'lobby' && Math.abs(before - c.ping) > 15) this.sync(c.room);
        }
        return;
      case 'create': {
        c.players = clampPlayers(m.players);
        const r = this.createRoom(c, !!m.public);
        this.enter(c, r);
        return;
      }
      case 'join': {
        const code = String(m.code ?? '').toUpperCase();
        const r = this.rooms.get(code);
        if (!r) return this.err(c, 'not-found', `Room ${code} does not exist.`);
        const players = clampPlayers(m.players);
        if (r.clients.length >= MAX_PEERS || this.playerCount(r) + Math.max(1, players.length) > MAX_PLAYERS) {
          return this.err(c, 'full', 'That room is full.');
        }
        c.players = players;
        this.enter(c, r);
        return;
      }
      case 'quick': {
        const players = clampPlayers(m.players);
        const need = Math.max(1, players.length);
        let best: Room | null = null;
        for (const r of this.rooms.values()) {
          if (!r.public || r.phase !== 'lobby' || r.clients.length >= MAX_PEERS) continue;
          if (this.playerCount(r) + need > MAX_PLAYERS) continue;
          if (!best || this.playerCount(r) > this.playerCount(best)) best = r;
        }
        c.players = players;
        this.enter(c, best ?? this.createRoom(c, true));
        return;
      }
      case 'leave':
        this.leave(c);
        c.send({ t: 'left' });
        return;
      case 'players': {
        const r = c.room;
        const players = clampPlayers(m.players);
        if (r && this.playerCount(r) - Math.max(1, c.players.length) + Math.max(1, players.length) > MAX_PLAYERS) {
          return this.err(c, 'full', 'Not enough room for more local players.');
        }
        c.players = players;
        if (r) this.sync(r);
        return;
      }
      case 'ready':
        c.ready = !!m.ready;
        if (c.room) this.sync(c.room);
        return;
      case 'settings': {
        const r = c.room;
        if (!r || r.host !== c.id) return;
        const s = m.settings ?? {};
        if (s.level && LEVELS.includes(s.level)) r.settings.level = s.level;
        if (typeof s.targetScore === 'number') r.settings.targetScore = Math.max(1, Math.min(20, Math.floor(s.targetScore)));
        if (typeof s.timeLimit === 'number') r.settings.timeLimit = Math.max(0, Math.min(900, Math.floor(s.timeLimit)));
        if (typeof s.items === 'boolean') r.settings.items = s.items;
        if (typeof s.teams === 'boolean') r.settings.teams = s.teams;
        if (typeof s.cpus === 'number') r.settings.cpus = Math.max(0, Math.min(3, Math.floor(s.cpus)));
        if (typeof s.cpuLevel === 'number') r.settings.cpuLevel = Math.max(1, Math.min(3, Math.floor(s.cpuLevel)));
        this.sync(r);
        return;
      }
      case 'start': {
        const r = c.room;
        if (!r || r.host !== c.id) return;
        if (!m.cfg || !Array.isArray(m.owners) || m.owners.length !== 4) return;
        r.phase = 'game';
        r.matchId++;
        for (const x of r.clients) {
          x.lastFrame = -1;
          x.ready = false;
        }
        const startAt = this.now() + 1200;
        this.broadcast(r, { t: 'start', start: { cfg: m.cfg, owners: m.owners, startAt, matchId: r.matchId } });
        this.sync(r);
        return;
      }
      case 'i': {
        const r = c.room;
        if (!r || r.phase !== 'game' || !Array.isArray(m.d) || typeof m.f !== 'number') return;
        if (m.f > c.lastFrame) c.lastFrame = m.f;
        this.broadcast(r, { t: 'i', p: c.id, f: m.f, d: m.d.slice(0, 4).map((x) => Number(x) & 255) }, c);
        return;
      }
      case 'h': {
        const r = c.room;
        if (!r || r.phase !== 'game') return;
        this.broadcast(r, { t: 'h', p: c.id, f: m.f, h: m.h }, c);
        return;
      }
      case 'needsync': {
        const r = c.room;
        if (!r) return;
        const host = r.clients.find((x) => x.id === r.host);
        host?.send({ t: 'needsync', p: c.id, f: m.f });
        return;
      }
      case 'sync': {
        const r = c.room;
        if (!r || r.host !== c.id) return;
        const to = r.clients.find((x) => x.id === m.to);
        to?.send({ t: 'sync', f: m.f, s: m.s });
        return;
      }
      case 'end': {
        const r = c.room;
        if (!r || r.host !== c.id) return;
        r.phase = 'lobby';
        this.sync(r);
        return;
      }
    }
  }

  /** Records a measured round-trip time (ms) for a client. */
  setPing(c: Client, ms: number) {
    c.ping = Math.round(ms);
  }
}
