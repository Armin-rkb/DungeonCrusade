// Level data (extracted from the original Unity scenes by
// tools/extract-levels.mjs) and its runtime form used by the simulation.
// World units are Unity units with the y axis pointing UP.

export interface Rect { x: number; y: number; w: number; h: number }

export interface LevelLayer {
  sprite?: string;
  anim?: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  rot?: number;
  flipX?: boolean;
  flipY?: boolean;
  z: number;
  color?: string;
  name: string;
  group?: string;
}

export interface LevelData {
  id: string;
  name: string;
  source: string;
  view: Rect;
  bgColor: string;
  music?: string;
  layers: LevelLayer[];
  solids: Array<Rect & { tag: string; name: string; group?: string }>;
  spawns: Array<{ x: number; y: number }>;
  pickupSpawns: Array<{ x: number; y: number }>;
  wraps: Array<Rect & { to: number }>;
  props: Array<{ type: string; x: number; y: number; [k: string]: unknown }>;
  notes?: string[];
}

export interface Solid extends Rect {
  oneway: boolean;
  /** Index into GameState.level.destroyed, or -1. */
  breakable: number;
  /** Optional script group (e.g. 'temple'). Solids of a removed group stop colliding. */
  group: string;
}

export interface LevelRuntime {
  id: string;
  name: string;
  view: Rect;
  wrapX: boolean;
  killY: number;
  ceilY: number;
  solids: Solid[];
  spawns: Array<{ x: number; y: number }>;
  pickupSpawns: Array<{ x: number; y: number }>;
  breakables: number;
  features: {
    lightning?: boolean;
    rain?: boolean;
    seagulls?: { y: number; minDelay: number; maxDelay: number };
    temple?: { x: number; y: number; w: number; h: number };
    armor?: { x: number; y: number; w: number; h: number; respawn: number };
    dragon?: { x: number; y: number };
  };
  data: LevelData;
}

export interface LevelTweaks {
  wrapX?: boolean;
  /** Override the camera rect (e.g. to include the gap next to side walls). */
  view?: Rect;
  /** Solids (matched by name or predicate) that become jump-through. */
  oneway?: (s: Rect & { tag: string; name: string; group?: string }) => boolean;
  breakable?: (s: Rect & { tag: string; name: string; group?: string }) => boolean;
  extraSolids?: Array<Rect & { oneway?: boolean; group?: string }>;
  removeSolid?: (s: Rect & { tag: string; name: string; group?: string }) => boolean;
  killY?: number;
  features?: LevelRuntime['features'];
  spawns?: Array<{ x: number; y: number }>;
  pickupSpawns?: Array<{ x: number; y: number }>;
}

export function buildLevel(data: LevelData, tweaks: LevelTweaks = {}): LevelRuntime {
  const solids: Solid[] = [];
  let breakables = 0;
  for (const s of data.solids) {
    if (tweaks.removeSolid?.(s)) continue;
    const breakable = tweaks.breakable?.(s) ? breakables++ : -1;
    solids.push({
      x: s.x, y: s.y, w: s.w, h: s.h,
      oneway: tweaks.oneway?.(s) ?? false,
      breakable,
      group: s.group ?? '',
    });
  }
  for (const s of tweaks.extraSolids ?? []) {
    solids.push({ x: s.x, y: s.y, w: s.w, h: s.h, oneway: s.oneway ?? false, breakable: -1, group: s.group ?? '' });
  }
  const view = tweaks.view ?? data.view;
  const lvl: LevelRuntime = {
    id: data.id,
    name: data.name,
    view,
    wrapX: tweaks.wrapX ?? true,
    killY: tweaks.killY ?? view.y - 3,
    ceilY: view.y + view.h + 4,
    solids,
    spawns: tweaks.spawns ?? data.spawns,
    pickupSpawns: tweaks.pickupSpawns ?? (data.pickupSpawns.length ? data.pickupSpawns : data.spawns),
    breakables,
    features: tweaks.features ?? {},
    data,
  };
  // Original spawn points are Unity pivots (~0.55 above the feet) and some sit
  // inside geometry: move them to the nearest free spot.
  lvl.spawns = lvl.spawns.map((p) => freeSpot(lvl, p.x, p.y - 0.55, 0.23, 0.8));
  lvl.pickupSpawns = lvl.pickupSpawns.map((p) => freeSpot(lvl, p.x, p.y, 0.3, 0.45));
  return lvl;
}

function overlaps(l: LevelRuntime, x: number, y: number, hw: number, h: number): boolean {
  for (const s of l.solids) {
    if (s.oneway) continue;
    if (x + hw <= s.x || x - hw >= s.x + s.w || y + h <= s.y || y >= s.y + s.h) continue;
    return true;
  }
  return false;
}

/** Nearest position (feet at y) where a box of half width hw and height h fits. */
export function freeSpot(l: LevelRuntime, x: number, y: number, hw: number, h: number): { x: number; y: number } {
  if (!overlaps(l, x, y, hw, h)) return { x, y };
  for (let d = 0.05; d < 4; d += 0.05) {
    if (!overlaps(l, x, y + d, hw, h)) return { x, y: y + d };
    if (!overlaps(l, x, y - d, hw, h)) return { x, y: y - d };
  }
  return { x, y };
}

/** A small hand-made arena used by unit tests and as a fallback. */
export function testArenaData(): LevelData {
  const solids: LevelData['solids'] = [
    { x: -12.5, y: -7, w: 25, h: 1, tag: 'Ground', name: 'floor' },
    { x: -9, y: -3, w: 5, h: 0.5, tag: 'Ground', name: 'left-plat' },
    { x: 4, y: -3, w: 5, h: 0.5, tag: 'Ground', name: 'right-plat' },
    { x: -2.5, y: 0.5, w: 5, h: 0.5, tag: 'Ground', name: 'top-plat' },
    { x: -12.5, y: -6, w: 1, h: 4, tag: 'LeftWall', name: 'wall-l' },
    { x: 11.5, y: -6, w: 1, h: 4, tag: 'RightWall', name: 'wall-r' },
  ];
  return {
    id: 'test',
    name: 'Test Arena',
    source: 'builtin',
    view: { x: -12.5, y: -7, w: 25, h: 14 },
    bgColor: '#202030',
    layers: [],
    solids,
    spawns: [{ x: -8, y: -6 }, { x: 8, y: -6 }, { x: -6, y: -2.5 }, { x: 6, y: -2.5 }],
    pickupSpawns: [{ x: 0, y: 1 }, { x: -6.5, y: -2.5 }, { x: 6.5, y: -2.5 }],
    wraps: [],
    props: [],
  };
}
