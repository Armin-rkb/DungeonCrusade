// Arenas designed for v2, built from the original game's art with the ASCII
// arena builder (./arena.ts). Each one is built around one idea:
//
//  * Oubliette    - a bottomless crypt shaft: everything loops top to bottom
//                   and side to side, shots included.
//  * High Tide    - a daytime beach where the sea rises every 30 s and swallows
//                   the sand and the low piers.
//  * Sky Shrine   - floating shrine islands with no walls and no floor: knock
//                   rivals off. Gusts of wind push knights and bend shots.
//  * Twin Keeps   - two castle keeps facing off over a courtyard in the rain;
//                   their glowing merlons give cover until they crumble.
//
// The top two rows sit under the HUD, so they never hold anything you stand on.

import type { LevelData, LevelLayer } from '../level';
import { buildArena, deco } from './arena';

const BG = 'sprites/placeholder/art1352016/background-etc/';
const TILES = 'sprites/placeholder/art1352016/platform-tiles/';
const SPACE = 'sprites/placeholder/space2';
const SUN = 'levi/map-2/sun';

/** A puffy cloud made of the beach sun's white disc (4 units across at scale 1). */
function cloud(x: number, y: number, size: number, z: number, alpha = 'f0'): LevelLayer[] {
  const puffs: Array<[number, number, number]> = [[-0.85, -0.1, 0.55], [0, 0.25, 0.75], [0.9, -0.05, 0.6], [0.35, -0.25, 0.6], [-0.4, -0.3, 0.55]];
  return puffs.map(([dx, dy, d], i) => deco(SUN, x + dx * size, y + dy * size, z + i * 0.01, { sx: (d * size) / 4, sy: (d * size) / 4, color: `#ffffff${alpha}` }));
}

// ------------------------------------------------------------------ Oubliette
export const OUBLIETTE: LevelData = buildArena({
  id: 'oubliette',
  name: 'Oubliette',
  theme: 'crypt',
  bgColor: '#05020c',
  music: 'sound/music/dungeon',
  wrapX: true,
  wrapY: true,
  map: [
    '.........................',
    '.........................',
    '.c.....................c.',
    '###...................###',
    '.........................',
    '......1...........2......',
    '....#####.......#####....',
    '.........................',
    '..........c...c..........',
    '.........###.###.........',
    '.........................',
    '..3...................4..',
    '.#####.............#####.',
    '.........................',
  ],
  layers: [
    deco(SPACE, 0, -0.5, 100000, { sx: 5.2, sy: 3, color: '#0a0718ff', group: 'lightning-bg' }),
    deco(`${BG}towers`, 0, -0.5, 300000, { sx: 3, sy: 3, color: '#8a78ff52' }),
    deco(`${BG}bg-v2`, 0, -0.5, 400000, { sx: 3, sy: 3, color: '#6a5cc040' }),
    // Glowing bones on the ledges around the bottomless shaft.
    deco('sprites/placeholder/lightuptiles/tile1_1', -2.5, -3, 650000, { anim: 'sprites/placeholder/lightuptiles/floatingtile' }),
    deco('sprites/placeholder/lightuptiles/tile1_1', 2.5, -3, 650000, { anim: 'sprites/placeholder/lightuptiles/floatingtile', sx: -1 }),
  ],
});

// ------------------------------------------------------------------ High Tide
const MAP2 = 'levi/map-2/';
/** Pier legs (3.25 units tall each), stacked from a plank down to the sea floor. */
function legs(xs: number[], top: number): LevelLayer[] {
  const out: LevelLayer[] = [];
  for (const x of xs) for (let y = top - 1.6; y > -8.5; y -= 3.2) out.push(deco(`${MAP2}tiles/_0005_pillar-3`, x, y, 500000 + x * 0.001));
  return out;
}

export const HIGH_TIDE: LevelData = buildArena({
  id: 'tide',
  name: 'High Tide',
  theme: 'beach',
  bgColor: '#b4e2f7',
  music: 'sound/music/wackybeach',
  wrapX: true,
  map: [
    '.........................',
    '.........................',
    '............c............',
    '..........=====..........',
    '.........................',
    '.....c...........c.......',
    '...======.......======...',
    '.........................',
    '..1........c..........2..',
    '=====.....=====.....=====',
    '.........................',
    '....====.........====....',
    '...3........c..........4.',
    '#########################',
  ],
  layers: [
    deco(`${MAP2}moving-sky_day#0`, 0, 1.8, 100000),
    deco(`${MAP2}moving-sky_day#0`, 0, 10.8, 100001, { sy: -1 }),
    deco(SUN, 8.5, 4.2, 200000, { sx: 0.5, sy: 0.5, color: '#fff3b0ff' }),
    ...cloud(-8, 4.6, 1.4, 210000, 'c0'), ...cloud(1, 3.6, 0.9, 210100, 'a0'),
    // The far sea is pale and hazy so the real (deep blue) tide reads clearly in front of it.
    deco(`${MAP2}zee-spritesheet-v2#0`, -6.4, -1.4, 300000, { anim: 'levi/map-2/de-zee-twee', color: '#ffffff99' }),
    deco(`${MAP2}zee-spritesheet-v2#0`, 6.4, -1.4, 300001, { anim: 'levi/map-2/de-zee-twee', color: '#ffffff99' }),
    deco(`${MAP2}zee-spritesheet-v2#0`, -19.2, -1.4, 300002, { anim: 'levi/map-2/de-zee-twee', color: '#ffffff99' }),
    deco(`${MAP2}zee-spritesheet-v2#0`, 19.2, -1.4, 300003, { anim: 'levi/map-2/de-zee-twee', color: '#ffffff99' }),
    deco(`${MAP2}sand`, 0, -6.7, 650000, { sy: 0.6, color: '#fff2c8ff' }),
    ...legs([-1.6, 1.6], 3.15),
    ...legs([-8.6, -4.4, 4.4, 8.6], 0.15),
    ...legs([-10.5, 10.5], -2.85),
    ...legs([-7.6, -5.4, 5.4, 7.6], -4.85),
  ],
});

// ------------------------------------------------------------------ Sky Shrine
const DRG = 'sprites/dragonlevel/';
function torii(x: number, top: number, bottom: number): LevelLayer[] {
  const out: LevelLayer[] = [];
  for (let y = top - 0.5; y > bottom - 0.5; y -= 1) out.push(deco(`${DRG}redpillars#0`, x, y, 550000));
  return out;
}

export const SKY_SHRINE: LevelData = buildArena({
  id: 'shrine',
  name: 'Sky Shrine',
  theme: 'shrine',
  bgColor: '#8fd0ff',
  music: 'sound/music/dragon',
  map: [
    '.........................',
    '.........................',
    '.........................',
    '..........=====..........',
    '.........................',
    '....c.......c.......c....',
    '...====...........====...',
    '.........................',
    '....1.....3...4.....2....',
    '..#####...#####...#####..',
    '...###....#####....###...',
    '....#......###......#....',
    '.........................',
    '.........................',
  ],
  layers: [
    deco(SPACE, 0, -0.5, 100000, { sx: 5.2, sy: 3, color: '#93d3ffff' }),
    deco(SUN, -8.5, 4.6, 110000, { sx: 0.45, sy: 0.45, color: '#fffbe0ff' }),
    deco(`${DRG}background`, 0, -4.6, 200000, { color: '#dcecff70' }),
    ...cloud(-6, 4.4, 1.3, 250000, 'e0'), ...cloud(7, 3.4, 1.6, 251000, 'e0'), ...cloud(11.5, 5.6, 0.9, 252000, 'd0'),
    ...cloud(-11, -6.6, 2.4, 260000), ...cloud(-4, -7.2, 2.6, 261000), ...cloud(3, -6.8, 2.4, 262000), ...cloud(10, -7.1, 2.6, 263000),
    ...torii(-9, -0.25, -2.5), ...torii(-6, -0.25, -2.5), ...torii(6, -0.25, -2.5), ...torii(9, -0.25, -2.5),
    ...torii(-2, 2.75, -2.5), ...torii(2, 2.75, -2.5),
    deco(`${DRG}sign`, 0, 2.3, 560000, { sx: 0.8, sy: 0.8 }),
    // A sea of clouds swallows whoever falls.
    ...cloud(-8, -8.2, 2.6, 800000, 'f8'), ...cloud(0, -8.5, 2.8, 801000, 'f8'), ...cloud(8.5, -8.3, 2.6, 802000, 'f8'),
  ],
});

// ------------------------------------------------------------------ Twin Keeps
/** Rain over the courtyard and the keeps' roofs (not inside them). */
const rain = (x: number, y: number, w: number, h: number) => ({ type: 'rain', x, y, emitter: { x, y, w, h }, direction: { x: 0.18, y: 0.98 }, z: 499999 });

export const TWIN_KEEPS: LevelData = buildArena({
  id: 'keeps',
  name: 'Twin Keeps',
  theme: 'crypt',
  bgColor: '#0b0f2a',
  music: 'sound/music/chiptune_motorcade',
  map: [
    '#########################',
    '#.......................#',
    '#..........c.c..........#',
    '#........#######........#',
    '#.......................#',
    '######.............######',
    '#,,,,...##.....##...,,,,#',
    '#,,,,...............,,,,#',
    '#,1,,%.............%,,2,#',
    '######...#######...######',
    '#,,,,...............,,,,#',
    '#,,,,..##.......##..,,,,#',
    '#,3,,%....c...c....%,,4,#',
    '#########################',
  ],
  legend: {
    ',': (x, y) => [deco(`${TILES}black-tile`, x, y, 550000, { color: '#000000b8' })],
  },
  layers: [
    deco(SPACE, 0, -0.5, 100000, { sx: 5.2, sy: 3, color: '#0b0f2aff', group: 'lightning-bg' }),
    deco(SUN, 7.5, 4.2, 150000, { sx: 0.35, sy: 0.35, color: '#fff6d8e0' }),
    deco(`${BG}towers`, 0, -0.5, 300000, { sx: 3, sy: 3, color: '#ffffff68' }),
    ...[[-10, -2], [10, -2], [-10, -6], [10, -6]].map(([x, y]) => deco(`${TILES}black-tile`, x, y, 550000, { color: '#000000b8' })),
    deco(`${TILES}candle-holder-stand`, 0, -5.7, 700000, { group: 'armor' }),
    deco('levi/fx/sparkles#0', 0, -5, 700001, { group: 'armor', anim: 'levi/fx/sparkles-fx', name: 'SparkleFX' }),
  ],
  props: [rain(-6.5, -6.5, 13, 13), rain(-12, 1.5, 6, 5), rain(6, 1.5, 6, 5)],
});
