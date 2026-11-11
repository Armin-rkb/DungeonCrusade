// Unified input: two keyboard layouts, any number of gamepads (Xbox,
// PlayStation, Switch Pro, 8BitDo, generic XInput/DirectInput via the browser
// Gamepad API "standard" mapping) and on-screen touch controls.
//
// Every physical device produces one button byte for the simulation plus menu
// navigation edges. Local players are bound to devices in the lobby.

import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_UP } from '../../shared/input';
import { settings } from '../settings';

export type Glyphs = 'xbox' | 'playstation' | 'nintendo' | 'keyboard' | 'touch';

export interface MenuNav {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  back: boolean;
  start: boolean;
  /** Any button/key was pressed this frame (used for "press to join"). */
  any: boolean;
  /** Secondary action (e.g. add CPU / ready toggle). */
  alt: boolean;
}

export interface Device {
  id: string;
  kind: 'keyboard' | 'gamepad' | 'touch';
  name: string;
  glyphs: Glyphs;
  connected: boolean;
  /** Current game buttons. */
  buttons: number;
  nav: MenuNav;
  rumble(strong: number, weak: number, ms: number): void;
}

const emptyNav = (): MenuNav => ({ up: false, down: false, left: false, right: false, confirm: false, back: false, start: false, any: false, alt: false });

// ------------------------------------------------------------------ keyboard
const keysDown = new Set<string>();
const keysPressed = new Set<string>();

const KB_LAYOUTS = [
  {
    id: 'kb1',
    name: 'Keyboard (WASD)',
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    jump: ['Space', 'KeyC'], attack: ['KeyF', 'KeyV'],
    start: ['Tab'],
  },
  {
    id: 'kb2',
    name: 'Keyboard (Arrows)',
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    jump: ['Period', 'Numpad0', 'ShiftRight', 'KeyK'], attack: ['Slash', 'Numpad1', 'ControlRight', 'KeyL', 'Comma'],
    start: ['Tab'],
  },
] as const;

const ALL_GAME_KEYS = new Set<string>(KB_LAYOUTS.flatMap((l) => [...l.left, ...l.right, ...l.up, ...l.down, ...l.jump, ...l.attack]));

function anyKey(codes: readonly string[], set: Set<string>): boolean {
  for (const c of codes) if (set.has(c)) return true;
  return false;
}

class KeyboardDevice implements Device {
  kind = 'keyboard' as const;
  glyphs: Glyphs = 'keyboard';
  connected = true;
  buttons = 0;
  nav = emptyNav();
  id: string;
  name: string;
  constructor(public layout: (typeof KB_LAYOUTS)[number]) {
    this.id = layout.id;
    this.name = layout.name;
  }
  poll(repeat: (key: string, held: boolean) => boolean) {
    const l = this.layout;
    let b = 0;
    if (anyKey(l.left, keysDown)) b |= BTN_LEFT;
    if (anyKey(l.right, keysDown)) b |= BTN_RIGHT;
    if (anyKey(l.up, keysDown)) b |= BTN_UP;
    if (anyKey(l.down, keysDown)) b |= BTN_DOWN;
    if (anyKey(l.jump, keysDown)) b |= BTN_JUMP;
    if (anyKey(l.attack, keysDown)) b |= BTN_ATTACK;
    this.buttons = b;
    const n = this.nav;
    n.up = repeat(this.id + 'u', anyKey(l.up, keysDown));
    n.down = repeat(this.id + 'd', anyKey(l.down, keysDown));
    n.left = repeat(this.id + 'l', anyKey(l.left, keysDown));
    n.right = repeat(this.id + 'r', anyKey(l.right, keysDown));
    // Menus: confirm with the jump keys (kb1 also E, kb2 also Enter), back with
    // Esc (kb1) / Backspace (kb2), continue / start with Tab.
    n.confirm = anyKey(l.jump, keysPressed) || keysPressed.has(this.id === 'kb1' ? 'KeyE' : 'Enter');
    n.back = keysPressed.has(this.id === 'kb1' ? 'Escape' : 'Backspace');
    n.start = keysPressed.has('Tab');
    n.alt = anyKey(l.attack, keysPressed);
    n.any = [...keysPressed].some((k) => anyKey([...l.left, ...l.right, ...l.up, ...l.down, ...l.jump, ...l.attack, ...l.start], new Set([k])));
  }
  rumble() {}
}

// ------------------------------------------------------------------ gamepad
function glyphsFor(id: string): Glyphs {
  const s = id.toLowerCase();
  if (s.includes('054c') || s.includes('dualsense') || s.includes('dualshock') || s.includes('playstation') || s.includes('wireless controller')) return 'playstation';
  if (s.includes('057e') || s.includes('pro controller') || s.includes('joy-con') || s.includes('nintendo') || s.includes('switch')) return 'nintendo';
  return 'xbox';
}

function prettyPadName(id: string, glyphs: Glyphs): string {
  if (glyphs === 'playstation') return 'PlayStation Controller';
  if (glyphs === 'nintendo') return 'Switch Controller';
  if (/xbox|xinput|045e/i.test(id)) return 'Xbox Controller';
  const clean = id.replace(/\(.*?\)/g, '').replace(/[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim();
  return clean.slice(0, 28) || 'Controller';
}

class GamepadDevice implements Device {
  kind = 'gamepad' as const;
  connected = true;
  buttons = 0;
  nav = emptyNav();
  prev: boolean[] = [];
  id: string;
  name: string;
  glyphs: Glyphs;
  pad: Gamepad | null = null;
  constructor(public index: number, padId: string) {
    this.id = `pad${index}`;
    this.glyphs = glyphsFor(padId);
    this.name = prettyPadName(padId, this.glyphs);
  }
  poll(gp: Gamepad, repeat: (key: string, held: boolean) => boolean) {
    this.pad = gp;
    const btn = (i: number) => {
      const b = gp.buttons[i];
      return !!b && (b.pressed || b.value > 0.5);
    };
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    const dead = 0.35;
    let b = 0;
    const left = ax < -dead || btn(14);
    const right = ax > dead || btn(15);
    const up = ay < -0.5 || btn(12);
    const down = ay > 0.5 || btn(13);
    if (left) b |= BTN_LEFT;
    if (right) b |= BTN_RIGHT;
    if (up) b |= BTN_UP;
    if (down) b |= BTN_DOWN;
    // A / Cross / bottom face button jumps (like the original "Press A to jump"),
    // X / Square / left face button attacks ("Press X to attack").
    if (btn(0) || btn(4) || btn(6)) b |= BTN_JUMP;
    if (btn(2) || btn(1) || btn(5) || btn(7) || btn(3)) b |= BTN_ATTACK;
    this.buttons = b;
    const pressed = (i: number) => btn(i) && !this.prev[i];
    const n = this.nav;
    n.up = repeat(this.id + 'u', up && !(Math.abs(ax) > Math.abs(ay) && ay > -0.5));
    n.down = repeat(this.id + 'd', down && !(Math.abs(ax) > Math.abs(ay) && ay < 0.5));
    n.left = repeat(this.id + 'l', left && Math.abs(ax) >= Math.abs(ay) || btn(14));
    n.right = repeat(this.id + 'r', right && Math.abs(ax) >= Math.abs(ay) || btn(15));
    n.confirm = pressed(0);
    n.back = pressed(1);
    n.start = pressed(9);
    n.alt = pressed(2) || pressed(3);
    n.any = gp.buttons.some((_, i) => pressed(i));
    this.prev = gp.buttons.map((_, i) => btn(i));
  }
  rumble(strong: number, weak: number, ms: number) {
    if (!settings.rumble || !this.pad) return;
    const act = (this.pad as unknown as { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } }).vibrationActuator;
    act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) })?.catch?.(() => {});
  }
}

// ------------------------------------------------------------------ touch
export class TouchDevice implements Device {
  id = 'touch';
  kind = 'touch' as const;
  name = 'Touch Screen';
  glyphs: Glyphs = 'touch';
  connected = false; // becomes true after the first touch
  buttons = 0;
  nav = emptyNav();
  pressedJump = false;
  rumble(strong: number, _weak: number, ms: number) {
    if (!settings.rumble) return;
    haptic(strong > 0.6 ? 'heavy' : strong > 0.3 ? 'medium' : 'light', ms);
  }
}

type HapticFn = (style: 'light' | 'medium' | 'heavy', ms: number) => void;
let hapticImpl: HapticFn = (_style, ms) => {
  try {
    navigator.vibrate?.(Math.min(ms, 60));
  } catch {
    /* unsupported */
  }
};
export function setHapticImpl(fn: HapticFn) {
  hapticImpl = fn;
}
export function haptic(style: 'light' | 'medium' | 'heavy', ms = 20) {
  if (settings.rumble) hapticImpl(style, ms);
}

// ------------------------------------------------------------------ manager
class InputManager {
  keyboards = KB_LAYOUTS.map((l) => new KeyboardDevice(l));
  pads = new Map<number, GamepadDevice>();
  touch = new TouchDevice();
  /** Aggregated menu navigation of every device. */
  nav = emptyNav();
  lastDevice: Device | null = null;
  private held = new Map<string, number>();
  private now = 0;
  listeners: Array<(d: Device, connected: boolean) => void> = [];

  install() {
    window.addEventListener('keydown', (e) => {
      if (isTextInput(e.target)) return;
      if (ALL_GAME_KEYS.has(e.code) || e.code === 'Escape' || e.code === 'Enter' || e.code === 'Tab' || e.code === 'Backspace') e.preventDefault();
      if (!e.repeat) keysPressed.add(e.code);
      keysDown.add(e.code);
    });
    window.addEventListener('keyup', (e) => keysDown.delete(e.code));
    window.addEventListener('blur', () => keysDown.clear());
    window.addEventListener('gamepadconnected', (e) => {
      const ge = e as GamepadEvent;
      this.addPad(ge.gamepad);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      const ge = e as GamepadEvent;
      const d = this.pads.get(ge.gamepad.index);
      if (d) {
        d.connected = false;
        d.buttons = 0;
        this.pads.delete(ge.gamepad.index);
        for (const l of this.listeners) l(d, false);
      }
    });
  }

  private addPad(gp: Gamepad) {
    if (this.pads.has(gp.index)) return;
    const d = new GamepadDevice(gp.index, gp.id);
    this.pads.set(gp.index, d);
    for (const l of this.listeners) l(d, true);
  }

  private repeat = (key: string, held: boolean): boolean => {
    if (!held) {
      this.held.delete(key);
      return false;
    }
    const t = this.held.get(key);
    if (t === undefined) {
      this.held.set(key, this.now + 380);
      return true;
    }
    if (this.now >= t) {
      this.held.set(key, this.now + 90);
      return true;
    }
    return false;
  };

  poll(now: number) {
    this.now = now;
    for (const k of this.keyboards) k.poll(this.repeat);
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (!gp || !gp.connected) continue;
      if (!this.pads.has(gp.index)) this.addPad(gp);
      this.pads.get(gp.index)!.poll(gp, this.repeat);
    }
    keysPressed.clear();
    const n = this.nav;
    Object.assign(n, emptyNav());
    for (const d of this.devices()) {
      const dn = d.nav;
      if (dn.any || dn.confirm || dn.up || dn.down || dn.left || dn.right) this.lastDevice = d;
      n.up ||= dn.up;
      n.down ||= dn.down;
      n.left ||= dn.left;
      n.right ||= dn.right;
      n.confirm ||= dn.confirm;
      n.back ||= dn.back;
      n.start ||= dn.start;
      n.any ||= dn.any;
      n.alt ||= dn.alt;
    }
    // Touch nav edges are one-shot.
    Object.assign(this.touch.nav, emptyNav());
  }

  devices(): Device[] {
    const list: Device[] = [...this.keyboards, ...this.pads.values()];
    if (this.touch.connected) list.push(this.touch);
    return list;
  }

  device(id: string): Device | undefined {
    return this.devices().find((d) => d.id === id) ?? (id === 'touch' ? this.touch : undefined);
  }

  /** Glyph style for prompts: the last used device. */
  glyphs(): Glyphs {
    return this.lastDevice?.glyphs ?? (isTouchDevice() ? 'touch' : 'keyboard');
  }
}

function isTextInput(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export const input = new InputManager();

/** Button labels per glyph set. */
export function label(g: Glyphs, action: 'jump' | 'attack' | 'confirm' | 'back' | 'start' | 'alt'): string {
  const table: Record<Glyphs, Record<string, string>> = {
    xbox: { jump: 'A', attack: 'X', confirm: 'A', back: 'B', start: 'Menu', alt: 'X' },
    playstation: { jump: '✕', attack: '□', confirm: '✕', back: '○', start: 'Options', alt: '□' },
    nintendo: { jump: 'B', attack: 'Y', confirm: 'B', back: 'A', start: '+', alt: 'Y' },
    keyboard: { jump: 'Space', attack: 'F', confirm: 'Space', back: 'Esc', start: 'Tab', alt: 'F' },
    touch: { jump: 'JUMP', attack: 'THROW', confirm: 'Tap', back: 'Back', start: 'Pause', alt: 'Tap' },
  };
  return table[g][action];
}
