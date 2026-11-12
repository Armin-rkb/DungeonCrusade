import { describe, expect, it } from 'vitest';
import { BTN_ATTACK, BTN_SWING } from '../src/shared/input';
import { getLevel, LEVELS } from '../src/shared/levels';
import { checksum, cloneState, createGame, crownHolder, step, type Match } from '../src/shared/sim';
import { AMMO, CR, T } from '../src/shared/tuning';
import { Phase, type GameState, type LevelId, type MatchConfig, type Projectile } from '../src/shared/types';
import { W, WEAPONS } from '../src/shared/weapons';

function match(level: LevelId = 'test', over: Partial<MatchConfig> = {}, bots = [0, 0, 0, 0], active = [true, true, false, false]): Match {
  const cfg: MatchConfig = {
    level, mode: 'crusade', seed: 4242, targetScore: 10, timeLimit: 0, teams: false, items: false,
    slots: [0, 1, 2, 3].map((k) => ({ active: active[k], knight: k, bot: bots[k], team: k % 2, name: `P${k}` })),
    ...over,
  };
  return { cfg, level: getLevel(level, cfg.mode) };
}

/** A game already past the countdown. */
function fight(m: Match): GameState {
  const s = createGame(m);
  s.phase = Phase.Play;
  s.phaseTimer = 0;
  for (let i = 0; i < 30; i++) step(m, s, [0, 0, 0, 0]); // settle on the floor
  return s;
}

function proj(s: GameState, kind: W, owner: number, x: number, y: number, vx: number, vy = 0): Projectile {
  const pr: Projectile = { id: s.nextId++, kind, owner, team: owner, x, y, vx, vy, age: 5, life: WEAPONS[kind].life, bounces: 0, dead: false, p: 0, q: 0, refl: 0 };
  s.projs.push(pr);
  return pr;
}

function place(s: GameState, slot: number, x: number, y: number, face = 1) {
  const p = s.players[slot];
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
  p.face = face;
  p.invuln = 0;
}

describe('crusade mode', () => {
  it('stays deterministic and rollback-safe with CPUs on every stage', () => {
    for (const info of LEVELS) {
      const m = match(info.id, { items: true }, [3, 2, 3, 1], [true, true, true, true]);
      const a = createGame(m);
      const b = createGame(m);
      const snaps: GameState[] = [];
      for (let f = 0; f < 2400; f++) {
        snaps.push(cloneState(a));
        step(m, a, [0, 0, 0, 0]);
        step(m, b, [0, 0, 0, 0]);
      }
      expect(checksum(a)).toBe(checksum(b));
      const re = cloneState(snaps[2390]);
      for (let f = 2390; f < 2400; f++) step(m, re, [0, 0, 0, 0]);
      expect(checksum(re)).toBe(checksum(a));
    }
  });

  it('a timed swing parries a projectile back at its thrower', () => {
    const m = match();
    const s = fight(m);
    place(s, 0, 0, -6, 1);
    place(s, 1, 8, -6, -1);
    const pr = proj(s, W.Shuriken, 1, 2.2, -5.55, -19);
    step(m, s, [BTN_SWING, 0, 0, 0]);
    for (let i = 0; i < 6; i++) step(m, s, [0, 0, 0, 0]);
    expect(pr.owner).toBe(0);
    expect(pr.refl).toBe(1);
    expect(pr.vx).toBeGreaterThan(19);
    expect(s.players[0].hp).toBe(T.maxHp);
    expect(s.players[0].parries).toBe(1);
  });

  it('getting launched into a wall splats for bonus damage', () => {
    const m = match();
    const s = fight(m);
    place(s, 0, 10.0, -6, 1);
    place(s, 1, 10.9, -6, -1);
    let splats = 0;
    step(m, s, [BTN_SWING, 0, 0, 0]);
    for (let i = 0; i < 40; i++) {
      step(m, s, [0, 0, 0, 0]);
      for (const e of s.events) if (e.t === 'splat') splats++;
    }
    expect(splats).toBe(1);
    expect(s.players[1].hp).toBe(T.maxHp - CR.swingDamage - CR.splatDamage);
    expect(s.players[0].splats).toBe(1);
  });

  it('chest weapons come with ammo, then you are back to the stone', () => {
    const m = match('test', { items: true });
    const s = fight(m);
    place(s, 1, 0, -6, 1);
    s.pickups.push({ id: 900, kind: 'weapon', x: 0, y: -5.8, vy: 0, ground: true, age: 0, opened: 0, weapon: -1 });
    step(m, s, [0, 0, 0, 0]);
    const p = s.players[1];
    expect(p.weapon).not.toBe(W.Stone);
    const ammo = AMMO[p.weapon];
    expect(p.ammo).toBe(ammo);
    let shots = 0;
    for (let i = 0; i < 2000 && p.weapon !== W.Stone; i++) {
      const before = p.shots;
      step(m, s, [0, i % 2 ? BTN_ATTACK : 0, 0, 0]);
      shots += p.shots - before;
    }
    expect(shots).toBe(ammo);
    expect(p.weapon).toBe(W.Stone);
  });

  it('scores KO 2, assist 1, and +1 bounty on the crowned leader', () => {
    const m = match('test', {}, [0, 0, 0, 0], [true, true, true, false]);
    const s = fight(m);
    place(s, 0, 0, -6, 1);
    place(s, 1, 0.7, -6, -1);
    place(s, 2, -8, -6, 1);
    const v = s.players[1];
    v.hp = 1;
    v.dmgBy[2] = 2; // P2 softened them up earlier
    v.score = 4; // ...and they wear the crown
    expect(crownHolder(m, s)).toBe(1);
    step(m, s, [BTN_SWING, 0, 0, 0]);
    for (let i = 0; i < 10; i++) step(m, s, [0, 0, 0, 0]);
    expect(v.alive).toBe(false);
    expect(s.players[0].score).toBe(CR.koPoints + CR.bountyPoints);
    expect(s.players[2].score).toBe(CR.assistPoints);
    expect(s.players[2].assists).toBe(1);
  });

  it('a self-KO costs a point', () => {
    const m = match();
    const s = fight(m);
    const p = s.players[0];
    p.score = 2;
    p.y = m.level.killY - 0.5;
    step(m, s, [0, 0, 0, 0]);
    expect(p.alive).toBe(false);
    expect(p.score).toBe(2 - CR.selfKoPenalty);
  });

  it('the Dragon temple can be shot down, or collapses by itself', () => {
    const m = match('dragon');
    const s = fight(m);
    expect(s.templeHp).toBe(CR.templeHp);
    s.templeHp = 2;
    proj(s, W.Hadouken, 0, 6, -3, -7);
    for (let i = 0; i < 60; i++) step(m, s, [0, 0, 0, 0]);
    expect(s.groupsGone).toContain('temple');
    expect(s.dragon.stage).toBeGreaterThan(0);

    const s2 = fight(m);
    s2.clock = CR.templeAutoCollapse - 1;
    step(m, s2, [0, 0, 0, 0]);
    expect(s2.groupsGone).toContain('temple');
  });

  it('Dungeon walls crumble under fire in Crusade but not in Classic', () => {
    const classic = getLevel('dungeon', 'classic');
    const m = match('dungeon');
    expect(m.level.breakables).toBeGreaterThan(classic.breakables);
    const s = fight(m);
    const idx = m.level.solids.findIndex((so) => so.breakable >= 0 && so.x === 4.5 && so.h === 3);
    expect(idx).toBeGreaterThanOrEqual(0);
    const so = m.level.solids[idx];
    for (let k = 0; k < 2; k++) {
      proj(s, W.Pizza, 0, so.x + so.w + 1.2, so.y + 1.5, -11);
      for (let i = 0; i < 20; i++) step(m, s, [0, 0, 0, 0]);
    }
    expect(s.destroyed[so.breakable]).toBe(1);
  });

  it('the confetti dud shoves instead of doing nothing', () => {
    const m = match();
    const s = fight(m);
    place(s, 1, 1, -6, -1);
    const b = proj(s, W.Bomb, 0, 0.4, -5.6, 0);
    b.p = 0; // dud
    b.life = 1;
    step(m, s, [0, 0, 0, 0]);
    for (let i = 0; i < 4; i++) step(m, s, [0, 0, 0, 0]);
    expect(s.players[1].hp).toBe(T.maxHp);
    expect(Math.abs(s.players[1].vx)).toBeGreaterThan(3);
  });

  it('Classic is untouched: the swing button just throws', () => {
    const m = match('test', { mode: 'classic' });
    const s = fight(m);
    step(m, s, [BTN_SWING, 0, 0, 0]);
    expect(s.players[0].shots).toBe(1);
    expect(s.players[0].swing).toBe(0);
    expect(s.tileHp.length).toBe(0);
  });

  for (const info of LEVELS) {
    it(`${info.id}: CPUs finish a Crusade match using the new mechanics`, () => {
      const m = match(info.id, { items: true, targetScore: 10 }, [3, 2, 3, 2], [true, true, true, true]);
      const s = createGame(m);
      const seen = new Set<string>();
      for (let f = 0; f < 60 * 60 * 6 && s.phase !== Phase.End; f++) {
        step(m, s, [0, 0, 0, 0]);
        for (const e of s.events) seen.add(e.t);
      }
      expect(s.phase).toBe(Phase.End);
      expect(s.players[s.winner].score).toBeGreaterThanOrEqual(10);
      for (const t of ['swing', 'parry', 'points']) expect(seen.has(t), t).toBe(true);
    });
  }
});
