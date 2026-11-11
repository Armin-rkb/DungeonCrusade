// Level registry: the three arenas of the original game plus a test arena.
import { buildLevel, testArenaData, type LevelData, type LevelRuntime, type LevelTweaks } from '../level';
import type { LevelId } from '../types';
import dungeonData from './dungeon.json';
import beachData from './beach.json';
import dragonData from './dragon.json';

export interface LevelInfo {
  id: LevelId;
  name: string;
  /** manifest image id of the menu preview */
  preview: string;
  music: string;
  blurb: string;
}

export const LEVELS: LevelInfo[] = [
  { id: 'dungeon', name: 'Dungeon', preview: 'sprites/menu/dungeonpreview', music: 'sound/music/dungeon', blurb: 'Stormy castle crypt. Barrels smash cracked walls.' },
  { id: 'beach', name: 'Wacky Beach', preview: 'sprites/menu/wackypreview', music: 'sound/music/wackybeach', blurb: 'Sunset piers. Seagulls drop surprise chests.' },
  { id: 'dragon', name: 'Dragon Temple', preview: 'sprites/menu/dragonpreview', music: 'sound/music/dragon', blurb: 'Nuke the temple... and wake what sleeps inside.' },
];

const registry: Partial<Record<LevelId, { data: LevelData; tweaks: LevelTweaks }>> = {};

export function registerLevel(id: LevelId, data: LevelData, tweaks: LevelTweaks) {
  registry[id] = { data, tweaks };
}

type SolidLike = { name: string; tag: string; group?: string; oneWay?: boolean; h: number };

// ---- Dungeon: closed crypt. Barrels / nukes smash the cracked tiles, the candle
// alcove gives armor every 30 s.
registerLevel('dungeon', dungeonData as unknown as LevelData, {
  wrapX: false,
  view: { x: -12.75, y: -7.5, w: 25.5, h: 14 },
  breakable: (s) => !!s.group?.startsWith('destructible'),
  features: {
    lightning: true,
    rain: true,
    armor: { x: -5.25, y: -6.5, w: 0.5, h: 1.63, respawn: 1800 },
  },
});

// ---- Wacky Beach: open sides wrap around, jump-through planks, seagulls drop chests.
registerLevel('beach', beachData as unknown as LevelData, {
  wrapX: true,
  oneway: (s) => !!(s as SolidLike).oneWay,
  removeSolid: (s) => /LevelWrap|^sand/.test(s.name),
  extraSolids: [{ x: -19.375, y: -6.375, w: 37.75, h: 0.75 }],
  features: { seagulls: { y: 4.2, minDelay: 1500, maxDelay: 2400 } },
});

// ---- Dragon Temple: nuke the temple to wake the dragon, who then swoops the arena.
registerLevel('dragon', dragonData as unknown as LevelData, {
  wrapX: false,
  oneway: (s) => !!(s as SolidLike).oneWay || /RedGround \((30|37)\)|Temple_Back/.test(s.name),
  features: {
    temple: { x: -2.5, y: -4.5, w: 5, h: 8 },
    dragon: { x: -7, y: -2 },
  },
});

const cache = new Map<string, LevelRuntime>();

export function getLevel(id: LevelId): LevelRuntime {
  let l = cache.get(id);
  if (!l) {
    const entry = registry[id];
    l = entry ? buildLevel(entry.data, entry.tweaks) : buildLevel(testArenaData(), { wrapX: true });
    cache.set(id, l);
  }
  return l;
}

export function levelInfo(id: LevelId): LevelInfo {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
