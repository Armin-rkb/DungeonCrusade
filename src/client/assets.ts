// Loads the manifest produced by tools/build-assets.mjs and the images it
// references. Provides sprite / animation lookups for the renderer.

export interface SpriteDef {
  img: string;
  x: number;
  y: number;
  w: number;
  h: number;
  px: number;
  py: number;
  ppu: number;
  name?: string;
}

export interface AnimDef {
  frames: Array<{ s: string; t: number }>;
  len: number;
  loop: boolean;
}

export interface Manifest {
  version: number;
  images: Record<string, string>;
  sprites: Record<string, SpriteDef>;
  anims: Record<string, AnimDef>;
  audio: Record<string, { url: string; music: boolean }>;
  fonts: Record<string, string>;
}

export const assets = {
  manifest: null as unknown as Manifest,
  images: new Map<string, HTMLImageElement>(),
  white: new Map<string, HTMLCanvasElement>(),
  tinted: new Map<string, HTMLCanvasElement>(),
  base: './',
};

export function url(rel: string): string {
  return assets.base + rel;
}

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch(url('gen/manifest.json'));
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  assets.manifest = await res.json();
  return assets.manifest;
}

function loadImage(id: string, src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      assets.images.set(id, img);
      resolve();
    };
    img.onerror = () => {
      console.warn('image failed', src);
      resolve();
    };
    img.src = url(src);
  });
}

/** Loads every image, reporting progress 0..1. Big backgrounds load in parallel. */
export async function loadImages(filter: (id: string) => boolean, progress?: (p: number) => void): Promise<void> {
  const ids = Object.keys(assets.manifest.images).filter((id) => filter(id) && !assets.images.has(id));
  let done = 0;
  const queue = ids.slice();
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const id = queue.shift()!;
      await loadImage(id, assets.manifest.images[id]);
      done++;
      progress?.(done / ids.length);
    }
  });
  await Promise.all(workers);
}

export async function loadFonts(): Promise<void> {
  const fonts = assets.manifest.fonts;
  const map: Record<string, string> = { ka1: 'Karmatic', 'sabo-filled': 'Sabo', '8-bit-wonder': 'EightBit', 'masaaki-regular': 'Masaaki' };
  await Promise.all(
    Object.entries(fonts).map(async ([id, src]) => {
      try {
        const face = new FontFace(map[id] ?? id, `url(${url(src)})`);
        await face.load();
        (document.fonts as unknown as { add(f: FontFace): void }).add(face);
      } catch (e) {
        console.warn('font failed', id, e);
      }
    }),
  );
}

export function sprite(id: string): SpriteDef | undefined {
  return assets.manifest.sprites[id];
}

export function anim(id: string): AnimDef | undefined {
  return assets.manifest.anims[id];
}

/** Sprite id of an animation at time t (seconds). */
export function animFrame(id: string, t: number, loop?: boolean): string | undefined {
  const a = assets.manifest.anims[id];
  if (!a || !a.frames.length) return undefined;
  const lp = loop ?? a.loop;
  let tt = t;
  if (lp && a.len > 0) tt = t % a.len;
  let cur = a.frames[0].s;
  for (const f of a.frames) {
    if (f.t <= tt + 1e-6) cur = f.s;
    else break;
  }
  return cur;
}

/** A white silhouette of an image, used for hit flashes. */
export function whiteImage(imgId: string): HTMLCanvasElement | undefined {
  let c = assets.white.get(imgId);
  if (c) return c;
  const img = assets.images.get(imgId);
  if (!img) return undefined;
  c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  assets.white.set(imgId, c);
  return c;
}

/** Image multiplied by a colour (Unity SpriteRenderer.color), cached. */
export function tintedImage(imgId: string, color: string): HTMLCanvasElement | HTMLImageElement | undefined {
  const rgb = color.slice(0, 7).toLowerCase();
  if (rgb === '#ffffff') return assets.images.get(imgId);
  const key = imgId + rgb;
  let c = assets.tinted.get(key);
  if (c) return c;
  const img = assets.images.get(imgId);
  if (!img) return undefined;
  c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = rgb;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(img, 0, 0);
  assets.tinted.set(key, c);
  return c;
}
