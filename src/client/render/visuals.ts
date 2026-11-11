// Mapping from game concepts to the original sprites / animations.

import { W } from '../../shared/weapons';

export interface KnightVisual {
  name: string;
  color: string;
  dark: string;
  icon: string;
  idle: string;
  walk: string;
  jump: string;
  djump: string;
  hit: string;
  death: string;
  throw: string;
  hadouken: string;
  mic: string;
  airThrow: string;
  wall: string; // sprite
}

const gold = 'levi/animations/gold-knight/';
const silver = 'levi/animations/silver-knight/';
const green = 'levi/animations/player3/';
const red = 'levi/animations/player4/';

export const KNIGHTS: KnightVisual[] = [
  {
    name: 'Gold', color: '#ffc53d', dark: '#9a6a00', icon: 'levi/ui/icongoldknight',
    idle: gold + 'gold-knight-idle', walk: gold + 'gold-knight-walk', jump: gold + 'gold-knight-jump',
    djump: gold + 'gold-knight-double-jump', hit: gold + 'gold-knight-hit', death: gold + 'gold-knight-death',
    throw: gold + 'gold-knight-throw', hadouken: gold + 'gold-knight-hadouken', mic: gold + 'gold-knight-microphone',
    airThrow: gold + 'gold-knight-jumpattackone', wall: gold + 'holdwall1',
  },
  {
    name: 'Silver', color: '#c9d4ea', dark: '#5b6680', icon: 'levi/ui/iconsilverknight',
    idle: silver + 'silver-knight-idle', walk: silver + 'silver-knight-walk', jump: silver + 'silver-knight-jump',
    djump: silver + 'silver-knight-double-jump', hit: silver + 'silver-knight-hit', death: silver + 'silver-knight-death',
    throw: silver + 'silver-knight-throw', hadouken: silver + 'silver-knight-hadouken', mic: silver + 'silver-knight-microphone',
    airThrow: silver + 'silver-knight-jumpattack', wall: silver + 'holdwall2',
  },
  {
    name: 'Green', color: '#5fd35f', dark: '#1f6e2a', icon: 'levi/ui/icongreenknight',
    idle: green + 'player-3-idle', walk: green + 'player-3-walk', jump: green + 'player-3-jump',
    djump: green + 'player-3-doublejump', hit: green + 'player-3-hit', death: green + 'player-3-death',
    throw: green + 'player-3-attack', hadouken: green + 'player-3-hadouken', mic: green + 'player-3-microphone',
    airThrow: green + 'player-3-jumpattack', wall: green + 'green-knight-wallslide',
  },
  {
    name: 'Red', color: '#ff5d6c', dark: '#8a1c2a', icon: 'levi/ui/iconredknight',
    idle: red + 'player-4-idle', walk: red + 'player-4-walk', jump: red + 'player-4-jump',
    djump: red + 'player-4-doublejump', hit: red + 'player-4-hit', death: red + 'player-4-death',
    throw: red + 'player-4-attack', hadouken: red + 'player-4-hadouken', mic: red + 'player-4-microphone',
    airThrow: red + 'player-4-jumpattack', wall: red + 'red-knight-wallslide',
  },
];

export const TEAM_COLORS = ['#ff6b5e', '#4fa8ff'];

export interface ProjVisual {
  sprite?: string;
  anim?: string;
  scale: number;
  spin?: number; // degrees per second
  trail?: string;
}

export const PROJECTILES: Record<number, ProjVisual> = {
  [W.Stone]: { sprite: 'levi/animations/projectiles/_0010_steen', scale: 3, spin: 540 },
  [W.Pill]: { anim: 'levi/animations/projectiles/pill-projectile', scale: 2.4 },
  [W.Shuriken]: { anim: 'levi/animations/projectiles/shuriken-projectile', scale: 2.4, spin: 1440, trail: '#d8f0ff' },
  [W.Hadouken]: { anim: 'levi/animations/projectiles/hadouken-projectile', scale: 3, trail: '#ff9a2e' },
  [W.Pizza]: { anim: 'levi/projectiles/new-projectiles-2/pizza-v2', scale: 3, spin: 0, trail: '#ffd34d' },
  [W.Barrel]: { anim: 'levi/projectiles/new-projectiles-2/barrel-roll-v2', scale: 3 },
  [W.Sock]: { sprite: 'levi/animations/projectiles/_0004_sok', scale: 3, spin: 600 },
  [W.Duck]: { sprite: 'levi/animations/projectiles/rubberduck', scale: 3 },
  [W.Bomb]: { sprite: 'levi/animations/projectiles/bommetje', scale: 3 },
  [W.Music]: { anim: 'levi/projectiles/new-projectiles-2/music-note-1', scale: 2.2 },
};

export const MUSIC_NOTES = [
  'levi/projectiles/new-projectiles-2/music-note-1',
  'levi/projectiles/new-projectiles-2/music-note-2',
  'levi/projectiles/new-projectiles-2/music-note-3',
];

export const WEAPON_ICONS: Record<number, string> = {
  [W.Stone]: 'levi/props/weapon-icons/_0010_steen',
  [W.Pill]: 'levi/props/weapon-icons/_0005_pil',
  [W.Shuriken]: 'levi/props/weapon-icons/_0003_shuriken',
  [W.Hadouken]: 'levi/props/weapon-icons/hadouken-icon#0',
  [W.Pizza]: 'levi/props/weapon-icons/pizza-icon',
  [W.Barrel]: 'levi/props/weapon-icons/barrel-icon',
  [W.Sock]: 'levi/props/weapon-icons/_0004_sok',
  [W.Duck]: 'levi/animations/projectiles/rubberduck',
  [W.Bomb]: 'levi/props/weapon-icons/bommetje',
  [W.Music]: 'levi/props/weapon-icons/microfoon-icon',
};

export const FX = {
  stoneImpact: 'levi/fx/stone-impact',
  shurikenImpact: 'levi/fx/v2/shuriken-effect',
  notePop: 'levi/fx/v2/music-note-pop',
  pizzaExplosion: 'levi/fx/v2/pizza-explosion',
  bigExplosion: 'levi/fx/v2/explosion-v2',
  boom: 'animations/fx/sockexplosion',
  duckBoom: 'animations/fx/duckexplosion',
  smoke: 'animations/fx/smoke',
  sparkles: 'levi/fx/sparkles-fx',
  rain: 'levi/fx/rain-v2',
  hadoukenImpact: 'levi/fx/v2/hadouken-impact',
  barrelBits: 'levi/fx/v2/barrel-impact-particles',
} as const;

export const CHEST = {
  weapon: 'levi/props/chest-weapons#0',
  weaponOpen: 'levi/props/chest-weapons#1',
  armor: 'levi/props/chest-armor#0',
  armorOpen: 'levi/props/chest-armor#1',
};
