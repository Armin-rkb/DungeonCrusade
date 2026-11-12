// Level registry: the three arenas of the original game, the arenas designed
// for v2 (./arenas.ts) and a test arena.
import { buildLevel, testArenaData, type LevelData, type LevelRuntime, type LevelTweaks } from '../level';
import type { GameMode, LevelId } from '../types';
import dungeonData from './dungeon.json';
import beachData from './beach.json';
import dragonData from './dragon.json';
import { HIGH_TIDE, OUBLIETTE, SKY_SHRINE, TWIN_KEEPS } from './arenas';

export interface LevelInfo {
  id: LevelId;
  name: string;
  /** manifest image id of the menu preview ('' = rendered from the level itself) */
  preview: string;
  /** Designed for v2 (not in the original game). */
  isNew?: boolean;
  music: string;
  blurb: string;
}

export const LEVELS: LevelInfo[] = [
  { id: 'dungeon', name: 'Dungeon', preview: 'sprites/menu/dungeonpreview', music: 'sound/music/dungeon', blurb: 'Stormy castle crypt. Barrels smash cracked walls.' },
  { id: 'beach', name: 'Wacky Beach', preview: 'sprites/menu/wackypreview', music: 'sound/music/wackybeach', blurb: 'Sunset piers. Seagulls drop surprise chests.' },
  { id: 'dragon', name: 'Dragon Temple', preview: 'sprites/menu/dragonpreview', music: 'sound/music/dragon', blurb: 'Nuke the temple... and wake what sleeps inside.' },
  { id: 'oubliette', name: 'Oubliette', preview: '', music: 'sound/music/dungeon', blurb: 'A bottomless shaft. Fall out the floor, drop in from the ceiling. Shots loop too.', isNew: true },
  { id: 'tide', name: 'High Tide', preview: '', music: 'sound/music/wackybeach', blurb: 'The sea rises every 30 seconds. Get to the high piers or get washed away.', isNew: true },
  { id: 'shrine', name: 'Sky Shrine', preview: '', music: 'sound/music/dragon', blurb: 'Islands above the clouds. No walls, no floor: knock them off. Gusts bend every shot.', isNew: true },
  { id: 'keeps', name: 'Twin Keeps', preview: '', music: 'sound/music/chiptune_motorcade', blurb: 'Two stone keeps, one courtyard. Hide behind the wooden barricades until they get smashed.', isNew: true },
];

type TweaksFor = (mode: GameMode) => LevelTweaks;
const registry: Partial<Record<LevelId, { data: LevelData; tweaks: TweaksFor }>> = {};

export function registerLevel(id: LevelId, data: LevelData, tweaks: LevelTweaks | TweaksFor) {
  registry[id] = { data, tweaks: typeof tweaks === 'function' ? tweaks : () => tweaks };
}

type SolidLike = { name: string; tag: string; group?: string; oneWay?: boolean; h: number };

// ---- Dungeon: closed crypt. Barrels / nukes smash the cracked tiles, the candle
// alcove gives armor every 30 s. Crusade: the inner walls crumble under fire,
// opening sightlines as the match goes on.
const CRUMBLING = /^Platform \((113|119|42|115|31)\)$|^Platform \(15\)/;
registerLevel('dungeon', dungeonData as unknown as LevelData, (mode) => ({
  wrapX: false,
  view: { x: -12.75, y: -7.5, w: 25.5, h: 14 },
  breakable: (s) => !!s.group?.startsWith('destructible') || (mode === 'crusade' && CRUMBLING.test(s.name)),
  features: {
    lightning: true,
    rain: true,
    armor: { x: -5.25, y: -6.5, w: 0.5, h: 1.63, respawn: 1800 },
  },
}));

// ---- Wacky Beach: open sides wrap around, jump-through planks, seagulls drop chests
// (more often in Crusade).
registerLevel('beach', beachData as unknown as LevelData, (mode) => ({
  wrapX: true,
  oneway: (s) => !!(s as SolidLike).oneWay,
  removeSolid: (s) => /LevelWrap|^sand/.test(s.name),
  extraSolids: [{ x: -19.375, y: -6.375, w: 37.75, h: 0.75 }],
  features: { seagulls: mode === 'crusade' ? { y: 4.2, minDelay: 720, maxDelay: 1200 } : { y: 4.2, minDelay: 1500, maxDelay: 2400 } },
}));

// ---- Dragon Temple: nuke the temple to wake the dragon, who then swoops the arena.
registerLevel('dragon', dragonData as unknown as LevelData, {
  wrapX: false,
  oneway: (s) => !!(s as SolidLike).oneWay || /RedGround \((30|37)\)|Temple_Back/.test(s.name),
  features: {
    temple: { x: -2.5, y: -4.5, w: 5, h: 8 },
    dragon: { x: -7, y: -2 },
  },
});

// ---- Oubliette: no floor, no walls. Everything wraps both ways.
registerLevel('oubliette', OUBLIETTE, {
  wrapX: true,
  wrapY: true,
  features: { lightning: true },
});

// ---- High Tide: wrap-around beach; the tide floods the sand and the low piers.
registerLevel('tide', HIGH_TIDE, (mode) => ({
  wrapX: true,
  oneway: (s) => !!(s as SolidLike).oneWay,
  features: {
    tide: { low: -7.2, high: -4.1, calm: 900, rise: 240, flood: 420, ebb: 240, warn: 180 },
    seagulls: mode === 'crusade' ? { y: 5.6, minDelay: 720, maxDelay: 1200 } : { y: 5.6, minDelay: 1500, maxDelay: 2400 },
  },
}));

// ---- Sky Shrine: ring-out arena with periodic gusts of wind.
registerLevel('shrine', SKY_SHRINE, {
  wrapX: false,
  ringOut: true,
  oneway: (s) => !!(s as SolidLike).oneWay,
  features: { gusts: { every: 1260, jitter: 360, warn: 120, length: 240, speed: 3.2 } },
});

// ---- Twin Keeps: closed castle courtyard. The keeps' barricades break (barrels
// and nukes in Classic, any fire in Crusade).
registerLevel('keeps', TWIN_KEEPS, {
  wrapX: false,
  breakable: (s) => !!s.group?.startsWith('crumble'),
  features: {
    armor: { x: -0.25, y: -6.5, w: 0.5, h: 1.63, respawn: 1800 },
  },
});

const cache = new Map<string, LevelRuntime>();

export function getLevel(id: LevelId, mode: GameMode = 'classic'): LevelRuntime {
  const key = `${id}:${mode}`;
  let l = cache.get(key);
  if (!l) {
    const entry = registry[id];
    l = entry ? buildLevel(entry.data, entry.tweaks(mode)) : buildLevel(testArenaData(), { wrapX: true });
    cache.set(key, l);
  }
  return l;
}

export function levelInfo(id: LevelId): LevelInfo {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
