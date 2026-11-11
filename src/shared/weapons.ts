// The ten weapons of the original game. Damage / knockback / cooldown values
// start from the original prefabs (Assets/Prefabs/Bullets/*.prefab and
// PlayerWeapon.cs) and were re-tuned for snappier PvP.

export enum W {
  Stone = 0,
  Pill = 1,
  Shuriken = 2,
  Hadouken = 3,
  Pizza = 4,
  Barrel = 5,
  Sock = 6,
  Duck = 7,
  Bomb = 8,
  Music = 9,
}

export const WEAPON_COUNT = 10;

export interface WeaponDef {
  id: W;
  name: string;
  /** Frames between shots (60 fps). */
  cooldown: number;
  /** Damage of the direct hit (explosives: of the blast). */
  damage: number;
  /** Knockback strength, original scale. */
  knockback: number;
  /** Launch speed in units/second. */
  speed: number;
  /** Gravity in units/second^2 (0 = straight). */
  gravity: number;
  /** Hitbox half extents. */
  hw: number;
  hh: number;
  /** Clash weight: when projectiles of different owners meet the lighter one breaks. 0 = never clashes. */
  weight: number;
  /** Lifetime in frames. */
  life: number;
  /** Animation used by the thrower: 'throw' | 'hadouken' | 'mic'. */
  pose: 'throw' | 'hadouken' | 'mic';
  /** Short description for the HUD / how-to-play. */
  blurb: string;
}

export const WEAPONS: WeaponDef[] = [
  { id: W.Stone, name: 'Stone', cooldown: 26, damage: 1, knockback: 2.5, speed: 14, gravity: 12, hw: 0.11, hh: 0.1, weight: 1, life: 120, pose: 'throw', blurb: 'Quick arcing pebble' },
  { id: W.Pill, name: 'Pill', cooldown: 46, damage: 2, knockback: 4, speed: 8, gravity: 22, hw: 0.12, hh: 0.12, weight: 1, life: 170, pose: 'throw', blurb: 'Bounces along the floor' },
  { id: W.Shuriken, name: 'Shuriken', cooldown: 20, damage: 1, knockback: 2.5, speed: 19, gravity: 0, hw: 0.15, hh: 0.15, weight: 1, life: 90, pose: 'throw', blurb: 'Fast and precise' },
  { id: W.Hadouken, name: 'Fireball', cooldown: 42, damage: 2, knockback: 7, speed: 7, gravity: 0, hw: 0.3, hh: 0.22, weight: 2, life: 200, pose: 'hadouken', blurb: 'Slow, huge push, eats small shots' },
  { id: W.Pizza, name: 'Pizza', cooldown: 80, damage: 4, knockback: 5, speed: 11, gravity: 0, hw: 0.17, hh: 0.17, weight: 2, life: 150, pose: 'throw', blurb: 'Heavy slice, heavy damage' },
  { id: W.Barrel, name: 'Barrel', cooldown: 45, damage: 3, knockback: 6, speed: 7, gravity: 30, hw: 0.32, hh: 0.22, weight: 3, life: 180, pose: 'throw', blurb: 'Rolls over everything' },
  { id: W.Sock, name: 'Stinky Sock', cooldown: 70, damage: 3, knockback: 9, speed: 7.5, gravity: 18, hw: 0.14, hh: 0.14, weight: 0, life: 240, pose: 'throw', blurb: 'Lobbed, explodes in a stink cloud' },
  { id: W.Duck, name: 'Rubber Duck', cooldown: 75, damage: 1, knockback: 5, speed: 8, gravity: 22, hw: 0.16, hh: 0.15, weight: 0, life: 130, pose: 'throw', blurb: 'Bounces, then QUACKS repeatedly' },
  { id: W.Bomb, name: 'Bomb', cooldown: 80, damage: 8, knockback: 11, speed: 5, gravity: 9, hw: 0.17, hh: 0.2, weight: 0, life: 60, pose: 'throw', blurb: '1 in 4 is a nuke. The rest is confetti' },
  { id: W.Music, name: 'Megaphone', cooldown: 62, damage: 2, knockback: 3, speed: 7.5, gravity: 0, hw: 0.17, hh: 0.17, weight: 1, life: 150, pose: 'mic', blurb: 'Three wavy sound notes' },
];

/** Explosion / area hit definitions. */
export const BLASTS = {
  sock: { r: 1.0, damage: 3, knockback: 9, life: 16, pulse: 0 },
  duck: { r: 1.05, damage: 1, knockback: 5, life: 54, pulse: 9 },
  nuke: { r: 2.1, damage: 8, knockback: 11, life: 16, pulse: 0 },
  confetti: { r: 0, damage: 0, knockback: 0, life: 30, pulse: 0 },
} as const;
export type BlastKind = keyof typeof BLASTS;
