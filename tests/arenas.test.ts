// The arenas designed for v2 and their mechanics: wrap-around shafts, the
// tide, ring-outs, gusts of wind and the closed-arena bounds.
import { describe, expect, it } from 'vitest';
import { LEVELS as SERVER_LEVELS } from '../server/rooms';
import { BTN_ATTACK, BTN_RIGHT } from '../src/shared/input';
import { getLevel, LEVELS } from '../src/shared/levels';
import { HIGH_TIDE, OUBLIETTE, SKY_SHRINE, TWIN_KEEPS } from '../src/shared/levels/arenas';
import { createGame, step, tideDanger, tideLevel, type Match } from '../src/shared/sim';
import { T } from '../src/shared/tuning';
import { Phase, type GameState, type LevelId, type MatchConfig } from '../src/shared/types';
import { W } from '../src/shared/weapons';

function match(level: LevelId, mode: 'classic' | 'crusade' = 'classic', active = [true, true, false, false]): Match {
  const cfg: MatchConfig = {
    level, mode, seed: 7, targetScore: 50, timeLimit: 0, teams: false, items: true,
    slots: [0, 1, 2, 3].map((k) => ({ active: active[k], knight: k, bot: 0, team: k % 2, name: `P${k}` })),
  };
  return { cfg, level: getLevel(level, mode) };
}

function fight(m: Match): GameState {
  const s = createGame(m);
  s.phase = Phase.Play;
  s.phaseTimer = 0;
  for (let i = 0; i < 30; i++) step(m, s, [0, 0, 0, 0]);
  return s;
}

function events(m: Match, s: GameState, frames: number, inputs = [0, 0, 0, 0]): string[] {
  const seen: string[] = [];
  for (let i = 0; i < frames; i++) {
    step(m, s, inputs);
    for (const e of s.events) seen.push(e.t);
  }
  return seen;
}

const NEW: LevelId[] = ['oubliette', 'tide', 'shrine', 'keeps'];

describe('v2 arenas', () => {
  it('the relay server accepts exactly the stages the game offers', () => {
    expect([...SERVER_LEVELS].sort()).toEqual(LEVELS.map((l) => l.id).sort());
  });

  it('built from 25 x 14 maps with the view the HUD expects', () => {
    for (const d of [OUBLIETTE, HIGH_TIDE, SKY_SHRINE, TWIN_KEEPS]) {
      expect(d.view).toEqual({ x: -12.5, y: -7.5, w: 25, h: 14 });
      expect(d.spawns).toHaveLength(4);
      expect(d.pickupSpawns.length).toBeGreaterThanOrEqual(3);
    }
  });

  for (const id of NEW) {
    it(`${id}: every knight spawns standing on solid ground, clear of the HUD`, () => {
      const m = match(id, 'classic', [true, true, true, true]);
      const s = createGame(m);
      for (let i = 0; i < T.countdown + 5; i++) step(m, s, [0, 0, 0, 0]);
      for (const p of s.players) {
        expect(p.alive).toBe(true);
        expect(p.ground).toBe(true);
        expect(p.y + T.height).toBeLessThan(m.level.view.y + m.level.view.h - 1.5);
      }
    });
  }

  describe('Oubliette (wraps both ways)', () => {
    it('falling out of the floor drops you in from the ceiling', () => {
      const m = match('oubliette');
      const s = fight(m);
      const p = s.players[0];
      // Col 12 is the bottomless shaft between the split ledges.
      p.x = 0;
      p.y = m.level.view.y + 0.05;
      p.vy = -10;
      p.ground = false;
      step(m, s, [0, 0, 0, 0]);
      expect(p.alive).toBe(true);
      expect(p.y).toBeGreaterThan(m.level.view.y + m.level.view.h - 1);
    });

    it('jumping out of the top under a ledge bonks its underside instead of getting stuck in it', () => {
      const m = match('oubliette');
      const s = fight(m);
      const p = s.players[0];
      const v = m.level.view;
      // Right under the bottom-right ledge (row 12, cols 19-23) once wrapped.
      p.x = 9;
      p.y = v.y + v.h - 0.05;
      p.vy = 20;
      p.ground = false;
      step(m, s, [0, 0, 0, 0]);
      for (const so of m.level.solids) {
        if (so.oneway) continue;
        const ox = Math.min(p.x + T.halfW, so.x + so.w) - Math.max(p.x - T.halfW, so.x);
        const oy = Math.min(p.y + T.height, so.y + so.h) - Math.max(p.y, so.y);
        expect(ox > 0.01 && oy > 0.01).toBe(false);
      }
      expect(p.vy).toBeLessThanOrEqual(0);
    });

    it('shots loop around too', () => {
      const m = match('oubliette');
      const s = fight(m);
      s.projs.push({ id: 900, kind: W.Shuriken, owner: 0, team: 0, x: 0, y: m.level.view.y + 0.1, vx: 0, vy: -18, age: 0, life: 90, bounces: 0, dead: false, p: 0, q: 0, refl: 0 });
      step(m, s, [0, 0, 0, 0]);
      const pr = s.projs.find((q) => q.id === 900);
      expect(pr).toBeDefined();
      expect(pr!.y).toBeGreaterThan(m.level.view.y + m.level.view.h - 1);
    });
  });

  describe('High Tide', () => {
    it('the sea follows its cycle: calm, warning, rise, flood, ebb', () => {
      const m = match('tide');
      const t = m.level.features.tide!;
      const s = createGame(m);
      const at = (clock: number) => { s.clock = clock; return tideLevel(m, s); };
      expect(at(0)).toBe(t.low);
      expect(at(t.calm - t.warn - 1)).toBe(t.low);
      s.clock = t.calm - t.warn;
      expect(tideDanger(m, s)).toBe(true);
      expect(at(t.calm + t.rise / 2)).toBeCloseTo((t.low + t.high) / 2, 6);
      expect(at(t.calm + t.rise + 10)).toBe(t.high);
      expect(at(t.calm + t.rise + t.flood + t.ebb / 2)).toBeCloseTo((t.low + t.high) / 2, 6);
      expect(at(t.calm + t.rise + t.flood + t.ebb)).toBe(t.low);
    });

    it('the high tide leaves the middle piers dry and floods the sand and the low piers', () => {
      const m = match('tide');
      const t = m.level.features.tide!;
      const tops = m.level.solids.map((so) => so.y + so.h);
      expect(tops.some((y) => y + T.height / 2 < t.high)).toBe(true); // sand + low piers drown
      expect(tops.filter((y) => y > t.high + 1).length).toBeGreaterThanOrEqual(5); // piers above stay safe
    });

    it('announces the flood, then drowns whoever is left on the sand (credited to the last hitter)', () => {
      const m = match('tide');
      const t = m.level.features.tide!;
      const s = fight(m);
      const [a, b] = s.players;
      b.x = 0; b.y = -6.5; b.vy = 0; b.lastHitBy = 0; b.lastHitFrame = s.frame;
      s.clock = t.calm - t.warn - 1;
      const seen = events(m, s, t.warn + 2);
      expect(seen).toContain('tide-warn');
      expect(seen).toContain('tide-rise');
      b.lastHitFrame = s.frame;
      const later = events(m, s, t.rise);
      expect(later).toContain('drown');
      expect(b.deaths).toBe(1);
      expect(a.kos).toBe(1);
    });

    it('never respawns anyone into the flood', () => {
      const m = match('tide', 'classic', [true, true, true, true]);
      const t = m.level.features.tide!;
      const s = fight(m);
      s.clock = t.calm + t.rise + 20;
      const p = s.players[3];
      p.alive = false;
      p.respawn = 1;
      // Respawn many times: every pick must be above the high-water mark.
      for (let i = 0; i < 20; i++) {
        p.alive = false;
        p.respawn = 1;
        // (KO freezes from the others drowning can delay it a few frames.)
        for (let k = 0; k < 40 && !p.alive; k++) step(m, s, [0, 0, 0, 0]);
        expect(p.alive).toBe(true);
        expect(p.y).toBeGreaterThan(t.high + 0.5);
      }
    });

    it('chests and shots that hit the water are swallowed', () => {
      const m = match('tide');
      const t = m.level.features.tide!;
      const s = fight(m);
      s.clock = t.calm + t.rise + 20;
      s.pickups.push({ id: 800, kind: 'weapon', x: 0, y: -4.5, vy: 0, ground: false, age: 0, opened: 0, weapon: 0 });
      s.projs.push({ id: 801, kind: W.Stone, owner: 0, team: 0, x: 3, y: -3.9, vx: 0, vy: -5, age: 0, life: 120, bounces: 0, dead: false, p: 0, q: 0, refl: 0 });
      const seen = events(m, s, 10);
      expect(seen).toContain('splash');
      expect(s.projs.find((q) => q.id === 801)).toBeUndefined();
      expect(s.pickups.find((c) => c.id === 800)?.opened ?? 999).toBeGreaterThan(0);
    });
  });

  describe('Sky Shrine', () => {
    it('flying off the side is a ring-out credited to the last hitter', () => {
      const m = match('shrine');
      const s = fight(m);
      const [a, b] = s.players;
      b.x = m.level.view.x + m.level.view.w + 0.9;
      b.y = 0;
      b.vx = 12;
      b.lastHitBy = 0;
      b.lastHitFrame = s.frame;
      const seen = events(m, s, 2);
      expect(seen).toContain('ringout');
      expect(b.alive).toBe(false);
      expect(a.kos).toBe(1);
    });

    it('gusts are announced, then push knights and bend shots, then calm down', () => {
      const m = match('shrine');
      const g = m.level.features.gusts!;
      const s = fight(m);
      s.windTimer = g.warn + 1;
      const seen = events(m, s, 3);
      expect(seen).toContain('gust-warn');
      const dir = s.windDir;
      expect(Math.abs(dir)).toBe(1);
      const more = events(m, s, g.warn);
      expect(more).toContain('gust');
      expect(s.wind).toBe(dir * g.speed);
      // An idle knight in the air drifts with the wind.
      const p = s.players[1];
      p.x = 0; p.y = 4; p.vx = 0; p.vy = 0; p.ground = false;
      const x0 = p.x;
      for (let i = 0; i < 20; i++) step(m, s, [0, 0, 0, 0]);
      expect((p.x - x0) * dir).toBeGreaterThan(0.3);
      // A shot thrown straight up is blown sideways.
      s.projs.push({ id: 700, kind: W.Stone, owner: 0, team: 0, x: 0, y: 2, vx: 0, vy: 8, age: 0, life: 120, bounces: 0, dead: false, p: 0, q: 0, refl: 0 });
      step(m, s, [0, 0, 0, 0]);
      step(m, s, [0, 0, 0, 0]);
      expect((s.projs.find((q) => q.id === 700)?.vx ?? 0) * dir).toBeGreaterThan(0);
      const calm = events(m, s, g.length + 5);
      expect(calm).toContain('gust-end');
      expect(s.wind).toBe(0);
    });

    it('a knight can walk against the wind', () => {
      const m = match('shrine');
      const g = m.level.features.gusts!;
      const s = fight(m);
      s.windTimer = 1;
      s.windDir = -1;
      step(m, s, [0, 0, 0, 0]);
      expect(s.wind).toBe(-g.speed);
      const p = s.players[0];
      const x0 = p.x;
      for (let i = 0; i < 30; i++) step(m, s, [BTN_RIGHT, 0, 0, 0]);
      expect(p.x).toBeGreaterThan(x0 + 1);
    });
  });

  describe('Twin Keeps', () => {
    it('the merlons are breakable: barrels smash them in Classic, any fire wears them down in Crusade', () => {
      for (const mode of ['classic', 'crusade'] as const) {
        const m = match('keeps', mode);
        expect(m.level.breakables).toBe(4);
        const s = fight(m);
        const merlon = m.level.solids.find((so) => so.breakable >= 0)!;
        const p = s.players[0];
        // Stand next to the merlon and throw at it (barrel in Classic, stones in Crusade).
        p.x = merlon.x - 1.2;
        p.y = merlon.y;
        p.face = 1;
        if (mode === 'classic') { p.weapon = W.Barrel; p.ammo = -1; }
        for (let i = 0; i < 600 && !s.destroyed[merlon.breakable]; i++) {
          p.x = merlon.x - 1.2;
          p.y = merlon.y;
          step(m, s, [i % 2 ? BTN_ATTACK | BTN_RIGHT : BTN_RIGHT, 0, 0, 0]);
        }
        expect(s.destroyed[merlon.breakable]).toBe(1);
      }
    });
  });

  it('regression: a barrel rolling along the floor smashes the Dungeon\'s cracked wall', () => {
    const m = match('dungeon');
    const s = fight(m);
    const wall = m.level.solids.find((so) => so.breakable >= 0 && so.x < 0)!;
    const p = s.players[0];
    p.weapon = W.Barrel;
    p.face = 1;
    for (let i = 0; i < 300 && !s.destroyed[wall.breakable]; i++) {
      p.x = wall.x - 1.2;
      p.y = wall.y;
      step(m, s, [i % 2 ? BTN_ATTACK | BTN_RIGHT : BTN_RIGHT, 0, 0, 0]);
    }
    expect(s.destroyed[wall.breakable]).toBe(1);
  });

  it('closed arenas: nobody escapes over the top of a side wall', () => {
    const m = match('dragon');
    const s = fight(m);
    const p = s.players[0];
    p.x = 12;
    p.y = 7;
    p.vx = 20;
    p.ground = false;
    for (let i = 0; i < 30; i++) step(m, s, [BTN_RIGHT, 0, 0, 0]);
    expect(p.x).toBeLessThanOrEqual(m.level.view.x + m.level.view.w + 0.2);
  });
});
