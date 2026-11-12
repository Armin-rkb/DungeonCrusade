// CPU players. Bots run inside the deterministic simulation (they only read
// the game state and draw from the shared PRNG), so they behave identically on
// every peer and can fill empty slots in online matches too.

import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_SWING, BTN_UP } from './input';
import { rand } from './rng';
import type { Match } from './sim';
import { crownHolder, teamOf, tideDanger, tideLevel } from './rules';
import { T } from './tuning';
import type { GameState, PlayerState } from './types';
import { W, WEAPONS } from './weapons';

const THINK = [0, 15, 8, 4]; // frames between decisions per difficulty
const DODGE = [0, 0.12, 0.4, 0.75];
const AIM_SLOP = [0, 1.0, 0.65, 0.45]; // vertical tolerance when shooting
const PARRY = [0, 0.15, 0.45, 0.75]; // chance to bat back a projectile (Crusade)


/** Is there something to land on below (x, y), above `minTop` (the sea)? */
function groundAhead(m: Match, s: GameState, x: number, y: number, minTop = -Infinity): boolean {
  for (const so of m.level.solids) {
    if (so.breakable >= 0 && s.destroyed[so.breakable]) continue;
    if (so.group && s.groupsGone.includes(so.group)) continue;
    if (x < so.x || x > so.x + so.w) continue;
    const top = so.y + so.h;
    if (top <= y + 0.05 && top > y - 7 && top >= minTop) return true;
  }
  return false;
}

/** A solid block occupies (x, y). */
function blocked(m: Match, s: GameState, x: number, y: number): boolean {
  for (const so of m.level.solids) {
    if (so.oneway || (so.breakable >= 0 && s.destroyed[so.breakable]) || (so.group && s.groupsGone.includes(so.group))) continue;
    if (x > so.x && x < so.x + so.w && y > so.y && y < so.y + so.h) return true;
  }
  return false;
}

/** Closest surface to stand on with its top in [minTop, y + maxRise] (prefers the highest when `climb`). */
function nearestLedge(m: Match, s: GameState, x: number, y: number, minTop: number, maxRise: number, climb = false): { x: number; top: number } | null {
  let best: { x: number; top: number } | null = null;
  let bestD = 1e9;
  for (const so of m.level.solids) {
    if (so.breakable >= 0 && s.destroyed[so.breakable]) continue;
    if (so.group && s.groupsGone.includes(so.group)) continue;
    const top = so.y + so.h;
    if (top < minTop || top > y + maxRise || so.w < 0.5) continue;
    const nx = so.w <= 0.8 ? so.x + so.w / 2 : Math.max(so.x + 0.4, Math.min(so.x + so.w - 0.4, x));
    // Tops buried under other blocks (the inside of a wall or island) are not standable.
    if (blocked(m, s, nx, top + 0.3)) continue;
    const d = Math.abs(wrappedDx(m, x, nx)) + (climb ? -top * 2 : Math.max(0, top - y) * 0.6);
    if (d < bestD) { bestD = d; best = { x: nx, top }; }
  }
  return best;
}

/**
 * Where to steer when airborne with nothing below: the closest edge we can still
 * make, preferring the direction we are already flying.
 */
function recoveryLedge(m: Match, s: GameState, p: PlayerState, minTop: number): { x: number; top: number } | null {
  const rise = p.jumps > 0 ? 3.6 : p.wall !== 0 ? 2 : 0.4;
  let best: { x: number; top: number } | null = null;
  let bestD = 1e9;
  for (const so of m.level.solids) {
    if (so.breakable >= 0 && s.destroyed[so.breakable]) continue;
    if (so.group && s.groupsGone.includes(so.group)) continue;
    const top = so.y + so.h;
    if (top < minTop || top > p.y + rise || so.w < 0.5) continue;
    const ex = Math.max(so.x + 0.3, Math.min(so.x + so.w - 0.3, p.x));
    if (blocked(m, s, ex, top + 0.3)) continue;
    const dx = wrappedDx(m, p.x, ex);
    const along = dx * p.vx > 0 ? Math.min(Math.abs(p.vx) * 0.25, 1.5) : 0;
    const d = Math.abs(dx) - along + Math.max(0, p.y - top - 4) * 0.5;
    if (d < bestD) { bestD = d; best = { x: ex, top }; }
  }
  return best;
}

function wrappedDy(m: Match, from: number, to: number): number {
  let dy = to - from;
  if (m.level.wrapY) {
    const h = m.level.view.h;
    if (dy > h / 2) dy -= h;
    else if (dy < -h / 2) dy += h;
  }
  return dy;
}

function wrappedDx(m: Match, from: number, to: number): number {
  let dx = to - from;
  if (m.level.wrapX) {
    const w = m.level.view.w;
    if (dx > w / 2) dx -= w;
    else if (dx < -w / 2) dx += w;
  }
  return dx;
}

export function botInput(m: Match, s: GameState, p: PlayerState, level: number): number {
  if (!p.alive || !p.active) return 0;
  const ai = p.ai;
  const lvl = Math.max(1, Math.min(3, level));
  let out = p.btn & ~(BTN_JUMP | BTN_ATTACK | BTN_SWING);
  const crusade = m.cfg.mode === 'crusade';

  // A jump asked for while the button was still held: released last frame, press now.
  if (ai.pressJump > 0) {
    ai.jumpHold = ai.pressJump;
    ai.pressJump = 0;
  }
  // Hold jump for a few frames for full height jumps.
  if (ai.jumpHold > 0) {
    ai.jumpHold--;
    out |= BTN_JUMP;
  }
  if (ai.wantShoot > 0) {
    ai.wantShoot--;
    out |= BTN_ATTACK;
  }

  /** Jump (holding for `hold` frames). Jumps need a fresh press, so release first if still held. */
  const jump = (hold: number) => {
    if (p.btn & BTN_JUMP) {
      out &= ~BTN_JUMP;
      ai.jumpHold = 0;
      ai.pressJump = hold;
    } else {
      out |= BTN_JUMP;
      ai.jumpHold = hold;
    }
  };

  ai.timer--;
  ai.idle++;
  if (ai.timer > 0) return out;
  ai.timer = THINK[lvl] + Math.floor(rand(s) * 3);

  // ---- survival first: get back over solid ground, keep out of the rising sea
  const tide = m.level.features.tide;
  const danger = tide ? (tideDanger(m, s) ? tide.high : tideLevel(m, s)) + 0.4 : -Infinity;
  const canFall = !m.level.wrapY; // falling loops around in wrap-Y arenas
  // Arenas where a misstep kills: the tide and ring-out arenas (the others are closed or floored).
  const hazard = canFall && (!!tide || m.level.ringOut);
  if (hazard && !p.ground && !groundAhead(m, s, p.x, p.y, danger)) {
    const ledge = recoveryLedge(m, s, p, danger);
    out &= ~(BTN_LEFT | BTN_RIGHT | BTN_UP | BTN_DOWN);
    if (ledge) {
      const ddx = wrappedDx(m, p.x, ledge.x);
      if (Math.abs(ddx) > 0.1) out |= ddx > 0 ? BTN_RIGHT : BTN_LEFT;
      // Use the air jump once we drop to the ledge's height (or it is far away).
      if (p.vy < 0.5 && p.jumps > 0 && (p.y < ledge.top + 0.6 || Math.abs(ddx) > 2.5)) jump(14);
      // Clinging to the side of the island: wall-jump off it (that restores the air jump).
      else if (p.wall !== 0 && p.y < ledge.top + 0.2) jump(12);
    }
    return out;
  }

  // ---- unstuck: wander when we have not moved, or nobody got hit for a while
  const wanted = (p.btn & (BTN_LEFT | BTN_RIGHT)) !== 0;
  if (wanted && Math.abs(p.x - ai.lastX) < 0.05) ai.stuck++;
  else ai.stuck = Math.max(0, ai.stuck - 1);
  ai.lastX = p.x;
  if (p.lastHitFrame > s.frame - 30 || p.hits !== ai.target) {
    ai.target = p.hits;
    ai.idle = 0;
  }
  if (ai.reaction <= 0 && (ai.stuck > 4 || ai.idle > 600)) {
    ai.reaction = 70 + Math.floor(rand(s) * 60);
    ai.dir = rand(s) < 0.5 ? -1 : 1;
    ai.stuck = 0;
    ai.idle = 0;
  }
  if (ai.reaction > 0) {
    ai.reaction -= THINK[lvl];
    out &= ~(BTN_LEFT | BTN_RIGHT | BTN_UP | BTN_DOWN);
    out |= ai.dir > 0 ? BTN_RIGHT : BTN_LEFT;
    const safeHop = !hazard || groundAhead(m, s, p.x + ai.dir * 2.5, p.y + 0.5, danger);
    if (p.wall === ai.dir || (p.ground && safeHop && rand(s) < 0.3)) {
      jump(12);
    } else if (!p.ground && !hazard && p.jumps > 0 && p.vy < 0 && rand(s) < 0.4) {
      jump(10);
    }
    if (p.wall === ai.dir && p.ground) ai.dir = -ai.dir;
    if (canFall && p.ground && !groundAhead(m, s, p.x + ai.dir * 0.9, p.y, danger)) {
      ai.dir = -ai.dir;
      out &= ~(BTN_LEFT | BTN_RIGHT);
    }
    return out;
  }

  // ---- choose a target: nearest living enemy (in Crusade, the crowned leader is juicier)
  const crown = crusade ? crownHolder(m, s) : -1;
  let target: PlayerState | null = null;
  let best = 1e9;
  for (const o of s.players) {
    if (o === p || !o.active || !o.alive) continue;
    if (teamOf(m, o.slot) === teamOf(m, p.slot)) continue;
    const dx = wrappedDx(m, p.x, o.x);
    const dy = wrappedDy(m, p.y, o.y);
    const d = (dx * dx + dy * dy * 1.5) * (o.slot === crown ? 0.5 : 1) + (o.invuln > 0 ? 40 : 0);
    if (d < best) { best = d; target = o; }
  }

  // ---- go for chests when holding the starter weapon
  let goalX = target ? target.x : m.level.view.x + m.level.view.w / 2;
  let goalY = target ? target.y : p.y;
  let chasingChest = false;
  if (p.weapon === W.Stone || p.hp <= 2) {
    for (const c of s.pickups) {
      if (c.opened || !c.ground || c.y < danger) continue;
      if (c.kind === 'armor' && p.hp > 5) continue;
      const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
      if (d < 9) { goalX = c.x; goalY = c.y - 0.2; chasingChest = true; break; }
    }
  }

  // The flood is coming: head for the nearest pier above the high-water mark,
  // or the highest one in reach as a stepping stone.
  if (p.y < danger) {
    const ledge = nearestLedge(m, s, p.x, p.y, danger, 3.9) ?? nearestLedge(m, s, p.x, p.y, p.y + 0.5, 3.9, true);
    if (ledge) { goalX = ledge.x; goalY = ledge.top + 0.6; chasingChest = true; }
  }

  const dx = wrappedDx(m, p.x, goalX);
  const dy = wrappedDy(m, p.y, goalY);
  const def = WEAPONS[p.weapon];
  const lob = def.gravity > 15 || p.weapon === W.Sock || p.weapon === W.Bomb;
  const ideal = chasingChest ? 0 : lob ? 3.5 : p.weapon === W.Barrel ? 2 : 5.5;

  let dir = 0;
  if (chasingChest || Math.abs(dx) > ideal + 1 || Math.abs(dy) > 1.6) dir = dx > 0 ? 1 : -1;
  else if (Math.abs(dx) < ideal - 1.5) dir = dx > 0 ? -1 : 1;
  else if (rand(s) < 0.25) dir = rand(s) < 0.5 ? -1 : 1;

  // Don't run off a ledge into the void (or the sea). Jump the gap instead when
  // there is ground to land on across it.
  let leap = false;
  // Stepping off is fine when we are about to jump up onto something right there.
  const climb = p.ground && dy > 1.2 && Math.abs(dx) < 7 && groundAhead(m, s, p.x + dir * 1.2, p.y + 3.8, p.y + 0.5);
  if (canFall && dir !== 0 && p.ground && !climb && !groundAhead(m, s, p.x + dir * 0.9, p.y, danger)) {
    if (hazard && Math.abs(dx) > 2) {
      for (let d = 2; d <= 5; d += 0.5) {
        if (groundAhead(m, s, p.x + dir * d, p.y + 1.5, Math.max(danger, p.y - 1.2))) { leap = true; break; }
      }
    }
    if (!leap && (dy > -1 || rand(s) < 0.6 || hazard)) dir = 0;
  }

  // Airborne over ground: don't drift off its edge while chasing.
  if (hazard && dir !== 0 && !p.ground && !leap && groundAhead(m, s, p.x, p.y, danger) && !groundAhead(m, s, p.x + dir * 0.7, p.y, danger)) dir = 0;

  out &= ~(BTN_LEFT | BTN_RIGHT | BTN_UP | BTN_DOWN);
  if (dir > 0) out |= BTN_RIGHT;
  else if (dir < 0) out |= BTN_LEFT;

  // ---- jumping
  const wallAhead = p.wall !== 0 && p.wall === dir;
  if (leap) {
    jump(14);
  } else if (p.ground && (dy > 1.2 || wallAhead) && Math.abs(dx) < 7) {
    jump(dy > 2.5 ? 14 : 8);
  } else if (!p.ground && p.vy < 1 && dy > 0.8 && p.jumps > 0 && (!hazard || (groundAhead(m, s, p.x, p.y, danger) && groundAhead(m, s, p.x + p.vx * 0.7, p.y, danger))) && rand(s) < 0.7) {
    jump(10);
  } else if (!p.ground && p.wall !== 0 && dy > 0) {
    jump(8);
  } else if (p.ground && dy < -1.5 && Math.abs(dx) < 4 && p.y - 2 > danger && rand(s) < 0.5) {
    out |= BTN_DOWN; // drop through platforms
    jump(1);
  }

  // ---- dodge incoming shots
  for (const pr of s.projs) {
    if (pr.owner === p.slot || (m.cfg.teams && pr.team === teamOf(m, p.slot))) continue;
    const rx = p.x - pr.x;
    const ry = p.y + T.height / 2 - pr.y;
    if (Math.abs(ry) > 0.8 || Math.abs(rx) > 4) continue;
    if (Math.sign(pr.vx) !== Math.sign(rx)) continue;
    if (crusade && p.swingCd <= 0 && Math.abs(rx) < 1.8 && rand(s) < PARRY[lvl]) {
      // Face the incoming shot and bat it back.
      out &= ~(BTN_LEFT | BTN_RIGHT);
      out |= rx > 0 ? BTN_LEFT : BTN_RIGHT;
      out |= BTN_SWING;
      return out;
    }
    if (rand(s) < DODGE[lvl] && (!hazard || (p.ground ? groundAhead(m, s, p.x + p.vx * 0.7, p.y, danger) : groundAhead(m, s, p.x, p.y, danger)))) {
      jump(10);
    }
    break;
  }

  // ---- Crusade: sword swipe when someone is in reach
  if (crusade && target && p.swingCd <= 0) {
    const tdx = wrappedDx(m, p.x, target.x);
    const tdy = wrappedDy(m, p.y, target.y);
    if (Math.abs(tdx) < 1.1 && Math.abs(tdy) < 0.9 && rand(s) < 0.35 + lvl * 0.15) {
      out &= ~(BTN_LEFT | BTN_RIGHT);
      out |= tdx >= 0 ? BTN_RIGHT : BTN_LEFT;
      out |= BTN_SWING;
      return out;
    }
  }

  // ---- shooting
  if (target && !chasingChest && p.cd <= 0) {
    const tdx = wrappedDx(m, p.x, target.x);
    const tdy = wrappedDy(m, p.y, target.y);
    const facing = Math.sign(tdx) || p.face;
    let shoot = false;
    if (lob) {
      shoot = Math.abs(tdx) < 7 && tdy > -2 && tdy < 3;
    } else if (p.weapon === W.Barrel) {
      shoot = Math.abs(tdy) < 0.5 && Math.abs(tdx) < 10 && p.ground;
    } else {
      if (Math.abs(tdy) < AIM_SLOP[lvl]) shoot = Math.abs(tdx) < 13;
      else if (tdy > 1.2 && Math.abs(tdx) < tdy * 2.2 && Math.abs(tdx) > tdy * 0.8) {
        shoot = true;
        out |= BTN_UP;
      }
    }
    if (shoot && rand(s) < 0.35 + lvl * 0.2) {
      out &= ~(BTN_LEFT | BTN_RIGHT);
      out |= facing > 0 ? BTN_RIGHT : BTN_LEFT;
      out |= BTN_ATTACK;
      ai.wantShoot = 2;
    }
  }
  return out;
}
