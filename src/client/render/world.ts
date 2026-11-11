// Draws a GameState: level art, players, projectiles, pickups, level scripts
// and the in-game HUD.

import { animFrame, assets, sprite } from '../assets';
import type { Effects } from '../fx';
import { settings } from '../settings';
import type { Renderer } from './renderer';
import { CHEST, FX, KNIGHTS, MUSIC_NOTES, PROJECTILES, TEAM_COLORS, WEAPON_ICONS } from './visuals';
import type { LevelLayer, LevelRuntime } from '../../shared/level';
import type { Match } from '../../shared/sim';
import { T, FPS } from '../../shared/tuning';
import { Phase, type GameState, type PlayerState } from '../../shared/types';
import { W } from '../../shared/weapons';

interface PlayerVis {
  key: string;
  start: number;
  sx: number;
  sy: number;
  wasGround: boolean;
  lastVy: number;
  koTime: number;
  koX: number;
  koY: number;
  face: number;
  alive: boolean;
  djumpTime: number;
}

export interface HudInfo {
  names: string[];
  local: boolean[];
  ping?: number[];
  status?: string;
  /** Show "P1".."P4" tags above heads. */
  tags: boolean;
  /** Hide the HUD entirely (attract mode behind menus). */
  hidden?: boolean;
}

interface LayerItem {
  l: LevelLayer;
  breakable: number;
  sparkle: boolean;
}

interface Streak { x: number; y: number; life: number }
interface Emitter { x: number; y: number; w: number; h: number; dx: number; n: number; streaks: Streak[] }
interface FallingPiece { l: LevelLayer; vx: number; vy: number; vr: number; x: number; y: number; rot: number }

export class WorldRenderer {
  level: LevelRuntime | null = null;
  layers: LayerItem[] = [];
  rainZ = Infinity;
  emitters: Emitter[] = [];
  falling: FallingPiece[] = [];
  templeFell = false;
  vis: PlayerVis[] = [];
  time = 0;
  private lightningOn = false;

  setLevel(level: LevelRuntime) {
    this.level = level;
    this.vis = [];
    this.falling = [];
    this.templeFell = false;
    const v = level.view;
    const margin = 3;
    const items: LayerItem[] = [];
    for (const l of level.data.layers) {
      // Cull art that can never be on screen.
      const def = l.sprite ? sprite(l.sprite) : undefined;
      const half = def ? (Math.max(def.w, def.h) / def.ppu) * Math.max(Math.abs(l.sx), Math.abs(l.sy)) : 2;
      if (l.x + half < v.x - margin || l.x - half > v.x + v.w + margin || l.y + half < v.y - margin || l.y - half > v.y + v.h + margin) continue;
      let breakable = -1;
      for (const so of level.solids) {
        if (so.breakable >= 0 && l.group && so.group === l.group) breakable = so.breakable;
      }
      items.push({ l, breakable, sparkle: l.group === 'armor' && /sparkle/i.test(l.name) });
    }
    items.sort((a, b) => a.l.z - b.l.z);
    this.layers = items;
    this.rainZ = Infinity;
    this.emitters = [];
    if (level.features.rain) {
      for (const p of level.data.props) {
        if (p.type !== 'rain') continue;
        const e = p.emitter as { x: number; y: number; w: number; h: number } | undefined;
        const dir = p.direction as { x: number; y: number } | undefined;
        if (!e) continue;
        this.rainZ = Math.min(this.rainZ, Number(p.z ?? 0));
        const n = Math.min(70, Math.round((e.w * e.h) * 1.2) + 12);
        this.emitters.push({ ...e, dx: -(dir?.x ?? 0) * 4, n, streaks: [] });
      }
    }
  }

  draw(r: Renderer, m: Match, s: GameState, fx: Effects, hud: HudInfo, dt: number) {
    this.time += dt;
    const lvl = m.level;
    if (this.level !== lvl) this.setLevel(lvl);
    r.clear(lvl.data.bgColor || '#000');
    const lt = 0.45 - fx.lightning;
    this.lightningOn = fx.lightning > 0 && (lt < 0.03 || (lt > 0.08 && lt < 0.17));
    this.drawLayers(r, s, dt);
    this.drawFalling(r, dt);
    if (this.lightningOn) {
      r.world();
      r.ctx.globalAlpha = 0.12;
      r.ctx.fillStyle = '#ccc6fb';
      r.ctx.fillRect(0, 0, r.w, r.h);
      r.ctx.globalAlpha = 1;
    }
    fx.draw(r, false);
    this.drawPickups(r, s);
    this.drawBlasts(r, s);
    this.drawGull(r, s);
    this.drawPlayers(r, m, s, hud);
    this.drawProjectiles(r, s);
    this.drawDragon(r, m, s);
    fx.draw(r, true);
    if (fx.flash > 0) {
      r.world();
      r.ctx.globalAlpha = Math.min(1, fx.flash);
      r.ctx.fillStyle = fx.flashColor;
      r.ctx.fillRect(0, 0, r.w, r.h);
      r.ctx.globalAlpha = 1;
    }
    if (!hud.hidden) this.drawHud(r, m, s, fx, hud);
  }

  private drawLayers(r: Renderer, s: GameState, dt: number) {
    let rainDone = this.emitters.length === 0;
    const templeGone = s.groupsGone.includes('temple');
    if (templeGone && !this.templeFell) this.startTempleFall();
    for (const it of this.layers) {
      const l = it.l;
      if (!rainDone && l.z > this.rainZ) {
        this.drawRain(r, dt);
        rainDone = true;
      }
      if (l.group && s.groupsGone.includes(l.group)) continue;
      if (it.breakable >= 0 && s.destroyed[it.breakable]) continue;
      if (it.sparkle && s.armorCd > 0) continue;
      let id = l.sprite;
      let x = l.x;
      let y = l.y;
      let tint = l.color;
      if (l.group === 'dragon') {
        const d = s.dragon;
        if (d.stage >= 4) continue;
        if (d.stage === 3) {
          const e = (120 - d.timer) / 60;
          y += 1.5 * e + 7 * e * e;
          id = animFrame('scripts/level/dragon/dragon_fly', this.time) ?? id;
        } else if (d.stage === 2) {
          id = animFrame('sprites/dragonlevel/anim/dragon_awake', (150 - d.timer) / 60, false) ?? id;
        } else if (l.anim) id = animFrame(l.anim, this.time) ?? id;
      } else if (l.anim) {
        id = animFrame(l.anim, this.time) ?? id;
      }
      if (l.group === 'lightning-bg' && this.lightningOn) tint = '#ccc6fbff';
      r.drawSprite(id, x, y, { sx: l.sx, sy: l.sy, flipX: l.flipX, flipY: l.flipY, rot: l.rot, alpha: alphaOf(tint), tint });
    }
    if (!rainDone) this.drawRain(r, dt);
  }

  private startTempleFall() {
    this.templeFell = true;
    for (const it of this.layers) {
      if (it.l.group !== 'temple') continue;
      this.falling.push({
        l: it.l, x: it.l.x, y: it.l.y, rot: it.l.rot ?? 0,
        vx: -2 + Math.random() * 3, vy: -2 + Math.random() * 6, vr: (Math.random() - 0.5) * 300,
      });
    }
  }

  private drawFalling(r: Renderer, dt: number) {
    if (!this.falling.length) return;
    for (const f of this.falling) {
      f.vy -= 14 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      const l = f.l;
      r.drawSprite(l.sprite, f.x, f.y, { sx: l.sx, sy: l.sy, flipX: l.flipX, flipY: l.flipY, rot: f.rot, tint: l.color });
    }
    const bottom = (this.level?.view.y ?? -10) - 4;
    this.falling = this.falling.filter((f) => f.y > bottom);
  }

  private drawRain(r: Renderer, dt: number) {
    const c = r.ctx;
    r.world();
    c.strokeStyle = 'rgba(175, 195, 255, 0.55)';
    c.lineWidth = Math.max(1, r.scale * 0.03);
    c.beginPath();
    for (const e of this.emitters) {
      while (e.streaks.length < e.n) e.streaks.push({ x: e.x + Math.random() * e.w, y: e.y + Math.random() * e.h, life: Math.random() * 0.3 });
      for (const st of e.streaks) {
        st.life += dt;
        st.y -= 19 * dt;
        st.x += e.dx * dt;
        if (st.life > 0.3 || st.y < e.y - 1.5) {
          st.x = e.x + Math.random() * e.w;
          st.y = e.y + Math.random() * e.h;
          st.life = 0;
        }
        c.moveTo(r.sx(st.x), r.sy(st.y));
        c.lineTo(r.sx(st.x - e.dx * 0.02), r.sy(st.y + 0.4));
      }
    }
    c.stroke();
  }

  // ---------------------------------------------------------------- players
  private visFor(slot: number): PlayerVis {
    let v = this.vis[slot];
    if (!v) {
      v = this.vis[slot] = { key: '', start: 0, sx: 1, sy: 1, wasGround: true, lastVy: 0, koTime: -10, koX: 0, koY: 0, face: 1, alive: true, djumpTime: -10 };
    }
    return v;
  }

  private drawPlayers(r: Renderer, m: Match, s: GameState, hud: HudInfo) {
    const now = this.time;
    for (const p of s.players) {
      if (!p.active) continue;
      const v = this.visFor(p.slot);
      const kv = KNIGHTS[m.cfg.slots[p.slot]?.knight ?? p.slot] ?? KNIGHTS[0];
      if (!p.alive) {
        if (v.alive) {
          v.alive = false;
          v.koTime = now;
          v.koX = p.x;
          v.koY = p.y;
        }
        const t = now - v.koTime;
        if (t < 0.7) {
          const id = animFrame(kv.death, t, false);
          r.drawSprite(id, v.koX, v.koY + 0.25 + t * 1.2, { flipX: v.face < 0, alpha: 1 - t / 0.7, sx: 1 + t, sy: 1 + t, white: t < 0.15 });
        }
        continue;
      }
      if (!v.alive) {
        v.alive = true;
        v.sx = 0.6;
        v.sy = 1.5;
      }
      // Squash & stretch.
      if (p.ground && !v.wasGround) {
        const impact = Math.min(1, -v.lastVy / 16);
        v.sx = 1 + 0.35 * impact;
        v.sy = 1 - 0.3 * impact;
      } else if (!p.ground && v.wasGround && p.vy > 4) {
        v.sx = 0.75;
        v.sy = 1.3;
      }
      if (!p.ground && p.jumps === 0 && v.lastVy < p.vy - 5) v.djumpTime = now;
      v.wasGround = p.ground;
      v.lastVy = p.vy;
      v.face = p.face;
      const k = Math.exp(-(1 / FPS) * 14);
      v.sx = 1 + (v.sx - 1) * k;
      v.sy = 1 + (v.sy - 1) * k;

      // Animation state.
      let key: string;
      let loop = true;
      let speed = 1;
      let spriteOnly: string | null = null;
      if (p.hitstop > 0 || p.stun > 6) key = kv.hit;
      else if (p.act && p.actTimer > 0) {
        if (p.act === 2) key = kv.hadouken;
        else if (p.act === 3) key = kv.mic;
        else key = p.ground ? kv.throw : kv.airThrow;
        loop = false;
      } else if (!p.ground && p.wall !== 0 && p.vy < 0) {
        key = 'wall';
        spriteOnly = kv.wall;
      } else if (!p.ground) key = now - v.djumpTime < 0.25 ? kv.djump : kv.jump;
      else if (Math.abs(p.vx) > 0.6) {
        key = kv.walk;
        speed = Math.max(0.5, Math.abs(p.vx) / T.runSpeed) * 1.3;
      } else key = kv.idle;
      if (key !== v.key) {
        v.key = key;
        v.start = now;
      }
      const at = (now - v.start) * speed;
      const id = spriteOnly ?? animFrame(key, at, loop);
      const def = id ? sprite(id) : undefined;
      if (!def) continue;
      let x = p.x;
      if (p.hitstop > 0) x += (Math.floor(now * 60) % 2 === 0 ? 1 : -1) * 0.05;
      const pivotY = p.y + ((def.h - def.py) / def.ppu) * v.sy - 0.02;
      const blink = p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0;
      const flipX = spriteOnly ? p.wall > 0 : p.face < 0;
      // Team / player outline glow for readability.
      if (m.cfg.teams) {
        r.world();
        r.ctx.globalAlpha = 0.35;
        r.ctx.fillStyle = TEAM_COLORS[m.cfg.slots[p.slot].team % 2];
        r.ctx.beginPath();
        r.ctx.ellipse(r.sx(p.x), r.sy(p.y), 0.35 * r.scale, 0.08 * r.scale, 0, 0, Math.PI * 2);
        r.ctx.fill();
        r.ctx.globalAlpha = 1;
      }
      // Shadow.
      r.world();
      r.ctx.globalAlpha = 0.25;
      r.ctx.fillStyle = '#000';
      r.ctx.beginPath();
      r.ctx.ellipse(r.sx(p.x), r.sy(p.y) - 1, 0.24 * r.scale * v.sx, 0.05 * r.scale, 0, 0, Math.PI * 2);
      r.ctx.fill();
      r.ctx.globalAlpha = 1;
      r.drawSpriteDef(def, x, pivotY, { flipX, sx: v.sx, sy: v.sy, alpha: blink ? 0.35 : 1 });
      if (p.flash > 0 && p.flash % 3 !== 0) r.drawSpriteDef(def, x, pivotY, { flipX, sx: v.sx, sy: v.sy, white: true, alpha: 0.9 });
      if (p.hp > T.maxHp) {
        const sp = animFrame(FX.sparkles, now + p.slot * 0.1);
        r.drawSprite(sp, p.x, p.y + 0.5, { sx: 1.2, sy: 1.2, alpha: 0.8 });
      }
      // Name tag + weapon icon.
      if (hud.tags) {
        const tagY = r.sy(p.y + T.height + 0.35);
        const cx = r.sx(p.x);
        r.world();
        const c = r.ctx;
        const size = Math.max(9, 0.28 * r.scale);
        c.font = `${Math.round(size)}px EightBit, monospace`;
        c.textAlign = 'center';
        c.textBaseline = 'bottom';
        const label = hud.local[p.slot] ? `P${p.slot + 1}` : hud.names[p.slot]?.slice(0, 10) ?? `P${p.slot + 1}`;
        c.lineWidth = Math.max(2, size * 0.25);
        c.strokeStyle = '#000';
        c.strokeText(label, cx, tagY);
        c.fillStyle = m.cfg.teams ? TEAM_COLORS[m.cfg.slots[p.slot].team % 2] : kv.color;
        c.fillText(label, cx, tagY);
        // Arrow
        c.beginPath();
        c.moveTo(cx - size * 0.3, tagY + size * 0.1);
        c.lineTo(cx + size * 0.3, tagY + size * 0.1);
        c.lineTo(cx, tagY + size * 0.45);
        c.closePath();
        c.fill();
        if (p.weapon !== W.Stone) {
          r.drawSprite(WEAPON_ICONS[p.weapon], p.x + 0.42, p.y + T.height + 0.5, { sx: 1.8, sy: 1.8 });
        }
      }
    }
  }

  // ---------------------------------------------------------------- projectiles
  private drawProjectiles(r: Renderer, s: GameState) {
    for (const pr of s.projs) {
      const v = PROJECTILES[pr.kind];
      if (!v) continue;
      const t = pr.age / FPS;
      const dir = pr.kind === W.Barrel ? pr.q || Math.sign(pr.vx) : Math.sign(pr.vx) || 1;
      if (v.trail) {
        r.world();
        const c = r.ctx;
        c.globalAlpha = 0.45;
        c.strokeStyle = v.trail;
        c.lineCap = 'round';
        c.lineWidth = Math.max(2, 0.12 * r.scale);
        c.beginPath();
        c.moveTo(r.sx(pr.x), r.sy(pr.y));
        c.lineTo(r.sx(pr.x - pr.vx * 0.045), r.sy(pr.y - pr.vy * 0.045));
        c.stroke();
        c.globalAlpha = 1;
      }
      let id: string | undefined;
      if (pr.kind === W.Music) id = animFrame(MUSIC_NOTES[pr.p] ?? MUSIC_NOTES[0], t);
      else id = v.anim ? animFrame(v.anim, t) : v.sprite;
      let rot = v.spin ? -dir * v.spin * t : 0;
      if (pr.kind === W.Duck) rot = Math.sin(t * 14) * 15;
      if ((pr.kind === W.Hadouken || pr.kind === W.Pizza || pr.kind === W.Shuriken) && pr.vy !== 0 && pr.vx !== 0) {
        rot = (Math.atan2(pr.vy, Math.abs(pr.vx)) * 180) / Math.PI * dir;
      }
      const scale = pr.kind === W.Music ? v.scale * (pr.p === 0 ? 1.15 : pr.p === 1 ? 1 : 0.85) : v.scale;
      let white = false;
      if (pr.kind === W.Bomb) {
        const left = pr.life;
        white = left < 30 && Math.floor(left / (left < 12 ? 2 : 4)) % 2 === 0;
      }
      if (pr.kind === W.Duck && pr.life < 30) white = Math.floor(pr.life / 3) % 2 === 0;
      r.drawSprite(id, pr.x, pr.y, { sx: scale, sy: scale, flipX: dir < 0, rot });
      if (white) r.drawSprite(id, pr.x, pr.y, { sx: scale, sy: scale, flipX: dir < 0, rot, white: true, alpha: 0.85 });
      if (pr.kind === W.Bomb) {
        // Fuse spark
        r.world();
        r.ctx.fillStyle = Math.random() < 0.5 ? '#ffe066' : '#ff7a00';
        const sz = 0.08 * r.scale;
        r.ctx.fillRect(r.sx(pr.x + 0.05 * dir) - sz / 2, r.sy(pr.y + 0.32) - sz / 2, sz, sz);
      }
    }
  }

  private drawBlasts(r: Renderer, s: GameState) {
    const c = r.ctx;
    for (const b of s.blasts) {
      if (b.kind === 'confetti') continue;
      r.world();
      const t = b.age / b.life;
      c.globalAlpha = b.kind === 'duck' ? 0.12 : 0.22 * (1 - t);
      c.fillStyle = b.kind === 'sock' ? '#9acd32' : b.kind === 'duck' ? '#ffe14d' : '#ffb347';
      c.beginPath();
      c.arc(r.sx(b.x), r.sy(b.y), b.r * r.scale * (b.kind === 'duck' ? 1 : 0.6 + t * 0.4), 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      if (b.kind === 'duck') {
        const id = animFrame(FX.duckBoom, (b.age % b.pulse) / FPS, false);
        r.drawSprite(id, b.x, b.y, { sx: 1.8, sy: 1.8, alpha: 0.85 });
      }
    }
  }

  private drawPickups(r: Renderer, s: GameState) {
    for (const c of s.pickups) {
      const open = c.opened > 0;
      const id = c.kind === 'armor' ? (open ? CHEST.armorOpen : CHEST.armor) : open ? CHEST.weaponOpen : CHEST.weapon;
      const blink = c.age > 1300 && Math.floor(c.age / 5) % 2 === 0;
      const bob = c.ground && !open ? Math.sin(this.time * 4 + c.id) * 0.03 : 0;
      const alpha = open ? Math.max(0, 1 - c.opened / 45) : blink ? 0.3 : 1;
      if (!open && c.ground) {
        // Glow to draw attention.
        r.world();
        const g = r.ctx;
        g.globalAlpha = 0.18 + Math.sin(this.time * 5 + c.id) * 0.08;
        g.fillStyle = c.kind === 'armor' ? '#8fd3ff' : '#ffe066';
        g.beginPath();
        g.arc(r.sx(c.x), r.sy(c.y), 0.45 * r.scale, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      r.drawSprite(id, c.x, c.y + bob, { sx: 2.2, sy: 2.2, alpha });
    }
  }

  private drawGull(r: Renderer, s: GameState) {
    const g = s.gull;
    if (!g.active) return;
    const id = animFrame('levi/map-2/zee-meeuw-vliegend', this.time);
    r.drawSprite(id, g.x, g.y, { flipX: g.vx < 0, sx: 1, sy: 1 });
  }

  private drawDragon(r: Renderer, m: Match, s: GameState) {
    const d = s.dragon;
    if (!m.level.features.dragon || d.stage !== 4) return;
    const id = animFrame('scripts/level/dragon/dragon_fly', this.time) ?? 'sprites/dragonlevel/dragon_fly';
    const wob = Math.sin(this.time * 10) * 4;
    r.drawSprite(id, d.x, d.y, { sx: 2.6, sy: 2.6, flipX: d.timer < 0, rot: wob });
  }

  // ---------------------------------------------------------------- HUD
  private drawHud(r: Renderer, m: Match, s: GameState, fx: Effects, hud: HudInfo) {
    r.screen();
    const c = r.ctx;
    const W_ = r.w / r.dpr;
    const H_ = r.h / r.dpr;
    const active = s.players.filter((p) => p.active);
    const n = active.length;
    const compact = W_ < 700;
    const pw = compact ? Math.min(150, (W_ - 16) / Math.max(n, 1) - 6) : 178;
    const ph = compact ? 44 : 52;
    const gap = 8;
    const total = n * pw + (n - 1) * gap;
    let x0 = (W_ - total) / 2;
    const top = Math.max(6, r.safe.top);
    for (const p of active) {
      this.drawPanel(c, m, s, p, x0, top, pw, ph, hud, compact);
      x0 += pw + gap;
    }
    // Target / timer
    c.textAlign = 'center';
    c.textBaseline = 'top';
    const info = m.cfg.timeLimit > 0 && s.phase !== Phase.Countdown
      ? fmtTime(Math.max(0, m.cfg.timeLimit * FPS - s.clock))
      : `FIRST TO ${m.cfg.targetScore}`;
    c.font = `${compact ? 10 : 12}px EightBit, monospace`;
    outlined(c, s.suddenDeath ? 'SUDDEN DEATH' : info, W_ / 2, top + ph + 6, s.suddenDeath ? '#ff5050' : '#ffffffcc');
    if (hud.status) outlined(c, hud.status, W_ / 2, top + ph + 22, '#ffd166');

    // Banner
    if (fx.banner) {
      const b = fx.banner;
      const t = b.t / b.dur;
      const pop = t < 0.12 ? 0.4 + (t / 0.12) * 0.8 : t < 0.22 ? 1.2 - ((t - 0.12) / 0.1) * 0.2 : 1;
      const alpha = t > 0.8 ? (1 - t) / 0.2 : 1;
      let size = Math.min(W_ / 9, H_ / 6) * pop;
      c.font = `${Math.round(size)}px Karmatic, EightBit, monospace`;
      // Long banners ("THE TEMPLE FALLS") shrink to fit the screen.
      const tw = c.measureText(b.text).width;
      if (tw > W_ * 0.88) {
        size *= (W_ * 0.88) / tw;
        c.font = `${Math.round(size)}px Karmatic, EightBit, monospace`;
      }
      c.globalAlpha = alpha;
      c.textBaseline = 'middle';
      c.lineWidth = Math.max(3, size * 0.12);
      outlined(c, b.text, W_ / 2, H_ * 0.42, b.color);
      if (b.sub) {
        c.font = `${Math.round(size * 0.28)}px EightBit, monospace`;
        outlined(c, b.sub, W_ / 2, H_ * 0.42 + size * 0.8, '#fff');
      }
      c.globalAlpha = 1;
    }
    if (settings.showFps) {
      c.font = '10px monospace';
      c.textAlign = 'left';
      c.fillStyle = '#fff8';
      c.fillText(`${Math.round(1 / Math.max(0.001, this.fpsDt))} fps`, 6, H_ - 14);
    }
  }

  fpsDt = 1 / 60;

  private drawPanel(c: CanvasRenderingContext2D, m: Match, s: GameState, p: PlayerState, x: number, y: number, w: number, h: number, hud: HudInfo, compact: boolean) {
    const kv = KNIGHTS[m.cfg.slots[p.slot]?.knight ?? p.slot] ?? KNIGHTS[0];
    const col = m.cfg.teams ? TEAM_COLORS[m.cfg.slots[p.slot].team % 2] : kv.color;
    c.globalAlpha = 0.72;
    c.fillStyle = '#0b0b16';
    roundRect(c, x, y, w, h, 7);
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = col;
    c.lineWidth = 2;
    roundRect(c, x, y, w, h, 7);
    c.stroke();
    // Icon
    const icon = sprite(kv.icon);
    const isz = h - 12;
    if (icon) {
      const img = assets.images.get(icon.img);
      if (img) {
        c.imageSmoothingEnabled = false;
        c.globalAlpha = p.alive ? 1 : 0.35;
        c.drawImage(img, icon.x, icon.y, icon.w, icon.h, x + 6, y + 6, isz, isz);
        c.globalAlpha = 1;
      }
    }
    // Name
    const nx = x + isz + 12;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.font = `${compact ? 8 : 10}px EightBit, monospace`;
    const name = (hud.local[p.slot] ? `P${p.slot + 1} ` : '') + (hud.names[p.slot] ?? '');
    c.fillStyle = col;
    c.fillText(name.slice(0, compact ? 10 : 15), nx, y + 6);
    // Hearts
    const heartSize = compact ? 9 : 11;
    const hpMax = Math.max(T.maxHp, p.hp);
    for (let i = 0; i < hpMax; i++) {
      const filled = i < p.hp;
      const armor = i >= T.maxHp;
      drawHeart(c, nx + i * (heartSize + 1), y + (compact ? 18 : 20), heartSize, filled ? (armor ? '#8fd3ff' : '#ff4d5e') : '#3a3a4a');
    }
    // Weapon + cooldown
    const wy = y + h - (compact ? 14 : 16);
    const wi = sprite(WEAPON_ICONS[p.weapon]);
    if (wi) {
      const img = assets.images.get(wi.img);
      if (img) {
        const sc = Math.min(12 / wi.h, 22 / wi.w);
        c.drawImage(img, wi.x, wi.y, wi.w, wi.h, nx, wy, wi.w * sc, wi.h * sc);
      }
    }
    const cdw = compact ? 30 : 46;
    const frac = p.cdMax > 0 ? 1 - p.cd / p.cdMax : 1;
    c.fillStyle = '#333';
    c.fillRect(nx + 26, wy + 4, cdw, 4);
    c.fillStyle = frac >= 1 ? '#7CFC00' : '#ffd166';
    c.fillRect(nx + 26, wy + 4, cdw * Math.max(0, Math.min(1, frac)), 4);
    // Score
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.font = `900 ${compact ? 20 : 26}px 'Arial Black', 'Segoe UI Black', system-ui, sans-serif`;
    c.lineWidth = 5;
    outlined(c, String(p.score), x + w - 8, y + h / 2 + 2, '#fff');
    if (!p.alive && s.phase === Phase.Play) {
      c.font = `${compact ? 8 : 9}px EightBit, monospace`;
      c.textAlign = 'center';
      outlined(c, `${Math.ceil(p.respawn / FPS)}`, x + 6 + isz / 2, y + h / 2, '#fff');
    }
    if (hud.ping && hud.ping[p.slot] >= 0 && settings.showPing && !hud.local[p.slot]) {
      c.font = '8px monospace';
      c.textAlign = 'right';
      c.textBaseline = 'top';
      const pg = hud.ping[p.slot];
      c.fillStyle = pg < 80 ? '#7CFC00' : pg < 160 ? '#ffd166' : '#ff5050';
      c.fillText(`${pg}ms`, x + w - 6, y + 3);
    }
  }
}

function alphaOf(color?: string): number {
  if (!color || color.length < 9) return 1;
  return parseInt(color.slice(7, 9), 16) / 255;
}

function fmtTime(frames: number): string {
  const sec = Math.ceil(frames / FPS);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function outlined(c: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string) {
  c.lineJoin = 'round';
  c.strokeStyle = '#000';
  if (c.lineWidth < 2) c.lineWidth = 3;
  c.strokeText(text, x, y);
  c.fillStyle = fill;
  c.fillText(text, x, y);
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function drawHeart(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const px = size / 7;
  c.fillStyle = '#000';
  for (let j = 0; j < HEART.length; j++) for (let i = 0; i < 7; i++) if (HEART[j][i] === 'X') c.fillRect(x + i * px - px * 0.4, y + j * px - px * 0.4, px * 1.8, px * 1.8);
  c.fillStyle = color;
  for (let j = 0; j < HEART.length; j++) for (let i = 0; i < 7; i++) if (HEART[j][i] === 'X') c.fillRect(x + i * px, y + j * px, px + 0.3, px + 0.3);
}
