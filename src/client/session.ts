// A running match. LocalSession runs the simulation on this device (couch
// play, practice vs CPUs, attract mode). The online equivalent lives in
// net/online-session.ts and implements the same interface.

import { input } from './input/input';
import { getLevel } from '../shared/levels';
import { createGame, step, type Match } from '../shared/sim';
import { DT } from '../shared/tuning';
import type { GameEvent, GameState, MatchConfig } from '../shared/types';

export interface Session {
  kind: 'local' | 'online';
  match: Match;
  state: GameState;
  /** slot -> device id of players on this device. */
  locals: Map<number, string>;
  names: string[];
  paused: boolean;
  /** Advances the game to wall-clock `now` (ms) and returns new events. */
  update(now: number): GameEvent[];
  ping(): number[] | undefined;
  status(): string | undefined;
  dispose(): void;
}

export class LocalSession implements Session {
  kind = 'local' as const;
  match: Match;
  state: GameState;
  paused = false;
  private acc = 0;
  private last = 0;

  constructor(cfg: MatchConfig, public locals: Map<number, string>, public names: string[]) {
    this.match = { cfg, level: getLevel(cfg.level, cfg.mode ?? 'classic') };
    this.state = createGame(this.match);
  }

  update(now: number): GameEvent[] {
    if (!this.last) this.last = now;
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.paused) return [];
    this.acc += dt;
    const events: GameEvent[] = [];
    const inputs = [0, 0, 0, 0];
    let n = 0;
    while (this.acc >= DT && n < 8) {
      for (const [slot, dev] of this.locals) inputs[slot] = input.device(dev)?.buttons ?? 0;
      step(this.match, this.state, inputs);
      for (const e of this.state.events) events.push(e);
      this.acc -= DT;
      n++;
    }
    if (n === 8) this.acc = 0;
    return events;
  }

  ping() {
    return undefined;
  }

  status() {
    return undefined;
  }

  dispose() {}
}
