// CPU players. Bots run inside the deterministic simulation (they only read
// the game state and draw from the shared PRNG), so they behave identically on
// every peer and can fill empty slots in online matches too.

import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_UP } from './input';
import { rand } from './rng';
import type { Match } from './sim';
import { T } from './tuning';
import type { GameState, PlayerState } from './types';
import { W, WEAPONS } from './weapons';

const THINK = [0, 15, 8, 4]; // frames between decisions per difficulty
const DODGE = [0, 0.12, 0.4, 0.75];
const AIM_SLOP = [0, 1.0, 0.65, 0.45]; // vertical tolerance when shooting

function teamOf(m: Match, slot: number): number {
  return m.cfg.teams ? m.cfg.slots[slot]?.team ?? slot : slot;
}

function groundAhead(m: Match, s: GameState, x: number, y: number): boolean {
  for (const so of m.level.solids) {
    if (so.breakable >= 0 && s.destroyed[so.breakable]) continue;
    if (so.group && s.groupsGone.includes(so.group)) continue;
    if (x < so.x || x > so.x + so.w) continue;
    const top = so.y + so.h;
    if (top <= y + 0.05 && top > y - 7) return true;
  }
  return false;
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
  let out = p.btn & ~(BTN_JUMP | BTN_ATTACK);

  // Hold jump for a few frames for full height jumps.
  if (ai.jumpHold > 0) {
    ai.jumpHold--;
    out |= BTN_JUMP;
  }
  if (ai.wantShoot > 0) {
    ai.wantShoot--;
    out |= BTN_ATTACK;
  }

  ai.timer--;
  ai.idle++;
  if (ai.timer > 0) return out;
  ai.timer = THINK[lvl] + Math.floor(rand(s) * 3);

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
    if (p.wall === ai.dir || (p.ground && rand(s) < 0.3)) {
      out |= BTN_JUMP;
      ai.jumpHold = 12;
    } else if (!p.ground && p.jumps > 0 && p.vy < 0 && rand(s) < 0.4) {
      out |= BTN_JUMP;
      ai.jumpHold = 10;
    }
    if (p.wall === ai.dir && p.ground) ai.dir = -ai.dir;
    return out;
  }

  // ---- choose a target: nearest living enemy
  let target: PlayerState | null = null;
  let best = 1e9;
  for (const o of s.players) {
    if (o === p || !o.active || !o.alive) continue;
    if (teamOf(m, o.slot) === teamOf(m, p.slot)) continue;
    const dx = wrappedDx(m, p.x, o.x);
    const dy = o.y - p.y;
    const d = dx * dx + dy * dy * 1.5 + (o.invuln > 0 ? 40 : 0);
    if (d < best) { best = d; target = o; }
  }

  // ---- go for chests when holding the starter weapon
  let goalX = target ? target.x : m.level.view.x + m.level.view.w / 2;
  let goalY = target ? target.y : p.y;
  let chasingChest = false;
  if (p.weapon === W.Stone || p.hp <= 2) {
    for (const c of s.pickups) {
      if (c.opened || !c.ground) continue;
      if (c.kind === 'armor' && p.hp > 5) continue;
      const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
      if (d < 9) { goalX = c.x; goalY = c.y - 0.2; chasingChest = true; break; }
    }
  }

  const dx = wrappedDx(m, p.x, goalX);
  const dy = goalY - p.y;
  const def = WEAPONS[p.weapon];
  const lob = def.gravity > 15 || p.weapon === W.Sock || p.weapon === W.Bomb;
  const ideal = chasingChest ? 0 : lob ? 3.5 : p.weapon === W.Barrel ? 2 : 5.5;

  let dir = 0;
  if (chasingChest || Math.abs(dx) > ideal + 1 || Math.abs(dy) > 1.6) dir = dx > 0 ? 1 : -1;
  else if (Math.abs(dx) < ideal - 1.5) dir = dx > 0 ? -1 : 1;
  else if (rand(s) < 0.25) dir = rand(s) < 0.5 ? -1 : 1;

  // Don't run off a ledge into the void.
  if (dir !== 0 && p.ground && !groundAhead(m, s, p.x + dir * 0.9, p.y)) {
    if (dy > -1 || rand(s) < 0.6) dir = 0;
  }

  out &= ~(BTN_LEFT | BTN_RIGHT | BTN_UP | BTN_DOWN);
  if (dir > 0) out |= BTN_RIGHT;
  else if (dir < 0) out |= BTN_LEFT;

  // ---- jumping
  const wallAhead = p.wall !== 0 && p.wall === dir;
  if (p.ground && (dy > 1.2 || wallAhead) && Math.abs(dx) < 7) {
    out |= BTN_JUMP;
    ai.jumpHold = dy > 2.5 ? 14 : 8;
  } else if (!p.ground && p.vy < 1 && dy > 0.8 && p.jumps > 0 && rand(s) < 0.7) {
    out |= BTN_JUMP;
    ai.jumpHold = 10;
  } else if (!p.ground && p.wall !== 0 && dy > 0) {
    out |= BTN_JUMP;
    ai.jumpHold = 8;
  } else if (p.ground && dy < -1.5 && Math.abs(dx) < 4 && rand(s) < 0.5) {
    out |= BTN_DOWN | BTN_JUMP; // drop through platforms
  }

  // ---- dodge incoming shots
  for (const pr of s.projs) {
    if (pr.owner === p.slot || (m.cfg.teams && pr.team === teamOf(m, p.slot))) continue;
    const rx = p.x - pr.x;
    const ry = p.y + T.height / 2 - pr.y;
    if (Math.abs(ry) > 0.8 || Math.abs(rx) > 4) continue;
    if (Math.sign(pr.vx) !== Math.sign(rx)) continue;
    if (rand(s) < DODGE[lvl]) {
      out |= BTN_JUMP;
      ai.jumpHold = 10;
    }
    break;
  }

  // ---- shooting
  if (target && !chasingChest && p.cd <= 0) {
    const tdx = wrappedDx(m, p.x, target.x);
    const tdy = target.y - p.y;
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
