// Game state. Everything that influences the future of the match lives in
// GameState and is made only of numbers, booleans, strings and arrays so it can
// be cloned for rollback, hashed for desync detection and sent over the wire.

import type { W, BlastKind } from './weapons';

export type LevelId = 'dungeon' | 'beach' | 'dragon' | 'oubliette' | 'tide' | 'shrine' | 'keeps' | 'test';

export interface SlotConfig {
  /** Slot participates in the match. */
  active: boolean;
  /** 0 gold, 1 silver, 2 green, 3 red. */
  knight: number;
  /** 0 = human, 1..3 = CPU difficulty. */
  bot: number;
  /** Team index (only used when MatchConfig.teams). */
  team: number;
  name: string;
}

export type GameMode = 'classic' | 'crusade';

export interface MatchConfig {
  level: LevelId;
  /** 'classic' = the original rules, 'crusade' = the remix. Missing = classic. */
  mode?: GameMode;
  seed: number;
  /** KOs needed to win. */
  targetScore: number;
  /** Seconds, 0 = unlimited. */
  timeLimit: number;
  teams: boolean;
  /** Weapon/armor chests spawn. */
  items: boolean;
  slots: SlotConfig[];
}

export enum Phase {
  Countdown = 0,
  Play = 1,
  End = 2,
}

export interface PlayerState {
  slot: number;
  active: boolean;
  alive: boolean;
  /** Frames until respawn while dead. */
  respawn: number;
  x: number; // feet centre
  y: number;
  vx: number;
  vy: number;
  face: number; // 1 right, -1 left
  ground: boolean;
  /** -1 touching a wall on the left, 1 on the right, 0 none. */
  wall: number;
  jumps: number;
  coyote: number;
  jumpBuf: number;
  jumpHeld: boolean;
  drop: number;
  wallLock: number;
  hp: number;
  weapon: W;
  cd: number;
  cdMax: number;
  burst: number;
  burstTimer: number;
  burstAim: number;
  stun: number;
  hitstop: number;
  invuln: number;
  flash: number;
  lastHitBy: number;
  lastHitFrame: number;
  btn: number;
  prevBtn: number;
  /** Current one-shot action pose: 0 none, 1 throw, 2 hadouken, 3 mic. */
  act: number;
  actTimer: number;
  airTime: number;
  // ---- Crusade mode
  /** Frames left in the current sword swing (0 = not swinging). */
  swing: number;
  swingCd: number;
  /** Slots already hit by the current swing. */
  swingHit: number;
  /** Shots left for the held weapon (-1 = unlimited). */
  ammo: number;
  splatCd: number;
  /** Damage taken from each slot during this life (for assists). */
  dmgBy: number[];
  assists: number;
  parries: number;
  splats: number;
  score: number;
  kos: number;
  deaths: number;
  damageDealt: number;
  shots: number;
  hits: number;
  /** Bot memory. */
  ai: { target: number; timer: number; jumpHold: number; pressJump: number; dir: number; reaction: number; wantShoot: number; stuck: number; lastX: number; idle: number };
}

export interface Projectile {
  id: number;
  kind: W;
  owner: number;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  bounces: number;
  dead: boolean;
  /** Times this projectile was parried (Crusade). */
  refl: number;
  /** Free parameter: music note size, base y for wave motion... */
  p: number;
  q: number;
}

export interface Blast {
  id: number;
  kind: BlastKind;
  owner: number;
  team: number;
  x: number;
  y: number;
  r: number;
  age: number;
  life: number;
  damage: number;
  knockback: number;
  pulse: number;
  /** Bitmask of slots hit during the current pulse. */
  hitMask: number;
}

export interface Pickup {
  id: number;
  kind: 'weapon' | 'armor';
  x: number;
  y: number;
  vy: number;
  ground: boolean;
  age: number;
  opened: number; // frames since opened, 0 = closed
  weapon: number; // revealed weapon after opening
}

export interface Gull {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  dropX: number;
  dropped: boolean;
  timer: number; // frames until next gull
}

export interface DragonState {
  /** 0 asleep, 1 temple destroyed (rumbling), 2 awake, 3 flying, 4 gone. */
  stage: number;
  timer: number;
  x: number;
  y: number;
  by: number; // slot that woke the dragon
  /** Slots already hit during the current swoop. */
  hitMask: number;
}

export interface GameEvent {
  /** Deterministic key: identical when the same thing happens during a rollback re-simulation. */
  k: string;
  t: string;
  x?: number;
  y?: number;
  a?: number; // slot / attacker
  b?: number; // victim / extra
  w?: number; // weapon / kind
  v?: number; // magnitude
}

export interface GameState {
  frame: number;
  rng: number;
  phase: Phase;
  phaseTimer: number;
  /** Global hit-freeze frames (KOs). */
  freeze: number;
  /** Remaining frames of match-end slow motion. */
  slowmo: number;
  /** Frames elapsed while in Play phase. */
  clock: number;
  suddenDeath: boolean;
  players: PlayerState[];
  projs: Projectile[];
  blasts: Blast[];
  pickups: Pickup[];
  nextId: number;
  chestTimer: number;
  destroyed: number[]; // 1 per breakable solid
  groupsGone: string[];
  gull: Gull;
  dragon: DragonState;
  /** Frames until the level armor spot is available again (0 = available). */
  armorCd: number;
  /** Crusade: hit points of breakable tiles / the Dragon temple. */
  tileHp: number[];
  templeHp: number;
  /** Sky Shrine: current gust (signed air speed, 0 = calm), its upcoming direction and frames to the next change. */
  wind: number;
  windDir: number;
  windTimer: number;
  winner: number; // slot (or team when teams) or -1
  winnerTeam: number;
  events: GameEvent[];
}
