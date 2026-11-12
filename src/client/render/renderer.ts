// Canvas 2D renderer: camera (fit the arena to any screen), pixel-art sprite
// drawing with Unity pivots / pixels-per-unit, hit-flash silhouettes, shake.

import { assets, silhouette, sprite, tintedImage, whiteImage, type SpriteDef } from '../assets';
import type { Rect } from '../../shared/level';

export interface DrawOpts {
  sx?: number;
  sy?: number;
  flipX?: boolean;
  flipY?: boolean;
  rot?: number; // degrees, counter-clockwise like Unity
  alpha?: number;
  white?: boolean;
  additive?: boolean;
  /** Multiply colour '#rrggbb[aa]' (Unity SpriteRenderer colour). */
  tint?: string;
  /** Draw a flat-colour silhouette (outlines). */
  fill?: string;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w = 0; // canvas pixels
  h = 0;
  dpr = 1;
  /** Arena rect (the HUD and letterboxing are relative to it). */
  view: Rect = { x: -12.5, y: -7, w: 25, h: 14 };
  /** Current (smoothed) camera rect inside the arena. */
  cam: Rect = { x: -12.5, y: -7, w: 25, h: 14 };
  scale = 1; // canvas px per world unit
  ox = 0; // canvas px of world x=view.x
  oy = 0; // canvas px of world y=view.y+view.h
  shakeX = 0;
  shakeY = 0;
  zoom = 1;
  /** Extra screen-space margins reserved for the HUD (CSS px). */
  safe = { top: 0, bottom: 0, left: 0, right: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.floor(window.innerWidth * this.dpr);
    const ch = Math.floor(window.innerHeight * this.dpr);
    if (cw !== this.canvas.width || ch !== this.canvas.height) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.w = cw;
    this.h = ch;
    this.ctx.imageSmoothingEnabled = false;
    this.updateCamera();
  }

  setView(v: Rect) {
    this.view = v;
    this.cam = { ...v };
    this.updateCamera();
  }

  /**
   * Smoothly frames the given points (living fighters). Zooms in up to
   * `maxZoom` when everyone is close together, never shows outside the arena.
   */
  follow(points: Array<{ x: number; y: number }>, dt: number, maxZoom = 1.45) {
    const v = this.view;
    let tw = v.w;
    let tx = v.x;
    let ty = v.y;
    if (points.length) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of points) {
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
      }
      const margin = 4.5;
      const aspect = v.w / v.h;
      tw = Math.max(x1 - x0 + margin * 2, (y1 - y0 + margin * 2) * aspect, v.w / maxZoom);
      tw = Math.min(tw, v.w);
      const th = tw / aspect;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2 + 0.5;
      tx = Math.max(v.x, Math.min(v.x + v.w - tw, cx - tw / 2));
      ty = Math.max(v.y, Math.min(v.y + v.h - th, cy - th / 2));
    }
    const k = 1 - Math.exp(-dt * 3.2);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.w += (tw - this.cam.w) * k;
    this.cam.h = this.cam.w * (v.h / v.w);
    this.updateCamera();
  }

  updateCamera() {
    const v = this.cam;
    const z = this.zoom;
    this.scale = Math.min(this.w / v.w, this.h / v.h) * z;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    this.ox = this.w / 2 - (cx - v.x) * this.scale + this.shakeX * this.dpr;
    this.oy = this.h / 2 - (v.y + v.h - cy) * this.scale + this.shakeY * this.dpr;
  }

  /** World -> canvas pixels. */
  sx(x: number): number {
    return this.ox + (x - this.cam.x) * this.scale;
  }
  sy(y: number): number {
    return this.oy + (this.cam.y + this.cam.h - y) * this.scale;
  }

  clear(color: string) {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = color;
    c.fillRect(0, 0, this.w, this.h);
  }

  drawSpriteDef(def: SpriteDef, x: number, y: number, o: DrawOpts = {}) {
    const img = o.fill ? silhouette(def.img, o.fill) : o.white ? whiteImage(def.img) : o.tint ? tintedImage(def.img, o.tint) : assets.images.get(def.img);
    if (!img) return;
    const c = this.ctx;
    const k = this.scale / def.ppu;
    const fx = (o.flipX ? -1 : 1) * (o.sx ?? 1) * k;
    const fy = (o.flipY ? -1 : 1) * (o.sy ?? 1) * k;
    const px = this.sx(x);
    const py = this.sy(y);
    if (o.rot) {
      const r = (-o.rot * Math.PI) / 180;
      const cs = Math.cos(r);
      const sn = Math.sin(r);
      c.setTransform(cs * fx, sn * fx, -sn * fy, cs * fy, px, py);
    } else {
      c.setTransform(fx, 0, 0, fy, px, py);
    }
    c.globalAlpha = o.alpha ?? 1;
    if (o.additive) c.globalCompositeOperation = 'lighter';
    c.drawImage(img, def.x, def.y, def.w, def.h, -def.px, -def.py, def.w, def.h);
    if (o.additive) c.globalCompositeOperation = 'source-over';
  }

  drawSprite(id: string | undefined, x: number, y: number, o: DrawOpts = {}) {
    if (!id) return;
    const def = sprite(id);
    if (def) this.drawSpriteDef(def, x, y, o);
  }

  /** Screen-space helpers (CSS pixels). */
  screen() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.globalAlpha = 1;
  }

  world() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Rectangle of the arena in CSS pixels. */
  arenaRect(): Rect {
    const v = this.cam;
    return {
      x: this.sx(v.x) / this.dpr,
      y: this.sy(v.y + v.h) / this.dpr,
      w: (v.w * this.scale) / this.dpr,
      h: (v.h * this.scale) / this.dpr,
    };
  }
}
