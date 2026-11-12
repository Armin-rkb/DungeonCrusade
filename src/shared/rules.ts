// Small rule queries shared by the simulation and the CPU players (kept in
// their own module so bot.ts and sim.ts do not import each other).

import type { LevelRuntime } from './level';
import type { GameState, MatchConfig } from './types';

export interface RulesMatch {
  cfg: MatchConfig;
}

interface LevelMatch {
  level: LevelRuntime;
}

/** Crusade = the remixed rules (parry, splats, ammo, bounty, perks). */
export function isCrusade(m: RulesMatch): boolean {
  return m.cfg.mode === 'crusade';
}

export function teamOf(m: RulesMatch, slot: number): number {
  return m.cfg.teams ? m.cfg.slots[slot]?.team ?? slot : slot;
}

/** Slot of the crowned leader: strictly highest score (Crusade). -1 when tied or nobody scored. */
export function crownHolder(m: RulesMatch, s: GameState): number {
  let best = -1;
  let bestScore = 0;
  let tie = false;
  for (const p of s.players) {
    if (!p.active) continue;
    if (p.score > bestScore) { bestScore = p.score; best = p.slot; tie = false; }
    else if (p.score === bestScore && bestScore > 0) tie = true;
  }
  return tie ? -1 : best;
}

/** Current sea level on tide arenas (-Infinity elsewhere). Depends only on the play clock. */
export function tideLevel(m: LevelMatch, s: GameState): number {
  const t = m.level.features.tide;
  if (!t) return -Infinity;
  const k = s.clock % (t.calm + t.rise + t.flood + t.ebb);
  if (k < t.calm) return t.low;
  if (k < t.calm + t.rise) return t.low + ((t.high - t.low) * (k - t.calm)) / t.rise;
  if (k < t.calm + t.rise + t.flood) return t.high;
  return t.high - ((t.high - t.low) * (k - t.calm - t.rise - t.flood)) / t.ebb;
}

/** The flood is announced, rising or in: low ground is not safe. */
export function tideDanger(m: LevelMatch, s: GameState): boolean {
  const t = m.level.features.tide;
  if (!t) return false;
  const k = s.clock % (t.calm + t.rise + t.flood + t.ebb);
  return k >= t.calm - t.warn && k < t.calm + t.rise + t.flood;
}
