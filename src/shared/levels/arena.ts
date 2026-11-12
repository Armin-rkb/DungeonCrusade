// ASCII arena builder: turns a character map into LevelData (art layers,
// merged collision boxes, spawn and chest points) using the original game's
// tile sets. Used by the arenas designed for v2 (see ./arenas.ts).
//
// The grid is 1 world unit per character, rows top to bottom. Cell (col, row)
// is centred on x = x0 + col, y = y0 - row (integers, like the Unity scenes).
//
//   #  solid block (autotiled)          %  crumbly block (breakable wall section)
//   =  jump-through platform            1-4 spawn point (feet on the cell bottom)
//   c  chest spawn                      .  or space: empty
//
// Any other character is looked up in ArenaDef.legend (decoration only).

import type { LevelData, LevelLayer, Rect } from '../level';

export type Theme = 'crypt' | 'beach' | 'shrine';

export interface ArenaDef {
  id: string;
  name: string;
  theme: Theme;
  bgColor: string;
  music: string;
  map: string[];
  /** Neighbour lookups wrap around (seamless tiling for wrap-around arenas). */
  wrapX?: boolean;
  wrapY?: boolean;
  /** Art behind the tiles (z < 500000) or in front (z > 700000). */
  layers?: LevelLayer[];
  legend?: Record<string, (x: number, y: number) => LevelLayer[]>;
  props?: LevelData['props'];
}

const CRYPT = 'sprites/placeholder/art1352016/platform-tiles/';
const FLOAT = 'sprites/placeholder/art1352016/floating-tiles/';
const BEACH = 'levi/map-2/tiles/';
const SHRINE = 'sprites/dragonlevel/';

/** Deterministic per-cell variation (no Math.random: levels must be identical everywhere). */
function hash(c: number, r: number): number {
  let h = Math.imul(c + 1013, 0x9e3779b1) ^ Math.imul(r + 7919, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

export function buildArena(def: ArenaDef): LevelData {
  const rows = def.map.length;
  const cols = Math.max(...def.map.map((r) => r.length));
  const grid = def.map.map((r) => r.padEnd(cols, '.'));
  const x0 = -Math.floor(cols / 2);
  const y0 = Math.floor(rows / 2) - 1;
  const cx = (c: number) => x0 + c;
  const cy = (r: number) => y0 - r;
  const view: Rect = { x: x0 - 0.5, y: y0 - rows + 0.5, w: cols, h: rows };

  const at = (c: number, r: number): string => {
    if (def.wrapX) c = (c + cols) % cols;
    if (def.wrapY) r = (r + rows) % rows;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return 'OUT';
    return grid[r][c];
  };
  const isBlock = (ch: string) => ch === '#' || ch === '%' || ch === 'OUT';
  const solidAt = (c: number, r: number) => isBlock(at(c, r));

  const layers: LevelLayer[] = [...(def.layers ?? [])];
  const solids: LevelData['solids'] = [];
  const spawns: LevelData['spawns'] = [];
  const pickupSpawns: LevelData['pickupSpawns'] = [];
  let z = 600000;
  const tile = (sprite: string, x: number, y: number, extra: Partial<LevelLayer> = {}) => {
    layers.push({ sprite, x, y, sx: 1, sy: 1, z: (z += 0.01), name: sprite.split('/').pop() ?? sprite, ...extra });
  };

  // ---- breakable wall sections: vertical runs of '%' in one column
  const crumbleGroup: string[][] = grid.map((r) => [...r].map(() => ''));
  let crumbles = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (grid[r][c] !== '%') continue;
      let e = r;
      while (e + 1 < rows && grid[e + 1][c] === '%') e++;
      const group = `crumble-${crumbles++}`;
      for (let k = r; k <= e; k++) crumbleGroup[k][c] = group;
      solids.push({ x: cx(c) - 0.5, y: cy(e) - 0.5, w: 1, h: e - r + 1, tag: 'Wall', name: `Crumble (${group})`, group });
      r = e;
    }
  }

  // ---- solid blocks: horizontal runs, then merge identical runs downwards
  const runs: Array<{ c0: number; c1: number; r0: number; r1: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '#') continue;
      let e = c;
      while (e + 1 < cols && grid[r][e + 1] === '#') e++;
      const above = runs.find((u) => u.r1 === r - 1 && u.c0 === c && u.c1 === e);
      if (above) above.r1 = r;
      else runs.push({ c0: c, c1: e, r0: r, r1: r });
      c = e;
    }
  }
  for (const u of runs) {
    solids.push({ x: cx(u.c0) - 0.5, y: cy(u.r1) - 0.5, w: u.c1 - u.c0 + 1, h: u.r1 - u.r0 + 1, tag: 'Ground', name: `Block ${u.c0},${u.r0}` });
  }

  // ---- jump-through platforms: horizontal runs of '='
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '=') continue;
      let e = c;
      while (e + 1 < cols && grid[r][e + 1] === '=') e++;
      const top = cy(r) + ONEWAY_TOP[def.theme];
      solids.push({ x: cx(c) - 0.5, y: top - 0.1, w: e - c + 1, h: 0.1, tag: 'Ground', name: `Plank ${c},${r}`, oneWay: true } as LevelData['solids'][number]);
      platformArt(def.theme, c, e, r, cx, cy, tile, at);
      c = e;
    }
  }

  // ---- block art, markers and decoration
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      const x = cx(c);
      const y = cy(r);
      if (ch === '#' || ch === '%') {
        blockArt(def.theme, c, r, x, y, solidAt, tile, crumbleGroup[r][c] || undefined);
      } else if (ch >= '1' && ch <= '4') {
        spawns[Number(ch) - 1] = { x, y: y - 0.5 + 0.55 };
      } else if (ch === 'c') {
        pickupSpawns.push({ x, y });
      } else if (def.legend?.[ch]) {
        for (const l of def.legend[ch](x, y)) layers.push(l);
      }
    }
  }
  for (let i = 0; i < 4; i++) if (!spawns[i]) throw new Error(`${def.id}: spawn ${i + 1} missing`);

  return {
    id: def.id,
    name: def.name,
    source: 'src/shared/levels/arenas.ts',
    view,
    bgColor: def.bgColor,
    music: def.music,
    layers,
    solids,
    spawns,
    pickupSpawns,
    wraps: [],
    props: def.props ?? [],
  };
}

/** Height of a jump-through platform's walkable surface above its cell centre. */
const ONEWAY_TOP: Record<Theme, number> = { crypt: 0.2, beach: 0.15, shrine: -0.25 };

type TileFn = (sprite: string, x: number, y: number, extra?: Partial<LevelLayer>) => void;

function blockArt(theme: Theme, c: number, r: number, x: number, y: number, solid: (c: number, r: number) => boolean, tile: TileFn, group?: string) {
  const U = solid(c, r - 1), D = solid(c, r + 1), L = solid(c - 1, r), R = solid(c + 1, r);
  const g = group ? { group } : {};
  if (theme === 'crypt') {
    if (group) {
      // Breakable walls glow like the original Dungeon's cracked tiles.
      tile('sprites/placeholder/lightuptiles/tile1_1', x, y, { ...g, anim: 'sprites/placeholder/lightuptiles/floatingtile', sx: hash(c, r) < 0.5 ? 0.5 : -0.5 });
    } else if (!U) {
      if (D) {
        // Top of a wall or floor.
        if (!L && !R) tile(`${FLOAT}floating-standardblock2`, x, y, g);
        else if (!L) tile(`${CRYPT}side-tile-left-edge-2`, x, y, g);
        else if (!R) tile(`${CRYPT}side-tile-right-edge-2`, x, y, g);
        else tile(`${CRYPT}standardblock2`, x, y, g);
      } else {
        // One block thick floating ledge.
        if (!L && !R) tile(`${FLOAT}floating-standardblock2`, x, y, g);
        else if (!L) tile(`${FLOAT}floatig-edge-left-tile`, x, y, g);
        else if (!R) tile(`${FLOAT}floatig-edge-right-tile`, x, y, g);
        else tile(`${FLOAT}floating-standardblock2`, x, y, g);
      }
    } else if (!D) {
      tile(`${CRYPT}standardblock2`, x, y, { sx: -1, sy: -1, ...g });
    } else if (!L) {
      tile(`${CRYPT}left-side-tile`, x, y, g);
    } else if (!R) {
      tile(`${CRYPT}right-side-tile`, x, y, g);
    } else {
      tile(`${CRYPT}black-tile`, x, y, g);
    }
    return;
  }
  if (theme === 'beach') {
    tile(`${BEACH}sandtile1`, x, y, { ...g, sx: hash(c, r) < 0.5 ? 1 : -1 });
    return;
  }
  // shrine
  if (!U) {
    if (!L && !R) tile(`${SHRINE}stone_tile_path`, x, y, g);
    else if (!L) tile(`${SHRINE}stone_tile_pathedge1`, x, y, { sx: -1, ...g });
    else if (!R) tile(`${SHRINE}stone_tile_pathedge1`, x, y, g);
    else tile(`${SHRINE}stone_tile_path`, x, y, g);
  } else if (!L) {
    tile(`${SHRINE}stone_tile_edge1`, x, y, { sx: -1, ...g });
  } else if (!R) {
    tile(`${SHRINE}stone_tile_edge1`, x, y, g);
  } else {
    const h = hash(c, r);
    tile(`${SHRINE}${h < 0.55 ? 'stone_tile1' : h < 0.7 ? 'stone_tile1_mosh' : h < 0.85 ? 'stone_tile2_mosh' : 'stone_tile3_mosh'}`, x, y, g);
  }
}

function platformArt(theme: Theme, c0: number, c1: number, r: number, cx: (c: number) => number, cy: (r: number) => number, tile: TileFn, at: (c: number, r: number) => string) {
  const y = cy(r);
  for (let c = c0; c <= c1; c++) {
    const x = cx(c);
    const first = c === c0 && at(c - 1, r) !== '=';
    const last = c === c1 && at(c + 1, r) !== '=';
    if (theme === 'beach') {
      if (first) tile(`${BEACH}_0001_tile-left-side`, x + 0.1, y);
      else if (last) tile(`${BEACH}_0004_plank-side-rechts`, x - 0.07, y);
      else tile(`${BEACH}${['_0000_tile-basic-1', '_0002_tile-basic-2', '_0003_tile-basic-3'][(c * 7 + r) % 3]}`, x, y);
    } else if (theme === 'shrine') {
      if (first) tile(`${SHRINE}redground_side`, x, y);
      else if (last) tile(`${SHRINE}redground_side`, x, y, { sx: -1 });
      else tile(`${SHRINE}redground`, x, y);
    } else {
      if (first) tile(`${FLOAT}floatig-edge-left-tile`, x, y, { sy: 0.5 });
      else if (last) tile(`${FLOAT}floatig-edge-right-tile`, x, y, { sy: 0.5 });
      else tile(`${FLOAT}floating-standardblock2`, x, y, { sy: 0.5 });
    }
  }
}

/** Convenience for decoration layers. */
export function deco(sprite: string, x: number, y: number, z: number, extra: Partial<LevelLayer> = {}): LevelLayer {
  return { sprite, x, y, sx: 1, sy: 1, z, name: sprite.split('/').pop() ?? sprite, ...extra };
}
