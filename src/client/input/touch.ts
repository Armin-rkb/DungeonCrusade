// On-screen controls for phones and tablets: a floating virtual stick on the
// left, JUMP and THROW buttons on the right (mirrored for left-handed play),
// and a pause button. Multi-touch aware.

import { BTN_ATTACK, BTN_DOWN, BTN_JUMP, BTN_LEFT, BTN_RIGHT, BTN_SWING, BTN_UP } from '../../shared/input';
import { settings } from '../settings';
import { haptic, input } from './input';

interface StickState {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
}

export class TouchControls {
  root: HTMLDivElement;
  stickBase: HTMLDivElement;
  stickKnob: HTMLDivElement;
  jumpBtn: HTMLDivElement;
  attackBtn: HTMLDivElement;
  swingBtn: HTMLDivElement;
  pauseBtn: HTMLButtonElement;
  stick: StickState | null = null;
  jumpTouch = -1;
  attackTouch = -1;
  swingTouch = -1;
  swingEnabled = false;
  visible = false;
  onPause: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'touch-controls hidden';
    this.root.innerHTML = `
      <div class="touch-zone touch-left"></div>
      <div class="touch-zone touch-right"></div>
      <div class="stick-base"><div class="stick-knob"></div></div>
      <div class="tbtn tbtn-attack"><span>THROW</span></div>
      <div class="tbtn tbtn-jump"><span>JUMP</span></div>
      <div class="tbtn tbtn-swing"><span>SWING</span></div>
    `;
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'tbtn-pause';
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.pauseBtn.innerHTML = '<span></span><span></span>';
    this.root.appendChild(this.pauseBtn);
    parent.appendChild(this.root);
    this.stickBase = this.root.querySelector('.stick-base')!;
    this.stickKnob = this.root.querySelector('.stick-knob')!;
    this.jumpBtn = this.root.querySelector('.tbtn-jump')!;
    this.attackBtn = this.root.querySelector('.tbtn-attack')!;
    this.swingBtn = this.root.querySelector('.tbtn-swing')!;

    const opts = { passive: false } as AddEventListenerOptions;
    this.root.addEventListener('touchstart', (e) => this.onStart(e), opts);
    this.root.addEventListener('touchmove', (e) => this.onMove(e), opts);
    this.root.addEventListener('touchend', (e) => this.onEnd(e), opts);
    this.root.addEventListener('touchcancel', (e) => this.onEnd(e), opts);
    this.pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onPause();
    });
    // Any touch on the page marks the touch device as available.
    window.addEventListener('touchstart', () => {
      input.touch.connected = true;
    }, { passive: true, capture: true });
    this.applySettings();
  }

  applySettings() {
    const s = settings.touchSize;
    this.root.style.setProperty('--touch-scale', String(s));
    this.root.style.setProperty('--touch-opacity', String(settings.touchOpacity));
    this.root.classList.toggle('lefty', settings.touchLeftHanded);
  }

  /** swing = show the Crusade sword button. */
  show(on: boolean, swing = this.swingEnabled) {
    this.visible = on;
    this.swingEnabled = swing;
    this.root.classList.toggle('hidden', !on);
    this.swingBtn.classList.toggle('hide', !swing);
    if (!on) this.reset();
  }

  private reset() {
    this.stick = null;
    this.jumpTouch = -1;
    this.attackTouch = -1;
    this.swingTouch = -1;
    this.swingBtn.classList.remove('down');
    this.stickBase.classList.remove('active');
    this.jumpBtn.classList.remove('down');
    this.attackBtn.classList.remove('down');
    this.update();
  }

  private isStickSide(x: number): boolean {
    const w = window.innerWidth;
    return settings.touchLeftHanded ? x > w * 0.55 : x < w * 0.45;
  }

  private buttonAt(x: number, y: number): 'jump' | 'attack' | 'swing' | null {
    const list: Array<[HTMLDivElement, 'jump' | 'attack' | 'swing']> = [[this.jumpBtn, 'jump'], [this.attackBtn, 'attack']];
    if (this.swingEnabled) list.push([this.swingBtn, 'swing']);
    for (const [el, name] of list) {
      const r = el.getBoundingClientRect();
      const pad = 18;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return name;
    }
    // Anywhere else on the button side: closest button.
    if (!this.isStickSide(x)) {
      const j = this.jumpBtn.getBoundingClientRect();
      const a = this.attackBtn.getBoundingClientRect();
      const dj = Math.hypot(x - (j.left + j.width / 2), y - (j.top + j.height / 2));
      const da = Math.hypot(x - (a.left + a.width / 2), y - (a.top + a.height / 2));
      return dj < da ? 'jump' : 'attack';
    }
    return null;
  }

  private onStart(e: TouchEvent) {
    e.preventDefault();
    input.touch.connected = true;
    for (const t of Array.from(e.changedTouches)) {
      if (this.isStickSide(t.clientX) && !this.stick) {
        this.stick = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY };
        this.stickBase.style.left = `${t.clientX}px`;
        this.stickBase.style.top = `${t.clientY}px`;
        this.stickBase.classList.add('active');
      } else {
        const b = this.buttonAt(t.clientX, t.clientY);
        if (b === 'jump' && this.jumpTouch < 0) {
          this.jumpTouch = t.identifier;
          this.jumpBtn.classList.add('down');
          haptic('light', 10);
        } else if (b === 'attack' && this.attackTouch < 0) {
          this.attackTouch = t.identifier;
          this.attackBtn.classList.add('down');
          haptic('light', 10);
        } else if (b === 'swing' && this.swingTouch < 0) {
          this.swingTouch = t.identifier;
          this.swingBtn.classList.add('down');
          haptic('medium', 12);
        }
      }
    }
    this.update();
  }

  private onMove(e: TouchEvent) {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (this.stick && t.identifier === this.stick.id) {
        this.stick.x = t.clientX;
        this.stick.y = t.clientY;
        // Let the stick origin follow a finger that drags far away.
        const r = 70 * settings.touchSize;
        const dx = this.stick.x - this.stick.ox;
        const dy = this.stick.y - this.stick.oy;
        const d = Math.hypot(dx, dy);
        if (d > r * 1.6) {
          const k = (d - r * 1.6) / d;
          this.stick.ox += dx * k;
          this.stick.oy += dy * k;
          this.stickBase.style.left = `${this.stick.ox}px`;
          this.stickBase.style.top = `${this.stick.oy}px`;
        }
      } else if (t.identifier === this.jumpTouch || t.identifier === this.attackTouch) {
        // Sliding between the two buttons switches them.
        const b = this.buttonAt(t.clientX, t.clientY);
        if (t.identifier === this.jumpTouch && b === 'attack' && this.attackTouch < 0) {
          this.jumpTouch = -1;
          this.attackTouch = t.identifier;
        } else if (t.identifier === this.attackTouch && b === 'jump' && this.jumpTouch < 0) {
          this.attackTouch = -1;
          this.jumpTouch = t.identifier;
        }
        this.jumpBtn.classList.toggle('down', this.jumpTouch >= 0);
        this.attackBtn.classList.toggle('down', this.attackTouch >= 0);
      }
    }
    this.update();
  }

  private onEnd(e: TouchEvent) {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (this.stick && t.identifier === this.stick.id) {
        this.stick = null;
        this.stickBase.classList.remove('active');
      }
      if (t.identifier === this.jumpTouch) {
        this.jumpTouch = -1;
        this.jumpBtn.classList.remove('down');
      }
      if (t.identifier === this.attackTouch) {
        this.attackTouch = -1;
        this.attackBtn.classList.remove('down');
      }
      if (t.identifier === this.swingTouch) {
        this.swingTouch = -1;
        this.swingBtn.classList.remove('down');
      }
    }
    this.update();
  }

  private update() {
    let b = 0;
    if (this.stick) {
      const r = 70 * settings.touchSize;
      const dx = (this.stick.x - this.stick.ox) / r;
      const dy = (this.stick.y - this.stick.oy) / r;
      if (dx < -0.3) b |= BTN_LEFT;
      if (dx > 0.3) b |= BTN_RIGHT;
      if (dy < -0.55) b |= BTN_UP;
      if (dy > 0.6) b |= BTN_DOWN;
      const len = Math.hypot(dx, dy);
      const k = len > 1 ? 1 / len : 1;
      this.stickKnob.style.transform = `translate(${dx * k * 50}%, ${dy * k * 50}%)`;
    } else {
      this.stickKnob.style.transform = 'translate(0, 0)';
    }
    if (this.jumpTouch >= 0) b |= BTN_JUMP;
    if (this.attackTouch >= 0) b |= BTN_ATTACK;
    if (this.swingTouch >= 0) b |= BTN_SWING;
    input.touch.buttons = b;
  }
}
