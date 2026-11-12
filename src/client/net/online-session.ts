// Online match with rollback netcode (GGPO style).
//
// Every peer runs the same deterministic simulation. Local inputs are applied
// `delay` frames in the future and sent to the other peers through the relay
// server. Remote inputs that have not arrived yet are predicted (= last known
// input). When the real input arrives and differs from the prediction, the game
// state is restored to the frame before and re-simulated up to the present,
// so remote players and their projectiles are always where they really are.
//
// All peers run off the server clock (frame = (serverTime - startAt) / 16.67ms),
// so they stay in lock-step without drifting. A peer never runs more than
// MAX_PREDICTION frames ahead of the inputs it has; beyond that it waits.

import { input } from '../input/input';
import type { Session } from '../session';
import type { Connection } from './connection';
import { getLevel } from '../../shared/levels';
import { INPUT_DISCONNECTED, type ServerMsg, type StartInfo } from '../../shared/protocol';
import { checksum, cloneState, createGame, step, type Match } from '../../shared/sim';
import { FPS } from '../../shared/tuning';
import { Phase, type GameEvent, type GameState } from '../../shared/types';

const RING = 512;
const MAX_PREDICTION = 10;
const FRAME_MS = 1000 / FPS;
const HASH_EVERY = 60;

export class OnlineSession implements Session {
  kind = 'online' as const;
  match: Match;
  state: GameState;
  paused = false;
  names: string[];
  owners: Array<string | null>;
  mySlots: number[] = [];
  peerSlots = new Map<string, number[]>();
  delay: number;
  current = 0;
  /** inputs[f % RING][slot] */
  private inp: number[][] = [];
  private used: number[][] = [];
  /** recv[f % RING][slot] = f when the real input for frame f arrived. */
  private recv: number[][] = [];
  private snaps: GameState[] = [];
  private confirmed: number[] = [Infinity, Infinity, Infinity, Infinity];
  private leftAt: number[] = [Infinity, Infinity, Infinity, Infinity];
  private rollbackFrom = Infinity;
  private remoteHash = new Map<number, Map<string, number>>();
  private myHash = new Map<number, number>();
  private lastHashed = 0;
  private stallSince = 0;
  private unsub: () => void;
  private sentZeroes = false;
  rollbacks = 0;
  maxRollback = 0;
  desyncs = 0;
  waitingFor = '';
  ended = false;
  /** Connection lost: the match continues offline against CPUs. */
  offline = false;

  constructor(public conn: Connection, public start: StartInfo, public locals: Map<number, string>, delay: number) {
    const cfg = start.cfg;
    this.match = { cfg, level: getLevel(cfg.level, cfg.mode ?? 'classic') };
    this.state = createGame(this.match);
    this.owners = start.owners;
    this.names = cfg.slots.map((s) => s.name);
    this.delay = delay;
    for (let i = 0; i < RING; i++) {
      this.inp.push([0, 0, 0, 0]);
      this.used.push([0, 0, 0, 0]);
      this.recv.push([-1, -1, -1, -1]);
    }
    this.owners.forEach((o, slot) => {
      if (!o) return;
      if (o === conn.id) this.mySlots.push(slot);
      else {
        const list = this.peerSlots.get(o) ?? [];
        list.push(slot);
        this.peerSlots.set(o, list);
        this.confirmed[slot] = 0;
      }
    });
    this.snaps[0] = cloneState(this.state);
    this.unsub = conn.on((m) => this.onMessage(m));
  }

  private onMessage(m: ServerMsg) {
    switch (m.t) {
      case 'i': {
        const slots = this.peerSlots.get(m.p);
        if (!slots) return;
        const f = m.f;
        if (f <= 0) return;
        slots.forEach((slot, k) => {
          // Inputs from a peer that left still count up to its last frame
          // (they may arrive after the peer-left notice).
          if (f <= this.confirmed[slot] || f > this.leftAt[slot]) return;
          if (f - this.confirmed[slot] >= RING - 8) return; // absurdly far ahead
          this.inp[f % RING][slot] = (m.d[k] ?? 0) & 255;
          this.recv[f % RING][slot] = f;
          // Confirm contiguous frames only (robust to reordering).
          let c = this.confirmed[slot];
          while (this.recv[(c + 1) % RING][slot] === c + 1) {
            c++;
            if (c <= this.current && this.used[c % RING][slot] !== this.inp[c % RING][slot]) {
              this.rollbackFrom = Math.min(this.rollbackFrom, c);
            }
          }
          this.confirmed[slot] = c >= this.leftAt[slot] ? Infinity : c;
        });
        return;
      }
      case 'error': {
        // Lost the server (or we were dropped): keep playing, everyone else
        // becomes a CPU from the last frame we know.
        if (m.code !== 'closed' && m.code !== 'dropped') return;
        this.offline = true;
        for (const [peer, slots] of [...this.peerSlots]) {
          // Nothing more will arrive: everything after what we have is a CPU.
          const have = Math.min(...slots.map((x) => this.confirmed[x]));
          if (Number.isFinite(have)) this.onMessage({ t: 'peer-left', p: peer, lastFrame: have });
          else for (const x of slots) if (this.leftAt[x] !== Infinity) this.confirmed[x] = Infinity;
        }
        return;
      }
      case 'peer-left': {
        const slots = this.peerSlots.get(m.p);
        if (!slots || this.leftAt[slots[0]] !== Infinity) return;
        const last = Math.max(m.lastFrame, 0);
        for (const slot of slots) {
          this.leftAt[slot] = last;
          // After its last frame a CPU drives the knight on every peer.
          for (let g = last + 1; g <= this.current + RING / 2; g++) this.inp[g % RING][slot] = INPUT_DISCONNECTED;
          for (let g = last + 1; g <= this.current; g++) {
            if (this.used[g % RING][slot] !== INPUT_DISCONNECTED) {
              this.rollbackFrom = Math.min(this.rollbackFrom, g);
              break;
            }
          }
          // Still waiting for late inputs up to `last`? Otherwise fully known.
          if (this.confirmed[slot] >= last) this.confirmed[slot] = Infinity;
        }
        return;
      }
      case 'h': {
        let map = this.remoteHash.get(m.f);
        if (!map) this.remoteHash.set(m.f, (map = new Map()));
        map.set(m.p, m.h);
        this.checkHash(m.f);
        return;
      }
      case 'needsync': {
        // Host: send our latest confirmed state to the peer that desynced. A
        // rollback may still be pending (inputs arrived since the last update),
        // so only frames before it are final.
        const f = Math.min(this.lastConfirmedFrame(), this.rollbackFrom - 1);
        const snap = this.snaps[f % RING];
        if (snap && snap.frame === f) this.conn.send({ t: 'sync', to: m.p, f, s: JSON.stringify(snap) });
        return;
      }
      case 'sync': {
        let s: GameState;
        try {
          s = JSON.parse(m.s);
        } catch {
          return;
        }
        if (!s || !Array.isArray(s.players) || typeof s.frame !== 'number' || s.frame !== m.f) return;
        if (m.f >= this.current) {
          this.state = s;
          this.current = m.f;
          this.snaps[m.f % RING] = cloneState(s);
        } else if (this.current - m.f < RING - 2) {
          this.snaps[m.f % RING] = s;
          this.rollbackFrom = Math.min(this.rollbackFrom, m.f + 1);
        }
        this.myHash.clear();
        return;
      }
    }
  }

  private lastConfirmedFrame(): number {
    let min = this.current;
    for (let s = 0; s < 4; s++) if (this.confirmed[s] < min) min = this.confirmed[s];
    return min;
  }

  private checkHash(f: number) {
    const mine = this.myHash.get(f);
    const theirs = this.remoteHash.get(f);
    if (mine === undefined || !theirs) return;
    const host = this.conn.room?.host;
    for (const [peer, h] of theirs) {
      if (h !== mine) {
        this.desyncs++;
        console.warn(`desync at frame ${f} with ${peer}`);
        // Only adopt the host's state (the host is the reference).
        if (peer === host && host !== this.conn.id) this.conn.send({ t: 'needsync', f });
      }
    }
    this.remoteHash.delete(f);
  }

  private inputsFor(f: number): number[] {
    const out = [0, 0, 0, 0];
    const row = this.inp[f % RING];
    for (let slot = 0; slot < 4; slot++) {
      const owner = this.owners[slot];
      if (!owner) continue;
      if (owner === this.conn.id) out[slot] = row[slot];
      else if (f > this.leftAt[slot]) out[slot] = INPUT_DISCONNECTED;
      else if (f <= this.confirmed[slot]) out[slot] = row[slot];
      else out[slot] = this.confirmed[slot] > 0 ? this.inp[this.confirmed[slot] % RING][slot] : 0; // prediction
    }
    return out;
  }

  private simulate(f: number, events: GameEvent[] | null) {
    const ins = this.inputsFor(f);
    const u = this.used[f % RING];
    for (let i = 0; i < 4; i++) u[i] = ins[i];
    step(this.match, this.state, ins);
    this.snaps[f % RING] = cloneState(this.state);
    if (events) for (const e of this.state.events) events.push(e);
  }

  private offlineBase = 0;
  private offlineFrame = 0;
  targetFrame(): number {
    if (this.offline) {
      // Without the server clock, just run in real time from here.
      if (!this.offlineBase) {
        this.offlineBase = performance.now();
        this.offlineFrame = this.current;
      }
      return this.offlineFrame + Math.floor((performance.now() - this.offlineBase) / FRAME_MS);
    }
    return Math.floor((this.conn.serverNow() - this.start.startAt) / FRAME_MS);
  }

  /** The match is over and its slow-motion finished: nothing left to simulate. */
  private finished(): boolean {
    const st = this.state;
    return st.phase === Phase.End && st.slowmo === 0 && st.phaseTimer > 90;
  }

  update(_now: number): GameEvent[] {
    const events: GameEvent[] = [];
    if (!this.sentZeroes) {
      // Frames 1..delay have no local input yet: announce zeroes.
      this.sentZeroes = true;
      for (let f = 1; f <= this.delay; f++) this.conn.send({ t: 'i', f, d: this.mySlots.map(() => 0) });
    }

    // ---- rollback
    if (this.rollbackFrom <= this.current) {
      const from = Math.max(1, this.rollbackFrom);
      const base = this.snaps[(from - 1) % RING];
      if (base && base.frame === from - 1) {
        const depth = this.current - from + 1;
        this.rollbacks++;
        this.maxRollback = Math.max(this.maxRollback, depth);
        this.state = cloneState(base);
        for (let f = from; f <= this.current; f++) this.simulate(f, events);
      }
    }
    this.rollbackFrom = Infinity;
    // Results reached (190+ frames after the final KO, far beyond the
    // 10-frame prediction window, so it is confirmed): stop simulating and
    // sending inputs.
    if (this.finished()) return events;

    // ---- advance to the server clock
    const target = this.targetFrame();
    let steps = 0;
    this.waitingFor = '';
    while (this.current < target && steps < 12 && !this.finished()) {
      const minConf = this.lastConfirmedFrame();
      if (this.current + 1 > minConf + MAX_PREDICTION) {
        if (!this.stallSince) this.stallSince = performance.now();
        if (performance.now() - this.stallSince > 300) this.waitingFor = this.slowestPeerName();
        break;
      }
      this.stallSince = 0;
      const f = this.current + 1;
      // Sample local devices for frame f + delay.
      const tf = f + this.delay;
      const d: number[] = [];
      for (const slot of this.mySlots) {
        const dev = this.locals.get(slot);
        const b = dev ? input.device(dev)?.buttons ?? 0 : 0;
        this.inp[tf % RING][slot] = b;
        d.push(b);
      }
      if (this.mySlots.length) this.conn.send({ t: 'i', f: tf, d });
      this.simulate(f, events);
      this.current = f;
      steps++;
    }
    if (target - this.current > 60 && steps === 12) {
      // Far behind (tab was in the background): the stall guard above keeps
      // us from running ahead of the others, so just keep catching up.
    }

    // ---- desync detection on confirmed frames
    const conf = Math.min(this.lastConfirmedFrame(), this.current);
    for (let f = Math.ceil((this.lastHashed + 1) / HASH_EVERY) * HASH_EVERY; f <= conf; f += HASH_EVERY) {
      const snap = this.snaps[f % RING];
      if (!snap || snap.frame !== f) continue;
      const h = checksum(snap);
      this.myHash.set(f, h);
      this.conn.send({ t: 'h', f, h });
      this.checkHash(f);
      this.lastHashed = f;
    }
    if (this.myHash.size > 64) {
      for (const k of this.myHash.keys()) if (k < conf - HASH_EVERY * 30) this.myHash.delete(k);
    }
    return events;
  }

  private slowestPeerName(): string {
    let worst = '';
    let wf = Infinity;
    for (const [peer, slots] of this.peerSlots) {
      const c = this.confirmed[slots[0]];
      if (!Number.isFinite(c)) continue;
      if (c < wf) {
        wf = c;
        worst = this.conn.room?.peers.find((p) => p.id === peer)?.name ?? 'opponent';
      }
    }
    return worst;
  }

  ping(): number[] {
    const out = [-1, -1, -1, -1];
    const peers = this.conn.room?.peers ?? [];
    this.owners.forEach((o, slot) => {
      if (!o || o === this.conn.id) return;
      out[slot] = peers.find((p) => p.id === o)?.ping ?? -1;
    });
    return out;
  }

  status(): string | undefined {
    if (this.offline) return 'Connection lost - playing on vs CPUs';
    if (this.current <= 0) return 'Get ready...';
    if (this.waitingFor) return `Waiting for ${this.waitingFor}...`;
    return undefined;
  }

  dispose() {
    this.unsub();
  }
}
