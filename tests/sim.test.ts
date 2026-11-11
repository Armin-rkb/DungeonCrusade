import { describe, expect, it } from 'vitest';
import { BTN_ATTACK, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_UP } from '../src/shared/input';
import { getLevel } from '../src/shared/levels';
import { checksum, cloneState, createGame, step, type Match } from '../src/shared/sim';
import { Phase, type MatchConfig } from '../src/shared/types';
import { hashString } from '../src/shared/rng';

function cfg(over: Partial<MatchConfig> = {}): MatchConfig {
  return {
    level: 'test', seed: 1234, targetScore: 5, timeLimit: 0, teams: false, items: true,
    slots: [
      { active: true, knight: 0, bot: 0, team: 0, name: 'P1' },
      { active: true, knight: 1, bot: 0, team: 1, name: 'P2' },
      { active: true, knight: 2, bot: 3, team: 0, name: 'CPU3' },
      { active: true, knight: 3, bot: 2, team: 1, name: 'CPU4' },
    ],
    ...over,
  };
}

function match(c = cfg()): Match {
  return { cfg: c, level: getLevel(c.level) };
}

/** Pseudo random but reproducible human inputs. */
function scriptedInputs(frame: number): number[] {
  const out = [0, 0, 0, 0];
  for (let i = 0; i < 2; i++) {
    const h = hashString(`${i}:${Math.floor(frame / 7)}`);
    let b = 0;
    if (h & 1) b |= BTN_LEFT; else if (h & 2) b |= BTN_RIGHT;
    if ((h >> 3) % 5 === 0) b |= BTN_JUMP;
    if ((h >> 6) % 3 === 0) b |= BTN_ATTACK;
    if ((h >> 9) % 7 === 0) b |= BTN_UP;
    out[i] = b;
  }
  return out;
}

describe('simulation', () => {
  it('is deterministic for identical inputs', () => {
    const m = match();
    const a = createGame(m);
    const b = createGame(m);
    for (let f = 0; f < 3600; f++) {
      const inp = scriptedInputs(f);
      step(m, a, inp);
      step(m, b, inp);
    }
    expect(checksum(a)).toBe(checksum(b));
    expect(a.frame).toBe(3600);
  });

  it('produces identical results after snapshot/restore (rollback)', () => {
    const m = match();
    const live = createGame(m);
    const history: ReturnType<typeof cloneState>[] = [];
    for (let f = 0; f < 1500; f++) {
      history.push(cloneState(live));
      step(m, live, scriptedInputs(f));
    }
    // Roll back 9 frames and re-simulate.
    const re = cloneState(history[1491]);
    for (let f = 1491; f < 1500; f++) step(m, re, scriptedInputs(f));
    expect(checksum(re)).toBe(checksum(live));
  });

  it('counts down, then lets players fight to a winner', () => {
    const m = match(cfg({ targetScore: 3, slots: cfg().slots.map((s) => ({ ...s, bot: 3 })) }));
    const s = createGame(m);
    expect(s.phase).toBe(Phase.Countdown);
    let shots = 0;
    let hits = 0;
    for (let f = 0; f < 60 * 60 * 4 && s.phase !== Phase.End; f++) {
      step(m, s, [0, 0, 0, 0]);
      for (const e of s.events) {
        if (e.t === 'shoot') shots++;
        if (e.t === 'hit') hits++;
      }
    }
    expect(shots).toBeGreaterThan(20);
    expect(hits).toBeGreaterThan(5);
    expect(s.phase).toBe(Phase.End);
    expect(s.winner).toBeGreaterThanOrEqual(0);
    expect(s.players[s.winner].score).toBeGreaterThanOrEqual(3);
  });

  it('player jumps, lands and walks', () => {
    const m = match(cfg({ items: false, slots: cfg().slots.map((s, i) => ({ ...s, bot: 0, active: i < 2 })) }));
    const s = createGame(m);
    for (let f = 0; f < 200; f++) step(m, s, [0, 0, 0, 0]);
    const p = s.players[0];
    expect(p.ground).toBe(true);
    const y0 = p.y;
    let maxY = y0;
    for (let f = 0; f < 40; f++) {
      step(m, s, [BTN_JUMP, 0, 0, 0]);
      maxY = Math.max(maxY, p.y);
    }
    expect(maxY - y0).toBeGreaterThan(2);
    for (let f = 0; f < 80; f++) step(m, s, [0, 0, 0, 0]);
    expect(p.ground).toBe(true);
    const x0 = p.x;
    for (let f = 0; f < 30; f++) step(m, s, [BTN_RIGHT, 0, 0, 0]);
    expect(p.x - x0).toBeGreaterThan(2.5);
  });
});
