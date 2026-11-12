// Movement / combat tuning. Shared by the simulation and the CPU players.
export const FPS = 60;
export const DT = 1 / FPS;

export const T = {
  runSpeed: 7.4,
  groundAccel: 110,
  groundDecel: 95,
  airAccel: 62,
  airDecel: 20,
  turnBoost: 1.7,
  gravity: 34,
  gravityApex: 18,
  gravityCut: 72,
  gravityFall: 48,
  maxFall: 15,
  fastFall: 22,
  jumpV: 12.8,
  doubleJumpV: 11,
  coyote: 6,
  jumpBuffer: 8,
  attackBuffer: 8,
  wallSlide: 3,
  wallJumpVX: 7.8,
  wallJumpVY: 12.2,
  wallLock: 9,
  stompBounce: 11.5,
  halfW: 0.23,
  height: 0.8,
  maxHp: 5,
  armorHp: 10,
  respawn: 120,
  spawnInvuln: 100,
  koFreeze: 12,
  countdown: 180,
  endSlowmo: 100,
  kbScale: 2.1,
  creditWindow: 360,
} as const;

/** Crusade mode rules (the remix with parries, splats, ammo and bounties). */
export const CR = {
  swingTime: 16,
  swingActiveFrom: 3, // frames into the swing when the blade becomes active
  swingActiveTo: 11,
  swingCd: 32,
  swingCdSwift: 22,
  swingRange: 0.85,
  swingDamage: 1,
  swingKnock: 8,
  parryBoost: 1.35,
  parryRefund: 8,
  splatSpeed: 9.5,
  splatDamage: 1,
  splatCooldown: 24,
  lowHpKnock: 0.7, // extra knockback at 1 HP (scaled by missing health)
  heavyKnock: 0.85, // Red takes less knockback...
  heavySwing: 1.2, // ...and swings harder
  luckyAmmo: 2, // Gold: double ammo...
  luckyStrong: 0.2, // ...and better chest odds
  swiftRun: 1.08,
  koPoints: 2,
  assistPoints: 1,
  assistMinDamage: 2,
  bountyPoints: 1,
  selfKoPenalty: 1,
  tileHp: 5,
  templeHp: 28,
  templeAutoCollapse: 75 * 60,
  confettiKnock: 8,
  confettiRadius: 1.6,
} as const;

/** Shots per weapon pickup in Crusade (the stone is unlimited). */
export const AMMO: Record<number, number> = { 1: 6, 2: 10, 3: 5, 4: 2, 5: 4, 6: 3, 7: 3, 8: 3, 9: 4 };

/** Crusade knight perks by knight index. */
export const PERKS = [
  { id: 'lucky', name: 'LUCKY', blurb: '2x ammo, luckier loot' },
  { id: 'swift', name: 'SWIFT', blurb: 'faster run & swing' },
  { id: 'bouncy', name: 'BOUNCY', blurb: 'triple jump' },
  { id: 'heavy', name: 'HEAVY', blurb: 'hard to launch' },
] as const;
