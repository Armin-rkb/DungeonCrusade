// Regression tests for bugs found in the code review.
import { describe, expect, it } from 'vitest';
import { RoomManager } from '../server/rooms';
import { BTN_ATTACK, BTN_SWING } from '../src/shared/input';
import { getLevel } from '../src/shared/levels';
import { PROTOCOL_VERSION, type ServerMsg } from '../src/shared/protocol';
import { createGame, step, type Match } from '../src/shared/sim';
import { CR, T } from '../src/shared/tuning';
import { Phase, type GameState, type LevelId, type MatchConfig, type Projectile } from '../src/shared/types';
import { W, WEAPONS } from '../src/shared/weapons';

const VALID_CFG = { level: 'dungeon', seed: 1, targetScore: 5, timeLimit: 0, teams: false, items: true, slots: [0, 1, 2, 3].map((k) => ({ active: k < 2, knight: k, bot: 0, team: 0, name: '' })) } as const;

function match(level: LevelId, mode: 'classic' | 'crusade', over: Partial<MatchConfig> = {}, active = [true, true, false, false]): Match {
  const cfg: MatchConfig = {
    level, mode, seed: 99, targetScore: 5, timeLimit: 0, teams: false, items: false,
    slots: [0, 1, 2, 3].map((k) => ({ active: active[k], knight: k, bot: 0, team: k % 2, name: `P${k}` })),
    ...over,
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

function proj(s: GameState, kind: W, owner: number, x: number, y: number, vx: number, vy = 0, extra: Partial<Projectile> = {}): Projectile {
  const pr: Projectile = { id: s.nextId++, kind, owner, team: owner, x, y, vx, vy, age: 5, life: WEAPONS[kind].life, bounces: 0, dead: false, p: 0, q: 0, refl: 0, ...extra };
  s.projs.push(pr);
  return pr;
}

describe('regressions', () => {
  it('the dragon hits a knight once per swoop, not every frame', () => {
    for (const mode of ['classic', 'crusade'] as const) {
      const m = match('dragon', mode);
      const s = fight(m);
      const p = s.players[0];
      p.invuln = 0;
      // Start a swoop passing through the middle of the arena, where P0 hovers.
      s.dragon.stage = 4;
      s.dragon.timer = 1;
      s.dragon.x = -1.2;
      let hits = 0;
      for (let i = 0; i < 40; i++) {
        p.x = 0;
        p.y = -2.9; // the swoop's lowest point is y = -2.5 at x = 0
        p.vx = 0;
        p.vy = 0;
        step(m, s, [0, 0, 0, 0]);
        for (const e of s.events) if (e.t === 'hit' && e.b === 0) hits++;
      }
      expect(hits, mode).toBe(1);
      expect(p.alive, mode).toBe(true);
    }
  });

  it('a resting bomb or duck does not chip walls or the temple every frame', () => {
    const m = match('dragon', 'crusade');
    const s = fight(m);
    const floor = m.level.solids.find((so) => so.group === 'temple' && so.oneway && so.w === 4 && so.h < 0.5)!;
    // A dud bomb sitting on the temple floor for its whole fuse.
    proj(s, W.Bomb, 0, floor.x + 1, floor.y + floor.h + 0.21, 0, 0, { life: 55, p: 0 });
    for (let i = 0; i < 50; i++) step(m, s, [0, 0, 0, 0]);
    expect(s.templeHp).toBe(CR.templeHp);
    expect(s.groupsGone).not.toContain('temple');

    const md = match('dungeon', 'crusade');
    const sd = fight(md);
    const wall = md.level.solids.find((so) => so.breakable >= 0 && so.x === -5.5 && so.h === 3)!;
    proj(sd, W.Duck, 0, wall.x + 0.5, wall.y + wall.h + 0.16, 0, 0, { life: 120 });
    for (let i = 0; i < 100; i++) step(md, sd, [0, 0, 0, 0]);
    expect(sd.destroyed[wall.breakable]).toBe(0);
    expect(sd.tileHp[wall.breakable]).toBe(CR.tileHp);
  });

  it('sudden death is only won by one of the tied leaders', () => {
    for (const mode of ['classic', 'crusade'] as const) {
      const m = match('test', mode, { timeLimit: 1 }, [true, true, true, false]);
      const s = fight(m);
      s.players[0].score = 3;
      s.players[1].score = 3;
      s.players[2].score = 0;
      for (let i = 0; i < 70 && !s.suddenDeath; i++) step(m, s, [0, 0, 0, 0]);
      expect(s.suddenDeath, mode).toBe(true);
      // The trailing player KOs someone: not enough to win.
      const victim = s.players[0];
      victim.hp = 1;
      victim.invuln = 0;
      victim.x = 0; victim.y = -6;
      const shooter = s.players[2];
      shooter.x = -1.2; shooter.y = -6; shooter.face = 1; shooter.invuln = 0;
      proj(s, W.Shuriken, 2, -0.6, -5.6, 19);
      for (let i = 0; i < 30; i++) step(m, s, [0, 0, 0, 0]);
      expect(victim.alive, mode).toBe(false);
      expect(s.phase, mode).toBe(Phase.Play);
      // A leader scoring ends it.
      const v2 = s.players[2];
      v2.hp = 1; v2.invuln = 0; v2.x = 5; v2.y = -6;
      proj(s, W.Shuriken, 1, 4.2, -5.6, 19);
      for (let i = 0; i < 30; i++) step(m, s, [0, 0, 0, 0]);
      expect(s.phase, mode).toBe(Phase.End);
      expect(s.winner, mode).toBe(1);
    }
  });

  it('getting hit cancels your sword swing', () => {
    const m = match('test', 'crusade');
    const s = fight(m);
    const p = s.players[0];
    p.x = 0; p.y = -6; p.face = 1; p.invuln = 0;
    step(m, s, [BTN_SWING, 0, 0, 0]);
    expect(p.swing).toBeGreaterThan(0);
    proj(s, W.Hadouken, 1, -0.6, -5.6, 7); // from behind, cannot be parried
    for (let i = 0; i < 3; i++) step(m, s, [0, 0, 0, 0]);
    expect(p.hp).toBeLessThan(T.maxHp);
    expect(p.swing).toBe(0);
  });

  it('Bouncy keeps its extra air jump after stomps and respawns', () => {
    const m = match('test', 'crusade', {}, [true, true, true, false]);
    const s = fight(m);
    const green = s.players[2]; // knight 2 = Bouncy
    const other = s.players[1];
    other.x = 0; other.y = -6; other.invuln = 5;
    green.x = 0; green.y = -6 + T.height + 0.1; green.vy = -3; green.invuln = 0;
    step(m, s, [0, 0, 0, 0]);
    expect(green.vy).toBeGreaterThan(5); // bounced
    expect(green.jumps).toBe(2);
  });

  it('a head-stomp under a low ceiling does not push the stomper into it', () => {
    const m = match('test', 'classic');
    const s = fight(m);
    const ceiling = m.level.solids.find((so) => so.y === 0.5)!; // the top platform, bottom at y=0.5
    const [a, b] = s.players;
    b.x = 0; b.y = -0.9; b.vy = 0; b.invuln = 0; // head at -0.1
    a.x = 0; a.y = -0.31; a.vy = -3; a.invuln = 0; // falling onto the head, top just under the ceiling
    step(m, s, [0, 0, 0, 0]);
    expect(a.y + T.height).toBeLessThanOrEqual(ceiling.y + 0.001);
  });

  it('two identical hits in one frame both reach the effects layer', () => {
    const m = match('test', 'classic');
    const s = fight(m);
    const v = s.players[1];
    v.x = 0; v.y = -6; v.invuln = 0;
    proj(s, W.Stone, 0, -0.5, -5.6, 14);
    proj(s, W.Stone, 0, -0.5, -5.55, 14);
    const keys = new Set<string>();
    let hits = 0;
    for (let i = 0; i < 5; i++) {
      step(m, s, [0, 0, 0, 0]);
      for (const e of s.events) if (e.t === 'hit') { hits++; keys.add(e.k); }
    }
    expect(hits).toBe(2);
    expect(keys.size).toBe(2);
  });

  it('classic swing button still throws and attack is unaffected', () => {
    const m = match('test', 'classic');
    const s = fight(m);
    step(m, s, [BTN_ATTACK, 0, 0, 0]);
    expect(s.players[0].shots).toBe(1);
  });
});

describe('server regressions', () => {
  function setup() {
    const rm = new RoomManager();
    const boxes = new Map<object, ServerMsg[]>();
    const join = (name: string) => {
      const box: ServerMsg[] = [];
      const c = rm.connect((msg) => box.push(msg));
      boxes.set(c, box);
      rm.handle(c, { t: 'hello', v: PROTOCOL_VERSION, name, platform: 'web' });
      return { c, box };
    };
    return { rm, join };
  }

  it('people who join a room mid-match are not idle-dropped', () => {
    const { rm, join } = setup();
    let now = 1000;
    rm.now = () => now;
    const a = join('A');
    rm.handle(a.c, { t: 'create', public: false, players: [{ name: 'A', knight: 0 }] });
    const code = a.c.room!.code;
    const b = join('B');
    rm.handle(b.c, { t: 'join', code, players: [{ name: 'B', knight: 1 }] });
    rm.handle(a.c, { t: 'start', cfg: VALID_CFG, owners: [a.c.id, b.c.id, null, null] });
    now += 3000;
    const late = join('Late');
    rm.handle(late.c, { t: 'join', code, players: [{ name: 'L', knight: 2 }] });
    for (let i = 0; i < 20; i++) {
      now += 1000;
      rm.handle(a.c, { t: 'i', f: 60 * i + 1, d: [0] });
      rm.handle(b.c, { t: 'i', f: 60 * i + 1, d: [0] });
      rm.tick();
    }
    expect(late.box.some((msg) => msg.t === 'error' && msg.code === 'dropped')).toBe(false);
    expect(a.c.room!.phase).toBe('game');
  });

  it('survives malformed and hostile messages', () => {
    const { rm, join } = setup();
    const a = join('A');
    const bad: unknown[] = [
      null, 42, 'str', [], { t: 'nope' }, { t: 'create' }, { t: 'create', players: 'x' }, { t: 'join', code: { a: 1 } },
      { t: 'join', code: null }, { t: 'players', players: [null, 1, { knight: 'x' }] }, { t: 'settings' },
      { t: 'settings', settings: null }, { t: 'start', cfg: null, owners: null }, { t: 'i', f: 'x', d: 'y' },
      { t: 'i', f: 1, d: [1e9, -5, 'z'] }, { t: 'h' }, { t: 'sync', to: null }, { t: 'needsync' }, { t: 'ping', c: 'x', rtt: 'NaN' },
      { t: 'leave' }, { t: 'quick', players: null }, { t: 'end' },
    ];
    for (const m of bad) expect(() => rm.handle(a.c, m)).not.toThrow();
  });
});
