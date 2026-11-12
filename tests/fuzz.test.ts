// Fuzz tests: random inputs, random networks, random server traffic.
import { describe, expect, it } from 'vitest';
import { RoomManager, type Client } from '../server/rooms';
import { input } from '../src/client/input/input';
import { OnlineSession } from '../src/client/net/online-session';
import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_SWING, BTN_UP } from '../src/shared/input';
import { getLevel, LEVELS } from '../src/shared/levels';
import { PROTOCOL_VERSION, type ClientMsg, type RoomState, type ServerMsg, type StartInfo } from '../src/shared/protocol';
import { checksum, cloneState, createGame, step, type Match } from '../src/shared/sim';
import { T } from '../src/shared/tuning';
import { Phase, type GameMode, type GameState, type LevelId, type MatchConfig } from '../src/shared/types';

/** Small seeded PRNG for the fuzzers themselves. */
function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const BUTTONS = [BTN_LEFT, BTN_RIGHT, BTN_UP, BTN_DOWN, BTN_JUMP, BTN_ATTACK, BTN_SWING];
/** FUZZ_RUNS=25 npm test -- fuzz  runs every scenario with more seeds. */
const RUNS = Math.max(1, Number(process.env.FUZZ_RUNS ?? 1));

/** Humans that hold random button combos for random durations. */
function inputFuzzer(seed: number) {
  const r = prng(seed);
  const cur = [0, 0, 0, 0];
  const left = [0, 0, 0, 0];
  return () => {
    for (let i = 0; i < 4; i++) {
      if (--left[i] > 0) continue;
      left[i] = 1 + Math.floor(r() * 25);
      let b = 0;
      for (const bit of BUTTONS) if (r() < 0.3) b |= bit;
      if ((b & BTN_LEFT) && (b & BTN_RIGHT) && r() < 0.5) b &= ~BTN_LEFT;
      cur[i] = b;
    }
    return cur.slice();
  };
}

function cfgFor(level: LevelId, mode: GameMode, teams: boolean, seed: number, bots: number[]): MatchConfig {
  return {
    level, mode, seed, targetScore: 40, timeLimit: 0, teams, items: true,
    slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: bots[k], team: k % 2, name: `P${k}` })),
  };
}

/** Physics / rules invariants that must hold after every frame. */
function checkInvariants(m: Match, s: GameState, where: string) {
  const v = m.level.view;
  for (const p of s.players) {
    if (!p.active) continue;
    for (const k of ['x', 'y', 'vx', 'vy', 'hp', 'score'] as const) {
      if (!Number.isFinite(p[k])) throw new Error(`${where}: player ${p.slot}.${k} = ${p[k]}`);
    }
    if (p.score < 0) throw new Error(`${where}: negative score`);
    if (p.hp > T.armorHp) throw new Error(`${where}: hp ${p.hp}`);
    if (!p.alive) continue;
    if (p.hp <= 0) throw new Error(`${where}: alive with hp ${p.hp}`);
    if (p.x < v.x - 1.5 || p.x > v.x + v.w + 1.5) throw new Error(`${where}: player ${p.slot} x=${p.x} outside arena`);
    if (p.y < m.level.killY - 0.5 || p.y > v.y + v.h + 8) throw new Error(`${where}: player ${p.slot} y=${p.y}`);
    // Never embedded in solid geometry (beyond a hair).
    for (const so of m.level.solids) {
      if (so.oneway) continue;
      if (so.breakable >= 0 && s.destroyed[so.breakable]) continue;
      if (so.group && s.groupsGone.includes(so.group)) continue;
      const ox = Math.min(p.x + T.halfW, so.x + so.w) - Math.max(p.x - T.halfW, so.x);
      const oy = Math.min(p.y + T.height, so.y + so.h) - Math.max(p.y, so.y);
      if (ox > 0.05 && oy > 0.05) throw new Error(`${where}: player ${p.slot} inside solid at ${so.x},${so.y} (overlap ${ox.toFixed(3)}x${oy.toFixed(3)}) pos ${p.x.toFixed(3)},${p.y.toFixed(3)}`);
    }
  }
  for (const pr of s.projs) {
    if (!Number.isFinite(pr.x) || !Number.isFinite(pr.y) || !Number.isFinite(pr.vx) || !Number.isFinite(pr.vy)) throw new Error(`${where}: projectile NaN`);
  }
  if (s.projs.length > 150) throw new Error(`${where}: ${s.projs.length} projectiles`);
  if (s.blasts.length > 40) throw new Error(`${where}: ${s.blasts.length} blasts`);
  if (s.pickups.length > 8) throw new Error(`${where}: ${s.pickups.length} pickups`);
}

describe('simulation fuzz', () => {
  const combos: Array<[LevelId, GameMode, boolean]> = [];
  for (const l of LEVELS) for (const mode of ['classic', 'crusade'] as GameMode[]) for (const teams of [false, true]) combos.push([l.id, mode, teams]);

  for (const [level, mode, teams] of combos) {
    it(`${level} ${mode}${teams ? ' teams' : ''}: random humans hold every invariant, deterministically`, () => {
      for (let run = 0; run < RUNS; run++) fuzzOnce(level.length * 1000 + (mode === 'crusade' ? 7 : 3) + (teams ? 50 : 0) + run * 7919);
    }, 600_000);
    const fuzzOnce = (seed: number) => {
      const m: Match = { cfg: cfgFor(level, mode, teams, seed, [0, 0, 0, 2]), level: getLevel(level, mode) };
      const a = createGame(m);
      const b = createGame(m);
      const next = inputFuzzer(seed);
      const r = prng(seed + 1);
      const history: Array<{ s: GameState; inp: number[] }> = [];
      for (let f = 0; f < 4000; f++) {
        const inp = next();
        history.push({ s: cloneState(a), inp });
        step(m, a, inp);
        step(m, b, inp);
        checkInvariants(m, a, `${level}/${mode} frame ${f}`);
        // Random rollbacks: rewind up to 12 frames and replay.
        if (f > 20 && r() < 0.02) {
          const k = 1 + Math.floor(r() * 12);
          const re = cloneState(history[history.length - k].s);
          for (let j = history.length - k; j < history.length; j++) step(m, re, history[j].inp);
          expect(checksum(re)).toBe(checksum(a));
        }
        if (history.length > 30) history.shift();
        if (a.phase === Phase.End && a.slowmo === 0) break;
      }
      expect(checksum(a)).toBe(checksum(b));
    };
  }
});

// ------------------------------------------------------------------ netcode
interface Peer {
  id: string;
  session: OnlineSession;
  listeners: Set<(m: ServerMsg) => void>;
  clockError: number;
  alive: boolean;
  nextUpdate: number;
}

function netFuzz(opts: { peers: number; seed: number; mode: GameMode; level: LevelId; lag: number; jitter: number; reorder: boolean; dropAt?: number; seconds: number }) {
  const r = prng(opts.seed);
  let now = 0;
  const queue: Array<{ due: number; to: Peer; msg: ServerMsg }> = [];
  const peers: Peer[] = [];
  const room: RoomState = {
    code: 'TEST', host: 'p0', public: false, phase: 'game', settings: {} as RoomState['settings'],
    peers: [],
  };
  const lastSent = new Map<string, number>();
  const deliver = (from: Peer, msg: ClientMsg) => {
    if (!from.alive) return;
    const base = now + opts.lag + r() * opts.jitter;
    const relay = (to: Peer, m: ServerMsg) => {
      if (!to.alive) return;
      // In-order delivery like TCP, unless the test asks for reordering.
      const prev = opts.reorder ? 0 : (lastSent.get(`${from.id}>${to.id}`) ?? 0);
      const due = Math.max(base + r() * opts.jitter, prev);
      lastSent.set(`${from.id}>${to.id}`, due);
      queue.push({ due, to, msg: m });
    };
    if (msg.t === 'i') for (const p of peers) { if (p !== from) relay(p, { t: 'i', p: from.id, f: msg.f, d: msg.d }); }
    if (msg.t === 'h') for (const p of peers) { if (p !== from) relay(p, { t: 'h', p: from.id, f: msg.f, h: msg.h }); }
    if (msg.t === 'needsync') relay(peers[0], { t: 'needsync', p: from.id, f: msg.f });
    if (msg.t === 'sync') { const to = peers.find((p) => p.id === msg.to); if (to) relay(to, { t: 'sync', f: msg.f, s: msg.s }); }
  };

  const slots = Array.from({ length: 4 }, (_, k) => k < opts.peers);
  const cfg: MatchConfig = {
    level: opts.level, mode: opts.mode, seed: opts.seed, targetScore: 99, timeLimit: 0, teams: false, items: true,
    slots: slots.map((on, k) => ({ active: true, knight: k, bot: on ? 0 : 2, team: 0, name: `N${k}` })),
  };
  const start: StartInfo = { cfg, owners: slots.map((on, k) => (on ? `p${k}` : null)), startAt: 200, matchId: 1 };

  const rnd: Array<() => number[]> = [];
  for (let i = 0; i < opts.peers; i++) {
    const id = `p${i}`;
    room.peers.push({ id, name: id, platform: 'web', players: [], ready: false, ping: 0 });
    const listeners = new Set<(m: ServerMsg) => void>();
    const clockError = (r() - 0.5) * 30;
    const peer = { id, listeners, clockError, alive: true, nextUpdate: r() * 16 } as Peer;
    const conn = {
      id, room, rtt: 0,
      on: (fn: (m: ServerMsg) => void) => { listeners.add(fn); return () => listeners.delete(fn); },
      send: (m: ClientMsg) => deliver(peer, m),
      serverNow: () => now + clockError,
    };
    rnd.push(inputFuzzer(opts.seed * 31 + i));
    peer.session = new OnlineSession(conn as never, start, new Map([[i, `dev${i}`]]), 2);
    peers.push(peer);
  }
  // Local devices return random buttons.
  const deviceOf = input.device.bind(input);
  let current = -1;
  (input as unknown as { device: (id: string) => unknown }).device = (id: string) => {
    const i = Number(id.replace('dev', ''));
    return { buttons: rnd[i]()[current >= 0 ? 0 : 0] };
  };

  const end = opts.seconds * 1000;
  try {
    while (now < end) {
      now += 1;
      queue.sort((a, b) => a.due - b.due);
      while (queue.length && queue[0].due <= now) {
        const q = queue.shift()!;
        if (q.to.alive) for (const l of [...q.to.listeners]) l(q.msg);
      }
      if (opts.dropAt !== undefined && now === opts.dropAt) {
        // The last peer vanishes: the server tells everyone at which frame.
        const gone = peers[peers.length - 1];
        gone.alive = false;
        const lastFrame = Math.max(-1, ...[...queue, { msg: { t: 'x' } as never, to: gone, due: 0 }]
          .filter((q) => (q.msg as ServerMsg).t === 'i' && (q.msg as { p?: string }).p === gone.id).map((q) => (q.msg as { f: number }).f));
        const lastRelayed = Math.max(lastFrame, gone.session.current + gone.session.delay);
        for (const p of peers) if (p.alive) p.listeners.forEach((l) => l({ t: 'peer-left', p: gone.id, lastFrame: lastRelayed }));
      }
      for (const p of peers) {
        if (!p.alive || now < p.nextUpdate) continue;
        current = p.session.current;
        p.session.update(now);
        p.nextUpdate = now + 14 + r() * 6; // ~60 Hz with frame jitter
      }
    }
    // Let in-flight messages land and everyone settle on confirmed frames.
    for (let k = 0; k < 2000 && queue.length; k++) {
      now += 1;
      queue.sort((a, b) => a.due - b.due);
      while (queue.length && queue[0].due <= now) {
        const q = queue.shift()!;
        if (q.to.alive) for (const l of [...q.to.listeners]) l(q.msg);
      }
    }
    for (const p of peers) if (p.alive) p.session.update(now);
  } finally {
    (input as unknown as { device: typeof deviceOf }).device = deviceOf;
  }
  const alive = peers.filter((p) => p.alive);
  const common = Math.min(...alive.map((p) => p.session.current)) - 15;
  const sums = alive.map((p) => {
    const snap = (p.session as unknown as { snaps: GameState[] }).snaps[common % 512];
    expect(snap.frame).toBe(common);
    return checksum(snap);
  });
  return { peers, alive, common, sums };
}

describe('netcode fuzz (rollback over a simulated network)', () => {
  const cases = [
    { name: '2 peers, 40ms +-60 jitter, reordered', peers: 2, lag: 40, jitter: 60, reorder: true, mode: 'classic' as GameMode, level: 'beach' as LevelId },
    { name: '3 peers + CPU, 90ms lag, crusade', peers: 3, lag: 90, jitter: 40, reorder: false, mode: 'crusade' as GameMode, level: 'dungeon' as LevelId },
    { name: '4 peers, 120ms lag, crusade dragon, reordered', peers: 4, lag: 120, jitter: 80, reorder: true, mode: 'crusade' as GameMode, level: 'dragon' as LevelId },
    { name: '3 peers, one disconnects mid-match', peers: 3, lag: 60, jitter: 30, reorder: false, mode: 'crusade' as GameMode, level: 'beach' as LevelId, dropAt: 9000 },
    // Long enough for the first flood / first gust (level events driven by the play clock).
    { name: '3 peers, 70ms lag, High Tide through a flood', peers: 3, lag: 70, jitter: 50, reorder: true, mode: 'classic' as GameMode, level: 'tide' as LevelId, seconds: 26 },
    { name: '4 peers, 100ms lag, Sky Shrine through a gust', peers: 4, lag: 100, jitter: 40, reorder: false, mode: 'crusade' as GameMode, level: 'shrine' as LevelId, seconds: 30 },
    { name: '2 peers, 50ms lag, Oubliette loops', peers: 2, lag: 50, jitter: 60, reorder: true, mode: 'crusade' as GameMode, level: 'oubliette' as LevelId },
  ];
  for (const c of cases) {
    it(c.name, () => {
      for (let run = 0; run < Math.ceil(RUNS / 3); run++) {
        const res = netFuzz({ ...c, seed: c.peers * 17 + c.lag + run * 104729, seconds: c.seconds ?? 20 });
        expect(res.common).toBeGreaterThan(900);
        expect(new Set(res.sums).size, `run ${run}`).toBe(1);
        for (const p of res.alive) expect(p.session.desyncs, `run ${run}`).toBe(0);
        expect(Math.max(...res.alive.map((p) => p.session.rollbacks))).toBeGreaterThan(5);
      }
    }, 600_000);
  }
});

// ------------------------------------------------------------------ server
describe('room manager fuzz', () => {
  it('random traffic from 30 clients keeps rooms consistent', () => {
    const r = prng(1234);
    const rm = new RoomManager();
    let now = 0;
    rm.now = () => now;
    const clients: Client[] = [];
    const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
    const codes = () => [...rm.rooms.keys()];
    for (let step = 0; step < 8000; step++) {
      now += Math.floor(r() * 50);
      if (clients.length < 30 && r() < 0.05) {
        const c = rm.connect(() => {});
        rm.handle(c, { t: 'hello', v: PROTOCOL_VERSION, name: `c${step}`, platform: 'web' });
        clients.push(c);
        continue;
      }
      if (!clients.length) continue;
      const c = pick(clients);
      const players = Array.from({ length: Math.floor(r() * 5) }, (_, i) => ({ name: `n${i}`, knight: Math.floor(r() * 6) - 1 }));
      const roll = r();
      if (roll < 0.08) rm.handle(c, { t: 'create', public: r() < 0.5, players });
      else if (roll < 0.18) rm.handle(c, { t: 'join', code: r() < 0.8 && codes().length ? pick(codes()) : 'ZZZZ', players });
      else if (roll < 0.25) rm.handle(c, { t: 'quick', players });
      else if (roll < 0.3) rm.handle(c, { t: 'leave' });
      else if (roll < 0.35) rm.handle(c, { t: 'players', players });
      else if (roll < 0.4) rm.handle(c, { t: 'settings', settings: { level: pick(['dungeon', 'beach', 'nope'] as never[]), cpus: Math.floor(r() * 6) - 1, targetScore: r() * 40 } });
      else if (roll < 0.45 && c.room) {
        const owners = c.room.clients.slice(0, 4).map((x) => x.id) as Array<string | null>;
        while (owners.length < 4) owners.push(null);
        rm.handle(c, { t: 'start', cfg: { level: 'beach', seed: 1, targetScore: 5, timeLimit: 0, teams: false, items: true, slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: 0, team: 0, name: '' })) }, owners });
      } else if (roll < 0.75) rm.handle(c, { t: 'i', f: Math.floor(r() * 1000), d: [Math.floor(r() * 300)] });
      else if (roll < 0.8) rm.handle(c, { t: 'end' });
      else if (roll < 0.83) rm.tick();
      else if (roll < 0.86) {
        rm.disconnect(c);
        clients.splice(clients.indexOf(c), 1);
      } else rm.handle(c, { t: 'ping', c: now, rtt: r() * 300 });

      // ---- invariants
      for (const room of rm.rooms.values()) {
        expect(room.clients.length).toBeGreaterThan(0);
        expect(room.clients.length).toBeLessThanOrEqual(4);
        expect(room.clients.some((x) => x.id === room.host)).toBe(true);
        expect(room.clients.reduce((n, x) => n + Math.max(1, x.players.length), 0)).toBeLessThanOrEqual(4);
        for (const x of room.clients) expect(x.room).toBe(room);
      }
      for (const x of clients) if (x.room) expect(rm.rooms.get(x.room.code)).toBe(x.room);
    }
  }, 60_000);
});
