// Tiny DOM UI framework: a stack of screens, spatial focus navigation with
// gamepads / keyboard, and option widgets. Mouse & touch work through normal
// clicks.

import { audio, SFX } from '../audio';
import { input, type Device, type MenuNav } from '../input/input';

export abstract class Screen {
  el: HTMLDivElement;
  focused: HTMLElement | null = null;
  /** Pass device nav through spatial navigation. */
  spatial = true;

  constructor(cls = '') {
    this.el = document.createElement('div');
    this.el.className = `screen ${cls}`;
  }

  abstract render(): void;
  onEnter() {}
  onExit() {}
  update(_dt: number) {}
  /** Return true if the screen consumed this device's input this frame. */
  claim(_d: Device): boolean {
    return false;
  }
  back(): boolean {
    return false;
  }

  focusables(): HTMLElement[] {
    return Array.from(this.el.querySelectorAll<HTMLElement>('[data-nav]')).filter((e) => e.offsetParent !== null && !e.classList.contains('disabled') && !(e as HTMLButtonElement).disabled);
  }

  focus(el: HTMLElement | null, sound = true) {
    if (this.focused === el) return;
    this.focused?.classList.remove('focused');
    this.focused = el;
    if (el) {
      el.classList.add('focused');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (sound) audio.play(SFX.select, { volume: 0.25, pitch: 1.6, vary: 0 });
    }
  }

  focusFirst() {
    const f = this.focusables();
    const pref = f.find((e) => e.dataset.autofocus !== undefined) ?? f[0] ?? null;
    this.focus(pref, false);
  }

  handleNav(n: MenuNav) {
    const f = this.focusables();
    if (this.focused && !f.includes(this.focused)) this.focused = null;
    if (!this.focused && (n.up || n.down || n.left || n.right || n.confirm)) {
      this.focusFirst();
      return;
    }
    const cur = this.focused;
    if (!cur) {
      if (n.back) this.back();
      return;
    }
    const adj = (cur as HTMLElement & { adjust?: (d: number) => void }).adjust;
    if (adj && (n.left || n.right)) {
      adj(n.left ? -1 : 1);
      audio.play(SFX.select, { volume: 0.3, pitch: 1.3, vary: 0 });
    } else if (n.up || n.down || n.left || n.right) {
      const dir = n.up ? 'up' : n.down ? 'down' : n.left ? 'left' : 'right';
      const next = spatialNext(cur, f, dir);
      if (next) this.focus(next);
    }
    if (n.confirm) {
      cur.click();
    }
    if (n.back) {
      if (this.back()) audio.play(SFX.button, { volume: 0.4, pitch: 0.8 });
    }
  }
}

function spatialNext(cur: HTMLElement, all: HTMLElement[], dir: 'up' | 'down' | 'left' | 'right'): HTMLElement | null {
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const e of all) {
    if (e === cur) continue;
    const q = e.getBoundingClientRect();
    const qx = q.left + q.width / 2;
    const qy = q.top + q.height / 2;
    const dx = qx - cx;
    const dy = qy - cy;
    let main: number;
    let cross: number;
    if (dir === 'up') { main = -dy; cross = Math.abs(dx); }
    else if (dir === 'down') { main = dy; cross = Math.abs(dx); }
    else if (dir === 'left') { main = -dx; cross = Math.abs(dy); }
    else { main = dx; cross = Math.abs(dy); }
    if (main <= 4) continue;
    const score = main + cross * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

export class UI {
  stack: Screen[] = [];
  private changedAt = 0;
  constructor(public root: HTMLElement) {
    // A tap that changes screens must not also click whatever appears under the
    // finger on the next screen (mobile "ghost clicks").
    root.addEventListener('click', (e) => {
      if (performance.now() - this.changedAt < 350) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }

  get top(): Screen | undefined {
    return this.stack[this.stack.length - 1];
  }

  push(s: Screen) {
    this.changedAt = performance.now();
    this.top?.el.classList.add('hide');
    this.stack.push(s);
    s.render();
    this.root.appendChild(s.el);
    s.onEnter();
    if (!s.focused) s.focusFirst();
    hookMouse(s);
  }

  pop() {
    this.changedAt = performance.now();
    const s = this.stack.pop();
    if (s) {
      s.onExit();
      s.el.remove();
    }
    const t = this.top;
    if (t) {
      t.el.classList.remove('hide');
      t.render();
      hookMouse(t);
      t.onEnter();
      if (!t.focused || !t.el.contains(t.focused)) t.focusFirst();
    }
  }

  /** Replace the whole stack (null = no menus, e.g. during a match). */
  set(s: Screen | null) {
    while (this.stack.length) {
      const x = this.stack.pop()!;
      x.onExit();
      x.el.remove();
    }
    if (s) this.push(s);
  }

  /** Re-render the current screen keeping focus position. */
  refresh() {
    const t = this.top;
    if (!t) return;
    const f = t.focused;
    const key = f?.dataset.key;
    const idx = f ? t.focusables().indexOf(f) : -1;
    t.render();
    hookMouse(t);
    const fs = t.focusables();
    const again = (key && fs.find((e) => e.dataset.key === key)) || (idx >= 0 ? fs[Math.min(idx, fs.length - 1)] : null);
    t.focused = null;
    if (again) t.focus(again, false);
  }

  update(dt: number) {
    const t = this.top;
    if (!t) return;
    t.update(dt);
    if (this.top !== t) return;
    const merged: MenuNav = { up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, any: false, alt: false };
    for (const d of input.devices()) {
      if (t.claim(d)) {
        if (this.top !== t) return; // the screen changed: ignore the other devices this frame
        continue;
      }
      const n = d.nav;
      merged.up ||= n.up;
      merged.down ||= n.down;
      merged.left ||= n.left;
      merged.right ||= n.right;
      merged.confirm ||= n.confirm;
      merged.back ||= n.back;
      merged.start ||= n.start;
      merged.alt ||= n.alt;
      merged.any ||= n.any;
    }
    if (t.spatial) t.handleNav(merged);
  }
}

function hookMouse(s: Screen) {
  for (const e of s.focusables()) {
    if ((e as HTMLElement & { __hooked?: boolean }).__hooked) continue;
    (e as HTMLElement & { __hooked?: boolean }).__hooked = true;
    e.addEventListener('mouseenter', () => s.focus(e, false));
  }
}

// ------------------------------------------------------------------ widgets
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
}

export function button(label: string, onClick: () => void, opts: { cls?: string; sub?: string; key?: string; autofocus?: boolean; disabled?: boolean } = {}): HTMLButtonElement {
  const b = h('button', { class: `btn ${opts.cls ?? ''}`, 'data-nav': '' });
  b.innerHTML = label + (opts.sub ? `<small>${opts.sub}</small>` : '');
  if (opts.key) b.dataset.key = opts.key;
  if (opts.autofocus) b.dataset.autofocus = '';
  if (opts.disabled) b.disabled = true;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.unlock();
    audio.play(SFX.button, { volume: 0.5, vary: 0.02 });
    onClick();
  });
  return b;
}

/** A focusable row that cycles through options with left/right (or click). */
export function selector<T>(label: string, options: Array<{ label: string; value: T }>, get: () => T, set: (v: T) => void, key?: string): HTMLElement {
  const row = h('div', { class: 'opt', 'data-nav': '' });
  if (key) row.dataset.key = key;
  const lab = h('span', {}, label);
  const val = h('span', { class: 'val' });
  const left = h('span', { class: 'arrow' }, '◀');
  const txt = h('span');
  const right = h('span', { class: 'arrow' }, '▶');
  val.append(left, txt, right);
  row.append(lab, val);
  const idx = () => Math.max(0, options.findIndex((o) => o.value === get()));
  const paint = () => (txt.textContent = options[idx()]?.label ?? '');
  const adjust = (d: number) => {
    const i = (idx() + d + options.length) % options.length;
    set(options[i].value);
    paint();
  };
  (row as HTMLElement & { adjust?: (d: number) => void }).adjust = adjust;
  left.addEventListener('click', (e) => { e.stopPropagation(); adjust(-1); });
  right.addEventListener('click', (e) => { e.stopPropagation(); adjust(1); });
  row.addEventListener('click', () => adjust(1));
  paint();
  return row;
}

export function slider(label: string, get: () => number, set: (v: number) => void, min = 0, max = 1, stepv = 0.1, key?: string): HTMLElement {
  const row = h('div', { class: 'opt', 'data-nav': '' });
  if (key) row.dataset.key = key;
  const lab = h('span', {}, label);
  const val = h('span', { class: 'val' });
  const range = h('input', { type: 'range', min: String(min), max: String(max), step: String(stepv) });
  range.value = String(get());
  const num = h('span');
  const paint = () => (num.textContent = `${Math.round(((get() - min) / (max - min)) * 100)}%`);
  range.addEventListener('input', () => {
    set(Number(range.value));
    paint();
  });
  val.append(range, num);
  row.append(lab, val);
  (row as HTMLElement & { adjust?: (d: number) => void }).adjust = (d: number) => {
    const v = Math.max(min, Math.min(max, Math.round((get() + d * stepv) / stepv) * stepv));
    set(v);
    range.value = String(v);
    paint();
  };
  paint();
  return row;
}

export function toggle(label: string, get: () => boolean, set: (v: boolean) => void, key?: string): HTMLElement {
  return selector(label, [{ label: 'ON', value: true }, { label: 'OFF', value: false }], get, set, key);
}

let toastTimer = 0;
export function toast(msg: string, error = false, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: `toast${error ? ' error' : ''}` }, msg);
  document.body.appendChild(t);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), ms);
}

export function hints(items: Array<[string, string]>): HTMLElement {
  const el = h('div', { class: 'footer-hints' });
  for (const [g, text] of items) el.appendChild(h('span', {}, `<span class="glyph">${g}</span>${text}`));
  return el;
}

/** Draws a sprite into a small canvas element (for menus). */
export function spriteCanvas(draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w: number, hgt: number, cls = ''): HTMLCanvasElement {
  const c = h('canvas', { class: cls });
  c.width = w;
  c.height = hgt;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  draw(g, w, hgt);
  return c;
}
