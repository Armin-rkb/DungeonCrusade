// Deterministic fixed-step game simulation (60 Hz).
//
// Rules of determinism (needed for rollback netcode across browsers, Electron,
// iOS and Android):
//  * only + - * / Math.sqrt Math.floor Math.round Math.abs Math.min Math.max
//    and integer ops on numbers (no Math.sin/cos/pow/random/Date in here),
//  * all randomness comes from the seeded PRNG stored in the state,
//  * iteration order is always array order.

import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_SWING, BTN_UP, MAX_PLAYERS } from './input';
import type { LevelRuntime, Solid } from './level';
import { rand, randInt } from './rng';
import {
  Phase,
  type Blast,
  type GameEvent,
  type GameState,
  type MatchConfig,
  type PlayerState,
  type Projectile,
} from './types';
import { BLASTS, W, WEAPONS, WEAPON_COUNT, type BlastKind } from './weapons';
import { botInput } from './bot';
import { crownHolder, isCrusade, teamOf } from './rules';
import { AMMO, CR, T, FPS, DT } from './tuning';

export { T, FPS, DT };

const EPS = 0.0005;
const C35 = 0.8191520442889918;
const S35 = 0.573576436351046;

export interface Match {
  cfg: MatchConfig;
  level: LevelRuntime;
}

/** Knight perk in Crusade: 0 lucky, 1 swift, 2 bouncy, 3 heavy (-1 in Classic). */
function perkOf(m: Match, slot: number): number {
  return isCrusade(m) ? m.cfg.slots[slot]?.knight ?? -1 : -1;
}

// ------------------------------------------------------------------ creation
function newPlayer(slot: number, active: boolean): PlayerState {
  return {
    slot, active, alive: false, respawn: 0,
    x: 0, y: 0, vx: 0, vy: 0, face: slot % 2 === 0 ? 1 : -1,
    ground: false, wall: 0, jumps: 0, coyote: 0, jumpBuf: 0, jumpHeld: false, drop: 0, wallLock: 0,
    hp: T.maxHp, weapon: W.Stone, cd: 0, cdMax: WEAPONS[W.Stone].cooldown, burst: 0, burstTimer: 0, burstAim: 0,
    stun: 0, hitstop: 0, invuln: 0, flash: 0, lastHitBy: -1, lastHitFrame: -9999,
    btn: 0, prevBtn: 0, act: 0, actTimer: 0, airTime: 0,
    swing: 0, swingCd: 0, swingHit: 0, ammo: -1, splatCd: 0, dmgBy: [0, 0, 0, 0], assists: 0, parries: 0, splats: 0,
    score: 0, kos: 0, deaths: 0, damageDealt: 0, shots: 0, hits: 0,
    ai: { target: -1, timer: 0, jumpHold: 0, dir: 0, reaction: 0, wantShoot: 0, stuck: 0, lastX: 0, idle: 0 },
  };
}

export function createGame(match: Match): GameState {
  const { cfg, level } = match;
  const s: GameState = {
    frame: 0,
    rng: (cfg.seed >>> 0) || 1,
    phase: Phase.Countdown,
    phaseTimer: T.countdown,
    freeze: 0,
    slowmo: 0,
    clock: 0,
    suddenDeath: false,
    players: [],
    projs: [],
    blasts: [],
    pickups: [],
    nextId: 1,
    chestTimer: 240,
    destroyed: new Array(level.breakables).fill(0),
    groupsGone: [],
    gull: { active: false, x: 0, y: 0, vx: 0, dropX: 0, dropped: false, timer: 600 },
    dragon: { stage: 0, timer: 0, x: 0, y: 0, by: -1, hitMask: 0 },
    armorCd: 0,
    tileHp: new Array(level.breakables).fill(CR.tileHp),
    templeHp: level.features.temple ? CR.templeHp : 0,
    winner: -1,
    winnerTeam: -1,
    events: [],
  };
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const sc = cfg.slots[i];
    const p = newPlayer(i, !!sc?.active);
    s.players.push(p);
    if (p.active) {
      const sp = level.spawns[i % level.spawns.length];
      placeAt(p, sp.x, sp.y);
      p.alive = true;
      p.face = sp.x > level.view.x + level.view.w / 2 ? -1 : 1;
    }
  }
  if (level.features.seagulls) s.gull.timer = randInt(s, 420, 900);
  return s;
}

function placeAt(p: PlayerState, x: number, y: number) {
  p.x = x;
  p.y = y;
  p.vx = 0;
  p.vy = 0;
}

export function cloneState(s: GameState): GameState {
  return structuredClone(s);
}

/** FNV-1a over the canonical JSON of the state (events excluded). */
export function checksum(s: GameState): number {
  const ev = s.events;
  s.events = [];
  const str = JSON.stringify(s);
  s.events = ev;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ------------------------------------------------------------------ helpers
function emit(s: GameState, t: string, id: number | string, e: Omit<GameEvent, 'k' | 't'> = {}) {
  s.events.push({ k: `${s.frame}:${t}:${id}`, t, ...e });
}

function solidActive(s: GameState, sol: Solid): boolean {
  if (sol.breakable >= 0 && s.destroyed[sol.breakable]) return false;
  if (sol.group && s.groupsGone.includes(sol.group)) return false;
  return true;
}

function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function approach(v: number, target: number, delta: number): number {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return v;
}

interface Body { x: number; y: number }
interface MoveResult { hitX: number; hitY: number; solid: number }

/**
 * Moves an axis-aligned box (centre x/y, half extents hw/hh) through the level.
 * hitX/hitY report the sign of the blocked direction (0 = free).
 */
function moveBox(m: Match, s: GameState, b: Body, hw: number, hh: number, dx: number, dy: number, oneway: boolean, dropping = false): MoveResult {
  const solids = m.level.solids;
  const res: MoveResult = { hitX: 0, hitY: 0, solid: -1 };
  // X axis
  if (dx !== 0) {
    let nx = b.x + dx;
    const y0 = b.y - hh + EPS, y1 = b.y + hh - EPS;
    for (let i = 0; i < solids.length; i++) {
      const so = solids[i];
      if (so.oneway || !solidActive(s, so)) continue;
      if (y1 <= so.y || y0 >= so.y + so.h) continue;
      if (nx + hw <= so.x || nx - hw >= so.x + so.w) continue;
      if (dx > 0 && b.x + hw <= so.x + EPS * 4) { nx = so.x - hw - EPS; res.hitX = 1; res.solid = i; }
      else if (dx < 0 && b.x - hw >= so.x + so.w - EPS * 4) { nx = so.x + so.w + hw + EPS; res.hitX = -1; res.solid = i; }
    }
    b.x = nx;
  }
  // Y axis
  if (dy !== 0) {
    let ny = b.y + dy;
    const x0 = b.x - hw + EPS, x1 = b.x + hw - EPS;
    for (let i = 0; i < solids.length; i++) {
      const so = solids[i];
      if (!solidActive(s, so)) continue;
      if (x1 <= so.x || x0 >= so.x + so.w) continue;
      const top = so.y + so.h;
      if (so.oneway) {
        if (!oneway || dropping || dy > 0) continue;
        // Land only when crossing the top surface from above.
        if (b.y - hh >= top - EPS * 4 && ny - hh < top) { ny = top + hh; res.hitY = -1; res.solid = i; }
        continue;
      }
      if (ny + hh <= so.y || ny - hh >= top) continue;
      if (dy < 0 && b.y - hh >= top - EPS * 4) { ny = top + hh; res.hitY = -1; res.solid = i; }
      else if (dy > 0 && b.y + hh <= so.y + EPS * 4) { ny = so.y - hh; res.hitY = 1; res.solid = i; }
    }
    b.y = ny;
  }
  return res;
}

function boxTouches(m: Match, s: GameState, x: number, y: number, hw: number, hh: number, oneway: boolean): boolean {
  for (const so of m.level.solids) {
    if (!solidActive(s, so)) continue;
    if (so.oneway && !oneway) continue;
    if (x + hw <= so.x || x - hw >= so.x + so.w) continue;
    if (y + hh <= so.y || y - hh >= so.y + so.h) continue;
    return true;
  }
  return false;
}

/** Supported by ground directly below (feet at y). */
function onGround(m: Match, s: GameState, p: PlayerState): boolean {
  const hw = T.halfW - 0.01;
  for (const so of m.level.solids) {
    if (!solidActive(s, so)) continue;
    if (p.x + hw <= so.x || p.x - hw >= so.x + so.w) continue;
    const top = so.y + so.h;
    if (p.y >= top - 0.02 && p.y <= top + 0.03) {
      if (so.oneway && p.drop > 0) continue;
      return true;
    }
  }
  return false;
}

function wallContact(m: Match, s: GameState, p: PlayerState): number {
  const cy = p.y + T.height / 2;
  const hh = T.height / 2 - 0.12;
  if (boxTouches(m, s, p.x + T.halfW + 0.02, cy, 0.015, hh, false)) return 1;
  if (boxTouches(m, s, p.x - T.halfW - 0.02, cy, 0.015, hh, false)) return -1;
  return 0;
}

function wrapX(m: Match, b: { x: number }) {
  if (!m.level.wrapX) return;
  const v = m.level.view;
  if (b.x < v.x) b.x += v.w;
  else if (b.x > v.x + v.w) b.x -= v.w;
}

// ------------------------------------------------------------------ step
/**
 * Advances the game by one frame. `inputs[slot]` holds the button byte of each
 * player. Bots ignore their input and think for themselves.
 */
export function step(m: Match, s: GameState, inputs: ArrayLike<number>): void {
  s.events = [];
  s.frame++;

  for (let i = 0; i < MAX_PLAYERS; i++) {
    const p = s.players[i];
    p.prevBtn = p.btn;
    const sc = m.cfg.slots[i];
    const raw = inputs[i] ?? 0;
    // 255 = the human controlling this slot disconnected; a CPU takes over.
    p.btn = !p.active ? 0 : sc && sc.bot > 0 ? botInput(m, s, p, sc.bot) : raw === 255 ? botInput(m, s, p, 2) : raw & 127;
    // Classic has no sword: the swing button is just another throw button.
    if (!isCrusade(m) && p.btn & BTN_SWING) p.btn = (p.btn & ~BTN_SWING) | BTN_ATTACK;
  }

  if (s.phase === Phase.Countdown) {
    s.phaseTimer--;
    if (s.phaseTimer % 60 === 0 && s.phaseTimer > 0) emit(s, 'count', s.phaseTimer / 60, { v: s.phaseTimer / 60 });
    if (s.phaseTimer === T.countdown - 1) emit(s, 'count', 3, { v: 3 });
    if (s.phaseTimer <= 0) {
      s.phase = Phase.Play;
      emit(s, 'go', 0);
    }
    // Let players settle onto the ground during the countdown.
    for (const p of s.players) if (p.active && p.alive) { p.btn = 0; updatePlayer(m, s, p, DT); }
    return;
  }

  if (s.freeze > 0) {
    s.freeze--;
    return;
  }

  let dt = DT;
  if (s.phase === Phase.End) {
    if (s.slowmo > 0) {
      s.slowmo--;
      dt = DT * 0.3;
    } else {
      s.phaseTimer++;
      return;
    }
    for (const p of s.players) p.btn = 0;
  } else {
    s.clock++;
  }

  for (const p of s.players) if (p.active) updatePlayer(m, s, p, dt);
  if (isCrusade(m)) swings(m, s);
  stomps(m, s);
  updateProjectiles(m, s, dt);
  clashProjectiles(m, s);
  updateBlasts(m, s);
  updatePickups(m, s, dt);
  updateLevel(m, s, dt);

  if (s.phase === Phase.Play && m.cfg.timeLimit > 0 && !s.suddenDeath && s.clock >= m.cfg.timeLimit * FPS) {
    timeUp(m, s);
  }
}

// ------------------------------------------------------------------ players
function updatePlayer(m: Match, s: GameState, p: PlayerState, dt: number) {
  if (!p.alive) {
    if (s.phase !== Phase.Play) return;
    p.respawn--;
    if (p.respawn <= 0) respawn(m, s, p);
    return;
  }
  if (p.flash > 0) p.flash--;
  if (p.invuln > 0) p.invuln--;
  if (p.hitstop > 0) {
    p.hitstop--;
    return;
  }

  const btn = p.btn;
  const pressed = btn & ~p.prevBtn;
  const stunned = p.stun > 0;
  if (stunned) p.stun--;
  if (p.cd > 0) p.cd--;
  if (p.actTimer > 0) p.actTimer--; else p.act = 0;
  if (p.drop > 0) p.drop--;
  if (p.wallLock > 0) p.wallLock--;
  if (p.swing > 0) p.swing--;
  if (p.swingCd > 0) p.swingCd--;
  if (p.splatCd > 0) p.splatCd--;
  const crusade = isCrusade(m);
  const perk = perkOf(m, p.slot);
  const runSpeed = perk === 1 ? T.runSpeed * CR.swiftRun : T.runSpeed;
  const airJumps = perk === 2 ? 2 : 1;

  const dir = stunned ? 0 : (btn & BTN_RIGHT ? 1 : 0) - (btn & BTN_LEFT ? 1 : 0);
  p.jumpHeld = !stunned && (btn & BTN_JUMP) !== 0;
  if (!stunned && pressed & BTN_JUMP) p.jumpBuf = T.jumpBuffer;
  else if (p.jumpBuf > 0) p.jumpBuf--;

  // ---- horizontal
  if (!stunned) {
    const target = dir * runSpeed;
    let accel: number;
    if (p.ground) accel = dir !== 0 ? T.groundAccel : T.groundDecel;
    else accel = dir !== 0 ? T.airAccel : T.airDecel;
    if (p.wallLock > 0) accel *= 0.25;
    if (dir !== 0 && sign(p.vx) === -dir) accel *= T.turnBoost;
    // Keep momentum above run speed in the air (knockback / wall jumps).
    if (!(Math.abs(p.vx) > runSpeed && sign(p.vx) === dir)) p.vx = approach(p.vx, target, accel * dt);
    else p.vx = approach(p.vx, target, T.airDecel * dt);
    if (dir !== 0 && p.wallLock <= 0) p.face = dir;
  } else {
    p.vx = approach(p.vx, 0, (p.ground ? 30 : 6) * dt);
  }

  // ---- wall contact
  p.wall = p.ground ? 0 : wallContact(m, s, p);
  const sliding = !stunned && p.wall !== 0 && dir === p.wall && p.vy < 0;

  // ---- jumping
  if (p.jumpBuf > 0 && !stunned) {
    const onOneway = p.ground && standingOnOneway(m, s, p);
    if ((btn & BTN_DOWN) && onOneway) {
      p.drop = 14;
      p.ground = false;
      p.jumpBuf = 0;
      p.y -= 0.05;
      emit(s, 'drop', p.slot, { a: p.slot, x: p.x, y: p.y });
    } else if (p.ground || p.coyote > 0) {
      p.vy = T.jumpV;
      p.ground = false;
      p.coyote = 0;
      p.jumpBuf = 0;
      p.jumps = airJumps;
      emit(s, 'jump', p.slot, { a: p.slot, x: p.x, y: p.y });
    } else if (p.wall !== 0) {
      p.vx = -p.wall * T.wallJumpVX;
      p.vy = T.wallJumpVY;
      p.face = -p.wall;
      p.wallLock = T.wallLock;
      p.jumpBuf = 0;
      p.jumps = airJumps;
      emit(s, 'walljump', p.slot, { a: p.slot, x: p.x + p.wall * T.halfW, y: p.y + 0.4, v: p.wall });
    } else if (p.jumps > 0) {
      p.vy = T.doubleJumpV;
      p.jumps--;
      p.jumpBuf = 0;
      emit(s, 'djump', p.slot, { a: p.slot, x: p.x, y: p.y });
    }
  }

  // ---- gravity
  let g: number = T.gravity;
  if (p.vy > 0) {
    if (!p.jumpHeld && !stunned) g = T.gravityCut;
    else if (p.vy < 2.2) g = T.gravityApex;
  } else {
    g = T.gravityFall;
  }
  const fastFall = !stunned && (btn & BTN_DOWN) !== 0 && !p.ground && p.vy < 1.5;
  let maxFall: number = fastFall ? T.fastFall : T.maxFall;
  if (sliding) maxFall = T.wallSlide;
  if (fastFall) g *= 1.4;
  p.vy -= g * dt;
  if (p.vy < -maxFall) p.vy = approach(p.vy, -maxFall, 80 * dt);

  // ---- move
  const wasGround = p.ground;
  const fallSpeed = p.vy;
  const body = { x: p.x, y: p.y + T.height / 2 };
  const hh = T.height / 2;
  const vxIn = p.vx;
  const vyIn = p.vy;
  const r = moveBox(m, s, body, T.halfW, hh, p.vx * dt, p.vy * dt, true, p.drop > 0);
  p.x = body.x;
  p.y = body.y - hh;
  // Crusade: slamming into a surface while launched hurts ("SPLAT!").
  if (crusade && stunned && p.splatCd <= 0 && ((r.hitX !== 0 && Math.abs(vxIn) > CR.splatSpeed) || (r.hitY !== 0 && Math.abs(vyIn) > CR.splatSpeed))) {
    splat(m, s, p, r.hitX !== 0 ? -vxIn * 0.45 : p.vx, r.hitY !== 0 ? -vyIn * 0.45 : p.vy, r.hitX !== 0 ? r.hitX : 0, r.hitY);
    if (!p.alive) return;
    p.ground = false;
    return;
  }
  if (r.hitX !== 0) p.vx = 0;
  if (r.hitY === 1 && p.vy > 0) p.vy = 0;
  if (r.hitY === -1) p.vy = 0;
  wrapX(m, p);

  p.ground = p.vy <= 0 && onGround(m, s, p);
  if (p.ground) {
    p.coyote = T.coyote;
    p.jumps = airJumps;
    p.airTime = 0;
    if (!wasGround) {
      emit(s, 'land', p.slot, { a: p.slot, x: p.x, y: p.y, v: -fallSpeed });
    }
  } else {
    if (p.coyote > 0) p.coyote--;
    p.airTime++;
  }

  if (p.y < m.level.killY) {
    ko(m, s, p, -1, -1);
    return;
  }

  // ---- shooting
  if (stunned) return;
  if (crusade && (pressed & BTN_SWING) && p.swingCd <= 0 && p.swing <= 0 && s.phase === Phase.Play) {
    p.swing = CR.swingTime;
    p.swingCd = perk === 1 ? CR.swingCdSwift : CR.swingCd;
    p.swingHit = 0;
    p.act = 4;
    p.actTimer = CR.swingTime;
    p.invuln = 0;
    emit(s, 'swing', p.slot, { a: p.slot, x: p.x + p.face * 0.5, y: p.y + 0.45, v: p.face });
  }
  if (p.swing > 0) return; // busy swinging
  if (p.burst > 0) {
    p.burstTimer--;
    if (p.burstTimer <= 0) {
      fireMusicNote(m, s, p, 3 - p.burst);
      p.burst--;
      p.burstTimer = 8;
    }
  }
  const wantShoot = (btn & BTN_ATTACK) !== 0 || (pressed & BTN_ATTACK) !== 0;
  if (wantShoot && p.cd <= 0 && s.phase === Phase.Play) {
    shoot(m, s, p);
  }
}

function standingOnOneway(m: Match, s: GameState, p: PlayerState): boolean {
  let oneway = false;
  for (const so of m.level.solids) {
    if (!solidActive(s, so)) continue;
    if (p.x + T.halfW <= so.x || p.x - T.halfW >= so.x + so.w) continue;
    const top = so.y + so.h;
    if (p.y >= top - 0.02 && p.y <= top + 0.03) {
      if (!so.oneway) return false;
      oneway = true;
    }
  }
  return oneway;
}

function respawn(m: Match, s: GameState, p: PlayerState) {
  const spawns = m.level.spawns;
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < spawns.length; i++) {
    let minD = 1e9;
    for (const o of s.players) {
      if (o === p || !o.active || !o.alive) continue;
      const dx = o.x - spawns[i].x;
      const dy = o.y - spawns[i].y;
      const d = dx * dx + dy * dy;
      if (d < minD) minD = d;
    }
    // Small random jitter so two spawns with the same distance alternate.
    const sc = minD + rand(s) * 0.5;
    if (sc > bestScore) { bestScore = sc; best = i; }
  }
  const sp = spawns[best];
  // Spawn points are already free spots (see buildLevel): lifting the knight
  // could push it into a low ceiling.
  placeAt(p, sp.x, sp.y + 0.01);
  p.alive = true;
  p.hp = T.maxHp;
  p.weapon = W.Stone;
  p.cdMax = WEAPONS[W.Stone].cooldown;
  p.cd = 0;
  p.burst = 0;
  p.stun = 0;
  p.hitstop = 0;
  p.invuln = T.spawnInvuln;
  p.jumps = perkOf(m, p.slot) === 2 ? 2 : 1;
  p.ammo = -1;
  p.splatCd = 0;
  p.swing = 0;
  p.dmgBy = [0, 0, 0, 0];
  p.face = sp.x > m.level.view.x + m.level.view.w / 2 ? -1 : 1;
  emit(s, 'spawn', p.slot, { a: p.slot, x: p.x, y: p.y });
}

function stomps(m: Match, s: GameState) {
  for (const a of s.players) {
    if (!a.active || !a.alive || a.vy >= -0.5 || a.hitstop > 0) continue;
    for (const b of s.players) {
      if (b === a || !b.active || !b.alive) continue;
      if (Math.abs(a.x - b.x) > T.halfW * 1.7) continue;
      const head = b.y + T.height;
      if (a.y > head + 0.05 || a.y < head - 0.3) continue;
      a.vy = T.stompBounce;
      a.jumps = perkOf(m, a.slot) === 2 ? 2 : 1;
      // Snap onto the head, but never up into a low ceiling.
      const body = { x: a.x, y: a.y + T.height / 2 };
      moveBox(m, s, body, T.halfW, T.height / 2, 0, head + 0.01 - a.y, false);
      a.y = body.y - T.height / 2;
      emit(s, 'stomp', `${a.slot}-${b.slot}`, { a: a.slot, b: b.slot, x: b.x, y: head });
      if (teamOf(m, a.slot) !== teamOf(m, b.slot) && b.invuln <= 0) {
        damage(m, s, b, a.slot, 1, 0, -4, -1);
        b.stun = Math.max(b.stun, 16);
      }
      break;
    }
  }
}

// ------------------------------------------------------------------ combat
function damage(m: Match, s: GameState, v: PlayerState, attacker: number, dmg: number, kx: number, ky: number, kind: number): boolean {
  if (!v.alive || v.invuln > 0) return false;
  v.hp -= dmg;
  v.flash = 9;
  v.hitstop = Math.min(9, 3 + dmg);
  if (isCrusade(m) && (kx !== 0 || ky !== 0)) {
    // The lower your health, the further you fly. Heavy knights resist.
    const missing = 1 - Math.max(0, Math.min(T.maxHp, v.hp)) / T.maxHp;
    let mult = 1 + CR.lowHpKnock * missing;
    if (perkOf(m, v.slot) === 3) mult *= CR.heavyKnock;
    kx *= mult;
    ky *= mult;
  }
  if (attacker >= 0 && attacker !== v.slot && attacker < 4) v.dmgBy[attacker] += dmg;
  const kb = Math.sqrt(kx * kx + ky * ky);
  v.stun = Math.max(v.stun, Math.round(9 + kb * 0.9));
  if (kb > 0) {
    v.vx = kx;
    v.vy = ky;
    v.ground = false;
  }
  v.burst = 0;
  if (dmg > 0 || kb > 0) v.swing = 0; // getting hit interrupts a sword swing
  if (attacker >= 0 && attacker !== v.slot) {
    v.lastHitBy = attacker;
    v.lastHitFrame = s.frame;
    const a = s.players[attacker];
    a.hits++;
    a.damageDealt += dmg;
  }
  let nth = 0; // several hits on one knight in the same frame need distinct keys
  for (const e of s.events) if (e.t === 'hit' && e.b === v.slot) nth++;
  emit(s, 'hit', `${v.slot}-${kind}-${attacker}-${nth}`, { a: attacker, b: v.slot, x: v.x, y: v.y + T.height / 2, v: dmg, w: kind });
  if (v.hp <= 0) ko(m, s, v, attacker, kind);
  return true;
}

function knockFrom(kb: number, dx: number, dy: number): [number, number] {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  let kx = (dx / len) * kb * T.kbScale;
  let ky = (dy / len) * kb * T.kbScale;
  ky = Math.max(ky, 2.5 + kb * 0.6);
  if (Math.abs(kx) < 1.5) kx = (dx >= 0 ? 1 : -1) * 1.5;
  return [kx, ky];
}

function ko(m: Match, s: GameState, v: PlayerState, attacker: number, kind: number) {
  if (!v.alive) return;
  v.alive = false;
  v.hp = 0;
  v.respawn = T.respawn;
  v.deaths++;
  v.burst = 0;
  let killer = attacker !== v.slot ? attacker : -1;
  if (killer < 0 && v.lastHitBy >= 0 && s.frame - v.lastHitFrame < T.creditWindow) killer = v.lastHitBy;
  if (killer >= 0 && teamOf(m, killer) === teamOf(m, v.slot) && killer !== v.slot) killer = -1;
  const play = s.phase === Phase.Play;
  if (isCrusade(m)) {
    crusadeScore(m, s, v, killer, play);
  } else if (killer >= 0) {
    const k = s.players[killer];
    k.kos++;
    if (play) k.score++;
  }
  v.lastHitBy = -1;
  s.freeze = T.koFreeze;
  emit(s, 'ko', v.slot, { a: killer, b: v.slot, x: v.x, y: v.y + T.height / 2, w: kind });
  if (play && s.phase === Phase.Play) {
    if (isCrusade(m)) checkWinAny(m, s, killer);
    else checkWin(m, s, killer);
  }
}

/** Crusade scoring: KO 2, assist 1, +1 for KOing the crowned leader, -1 for a self-KO. */
function crusadeScore(m: Match, s: GameState, v: PlayerState, killer: number, play: boolean) {
  if (killer >= 0) {
    const k = s.players[killer];
    k.kos++;
    const bounty = crownHolder(m, s) === v.slot;
    const pts = CR.koPoints + (bounty ? CR.bountyPoints : 0);
    if (play) k.score += pts;
    emit(s, 'points', `ko-${v.slot}`, { a: killer, b: v.slot, v: pts, w: bounty ? 1 : 0, x: k.x, y: k.y + T.height + 0.6 });
    for (const o of s.players) {
      if (!o.active || o.slot === killer || o.slot === v.slot) continue;
      if (teamOf(m, o.slot) === teamOf(m, v.slot)) continue;
      if (v.dmgBy[o.slot] < CR.assistMinDamage) continue;
      o.assists++;
      if (play) o.score += CR.assistPoints;
      emit(s, 'points', `assist-${v.slot}-${o.slot}`, { a: o.slot, b: v.slot, v: CR.assistPoints, w: 2, x: o.x, y: o.y + T.height + 0.6 });
    }
  } else if (play && v.score > 0) {
    v.score = Math.max(0, v.score - CR.selfKoPenalty);
    emit(s, 'points', `oops-${v.slot}`, { a: v.slot, b: v.slot, v: -CR.selfKoPenalty, w: 3, x: v.x, y: v.y + T.height + 0.6 });
  }
}

/** Anyone (or any team) may cross the target in Crusade (assists also score). */
function checkWinAny(m: Match, s: GameState, preferred: number) {
  const reached = (slot: number) => (m.cfg.teams ? teamScore(m, s, teamOf(m, slot)) : s.players[slot].score) >= m.cfg.targetScore;
  if (s.suddenDeath) return checkSuddenDeath(m, s, preferred);
  if (preferred >= 0 && reached(preferred)) return endMatch(m, s, preferred);
  let best = -1;
  for (const p of s.players) {
    if (!p.active || !reached(p.slot)) continue;
    if (best < 0 || p.score > s.players[best].score) best = p.slot;
  }
  if (best >= 0) endMatch(m, s, best);
}

function teamScore(m: Match, s: GameState, team: number): number {
  let t = 0;
  for (const p of s.players) if (p.active && teamOf(m, p.slot) === team) t += p.score;
  return t;
}

function checkWin(m: Match, s: GameState, scorer: number) {
  if (s.suddenDeath) return checkSuddenDeath(m, s, scorer);
  if (scorer < 0) return;
  const team = teamOf(m, scorer);
  const sc = m.cfg.teams ? teamScore(m, s, team) : s.players[scorer].score;
  if (sc >= m.cfg.targetScore) endMatch(m, s, scorer);
}

/** Sudden death ends as soon as one player (or team) leads alone. */
function checkSuddenDeath(m: Match, s: GameState, preferred: number) {
  let best = -1;
  let bestScore = -Infinity;
  let tie = false;
  const seen: number[] = [];
  for (const p of s.players) {
    if (!p.active) continue;
    const team = teamOf(m, p.slot);
    if (m.cfg.teams && seen.includes(team)) continue;
    seen.push(team);
    const sc = m.cfg.teams ? teamScore(m, s, team) : p.score;
    if (sc > bestScore) { bestScore = sc; best = p.slot; tie = false; }
    else if (sc === bestScore) tie = true;
  }
  if (tie || best < 0) return;
  // Credit the scorer when they belong to the leading team.
  const winner = preferred >= 0 && teamOf(m, preferred) === teamOf(m, best) ? preferred : best;
  endMatch(m, s, winner);
}

function endMatch(m: Match, s: GameState, winner: number) {
  s.phase = Phase.End;
  s.phaseTimer = 0;
  s.slowmo = T.endSlowmo;
  s.winner = winner;
  s.winnerTeam = winner >= 0 ? teamOf(m, winner) : -1;
  emit(s, 'win', winner, { a: winner, b: s.winnerTeam });
}

function timeUp(m: Match, s: GameState) {
  // Leader by (team) score; ties go to sudden death (next KO wins).
  let best = -1;
  let bestScore = -1;
  let tie = false;
  const seen: number[] = [];
  for (const p of s.players) {
    if (!p.active) continue;
    const team = teamOf(m, p.slot);
    if (m.cfg.teams && seen.includes(team)) continue;
    seen.push(team);
    const sc = m.cfg.teams ? teamScore(m, s, team) : p.score;
    if (sc > bestScore) { bestScore = sc; best = p.slot; tie = false; }
    else if (sc === bestScore) tie = true;
  }
  if (tie) {
    s.suddenDeath = true;
    emit(s, 'sudden', 0);
  } else {
    endMatch(m, s, best);
  }
}

// ------------------------------------------------------------------ weapons
function aimOf(p: PlayerState): number {
  if (p.btn & BTN_UP) return 1;
  if (p.btn & BTN_DOWN && !p.ground) return -1;
  return 0;
}

function spawnProj(m: Match, s: GameState, p: PlayerState, kind: W, vx: number, vy: number, ox = 0.32, oy = 0.45): Projectile {
  const def = WEAPONS[kind];
  const pr: Projectile = {
    id: s.nextId++, kind, owner: p.slot, team: teamOf(m, p.slot),
    x: p.x + p.face * ox, y: p.y + oy, vx, vy, age: 0, life: def.life, bounces: 0, dead: false, p: 0, q: 0, refl: 0,
  };
  s.projs.push(pr);
  return pr;
}

function shoot(m: Match, s: GameState, p: PlayerState) {
  const def = WEAPONS[p.weapon];
  const f = p.face;
  const aim = aimOf(p);
  p.cd = def.cooldown;
  p.cdMax = def.cooldown;
  p.shots++;
  p.invuln = 0;
  p.act = def.pose === 'throw' ? 1 : def.pose === 'hadouken' ? 2 : 3;
  p.actTimer = def.pose === 'mic' ? 30 : 20;
  const sp = def.speed;
  const carry = p.vx * 0.3;
  switch (p.weapon) {
    case W.Stone:
      if (aim === 1) spawnProj(m, s, p, W.Stone, f * 10.5 + carry, 10);
      else if (aim === -1) spawnProj(m, s, p, W.Stone, f * 11 + carry, -8);
      else spawnProj(m, s, p, W.Stone, f * sp + carry, 2.5);
      break;
    case W.Pill:
      spawnProj(m, s, p, W.Pill, f * sp + carry, aim === 1 ? 10 : aim === -1 ? -6 : 4);
      break;
    case W.Shuriken:
    case W.Hadouken:
    case W.Pizza: {
      const vx = aim === 0 ? f * sp : f * sp * C35;
      const vy = aim === 0 ? 0 : aim * sp * S35;
      spawnProj(m, s, p, p.weapon, vx, vy, p.weapon === W.Hadouken ? 0.42 : 0.32);
      if (p.weapon !== W.Shuriken) p.vx -= f * (p.weapon === W.Pizza ? 2.5 : 3.5);
      break;
    }
    case W.Barrel: {
      const b = spawnProj(m, s, p, W.Barrel, f * sp, p.ground ? 0 : -2, 0.45, 0.24);
      b.q = f;
      break;
    }
    case W.Sock:
      if (aim === 1) spawnProj(m, s, p, W.Sock, f * 3.5 + carry, 12);
      else if (aim === -1) spawnProj(m, s, p, W.Sock, f * 8 + carry, 2);
      else spawnProj(m, s, p, W.Sock, f * 5.5 + carry, 8.5);
      break;
    case W.Duck:
      spawnProj(m, s, p, W.Duck, f * (aim === 1 ? 5.5 : sp) + carry, aim === 1 ? 10 : aim === -1 ? -3 : 3.5);
      break;
    case W.Bomb: {
      const b = aim === 1 ? spawnProj(m, s, p, W.Bomb, f * 3 + carry, 9)
        : aim === -1 ? spawnProj(m, s, p, W.Bomb, f * 1.5, -3, 0.1, 0.2)
        : spawnProj(m, s, p, W.Bomb, f * sp + carry, 4.5);
      // Decide the outcome now so every peer agrees: 1 in 4 is a nuke
      // (1 in 3 for a Lucky knight in Crusade).
      b.p = rand(s) < (perkOf(m, p.slot) === 0 ? 0.34 : 0.25) ? 1 : 0;
      break;
    }
    case W.Music:
      p.burst = 2;
      p.burstTimer = 8;
      p.burstAim = aim;
      fireMusicNote(m, s, p, 0);
      break;
  }
  emit(s, 'shoot', p.slot, { a: p.slot, w: p.weapon, x: p.x + f * 0.4, y: p.y + 0.45, v: aim });
  if (p.ammo > 0) {
    p.ammo--;
    if (p.ammo === 0) {
      emit(s, 'empty', `${p.slot}-${p.shots}`, { a: p.slot, w: p.weapon, x: p.x, y: p.y + T.height + 0.4 });
      p.weapon = W.Stone;
      p.ammo = -1;
    }
  }
}

function fireMusicNote(m: Match, s: GameState, p: PlayerState, index: number) {
  const def = WEAPONS[W.Music];
  const f = p.face;
  const aim = index === 0 ? aimOf(p) : p.burstAim;
  if (index === 0) p.burstAim = aim;
  const vx = aim === 0 ? f * def.speed : f * def.speed * C35;
  const vy = aim === 0 ? 0 : aim * def.speed * S35;
  const n = spawnProj(m, s, p, W.Music, vx, vy, 0.4, 0.55);
  n.p = index; // 0 big, 1 medium, 2 small
  n.q = index % 2 === 0 ? 1 : -1; // wave phase
  if (index > 0) emit(s, 'note', `${p.slot}-${index}`, { a: p.slot, w: W.Music, x: n.x, y: n.y, v: index });
}

function projHalf(pr: Projectile): [number, number] {
  const def = WEAPONS[pr.kind];
  if (pr.kind === W.Music) {
    const sz = pr.p === 0 ? 1 : 0.8;
    return [def.hw * sz, def.hh * sz];
  }
  return [def.hw, def.hh];
}

function updateProjectiles(m: Match, s: GameState, dt: number) {
  for (const pr of s.projs) {
    if (pr.dead) continue;
    pr.age++;
    const def = WEAPONS[pr.kind];
    const [hw, hh] = projHalf(pr);

    // ---- motion per weapon
    if (def.gravity > 0) pr.vy -= def.gravity * dt;
    if (pr.kind === W.Music) {
      // Zig-zag like the original megaphone notes.
      const half = 14;
      const t = (pr.age + (pr.q > 0 ? 0 : half)) % (half * 2);
      const wave = t < half ? 1 : -1;
      pr.y += wave * 3.2 * dt;
    }
    if (pr.kind === W.Barrel && pr.bounces > 0) pr.vx = pr.q * def.speed;
    if (pr.vy < -20) pr.vy = -20;

    const body = { x: pr.x, y: pr.y };
    const bouncy = pr.kind === W.Pill || pr.kind === W.Duck || pr.kind === W.Bomb || pr.kind === W.Barrel;
    const landOnPlatforms = bouncy || pr.kind === W.Sock;
    // Sub-step fast projectiles to avoid tunnelling.
    const steps = Math.abs(pr.vx * dt) > hw || Math.abs(pr.vy * dt) > hh ? 2 : 1;
    let hit: MoveResult = { hitX: 0, hitY: 0, solid: -1 };
    for (let k = 0; k < steps && !hit.hitX && !hit.hitY; k++) {
      hit = moveBox(m, s, body, hw, hh, (pr.vx * dt) / steps, (pr.vy * dt) / steps, landOnPlatforms);
    }
    pr.x = body.x;
    pr.y = body.y;
    wrapX(m, pr);

    if (hit.hitX || hit.hitY) projHitsWorld(m, s, pr, hit);
    if (pr.dead) continue;

    // ---- players
    for (const v of s.players) {
      if (!v.active || !v.alive || v.slot === pr.owner) continue;
      if (m.cfg.teams && teamOf(m, v.slot) === pr.team) continue;
      if (Math.abs(pr.x - v.x) > hw + T.halfW) continue;
      const cy = v.y + T.height / 2;
      if (Math.abs(pr.y - cy) > hh + T.height / 2) continue;
      if (v.invuln > 0) continue;
      projHitsPlayer(m, s, pr, v);
      if (pr.dead) break;
    }
    if (pr.dead) continue;

    pr.life--;
    if (pr.life <= 0) projExpire(m, s, pr);
    if (pr.y < m.level.killY - 2 || pr.y > m.level.ceilY + 6) pr.dead = true;
  }
  s.projs = s.projs.filter((p) => !p.dead);
}

function breakProj(s: GameState, pr: Projectile, how = 'break') {
  pr.dead = true;
  emit(s, how, pr.id, { w: pr.kind, x: pr.x, y: pr.y, a: pr.owner, v: pr.vx >= 0 ? 1 : -1 });
}

function projHitsWorld(m: Match, s: GameState, pr: Projectile, hit: MoveResult) {
  const sol = hit.solid >= 0 ? m.level.solids[hit.solid] : null;
  if (sol && isCrusade(m) && impactsTerrain(pr, hit)) {
    // Crusade: walls crumble and the temple cracks under fire.
    const dmg = Math.max(1, WEAPONS[pr.kind].damage);
    if (sol.breakable >= 0 && !s.destroyed[sol.breakable]) damageTile(s, sol, dmg, pr.owner);
    if (sol.group === 'temple') damageTemple(m, s, dmg, pr.owner, pr.x, pr.y);
  }
  switch (pr.kind) {
    case W.Stone:
    case W.Shuriken:
    case W.Hadouken:
    case W.Pizza:
    case W.Music:
      breakProj(s, pr);
      return;
    case W.Sock:
      explode(m, s, pr, 'sock');
      return;
    case W.Barrel:
      if (sol && sol.breakable >= 0 && hit.hitX) {
        breakSolid(s, sol, pr.owner);
        breakProj(s, pr);
        return;
      }
      if (hit.hitX) { breakProj(s, pr); return; }
      if (hit.hitY === -1) {
        if (pr.bounces === 0) emit(s, 'roll', pr.id, { x: pr.x, y: pr.y });
        pr.bounces = 1;
        pr.vy = 0;
      }
      return;
    case W.Pill:
      if (hit.hitY === -1) {
        pr.bounces++;
        pr.vy = 7.5;
        emit(s, 'bounce', `${pr.id}-${pr.bounces}`, { w: pr.kind, x: pr.x, y: pr.y });
        if (pr.bounces > 4) breakProj(s, pr, 'fizzle');
      } else if (hit.hitY === 1) {
        pr.vy = -Math.abs(pr.vy) * 0.5;
      } else if (hit.hitX) {
        pr.vx = -pr.vx * 0.8;
      }
      return;
    case W.Duck:
    case W.Bomb:
      if (hit.hitY === -1) {
        pr.vy = Math.abs(pr.vy) > 3 ? -pr.vy * 0.55 : 0;
        pr.vx *= pr.kind === W.Duck ? 0.85 : 0.6;
        if (Math.abs(pr.vy) > 1) emit(s, 'bounce', `${pr.id}-${pr.age}`, { w: pr.kind, x: pr.x, y: pr.y });
      } else if (hit.hitY === 1) {
        pr.vy = -Math.abs(pr.vy) * 0.5;
      }
      if (hit.hitX) pr.vx = -pr.vx * 0.7;
      return;
  }
}

/**
 * Does this world collision chip Crusade terrain? Shots that shatter on impact
 * do; bouncing / rolling objects only on a hard sideways hit (not while they
 * rest or roll on a floor, which collides every frame). Barrels smash
 * breakables their own way and explosives damage terrain with their blast.
 */
function impactsTerrain(pr: Projectile, hit: MoveResult): boolean {
  switch (pr.kind) {
    case W.Stone:
    case W.Shuriken:
    case W.Hadouken:
    case W.Pizza:
    case W.Music:
      return true;
    case W.Pill:
    case W.Duck:
    case W.Bomb:
      return hit.hitX !== 0 && Math.abs(pr.vx) > 4;
    default:
      return false;
  }
}

function projHitsPlayer(m: Match, s: GameState, pr: Projectile, v: PlayerState) {
  const def = WEAPONS[pr.kind];
  switch (pr.kind) {
    case W.Sock:
      explode(m, s, pr, 'sock');
      return;
    case W.Duck:
      explode(m, s, pr, 'duck');
      return;
    case W.Bomb:
      // Bombs bonk off players and keep ticking.
      if (pr.p === 0 && pr.age > 6) { pr.vx = -pr.vx * 0.5; pr.vy = 3; }
      return;
    default: {
      let dmg = def.damage;
      if (pr.kind === W.Music) dmg = pr.p === 0 ? 2 : 1;
      const dirx = pr.vx !== 0 ? sign(pr.vx) : sign(v.x - pr.x) || 1;
      const kb = pr.kind === W.Music ? (pr.p === 0 ? 3 : 2) : def.knockback;
      const [kx, ky] = knockFrom(kb, dirx * 1.0, 0.35 + (pr.vy > 0 ? 0.25 : 0));
      damage(m, s, v, pr.owner, dmg, kx, ky, pr.kind);
      breakProj(s, pr, 'impact');
    }
  }
}

function projExpire(m: Match, s: GameState, pr: Projectile) {
  switch (pr.kind) {
    case W.Duck:
      explode(m, s, pr, 'duck');
      return;
    case W.Bomb:
      explode(m, s, pr, pr.p === 1 ? 'nuke' : 'confetti');
      return;
    case W.Sock:
      explode(m, s, pr, 'sock');
      return;
    default:
      breakProj(s, pr, 'fizzle');
  }
}

function explode(m: Match, s: GameState, pr: Projectile, kind: BlastKind) {
  pr.dead = true;
  const d = BLASTS[kind];
  const b: Blast = {
    id: s.nextId++, kind, owner: pr.owner, team: pr.team, x: pr.x, y: pr.y, r: d.r,
    age: 0, life: d.life, damage: d.damage, knockback: d.knockback, pulse: d.pulse, hitMask: 0,
  };
  if (isCrusade(m) && kind === 'confetti') {
    // The dud is no longer useless: a party popper that shoves everyone.
    b.knockback = CR.confettiKnock;
    b.r = CR.confettiRadius;
  }
  s.blasts.push(b);
  if (isCrusade(m) && kind !== 'nuke') {
    const dmg = kind === 'sock' ? 3 : 2;
    for (const so of m.level.solids) {
      if (so.breakable >= 0 && !s.destroyed[so.breakable] && circleRect(b.x, b.y, b.r, so)) damageTile(s, so, dmg, b.owner);
    }
    const t = m.level.features.temple;
    if (t && circleRect(b.x, b.y, b.r, t)) damageTemple(m, s, dmg, b.owner, b.x, b.y);
  }
  emit(s, 'boom', b.id, { w: pr.kind, x: b.x, y: b.y, a: b.owner, v: kind === 'nuke' ? 3 : kind === 'confetti' ? 0 : kind === 'sock' ? 2 : 1, b: ['sock', 'duck', 'nuke', 'confetti'].indexOf(kind) });
  if (kind === 'nuke') {
    // Nukes smash breakable tiles and the Dragon temple.
    for (const so of m.level.solids) {
      if (so.breakable < 0 || s.destroyed[so.breakable]) continue;
      if (circleRect(b.x, b.y, b.r, so)) {
        breakSolid(s, so, b.owner);
      }
    }
    const t = m.level.features.temple;
    if (t && s.dragon.stage === 0 && circleRect(b.x, b.y, b.r + 0.5, t)) collapseTemple(m, s, b.owner);
  }
}

function collapseTemple(m: Match, s: GameState, by: number) {
  const t = m.level.features.temple;
  if (!t || s.dragon.stage !== 0) return;
  s.dragon.stage = 1;
  s.dragon.timer = 150;
  s.dragon.by = by;
  s.templeHp = 0;
  if (!s.groupsGone.includes('temple')) s.groupsGone.push('temple');
  emit(s, 'temple', 0, { a: by, x: t.x + t.w / 2, y: t.y + t.h / 2 });
}

function damageTemple(m: Match, s: GameState, dmg: number, by: number, x: number, y: number) {
  if (s.dragon.stage !== 0 || s.templeHp <= 0) return;
  s.templeHp -= dmg;
  emit(s, 'temple-hit', `${s.frame}-${x.toFixed(2)}`, { x, y, v: Math.max(0, s.templeHp), a: by });
  if (s.templeHp <= 0) collapseTemple(m, s, by);
}

function damageTile(s: GameState, so: Solid, dmg: number, by: number) {
  if (so.breakable < 0 || s.destroyed[so.breakable]) return;
  s.tileHp[so.breakable] -= dmg;
  if (s.tileHp[so.breakable] <= 0) breakSolid(s, so, by);
  else emit(s, 'tile-hit', `${s.frame}-${so.breakable}`, { x: so.x + so.w / 2, y: so.y + so.h / 2, v: s.tileHp[so.breakable] });
}

function breakSolid(s: GameState, so: Solid, by: number) {
  s.destroyed[so.breakable] = 1;
  if (so.group && !s.groupsGone.includes(so.group)) s.groupsGone.push(so.group);
  emit(s, 'tile', so.breakable, { x: so.x + so.w / 2, y: so.y + so.h / 2, a: by });
}

function circleRect(cx: number, cy: number, r: number, rc: { x: number; y: number; w: number; h: number }): boolean {
  const nx = Math.max(rc.x, Math.min(cx, rc.x + rc.w));
  const ny = Math.max(rc.y, Math.min(cy, rc.y + rc.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function updateBlasts(m: Match, s: GameState) {
  for (const b of s.blasts) {
    if (b.pulse > 0 && b.age % b.pulse === 0) {
      b.hitMask = 0;
      if (b.age > 0) emit(s, 'quack', `${b.id}-${b.age}`, { x: b.x, y: b.y });
    }
    if ((b.damage > 0 || b.knockback > 0) && (b.pulse > 0 || b.age < 6)) {
      for (const v of s.players) {
        if (!v.active || !v.alive) continue;
        if (b.hitMask & (1 << v.slot)) continue;
        if (m.cfg.teams && v.slot !== b.owner && teamOf(m, v.slot) === b.team) continue;
        const cy = v.y + T.height / 2;
        if (!circleRect(b.x, b.y, b.r, { x: v.x - T.halfW, y: v.y, w: T.halfW * 2, h: T.height })) continue;
        b.hitMask |= 1 << v.slot;
        // Your own blasts hurt you, but less.
        const self = v.slot === b.owner;
        const dmg = b.damage === 0 ? 0 : self ? Math.max(1, Math.floor(b.damage / 2)) : b.damage;
        const [kx, ky] = knockFrom(b.knockback, v.x - b.x, cy - b.y + 0.3);
        damage(m, s, v, b.owner, dmg, kx, ky, 100 + ['sock', 'duck', 'nuke', 'confetti'].indexOf(b.kind));
      }
    }
    b.age++;
  }
  s.blasts = s.blasts.filter((b) => b.age < b.life);
}

function clashProjectiles(m: Match, s: GameState) {
  const ps = s.projs;
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i];
    const wa = WEAPONS[a.kind].weight;
    if (a.dead || wa === 0) continue;
    const [ahw, ahh] = projHalf(a);
    for (let j = i + 1; j < ps.length; j++) {
      const b = ps[j];
      const wb = WEAPONS[b.kind].weight;
      if (b.dead || wb === 0 || b.owner === a.owner) continue;
      if (m.cfg.teams && a.team === b.team) continue;
      const [bhw, bhh] = projHalf(b);
      if (Math.abs(a.x - b.x) > ahw + bhw || Math.abs(a.y - b.y) > ahh + bhh) continue;
      emit(s, 'clash', `${a.id}-${b.id}`, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: a.kind, b: b.kind });
      if (wa <= wb) breakProj(s, a);
      if (wb <= wa) breakProj(s, b);
      if (a.dead) break;
    }
  }
  s.projs = s.projs.filter((p) => !p.dead);
}

// ------------------------------------------------------------------ pickups
function maxChests(m: Match, s: GameState): number {
  let n = 0;
  for (const p of s.players) if (p.active) n++;
  return n >= 3 ? 2 : 1;
}

function spawnChest(m: Match, s: GameState, x: number, y: number, kind: 'weapon' | 'armor') {
  const id = s.nextId++;
  s.pickups.push({ id, kind, x, y, vy: 0, ground: false, age: 0, opened: 0, weapon: -1 });
  emit(s, 'chest', id, { x, y, w: kind === 'armor' ? 1 : 0 });
}

function updatePickups(m: Match, s: GameState, dt: number) {
  if (m.cfg.items && s.phase === Phase.Play) {
    let closed = 0;
    for (const c of s.pickups) if (!c.opened) closed++;
    if (closed < maxChests(m, s)) {
      s.chestTimer--;
      if (s.chestTimer <= 0) {
        const spots = m.level.pickupSpawns;
        const start = randInt(s, 0, spots.length - 1);
        for (let k = 0; k < spots.length; k++) {
          const sp = spots[(start + k) % spots.length];
          const busy = s.pickups.some((c) => Math.abs(c.x - sp.x) < 1 && Math.abs(c.y - sp.y) < 2);
          if (busy) continue;
          spawnChest(m, s, sp.x, sp.y + 0.6, rand(s) < 0.22 ? 'armor' : 'weapon');
          break;
        }
        s.chestTimer = randInt(s, 300, 560);
      }
    }
  }

  const HW = 0.27, HH = 0.2;
  for (const c of s.pickups) {
    c.age++;
    if (c.opened) {
      c.opened++;
      continue;
    }
    if (!c.ground) {
      c.vy = Math.max(c.vy - 22 * dt, -14);
      const body = { x: c.x, y: c.y };
      const r = moveBox(m, s, body, HW, HH, 0, c.vy * dt, true);
      c.x = body.x;
      c.y = body.y;
      if (r.hitY === -1) {
        c.ground = true;
        c.vy = 0;
        emit(s, 'chestland', c.id, { x: c.x, y: c.y });
      }
    } else if (!boxTouches(m, s, c.x, c.y - 0.03, HW - 0.02, HH, true)) {
      c.ground = false; // floor was destroyed
    }
    if (c.y < m.level.killY) { c.opened = 999; continue; }
    if (c.age > 1500) { c.opened = 999; continue; }
    for (const p of s.players) {
      if (!p.active || !p.alive) continue;
      if (Math.abs(p.x - c.x) > HW + T.halfW || Math.abs(p.y + T.height / 2 - c.y) > HH + T.height / 2) continue;
      c.opened = 1;
      if (c.kind === 'armor') {
        p.hp = Math.min(T.armorHp, p.hp + 5);
        emit(s, 'armor', c.id, { a: p.slot, x: c.x, y: c.y });
      } else {
        let w: number;
        if (isCrusade(m)) {
          w = underdogWeapon(m, s, p);
          p.ammo = Math.ceil(AMMO[w] * (perkOf(m, p.slot) === 0 ? CR.luckyAmmo : 1));
        } else {
          // A random weapon different from the current one (never the starter stone).
          w = randInt(s, 1, WEAPON_COUNT - 2);
          if (w >= p.weapon && p.weapon !== W.Stone) w++;
          if (w === p.weapon) w = ((w % (WEAPON_COUNT - 1)) + 1) as W;
        }
        c.weapon = w;
        p.weapon = w as W;
        p.cd = 12;
        p.cdMax = 12;
        p.burst = 0;
        emit(s, 'pickup', c.id, { a: p.slot, w, x: c.x, y: c.y });
      }
      break;
    }
  }
  s.pickups = s.pickups.filter((c) => c.opened < 45);
}

const STRONG: W[] = [W.Pizza, W.Bomb, W.Hadouken, W.Duck];
const NORMAL: W[] = [W.Pill, W.Shuriken, W.Barrel, W.Sock, W.Music];

/** Crusade chests favour whoever is behind: last place gets the big guns. */
function underdogWeapon(m: Match, s: GameState, p: PlayerState): W {
  let top = 0;
  for (const o of s.players) if (o.active && o.score > top) top = o.score;
  const behind = top > 0 ? (top - p.score) / top : 0.5;
  const lucky = perkOf(m, p.slot) === 0 ? CR.luckyStrong : 0;
  const tier = rand(s) < 0.2 + 0.55 * behind + lucky ? STRONG : NORMAL;
  const options = tier.filter((w) => w !== p.weapon);
  return options[randInt(s, 0, options.length - 1)];
}

// ------------------------------------------------------------------ crusade: swords
/** Active sword swings parry projectiles and shove knights. */
function swings(m: Match, s: GameState) {
  for (const p of s.players) {
    if (!p.active || !p.alive || p.swing <= 0) continue;
    const t = CR.swingTime - p.swing;
    if (t < CR.swingActiveFrom || t > CR.swingActiveTo) continue;
    const cx = p.x + p.face * 0.5;
    const cy = p.y + 0.45;
    const r = CR.swingRange;
    const myTeam = teamOf(m, p.slot);
    // ---- parry
    for (const pr of s.projs) {
      if (pr.dead || pr.owner === p.slot) continue;
      if (m.cfg.teams && pr.team === myTeam) continue;
      const [hw, hh] = projHalf(pr);
      if (!circleRect(cx, cy, r, { x: pr.x - hw, y: pr.y - hh, w: hw * 2, h: hh * 2 })) continue;
      const def = WEAPONS[pr.kind];
      const speed = Math.min(24, Math.max(Math.sqrt(pr.vx * pr.vx + pr.vy * pr.vy), def.speed) * CR.parryBoost);
      const aim = aimOf(p);
      if (def.gravity > 0) {
        pr.vx = p.face * speed * 0.75;
        pr.vy = aim === 1 ? 11 : aim === -1 ? -4 : 6;
      } else if (aim === 0) {
        pr.vx = p.face * speed;
        pr.vy = 0;
      } else {
        pr.vx = p.face * speed * C35;
        pr.vy = aim * speed * S35;
      }
      if (pr.kind === W.Barrel) { pr.q = p.face; pr.bounces = 0; }
      pr.owner = p.slot;
      pr.team = myTeam;
      pr.refl++;
      pr.life = Math.max(pr.life, Math.min(def.life, 90));
      p.parries++;
      p.hitstop = Math.max(p.hitstop, 5);
      p.swingCd = Math.min(p.swingCd, CR.parryRefund);
      emit(s, 'parry', `${pr.id}-${pr.refl}`, { a: p.slot, x: pr.x, y: pr.y, w: pr.kind });
    }
    // ---- sword hits
    for (const v of s.players) {
      if (v === p || !v.active || !v.alive || v.invuln > 0) continue;
      if (p.swingHit & (1 << v.slot)) continue;
      if (teamOf(m, v.slot) === myTeam && m.cfg.teams) continue;
      if (!circleRect(cx, cy, r, { x: v.x - T.halfW, y: v.y, w: T.halfW * 2, h: T.height })) continue;
      p.swingHit |= 1 << v.slot;
      const power = CR.swingKnock * (perkOf(m, p.slot) === 3 ? CR.heavySwing : 1);
      const [kx, ky] = knockFrom(power, p.face, 0.45 + (aimOf(p) === 1 ? 0.6 : 0));
      p.hitstop = Math.max(p.hitstop, 4);
      damage(m, s, v, p.slot, CR.swingDamage, kx, ky, 300);
    }
  }
}

/** Launched knight slammed into a surface. */
function splat(m: Match, s: GameState, p: PlayerState, vx: number, vy: number, hx: number, hy: number) {
  p.splatCd = CR.splatCooldown;
  const by = p.lastHitBy >= 0 && s.frame - p.lastHitFrame < T.creditWindow ? p.lastHitBy : -1;
  if (by >= 0) s.players[by].splats++;
  emit(s, 'splat', `${p.slot}-${s.frame}`, { a: by, b: p.slot, x: p.x + hx * T.halfW, y: p.y + T.height / 2 + (hy > 0 ? 0.4 : hy < 0 ? -0.4 : 0), v: hx !== 0 ? hx : 0, w: hy });
  damage(m, s, p, by, CR.splatDamage, 0, 0, 301);
  p.vx = vx;
  p.vy = vy;
}

// ------------------------------------------------------------------ level scripts
function updateLevel(m: Match, s: GameState, dt: number) {
  const f = m.level.features;
  const v = m.level.view;
  if (f.seagulls && s.phase === Phase.Play) {
    const g = s.gull;
    if (!g.active) {
      g.timer--;
      if (g.timer <= 0) {
        g.active = true;
        const fromLeft = rand(s) < 0.5;
        g.x = fromLeft ? v.x - 1.5 : v.x + v.w + 1.5;
        g.vx = fromLeft ? 4.2 : -4.2;
        g.y = f.seagulls.y;
        g.dropX = v.x + v.w * (0.2 + rand(s) * 0.6);
        g.dropped = false;
        emit(s, 'gull', s.frame, { x: g.x, y: g.y, v: g.vx });
      }
    } else {
      g.x += g.vx * dt;
      if (!g.dropped && ((g.vx > 0 && g.x >= g.dropX) || (g.vx < 0 && g.x <= g.dropX))) {
        g.dropped = true;
        if (m.cfg.items) spawnChest(m, s, g.x, g.y - 0.4, rand(s) < 0.3 ? 'armor' : 'weapon');
      }
      if (g.x < v.x - 3 || g.x > v.x + v.w + 3) {
        g.active = false;
        g.timer = randInt(s, f.seagulls.minDelay, f.seagulls.maxDelay);
      }
    }
  }

  if (f.armor && s.phase === Phase.Play) {
    if (s.armorCd > 0) {
      s.armorCd--;
      if (s.armorCd === 0) emit(s, 'armor-ready', s.frame, { x: f.armor.x + f.armor.w / 2, y: f.armor.y + 0.8 });
    } else {
      for (const p of s.players) {
        if (!p.active || !p.alive) continue;
        if (p.x + T.halfW < f.armor.x || p.x - T.halfW > f.armor.x + f.armor.w) continue;
        if (p.y > f.armor.y + f.armor.h || p.y + T.height < f.armor.y) continue;
        p.hp = Math.min(T.armorHp, p.hp + 5);
        s.armorCd = f.armor.respawn;
        emit(s, 'armor', `spot-${s.frame}`, { a: p.slot, x: p.x, y: p.y + 0.4 });
        break;
      }
    }
  }

  const d = s.dragon;
  if (f.temple && isCrusade(m) && d.stage === 0 && s.phase === Phase.Play && s.clock >= CR.templeAutoCollapse) {
    collapseTemple(m, s, -1);
  }
  if (f.dragon && d.stage > 0) {
    if (d.stage !== 4) d.timer--;
    if (d.stage === 1 && d.timer <= 0) { d.stage = 2; d.timer = 150; emit(s, 'dragon-wake', 0); }
    else if (d.stage === 2 && d.timer <= 0) { d.stage = 3; d.timer = 120; emit(s, 'dragon-rise', 0); }
    else if (d.stage === 3 && d.timer <= 0) {
      d.stage = 4;
      d.timer = 0;
      startSwoop(m, s);
    } else if (d.stage === 4) {
      // Swooping across the arena; touching the dragon hurts.
      d.x += (d.timer > 0 ? 1 : -1) * 9 * dt;
      const span = v.w / 2 + 2;
      const cx = v.x + v.w / 2;
      const u = (d.x - cx) / span;
      d.y = v.y + v.h - 2 - 7 * (1 - u * u);
      for (const p of s.players) {
        if (!p.active || !p.alive || p.invuln > 0) continue;
        if (d.hitMask & (1 << p.slot)) continue; // once per swoop
        const dx = p.x - d.x;
        const dy = p.y + T.height / 2 - d.y;
        if (dx * dx + dy * dy < 0.9 * 0.9) {
          d.hitMask |= 1 << p.slot;
          const [kx, ky] = knockFrom(10, dx || 1, dy + 0.5);
          damage(m, s, p, d.by >= 0 && d.by !== p.slot ? d.by : -1, 2, kx, ky, 200);
        }
      }
      if (d.x < v.x - 4 || d.x > v.x + v.w + 4) {
        d.stage = 5;
        d.timer = isCrusade(m) ? randInt(s, 600, 1000) : randInt(s, 900, 1500);
      }
    } else if (d.stage === 5 && d.timer <= 0 && s.phase === Phase.Play) {
      d.stage = 4;
      startSwoop(m, s);
    }
  }
}

function startSwoop(m: Match, s: GameState) {
  const v = m.level.view;
  const d = s.dragon;
  const fromLeft = rand(s) < 0.5;
  d.timer = fromLeft ? 1 : -1; // direction flag while swooping
  d.hitMask = 0;
  d.x = fromLeft ? v.x - 3 : v.x + v.w + 3;
  d.y = v.y + v.h - 2;
  emit(s, 'dragon-swoop', s.frame, { v: fromLeft ? 1 : -1 });
}

// ------------------------------------------------------------------ queries
export function leader(m: Match, s: GameState): number {
  let best = -1;
  let bestScore = 0;
  for (const p of s.players) {
    if (!p.active) continue;
    if (p.score > bestScore) { bestScore = p.score; best = p.slot; }
  }
  return best;
}

export function isTeamMatch(m: Match): boolean {
  return m.cfg.teams;
}

export { teamOf, teamScore, crownHolder, isCrusade };
