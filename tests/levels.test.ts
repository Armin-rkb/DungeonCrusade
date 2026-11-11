import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS } from '../src/shared/levels';
import { checksum, cloneState, createGame, step, type Match } from '../src/shared/sim';
import { Phase, type MatchConfig } from '../src/shared/types';
import { T } from '../src/shared/tuning';

function botMatch(level: MatchConfig['level'], seed: number): Match {
  const cfg: MatchConfig = {
    level, seed, targetScore: 5, timeLimit: 0, teams: false, items: true,
    slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: 1 + (k % 3), team: 0, name: `CPU${k}` })),
  };
  return { cfg, level: getLevel(level) };
}

describe('levels', () => {
  for (const info of LEVELS) {
    it(`${info.id}: loads with solids, spawns and pickup spots`, () => {
      const l = getLevel(info.id);
      expect(l.solids.length).toBeGreaterThan(5);
      expect(l.spawns.length).toBe(4);
      expect(l.pickupSpawns.length).toBeGreaterThan(0);
      expect(l.data.layers.length).toBeGreaterThan(30);
    });

    it(`${info.id}: CPUs play a full match without leaving the arena`, () => {
      const m = botMatch(info.id, 99 + info.id.length);
      const s = createGame(m);
      const v = m.level.view;
      let kos = 0;
      let picks = 0;
      let maxFrames = 60 * 60 * 6;
      while (s.phase !== Phase.End && maxFrames-- > 0) {
        step(m, s, [0, 0, 0, 0]);
        for (const e of s.events) {
          if (e.t === 'ko') kos++;
          if (e.t === 'pickup' || e.t === 'armor') picks++;
        }
        for (const p of s.players) {
          if (!p.alive) continue;
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          expect(p.x).toBeGreaterThan(v.x - 2);
          expect(p.x).toBeLessThan(v.x + v.w + 2);
          expect(p.y).toBeGreaterThan(m.level.killY - 1);
          expect(p.y + T.height).toBeLessThan(v.y + v.h + 6);
        }
      }
      expect(kos).toBeGreaterThanOrEqual(5);
      expect(picks).toBeGreaterThan(0);
      expect(s.phase).toBe(Phase.End);
    });
  }

  it('simulation + snapshot cost stays well inside a frame budget', () => {
    const m = botMatch('dragon', 7);
    const s = createGame(m);
    for (let i = 0; i < 600; i++) step(m, s, [0, 0, 0, 0]);
    const t0 = performance.now();
    let copy = s;
    for (let i = 0; i < 600; i++) {
      step(m, s, [0, 0, 0, 0]);
      copy = cloneState(s);
    }
    const perFrame = (performance.now() - t0) / 600;
    expect(checksum(copy)).toBe(checksum(s));
    // Rollback re-simulates up to ~10 frames at once: must be cheap.
    expect(perFrame).toBeLessThan(1.5);
  });

  it('nuking the Dragon temple destroys it and wakes the dragon', () => {
    const m = botMatch('dragon', 3);
    m.cfg.slots.forEach((sl) => (sl.bot = 0));
    const s = createGame(m);
    for (let i = 0; i < 200; i++) step(m, s, [0, 0, 0, 0]);
    // Place a ticking nuke in the temple.
    s.projs.push({ id: 999, kind: 8, owner: 0, team: 0, x: 0, y: -2, vx: 0, vy: 0, age: 50, life: 1, bounces: 0, dead: false, p: 1, q: 0 });
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 12; i++) {
      step(m, s, [0, 0, 0, 0]);
      for (const e of s.events) seen.add(e.t);
    }
    expect(s.groupsGone).toContain('temple');
    expect(seen.has('temple')).toBe(true);
    expect(seen.has('dragon-wake')).toBe(true);
    expect(seen.has('dragon-swoop')).toBe(true);
  });
});
