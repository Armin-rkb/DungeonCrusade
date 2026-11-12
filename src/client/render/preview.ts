// Stage-select thumbnails rendered from the level data itself (the v2 arenas
// have no hand-made preview image like the original three).

import { Effects } from '../fx';
import { getLevel } from '../../shared/levels';
import { createGame, type Match } from '../../shared/sim';
import type { LevelId, MatchConfig } from '../../shared/types';
import { Renderer } from './renderer';
import { WorldRenderer } from './world';

const cache = new Map<string, string>();

export function levelPreview(id: LevelId, w = 480, h = 270): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  const r = new Renderer(canvas, { w, h });
  const cfg: MatchConfig = {
    level: id, seed: 1, targetScore: 1, timeLimit: 0, teams: false, items: false,
    slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: 0, team: 0, name: '' })),
  };
  const m: Match = { cfg, level: getLevel(id) };
  const s = createGame(m);
  r.setView(m.level.view);
  new WorldRenderer().draw(r, m, s, new Effects(), { names: [], local: [], tags: false, hidden: true }, 0.4);
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}
