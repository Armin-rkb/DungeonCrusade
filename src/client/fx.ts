// Client-side "juice": particles, sprite effects, floating text, screen shake,
// camera kicks, flashes, controller rumble and sounds, all driven by the
// simulation's events. None of this affects gameplay, so it may use
// Math.random freely.

import { animFrame, anim as animDef } from './assets';
import { audio, SFX } from './audio';
import type { Renderer } from './render/renderer';
import { FX, KNIGHTS, WEAPON_ICONS } from './render/visuals';
import { settings } from './settings';
import type { GameEvent, GameState } from '../shared/types';
import { W, WEAPONS } from '../shared/weapons';
import type { LevelRuntime } from '../shared/level';

interface Particle {
  kind: 'px' | 'anim' | 'sprite' | 'text' | 'ring';
  x: number;
  y: number;
  vx: number;
  vy: number;
  grav: number;
  drag: number;
  life: number;
  max: number;
  size: number;
  color: string;
  id?: string;
  rot: number;
  vrot: number;
  scale: number;
  text?: string;
  front?: boolean;
  additive?: boolean;
  flip?: boolean;
}

export interface FxContext {
  level: LevelRuntime;
  /** slot -> knight index */
  knights: number[];
  /** slot -> rumble callback for local players */
  rumble: (slot: number, strong: number, weak: number, ms: number) => void;
  names: string[];
}

export class Effects {
  parts: Particle[] = [];
  trauma = 0;
  kickX = 0;
  kickY = 0;
  punch = 0;
  flash = 0;
  flashColor = '#ffffff';
  lightning = 0;
  nextLightning = 6 + Math.random() * 10;
  banner: { text: string; sub: string; t: number; color: string; dur: number } | null = null;
  private seen = new Map<string, number>();
  time = 0;

  reset() {
    this.parts = [];
    this.trauma = 0;
    this.kickX = this.kickY = this.punch = this.flash = 0;
    this.banner = null;
    this.seen.clear();
  }

  shake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount * settings.shake);
  }

  kick(dx: number, dy: number, amount: number) {
    const s = settings.shake;
    this.kickX += dx * amount * s;
    this.kickY += dy * amount * s;
  }

  showBanner(text: string, sub = '', color = '#fff', dur = 1.4) {
    this.banner = { text, sub, t: 0, color, dur };
  }

  private add(p: Partial<Particle> & { x: number; y: number }): Particle {
    const part: Particle = {
      kind: 'px', vx: 0, vy: 0, grav: 0, drag: 0, life: 0, max: 0.5, size: 0.06, color: '#fff',
      rot: 0, vrot: 0, scale: 1, ...p,
    };
    this.parts.push(part);
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
    return part;
  }

  burst(x: number, y: number, n: number, color: string | string[], speed: number, opts: Partial<Particle> = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.65);
      this.add({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 12, drag: 2.5,
        max: 0.25 + Math.random() * 0.35, size: 0.05 + Math.random() * 0.06,
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color, ...opts,
      });
    }
  }

  dust(x: number, y: number, n = 6, dir = 0) {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x + (Math.random() - 0.5) * 0.4, y: y + 0.03, vx: (Math.random() - 0.5) * 2.5 + dir * 1.5, vy: Math.random() * 1.2,
        grav: -0.5, drag: 4, max: 0.3 + Math.random() * 0.25, size: 0.07 + Math.random() * 0.07, color: 'rgba(235,225,210,0.85)',
      });
    }
  }

  animFx(id: string, x: number, y: number, scale = 1, opts: Partial<Particle> = {}) {
    const a = animDef(id);
    this.add({ kind: 'anim', id, x, y, max: a ? a.len : 0.4, scale, front: true, ...opts });
  }

  text(x: number, y: number, text: string, color: string, size = 0.5, max = 0.9, vy = 2.2) {
    this.add({ kind: 'text', x, y, vy, drag: 2, text, color, size, max, front: true });
  }

  ring(x: number, y: number, r: number, color: string, max = 0.35) {
    this.add({ kind: 'ring', x, y, size: r, color, max, front: true });
  }

  update(dt: number, level: LevelRuntime | null) {
    this.time += dt;
    for (const p of this.parts) {
      p.life += dt;
      p.vy -= p.grav * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const k = Math.exp(-dt * 18);
    this.kickX *= k;
    this.kickY *= k;
    this.punch *= Math.exp(-dt * 7);
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    if (level?.features.lightning) {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.nextLightning = 10 + Math.random() * 20;
        this.lightning = 0.45;
        audio.play(SFX.lightning, { volume: 0.5, vary: 0.1 });
      }
      this.lightning = Math.max(0, this.lightning - dt);
    }
  }

  /** Applies shake & kick to the renderer camera (CSS px). */
  applyCamera(r: Renderer) {
    const t = this.time;
    const s = this.trauma * this.trauma;
    const mag = 14 * s;
    r.shakeX = (Math.sin(t * 61.3) * 0.6 + Math.sin(t * 23.7 + 1.3) * 0.4) * mag + this.kickX;
    r.shakeY = (Math.sin(t * 57.1 + 2.1) * 0.6 + Math.sin(t * 29.3 + 0.4) * 0.4) * mag + this.kickY;
    r.zoom = 1 + this.punch;
    r.updateCamera();
  }

  draw(r: Renderer, front: boolean) {
    const c = r.ctx;
    for (const p of this.parts) {
      if (!!p.front !== front) continue;
      const t = p.life / p.max;
      switch (p.kind) {
        case 'px': {
          r.world();
          c.globalAlpha = 1 - t * t;
          c.fillStyle = p.color;
          const s = p.size * r.scale * (1 - t * 0.5);
          c.fillRect(r.sx(p.x) - s / 2, r.sy(p.y) - s / 2, s, s);
          break;
        }
        case 'anim': {
          const f = animFrame(p.id!, p.life, false);
          r.drawSprite(f, p.x, p.y, { sx: p.scale * (p.flip ? -1 : 1), sy: p.scale, rot: p.rot, alpha: t > 0.8 ? (1 - t) * 5 : 1, additive: p.additive });
          break;
        }
        case 'sprite':
          r.drawSprite(p.id, p.x, p.y, { sx: p.scale, sy: p.scale, rot: p.rot, alpha: 1 - t * t });
          break;
        case 'text': {
          r.world();
          const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : t < 0.3 ? 1.2 - ((t - 0.15) / 0.15) * 0.2 : 1;
          const size = p.size * r.scale * pop;
          c.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
          c.font = `${Math.round(size)}px Karmatic, EightBit, monospace`;
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.lineWidth = Math.max(2, size * 0.18);
          c.strokeStyle = '#000';
          c.lineJoin = 'round';
          c.strokeText(p.text!, r.sx(p.x), r.sy(p.y));
          c.fillStyle = p.color;
          c.fillText(p.text!, r.sx(p.x), r.sy(p.y));
          break;
        }
        case 'ring': {
          r.world();
          c.globalAlpha = (1 - t) * 0.9;
          c.strokeStyle = p.color;
          c.lineWidth = Math.max(1, 0.12 * r.scale * (1 - t));
          c.beginPath();
          c.arc(r.sx(p.x), r.sy(p.y), p.size * r.scale * (0.3 + t * 0.9), 0, Math.PI * 2);
          c.stroke();
          break;
        }
      }
    }
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- events
  handle(events: GameEvent[], s: GameState, ctx: FxContext) {
    for (const e of events) {
      if (this.seen.has(e.k)) continue;
      this.seen.set(e.k, s.frame);
      this.onEvent(e, s, ctx);
    }
    if (this.seen.size > 4000) {
      for (const [k, f] of this.seen) if (s.frame - f > 900 || f > s.frame + 5) this.seen.delete(k);
    }
  }

  private pan(ctx: FxContext, x = 0): number {
    const v = ctx.level.view;
    return ((x - v.x) / v.w) * 1.6 - 0.8;
  }

  private onEvent(e: GameEvent, s: GameState, ctx: FxContext) {
    const x = e.x ?? 0;
    const y = e.y ?? 0;
    const pan = this.pan(ctx, x);
    const kc = (slot: number | undefined) => (slot !== undefined && slot >= 0 ? KNIGHTS[ctx.knights[slot] ?? 0]?.color ?? '#fff' : '#fff');
    switch (e.t) {
      case 'count':
        audio.play(SFX.select, { volume: 0.7, vary: 0 });
        this.showBanner(String(e.v), '', '#ffe066', 0.9);
        break;
      case 'go':
        audio.play(SFX.button, { volume: 0.9, pitch: 0.8, vary: 0 });
        this.showBanner('FIGHT!', '', '#ff8a3d', 0.9);
        this.punch = 0.04;
        break;
      case 'jump':
        audio.play(SFX.jump, { volume: 0.45, pan, vary: 0.08 });
        this.dust(x, y, 5);
        break;
      case 'djump':
        audio.play(SFX.doubleJump, { volume: 0.5, pan });
        this.ring(x, y + 0.1, 0.5, 'rgba(255,255,255,0.8)', 0.25);
        this.dust(x, y, 4);
        break;
      case 'walljump':
        audio.play(SFX.jump, { volume: 0.5, pitch: 1.15, pan });
        this.burst(x, y, 6, '#e8e0d0', 3, { grav: 4 });
        break;
      case 'land':
        if ((e.v ?? 0) > 6) this.dust(x, y, (e.v ?? 0) > 12 ? 9 : 5);
        break;
      case 'drop':
        this.dust(x, y, 3);
        break;
      case 'shoot': {
        const w = e.w as W;
        const snd: Record<number, string> = {
          [W.Stone]: SFX.stone, [W.Pill]: SFX.pill, [W.Shuriken]: SFX.shuriken, [W.Hadouken]: SFX.hadouken,
          [W.Pizza]: SFX.pizza, [W.Barrel]: SFX.barrel, [W.Sock]: SFX.sock, [W.Duck]: SFX.quack, [W.Bomb]: SFX.bomb, [W.Music]: SFX.noteBig,
        };
        audio.play(snd[w], { volume: w === W.Duck ? 0.35 : 0.7, pan, pitch: w === W.Duck ? 1.4 : 1 });
        const p = s.players[e.a ?? 0];
        const f = p?.face ?? 1;
        this.burst(x + f * 0.1, y, 3, '#fff', 2.5, { grav: 0, max: 0.12 });
        if (w === W.Hadouken || w === W.Pizza) this.kick(-f, 0, 2);
        ctx.rumble(e.a ?? -1, 0.1, 0.25, 40);
        break;
      }
      case 'note':
        audio.play(e.v === 1 ? SFX.noteMed : SFX.noteSmall, { volume: 0.6, pan });
        break;
      case 'hit': {
        const dmg = e.v ?? 1;
        audio.play(SFX.hit, { volume: 0.55 + dmg * 0.08, pan, maxVoices: 3 });
        audio.play(SFX.bulletHit, { volume: 0.5, pan, pitch: 1.2 - dmg * 0.05 });
        const col = ['#ffffff', '#ffe066', '#ff9a3d'];
        this.burst(x, y, 8 + dmg * 3, col, 6 + dmg, { grav: 6 });
        this.ring(x, y, 0.35 + dmg * 0.12, '#fff', 0.2);
        this.shake(0.12 + dmg * 0.07);
        const v = s.players[e.b ?? 0];
        if (v) this.kick(Math.sign(v.vx) || 1, -Math.sign(v.vy), 3 + dmg * 1.5);
        this.text(x + (Math.random() - 0.5) * 0.3, y + 0.5, `-${dmg}`, dmg >= 4 ? '#ff5050' : '#ffd0d0', 0.32 + dmg * 0.03, 0.7, 2.8);
        ctx.rumble(e.b ?? -1, 0.4 + dmg * 0.1, 0.6, 80 + dmg * 25);
        ctx.rumble(e.a ?? -1, 0.05, 0.3, 50);
        break;
      }
      case 'ko': {
        audio.play(SFX.death, { volume: 0.55, pan, vary: 0.04 });
        audio.play(SFX.explosion, { volume: 0.35, pan, pitch: 1.3 });
        const victimColor = kc(e.b);
        this.burst(x, y, 40, [victimColor, '#ffffff', '#ffe066'], 11, { grav: 8, max: 0.9 });
        this.animFx(FX.smoke, x, y, 1.1);
        this.ring(x, y, 1.6, victimColor, 0.45);
        this.shake(0.55);
        this.punch = 0.06;
        this.flash = 0.25;
        this.flashColor = '#ffffff';
        this.text(x, y + 0.9, 'KO!', '#ff5050', 0.85, 1.1, 1.6);
        if (e.a !== undefined && e.a >= 0) {
          audio.play(SFX.plusOne, { volume: 0.55, vary: 0 });
          const k = s.players[e.a];
          if (k) this.text(k.x, k.y + 1.4, '+1', kc(e.a), 0.6, 1.2, 1.4);
        }
        ctx.rumble(e.b ?? -1, 1, 1, 380);
        ctx.rumble(e.a ?? -1, 0.5, 0.6, 160);
        break;
      }
      case 'stomp':
        audio.play(SFX.footstool, { volume: 0.55, pan });
        this.dust(x, y, 6);
        this.ring(x, y, 0.5, '#fff', 0.2);
        this.shake(0.12);
        ctx.rumble(e.a ?? -1, 0.2, 0.3, 60);
        break;
      case 'impact':
      case 'break':
      case 'fizzle':
        this.projectileFx(e, x, y, pan);
        break;
      case 'clash':
        audio.play(SFX.bulletHit, { volume: 0.6, pitch: 1.6, pan });
        this.burst(x, y, 12, ['#fff', '#9ff', '#ffe066'], 7, { grav: 2 });
        this.ring(x, y, 0.5, '#bff', 0.2);
        this.shake(0.08);
        break;
      case 'boom':
        this.boom(e, x, y, pan);
        break;
      case 'quack':
        audio.play(SFX.quack, { volume: 0.4, pan, pitch: 0.9 + Math.random() * 0.4, maxVoices: 2 });
        this.ring(x, y, 1.1, '#ffe14d', 0.3);
        this.shake(0.06);
        break;
      case 'bounce':
        if (e.w === W.Pill) audio.play(SFX.pill, { volume: 0.2, pitch: 1.6, pan });
        break;
      case 'chest':
        audio.play(SFX.spawn, { volume: 0.35, pan });
        this.animFx(FX.smoke, x, y, 0.6);
        break;
      case 'chestland':
        this.dust(x, y - 0.2, 4);
        break;
      case 'pickup': {
        audio.play(SFX.chest, { volume: 0.8, pan });
        const w = e.w ?? 0;
        this.add({ kind: 'sprite', id: WEAPON_ICONS[w], x, y: y + 0.3, vy: 2.2, drag: 2, max: 1, scale: 3, front: true });
        this.text(x, y + 1.1, WEAPONS[w]?.name.toUpperCase() ?? '', kc(e.a), 0.3, 1.3, 1.2);
        this.burst(x, y, 14, ['#ffe066', '#fff'], 5, { grav: 3 });
        ctx.rumble(e.a ?? -1, 0.1, 0.4, 60);
        break;
      }
      case 'armor':
        audio.play(SFX.armor, { volume: 0.7, pan });
        this.animFx(FX.sparkles, x, y + 0.2, 1.4);
        this.text(x, y + 1.1, 'ARMOR!', '#8fd3ff', 0.32, 1.3, 1.2);
        this.burst(x, y, 16, ['#8fd3ff', '#fff'], 5, { grav: 2 });
        break;
      case 'spawn':
        audio.play(SFX.spawn, { volume: 0.3, pan, pitch: 1.2 });
        this.animFx(FX.smoke, x, y + 0.4, 0.7);
        this.ring(x, y + 0.4, 0.8, kc(e.a), 0.35);
        break;
      case 'tile':
        audio.play(SFX.explosion, { volume: 0.6, pan });
        this.animFx(FX.boom, x, y, 1.4);
        this.burst(x, y, 24, ['#2c5e3a', '#3f7d4d', '#1d3a26', '#6b4a33'], 7, { grav: 18, max: 0.9, size: 0.12 });
        this.shake(0.35);
        break;
      case 'win': {
        audio.play(SFX.win, { volume: 0.8, vary: 0 });
        audio.duckMusic(0.25, 3);
        this.flash = 0.6;
        this.flashColor = '#fff';
        this.punch = 0.08;
        break;
      }
      case 'sudden':
        this.showBanner('SUDDEN DEATH', 'next KO wins', '#ff5050', 2.2);
        audio.play(SFX.pause, { volume: 0.8 });
        break;
      case 'gull':
        audio.play(SFX.seagull, { volume: 0.6, pan: Math.sign(e.v ?? 0) * -0.6 });
        break;
      case 'temple':
        audio.play(SFX.explosion, { volume: 1, pitch: 0.7 });
        this.shake(1);
        this.flash = 0.5;
        this.burst(x, y, 60, ['#c0392b', '#e74c3c', '#2a9d8f', '#ffd166'], 12, { grav: 14, max: 1.4, size: 0.15 });
        this.showBanner('THE TEMPLE FALLS', 'something stirs...', '#ffd166', 2.5);
        break;
      case 'dragon-wake':
        audio.play(SFX.dragonAwake, { volume: 0.9 });
        this.shake(0.4);
        break;
      case 'dragon-swoop':
        audio.play(SFX.dragonEnter, { volume: 0.9 });
        this.shake(0.7);
        this.showBanner('DRAGON!', '', '#ff5050', 1.4);
        break;
    }
  }

  private projectileFx(e: GameEvent, x: number, y: number, pan: number) {
    const w = e.w as W;
    const dir = e.v ?? 1;
    switch (w) {
      case W.Stone:
        this.animFx(FX.stoneImpact, x, y, 1.5, { flip: dir < 0 });
        this.burst(x, y, 5, '#9a8f84', 3, { grav: 12 });
        break;
      case W.Shuriken:
        this.animFx(FX.shurikenImpact, x, y, 1.5, { flip: dir < 0 });
        this.burst(x, y, 6, '#dff', 4);
        break;
      case W.Hadouken:
        this.animFx(FX.hadoukenImpact, x, y, 2, { flip: dir < 0 });
        this.burst(x, y, 14, ['#ffb347', '#ff6b2e', '#fff3b0'], 6, { grav: -1 });
        this.shake(0.1);
        break;
      case W.Pizza:
        this.animFx(FX.pizzaExplosion, x, y, 1.1);
        this.burst(x, y, 16, ['#ffd34d', '#e74c3c', '#f4a261'], 6, { grav: 10 });
        audio.play(SFX.bulletHit, { volume: 0.5, pitch: 0.7, pan });
        this.shake(0.12);
        break;
      case W.Barrel:
        audio.play(SFX.barrel, { volume: 0.6, pitch: 0.7, pan });
        this.burst(x, y, 18, ['#8b5a2b', '#c08a52', '#5b3a1e', '#999'], 7, { grav: 16, size: 0.1, max: 0.8 });
        this.shake(0.15);
        break;
      case W.Music:
        this.animFx(FX.notePop, x, y, 1.6);
        break;
      case W.Pill:
        this.burst(x, y, 6, ['#ff7eb6', '#fff'], 3);
        break;
      default:
        this.burst(x, y, 5, '#fff', 3);
    }
  }

  private boom(e: GameEvent, x: number, y: number, pan: number) {
    switch (e.b) {
      case 0: // sock
        audio.play(SFX.duckExplosion, { volume: 0.7, pan });
        this.animFx(FX.boom, x, y, 2.6);
        this.burst(x, y, 26, ['#9acd32', '#6b8e23', '#c5e17a'], 6, { grav: -1.5, drag: 3, max: 1.1, size: 0.12 });
        this.ring(x, y, 1.0, '#b5e550', 0.3);
        this.shake(0.3);
        break;
      case 1: // duck
        audio.play(SFX.quack, { volume: 0.7, pan });
        this.animFx(FX.duckBoom, x, y, 2.4);
        this.ring(x, y, 1.05, '#ffe14d', 0.3);
        this.shake(0.2);
        break;
      case 2: // nuke
        audio.play(SFX.explosion, { volume: 1, pan });
        this.animFx(FX.bigExplosion, x, y, 2.4);
        this.burst(x, y, 70, ['#fff', '#ffe066', '#ff8a3d', '#ff3d3d', '#555'], 15, { grav: 6, max: 1.2, size: 0.13 });
        this.ring(x, y, 2.2, '#fff', 0.4);
        this.shake(1);
        this.punch = 0.08;
        this.flash = 0.7;
        this.flashColor = '#fff5d0';
        break;
      case 3: // confetti dud
        audio.play(SFX.confetti, { volume: 0.7, pan });
        for (let i = 0; i < 70; i++) {
          const a = Math.PI * (0.15 + Math.random() * 0.7);
          const sp = 4 + Math.random() * 7;
          this.add({
            x, y, vx: Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(a) * sp, grav: 7, drag: 1.8,
            max: 1.2 + Math.random() * 0.8, size: 0.09,
            color: ['#ff5d6c', '#ffc53d', '#5fd35f', '#4fa8ff', '#c77dff', '#fff'][(Math.random() * 6) | 0], front: true,
          });
        }
        this.text(x, y + 0.6, 'PARTY!', '#ff9ff3', 0.4, 1.1, 1.5);
        break;
    }
  }
}
