// All menu screens.

import type { AppApi, CouchSlot } from '../app-api';
import { animFrame, assets, sprite, url } from '../assets';
import { audio, MUSIC, SFX } from '../audio';
import { input, isTouchDevice, label, type Device } from '../input/input';
import { applySettingsSideEffects } from '../options';
import { copy, inviteLink, isDesktopApp, native, quit, share, toggleFullscreen } from '../platform';
import { KNIGHTS, WEAPON_ICONS } from '../render/visuals';
import { playerName, saveSettings, settings } from '../settings';
import { button, h, hints, Screen, selector, slider, spriteCanvas, toast, toggle } from './core';
import { LEVELS, levelInfo } from '../../shared/levels';
import { normalizeCode, type RoomState, type ServerMsg } from '../../shared/protocol';
import { Phase, type LevelId, type MatchConfig } from '../../shared/types';
import { WEAPONS } from '../../shared/weapons';

const VERSION = '2.0.0';

// ------------------------------------------------------------------ helpers
export function knightCanvas(k: number, scale = 4, cls = 'knight'): HTMLCanvasElement {
  const kv = KNIGHTS[k] ?? KNIGHTS[0];
  const id = animFrame(kv.idle, 0) ?? kv.idle;
  const def = sprite(id);
  const w = def ? def.w : 27;
  const hgt = def ? def.h : 36;
  return spriteCanvas((c) => {
    if (!def) return;
    const img = assets.images.get(def.img);
    if (img) c.drawImage(img, def.x, def.y, def.w, def.h, 0, 0, def.w * scale, def.h * scale);
  }, w * scale, hgt * scale, cls);
}

function iconCanvas(id: string, size = 40): HTMLCanvasElement {
  const def = sprite(id);
  return spriteCanvas((c) => {
    if (!def) return;
    const img = assets.images.get(def.img);
    if (!img) return;
    const sc = Math.floor(Math.min(size / def.w, size / def.h)) || 1;
    c.drawImage(img, def.x, def.y, def.w, def.h, (size - def.w * sc) / 2, (size - def.h * sc) / 2, def.w * sc, def.h * sc);
  }, size, size);
}

function deviceLabel(d: Device | undefined): string {
  if (!d) return '';
  return d.name;
}

function g(action: 'jump' | 'attack' | 'confirm' | 'back' | 'start' | 'alt'): string {
  return label(input.glyphs(), action);
}

function newSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

const SCORE_OPTS = [3, 5, 7, 10].map((v) => ({ label: `${v} KOs`, value: v }));
const TIME_OPTS = [
  { label: 'OFF', value: 0 },
  { label: '2 MIN', value: 120 },
  { label: '3 MIN', value: 180 },
  { label: '5 MIN', value: 300 },
];
const CPU_LEVELS = [
  { label: 'EASY', value: 1 },
  { label: 'NORMAL', value: 2 },
  { label: 'HARD', value: 3 },
];

// ------------------------------------------------------------------ title
export class TitleScreen extends Screen {
  spatial = false;
  private t = 0;
  constructor(private app: AppApi) {
    super('center title-bg');
  }
  render() {
    this.el.innerHTML = '';
    const logo = h('img', { class: 'logo', src: url(assets.manifest.images['sprites/boxart/startmenu']), alt: '' });
    const title = h('h1', {}, 'DUNGEON CRUSADE');
    const press = h('div', { class: 'press-start' }, isTouchDevice() && !input.pads.size ? 'TAP TO START' : 'PRESS ANY BUTTON');
    const sub = h('div', { class: 'sub' }, '2-4 player projectile brawler &middot; couch &amp; online');
    this.el.append(logo, title, press, sub, h('div', { class: 'footer-hints' }, `<span>v${VERSION}</span>`));
    this.el.addEventListener('pointerdown', () => this.go());
  }
  onEnter() {
    audio.playMusic(MUSIC.menu);
    this.app.setAttract(true);
  }
  claim(d: Device): boolean {
    if (this.t > 0.3 && (d.nav.any || d.nav.confirm || d.nav.start)) this.go();
    return true;
  }
  update(dt: number) {
    this.t += dt;
  }
  private go() {
    if (this.t < 0.3) return;
    this.t = -100;
    audio.unlock();
    audio.playMusic(MUSIC.menu);
    audio.play(SFX.button, { volume: 0.7 });
    this.app.ui.set(new MainMenuScreen(this.app));
  }
}

// ------------------------------------------------------------------ main menu
export class MainMenuScreen extends Screen {
  constructor(private app: AppApi) {
    super('center dim');
  }
  render() {
    this.el.innerHTML = '';
    this.el.appendChild(h('h1', {}, 'DUNGEON CRUSADE'));
    const menu = h('div', { class: 'menu' });
    menu.append(
      button('VERSUS', () => this.app.ui.push(new FightersScreen(this.app)), { cls: 'primary', sub: 'Couch battle for 2-4 players and CPUs', autofocus: true, key: 'versus' }),
      button('ONLINE', () => this.app.ui.push(new OnlineScreen(this.app)), { sub: 'Play friends on any device: PC, Steam, mobile', key: 'online' }),
      button('HOW TO PLAY', () => this.app.ui.push(new HowToScreen(this.app)), { key: 'how' }),
      button('SETTINGS', () => this.app.ui.push(new SettingsScreen(this.app)), { key: 'settings' }),
    );
    if (isDesktopApp()) menu.append(button('QUIT', () => quit(), { cls: 'danger', key: 'quit' }));
    this.el.appendChild(menu);
    const pads = input.pads.size;
    this.el.appendChild(hints([
      [g('confirm'), 'Select'],
      ['🎮', `${pads} controller${pads === 1 ? '' : 's'} connected`],
    ]));
  }
  onEnter() {
    audio.playMusic(MUSIC.menu);
    this.app.setAttract(true);
  }
  update() {
    // Refresh the controller count when one is plugged in.
    const pads = input.pads.size;
    if (pads !== this.pads) {
      this.pads = pads;
      this.app.ui.refresh();
    }
  }
  private pads = input.pads.size;
}

// ------------------------------------------------------------------ couch lobby
function takenKnights(slots: CouchSlot[], except: number): Set<number> {
  const s = new Set<number>();
  slots.forEach((x, i) => {
    if (x && i !== except) s.add(x.knight);
  });
  return s;
}

function freeKnight(slots: CouchSlot[], from: number, dir: number, self: number): number {
  const taken = takenKnights(slots, self);
  let k = from;
  for (let i = 0; i < 4; i++) {
    k = (k + dir + 4) % 4;
    if (!taken.has(k)) return k;
  }
  return from;
}

export class FightersScreen extends Screen {
  spatial = false;
  private dirty = false;
  constructor(private app: AppApi) {
    super('dim');
  }

  private get slots() {
    return this.app.couch;
  }

  render() {
    this.el.innerHTML = '';
    this.el.appendChild(h('h2', {}, 'CHOOSE YOUR KNIGHT'));
    const cards = h('div', { class: 'cards' });
    this.slots.forEach((s, i) => cards.appendChild(this.card(s, i)));
    this.el.appendChild(cards);
    const n = this.count();
    const row = h('div', { class: 'row' });
    row.style.marginTop = '14px';
    row.append(
      button('BACK', () => this.leave(), { cls: 'small', key: 'back' }),
      button(n.total >= 2 ? 'NEXT ▶' : n.total === 1 ? 'ADD A RIVAL' : 'JOIN TO PLAY', () => this.next(), { cls: n.total >= 2 ? 'primary' : '', key: 'next', disabled: n.total < 2 }),
    );
    this.el.appendChild(row);
    this.el.appendChild(hints([
      [isTouchDevice() && !input.pads.size ? 'Tap' : input.glyphs() === 'keyboard' ? 'Space / Enter' : g('jump'), 'Join'],
      ['◀ ▶', 'Knight'],
      [g('alt'), 'Add CPU'],
      [g('confirm'), 'Ready'],
      [g('start'), 'Continue'],
      [g('back'), 'Leave'],
    ]));
    // Focus-free screen: buttons are clicked with mouse/touch; controllers use per-device input.
    for (const b of this.el.querySelectorAll('[data-nav]')) b.removeAttribute('data-nav');
  }

  private card(s: CouchSlot, i: number): HTMLElement {
    const c = h('div', { class: `card${s ? ' joined' : ''}` });
    if (s) c.style.setProperty('--kc', KNIGHTS[s.knight].color);
    c.appendChild(h('div', { class: 'slot' }, `P${i + 1}`));
    if (!s) {
      const touchJoined = this.slots.some((x) => x?.kind === 'human' && x.device === 'touch');
      const hintText = isTouchDevice() && !input.pads.size
        ? (touchJoined ? 'CONNECT A<br>CONTROLLER<br>OR ADD A CPU' : 'TAP TO JOIN')
        : input.glyphs() === 'keyboard' ? 'PRESS<br>SPACE / ENTER<br>OR A<br>TO JOIN' : `PRESS<br>${g('jump')}<br>TO JOIN`;
      const hint = h('div', { class: 'join-hint' }, hintText);
      const kn = h('div', { class: 'kn' });
      kn.appendChild(hint);
      c.appendChild(kn);
      const btns = h('div', { class: 'kbtns' });
      if (isTouchDevice() && !this.slots.some((x) => x?.kind === 'human' && x.device === 'touch')) {
        btns.appendChild(button('JOIN', () => this.join('touch', i), { cls: 'small' }));
      }
      btns.appendChild(button('+ CPU', () => this.addCpu(i), { cls: 'small' }));
      c.appendChild(btns);
      return c;
    }
    if (s.kind === 'cpu') c.appendChild(h('div', { class: 'cpu-tag' }, `CPU · ${CPU_LEVELS[s.level - 1].label}`));
    const kn = h('div', { class: 'kn' });
    kn.appendChild(knightCanvas(s.knight, 3));
    c.appendChild(kn);
    c.appendChild(h('div', { class: 'name' }, KNIGHTS[s.knight].name.toUpperCase() + ' KNIGHT'));
    if (s.kind === 'human') c.appendChild(h('div', { class: 'dev' }, deviceLabel(input.device(s.device))));
    const btns = h('div', { class: 'kbtns' });
    btns.append(
      button('◀', () => this.cycle(i, -1), { cls: 'small' }),
      button('▶', () => this.cycle(i, 1), { cls: 'small' }),
    );
    if (s.kind === 'cpu') btns.appendChild(button('LV', () => {
      s.level = (s.level % 3) + 1;
      this.dirty = true;
    }, { cls: 'small' }));
    btns.appendChild(button('✕', () => this.remove(i), { cls: 'small danger' }));
    c.appendChild(btns);
    if (s.kind === 'human' && s.ready) c.appendChild(h('div', { class: 'ready' }, 'READY!'));
    return c;
  }

  private count() {
    let humans = 0;
    let total = 0;
    for (const s of this.slots) {
      if (!s) continue;
      total++;
      if (s.kind === 'human') humans++;
    }
    return { humans, total };
  }

  onEnter() {
    this.app.setAttract(true);
    audio.playMusic(MUSIC.lobby);
    // Auto-join the device that opened the lobby.
    const d = input.lastDevice;
    if (this.count().humans === 0) {
      if (d) this.join(d.id);
      else if (isTouchDevice()) this.join('touch');
    }
    this.refreshSoon();
  }

  private refreshSoon() {
    this.dirty = true;
  }

  update() {
    // Drop players whose controller was unplugged.
    this.slots.forEach((s, i) => {
      if (s?.kind === 'human' && s.device !== 'touch' && !input.device(s.device)) {
        this.slots[i] = null;
        this.dirty = true;
      }
    });
    if (this.dirty) {
      this.dirty = false;
      this.app.ui.refresh();
    }
  }

  private slotOf(dev: string): number {
    return this.slots.findIndex((s) => s?.kind === 'human' && s.device === dev);
  }

  join(dev: string, prefer = -1) {
    if (this.slotOf(dev) >= 0) return;
    let i = prefer >= 0 && !this.slots[prefer] ? prefer : this.slots.findIndex((s) => !s);
    if (i < 0) i = this.slots.findIndex((s) => s?.kind === 'cpu');
    if (i < 0) return;
    const knight = takenKnights(this.slots, i).has(i) ? freeKnight(this.slots, i, 1, i) : i;
    this.slots[i] = { kind: 'human', device: dev, knight, ready: false };
    audio.play(SFX.plusOne, { volume: 0.5 });
    input.device(dev)?.rumble(0.3, 0.5, 120);
    this.dirty = true;
  }

  private addCpu(prefer = -1) {
    const i = prefer >= 0 && !this.slots[prefer] ? prefer : this.slots.findIndex((s) => !s);
    if (i < 0) return;
    this.slots[i] = { kind: 'cpu', knight: freeKnight(this.slots, i - 1, 1, i), level: settings.botLevel };
    audio.play(SFX.select, { volume: 0.5 });
    this.dirty = true;
  }

  private remove(i: number) {
    this.slots[i] = null;
    this.dirty = true;
  }

  private cycle(i: number, dir: number) {
    const s = this.slots[i];
    if (!s) return;
    s.knight = freeKnight(this.slots, s.knight, dir, i);
    audio.play(SFX.select, { volume: 0.4, pitch: 1.2 });
    this.dirty = true;
  }

  claim(d: Device): boolean {
    const n = d.nav;
    const i = this.slotOf(d.id);
    if (i < 0) {
      if (n.back && d.kind !== 'touch' && this.count().humans === 0) this.leave();
      else if (n.confirm || (d.kind === 'gamepad' && n.any && !n.back) || (d.kind === 'keyboard' && n.confirm)) this.join(d.id);
      return true;
    }
    const s = this.slots[i] as Extract<CouchSlot, { kind: 'human' }>;
    if (n.left) this.cycle(i, -1);
    if (n.right) this.cycle(i, 1);
    if (n.alt) this.addCpu();
    if (n.confirm) {
      s.ready = !s.ready;
      audio.play(s.ready ? SFX.plusOne : SFX.select, { volume: 0.5 });
      d.rumble(0.2, 0.3, 60);
      this.dirty = true;
      const c = this.count();
      const humans = this.slots.filter((x) => x?.kind === 'human') as Array<Extract<CouchSlot, { kind: 'human' }>>;
      if (c.total >= 2 && humans.every((x) => x.ready)) this.next();
    }
    if (n.start) this.next();
    if (n.back) {
      if (s.ready) s.ready = false;
      else this.remove(i);
      this.dirty = true;
      if (this.count().humans === 0) this.leave();
    }
    return true;
  }

  private leave() {
    for (let i = 0; i < 4; i++) if (this.slots[i]?.kind === 'human') this.slots[i] = null;
    this.app.ui.pop();
  }

  private next() {
    if (this.count().total < 2) {
      toast('Add a second player or a CPU to fight!');
      return;
    }
    for (const s of this.slots) if (s?.kind === 'human') s.ready = false;
    this.app.ui.push(new StageScreen(this.app));
  }
}

// ------------------------------------------------------------------ stage & rules
export class StageScreen extends Screen {
  constructor(private app: AppApi) {
    super('dim');
  }
  render() {
    this.el.innerHTML = '';
    this.el.appendChild(h('h2', {}, 'PICK A STAGE'));
    this.el.appendChild(stagePicker(() => settings.lastLevel as LevelId, (id) => {
      settings.lastLevel = id;
      saveSettings();
      this.app.ui.refresh();
    }));
    const rules = h('div', { class: 'list' });
    rules.style.marginTop = '12px';
    const humans = this.app.couch.filter((s) => s).length;
    rules.append(
      selector('FIRST TO', SCORE_OPTS, () => settings.targetScore, (v) => { settings.targetScore = v; saveSettings(); }, 'score'),
      selector('TIME LIMIT', TIME_OPTS, () => settings.timeLimit, (v) => { settings.timeLimit = v; saveSettings(); }, 'time'),
      toggle('ITEM CHESTS', () => settings.items, (v) => { settings.items = v; saveSettings(); }, 'items'),
    );
    if (humans >= 3) rules.append(toggle('TEAMS (2 VS 2)', () => settings.teams, (v) => { settings.teams = v; saveSettings(); }, 'teams'));
    this.el.appendChild(rules);
    const row = h('div', { class: 'row' });
    row.style.marginTop = '14px';
    row.append(
      button('BACK', () => this.app.ui.pop(), { cls: 'small', key: 'back' }),
      button('FIGHT!', () => this.start(), { cls: 'primary', key: 'fight', autofocus: true }),
    );
    this.el.appendChild(row);
    this.el.appendChild(hints([[g('confirm'), 'Select'], ['◀ ▶', 'Change'], [g('back'), 'Back']]));
  }
  back() {
    this.app.ui.pop();
    return true;
  }
  update() {
    if (input.nav.start) this.start();
  }
  private start() {
    const slots = this.app.couch;
    const locals = new Map<number, string>();
    const names: string[] = [];
    const teams = settings.teams && slots.filter((s) => s).length >= 3;
    let humanIdx = 0;
    const cfg: MatchConfig = {
      level: settings.lastLevel as LevelId,
      seed: newSeed(),
      targetScore: settings.targetScore,
      timeLimit: settings.timeLimit,
      teams,
      items: settings.items,
      slots: slots.map((s, i) => {
        if (!s) return { active: false, knight: i, bot: 0, team: 0, name: '' };
        if (s.kind === 'human') {
          locals.set(i, s.device);
          humanIdx++;
        }
        const name = s.kind === 'human' ? (humanIdx === 1 ? playerName() : `Player ${i + 1}`) : `CPU ${KNIGHTS[s.knight].name}`;
        names[i] = name;
        return { active: true, knight: s.knight, bot: s.kind === 'cpu' ? s.level : 0, team: 0, name };
      }),
    };
    if (teams) {
      // Split fighters into two teams alternating by slot order.
      let t = 0;
      for (const sc of cfg.slots) if (sc.active) sc.team = t++ % 2;
    }
    this.app.startLocal(cfg, locals, names);
  }
}

function stagePicker(get: () => LevelId, set: (id: LevelId) => void, readonly = false): HTMLElement {
  const wrap = h('div', { class: 'stages' });
  for (const l of LEVELS) {
    const st = h('div', { class: `stage${get() === l.id ? ' selected' : ''}`, ...(readonly ? {} : { 'data-nav': '' }) });
    st.dataset.key = `stage-${l.id}`;
    const src = assets.manifest.images[l.preview];
    if (src) st.appendChild(h('img', { src: url(src), alt: l.name }));
    st.appendChild(h('div', { class: 'label' }, l.name.toUpperCase()));
    if (!readonly) {
      st.addEventListener('click', () => {
        audio.play(SFX.select, { volume: 0.5 });
        set(l.id);
      });
    }
    wrap.appendChild(st);
  }
  return wrap;
}

// ------------------------------------------------------------------ online
export class OnlineScreen extends Screen {
  private status = 'Connecting to server...';
  private busy = false;
  private unsub: (() => void) | null = null;
  constructor(private app: AppApi, private autoJoin: string | null = null) {
    super('dim center');
  }
  render() {
    this.el.innerHTML = '';
    this.el.appendChild(h('h1', {}, 'ONLINE'));
    this.el.appendChild(h('div', { class: 'sub' }, 'Crossplay with PC, Steam, Android, iOS and browsers.<br>Friends join with your 4-letter room code or invite link.'));
    const menu = h('div', { class: 'menu' });
    const nameRow = h('div', { class: 'opt', 'data-nav': '' });
    nameRow.dataset.key = 'name';
    const nameInput = h('input', { type: 'text', maxlength: '16', value: playerName(), 'aria-label': 'Name' });
    nameInput.addEventListener('change', () => {
      settings.name = nameInput.value.trim().slice(0, 16) || playerName();
      saveSettings();
    });
    nameRow.append(h('span', {}, 'NAME'), nameInput);
    nameRow.addEventListener('click', () => nameInput.focus());
    const codeInput = h('input', { class: 'code-input', maxlength: '4', placeholder: 'CODE', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Room code' });
    codeInput.addEventListener('input', () => {
      codeInput.value = normalizeCode(codeInput.value);
      if (codeInput.value.length === 4) this.join(codeInput.value);
    });
    codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.join(codeInput.value);
      e.stopPropagation();
    });
    const joinRow = h('div', { class: 'row' });
    joinRow.append(codeInput, button('JOIN', () => this.join(codeInput.value), { key: 'join' }));
    menu.append(
      nameRow,
      button('QUICK MATCH', () => this.quick(), { cls: 'primary', sub: 'Jump into a public room', key: 'quick', autofocus: true }),
      button('CREATE ROOM', () => this.create(), { sub: 'Private room for you and your friends', key: 'create' }),
      joinRow,
      button('BACK', () => this.back(), { cls: 'small', key: 'back' }),
    );
    this.el.appendChild(menu);
    const st = h('div', { class: 'sub' }, this.status);
    st.style.marginTop = '10px';
    this.el.appendChild(st);
    this.el.appendChild(hints([[g('confirm'), 'Select'], [g('back'), 'Back']]));
  }
  onEnter() {
    this.app.setAttract(true);
    audio.playMusic(MUSIC.lobby);
    this.unsub?.();
    this.connect();
  }
  onExit() {
    this.unsub?.();
    this.unsub = null;
  }
  private async connect() {
    try {
      const conn = await this.app.ensureConnection();
      this.status = `Connected · ${Math.round(conn.rtt)}ms`;
      this.unsub = conn.on((m) => this.onMsg(m));
      if (this.autoJoin) {
        const code = this.autoJoin;
        this.autoJoin = null;
        this.join(code);
      }
    } catch (e) {
      this.status = `Offline: ${(e as Error).message} <br>Couch play still works!`;
    }
    this.app.ui.refresh();
  }
  private onMsg(m: ServerMsg) {
    if (m.t === 'room' && this.busy) {
      this.busy = false;
      this.app.ui.push(new RoomScreen(this.app));
    } else if (m.t === 'error') {
      this.busy = false;
      toast(m.msg, true);
    }
  }
  private players() {
    if (!this.app.onlineLocals.length) {
      const d = input.lastDevice ?? (isTouchDevice() ? input.touch : input.keyboards[0]);
      this.app.onlineLocals.push({ device: d.id, knight: 0 });
    }
    return this.app.onlineLocals.map((p, i) => ({ name: i === 0 ? playerName() : `${playerName()} ${i + 1}`, knight: p.knight }));
  }
  private async withConn(fn: () => void) {
    if (this.busy) return;
    try {
      await this.app.ensureConnection();
      this.busy = true;
      fn();
      window.setTimeout(() => (this.busy = false), 6000);
    } catch (e) {
      toast(`Can't reach the server: ${(e as Error).message}`, true);
    }
  }
  private quick() {
    void this.withConn(() => this.app.conn!.quick(this.players()));
  }
  private create() {
    void this.withConn(() => this.app.conn!.create(false, this.players()));
  }
  join(raw: string) {
    const code = normalizeCode(raw);
    if (code.length !== 4) {
      toast('Room codes have 4 letters.', true);
      return;
    }
    void this.withConn(() => this.app.conn!.join(code, this.players()));
  }
  back() {
    this.app.disconnect();
    this.app.ui.pop();
    return true;
  }
}

export class RoomScreen extends Screen {
  private unsub: (() => void) | null = null;
  constructor(private app: AppApi) {
    super('dim');
  }
  private get room(): RoomState | null {
    return this.app.conn?.room ?? null;
  }
  render() {
    this.el.innerHTML = '';
    const room = this.room;
    if (!room) {
      this.el.appendChild(h('h2', {}, 'Leaving...'));
      return;
    }
    const isHost = this.app.conn!.isHost();
    const top = h('div', { class: 'row' });
    top.append(h('div', { class: 'sub' }, room.public ? 'PUBLIC ROOM' : 'ROOM CODE'), h('div', { class: 'code' }, room.code));
    this.el.appendChild(top);
    const invite = h('div', { class: 'row' });
    invite.append(button('SHARE INVITE', () => void this.share(), { cls: 'small', key: 'share' }));
    invite.append(button('COPY LINK', () => void copy(inviteLink(room.code)).then((ok) => toast(ok ? 'Invite link copied!' : 'Copy failed')), { cls: 'small', key: 'copy' }));
    if (native?.steam) invite.append(button('INVITE STEAM FRIENDS', () => void native!.inviteFriends(room.code), { cls: 'small primary', key: 'steam' }));
    this.el.appendChild(invite);

    const grid = h('div', { class: 'room-grid' });
    grid.style.marginTop = '12px';
    // Players
    const left = h('div', { class: 'panel' });
    left.appendChild(h('div', { class: 'sub' }, `FIGHTERS ${this.totalPlayers()}/4`));
    const peers = h('div', { class: 'peers' });
    for (const p of room.peers) {
      const me = p.id === this.app.conn!.id;
      p.players.forEach((pl, i) => {
        const row = h('div', { class: 'peer' });
        row.style.setProperty('--kc', KNIGHTS[pl.knight]?.color ?? '#fff');
        row.append(h('span', { class: 'dot' }), h('span', {}, pl.name));
        if (me) {
          row.append(
            button('◀', () => this.cycle(i, -1), { cls: 'small', key: `k${i}l` }),
            button('▶', () => this.cycle(i, 1), { cls: 'small', key: `k${i}r` }),
          );
          if (i > 0) row.append(button('✕', () => this.removeLocal(i), { cls: 'small danger', key: `k${i}x` }));
        }
        const meta = h('span', { class: 'meta' }, `${room.host === p.id && i === 0 ? '<span class="host">HOST</span> ' : ''}${platformIcon(p.platform)} ${me ? 'YOU' : `${p.ping}ms`}`);
        row.appendChild(meta);
        peers.appendChild(row);
      });
    }
    const cpus = Math.min(room.settings.cpus, 4 - this.totalPlayers());
    for (let i = 0; i < cpus; i++) peers.appendChild(h('div', { class: 'peer' }, `<span class="dot" style="--kc:#888"></span><span>CPU (${CPU_LEVELS[room.settings.cpuLevel - 1].label})</span>`));
    left.appendChild(peers);
    if (this.totalPlayers() < 4) left.appendChild(h('div', { class: 'sub' }, `<br>Couch + online: press ${g('jump')} on another controller to add a local player.`));
    grid.appendChild(left);

    // Settings
    const right = h('div', { class: 'panel' });
    const s = room.settings;
    right.appendChild(h('div', { class: 'sub' }, isHost ? 'MATCH SETTINGS (YOU ARE HOST)' : 'MATCH SETTINGS'));
    const set = (patch: Partial<RoomState['settings']>) => this.app.conn!.send({ t: 'settings', settings: patch });
    if (isHost) {
      const list = h('div', { class: 'list' });
      list.style.width = '100%';
      list.append(
        selector('STAGE', LEVELS.map((l) => ({ label: l.name.toUpperCase(), value: l.id })), () => s.level, (v) => set({ level: v }), 'lvl'),
        selector('FIRST TO', SCORE_OPTS, () => s.targetScore, (v) => set({ targetScore: v }), 'score'),
        selector('TIME LIMIT', TIME_OPTS, () => s.timeLimit, (v) => set({ timeLimit: v }), 'time'),
        toggle('ITEM CHESTS', () => s.items, (v) => set({ items: v }), 'items'),
        toggle('TEAMS', () => s.teams, (v) => set({ teams: v }), 'teams'),
        selector('FILL WITH CPUS', [0, 1, 2, 3].map((v) => ({ label: v ? `UP TO ${v}` : 'NONE', value: v })), () => s.cpus, (v) => set({ cpus: v }), 'cpus'),
        selector('CPU LEVEL', CPU_LEVELS, () => s.cpuLevel, (v) => set({ cpuLevel: v }), 'cpulvl'),
      );
      right.appendChild(list);
    } else {
      const info = levelInfo(s.level);
      right.appendChild(h('div', { class: 'sub' }, `<br>${info.name.toUpperCase()}<br>FIRST TO ${s.targetScore}${s.timeLimit ? ` · ${s.timeLimit / 60} MIN` : ''}<br>ITEMS ${s.items ? 'ON' : 'OFF'}${s.teams ? ' · TEAMS' : ''}${s.cpus ? ` · ${s.cpus} CPU` : ''}`));
    }
    grid.appendChild(right);
    this.el.appendChild(grid);

    const row = h('div', { class: 'row' });
    row.style.marginTop = '14px';
    row.append(button('LEAVE', () => this.back(), { cls: 'small danger', key: 'leave' }));
    const canStart = this.totalPlayers() + cpus >= 2;
    if (isHost) row.append(button(canStart ? 'START MATCH' : 'WAITING FOR PLAYERS...', () => this.start(), { cls: 'primary', key: 'start', autofocus: true, disabled: !canStart }));
    else row.append(h('div', { class: 'sub' }, room.phase === 'game' ? 'Match in progress - you will join the next one.' : 'Waiting for the host to start...'));
    this.el.appendChild(row);
    this.el.appendChild(hints([[g('confirm'), 'Select'], [g('back'), 'Leave'], ['🌐', 'Crossplay on']]));
  }

  private totalPlayers(): number {
    return (this.room?.peers ?? []).reduce((a, p) => a + Math.max(1, p.players.length), 0);
  }

  onEnter() {
    this.app.setAttract(true);
    audio.playMusic(MUSIC.lobby);
    this.unsub?.();
    this.unsub = this.app.conn?.on((m) => {
      if (m.t === 'room') this.app.ui.refresh();
      else if (m.t === 'error' && m.code === 'closed') {
        toast('Disconnected from server.', true);
        this.app.goMainMenu();
      } else if (m.t === 'error') toast(m.msg, true);
    }) ?? null;
    this.syncPlayers();
  }

  onExit() {
    this.unsub?.();
    this.unsub = null;
  }

  claim(d: Device): boolean {
    const locals = this.app.onlineLocals;
    const mine = locals.findIndex((l) => l.device === d.id);
    if (mine < 0) {
      // A new couch player wants to join this online room.
      if (d.nav.confirm && this.totalPlayers() < 4 && d.kind !== 'touch') {
        const taken = new Set(locals.map((l) => l.knight));
        let k = 0;
        while (taken.has(k) && k < 3) k++;
        locals.push({ device: d.id, knight: k });
        audio.play(SFX.plusOne, { volume: 0.5 });
        this.syncPlayers();
      }
      return true;
    }
    if (mine > 0) {
      if (d.nav.left) this.cycle(mine, -1);
      if (d.nav.right) this.cycle(mine, 1);
      if (d.nav.back) this.removeLocal(mine);
      return true;
    }
    return false; // the main local player drives the menu
  }

  private cycle(i: number, dir: number) {
    const l = this.app.onlineLocals[i];
    if (!l) return;
    l.knight = (l.knight + dir + 4) % 4;
    audio.play(SFX.select, { volume: 0.4 });
    this.syncPlayers();
  }

  private removeLocal(i: number) {
    this.app.onlineLocals.splice(i, 1);
    this.syncPlayers();
  }

  private syncPlayers() {
    const players = this.app.onlineLocals.map((p, i) => ({ name: i === 0 ? playerName() : `${playerName()} ${i + 1}`, knight: p.knight }));
    this.app.conn?.send({ t: 'players', players });
  }

  private async share() {
    const room = this.room;
    if (!room) return;
    const r = await share(room.code);
    if (r === 'copied') toast('Invite copied! Paste it to your friends.');
    else if (r === 'failed') toast(`Room code: ${room.code}`);
  }

  private start() {
    const conn = this.app.conn;
    const room = this.room;
    if (!conn || !room || !conn.isHost()) return;
    const s = room.settings;
    const slots: MatchConfig['slots'] = [];
    const owners: Array<string | null> = [];
    const used = new Set<number>();
    for (const p of room.peers) {
      for (const pl of p.players.length ? p.players : [{ name: p.name, knight: 0 }]) {
        if (slots.length >= 4) break;
        let k = pl.knight;
        if (used.has(k)) k = [0, 1, 2, 3].find((x) => !used.has(x)) ?? k;
        used.add(k);
        slots.push({ active: true, knight: k, bot: 0, team: 0, name: pl.name });
        owners.push(p.id);
      }
    }
    let cpus = s.cpus;
    while (slots.length < 4) {
      if (cpus > 0) {
        const k = [0, 1, 2, 3].find((x) => !used.has(x)) ?? 0;
        used.add(k);
        slots.push({ active: true, knight: k, bot: s.cpuLevel, team: 0, name: `CPU ${KNIGHTS[k].name}` });
        cpus--;
      } else slots.push({ active: false, knight: slots.length, bot: 0, team: 0, name: '' });
      owners.push(null);
    }
    const teams = s.teams && slots.filter((x) => x.active).length >= 3;
    if (teams) {
      let t = 0;
      for (const sc of slots) if (sc.active) sc.team = t++ % 2;
    }
    const cfg: MatchConfig = { level: s.level, seed: newSeed(), targetScore: s.targetScore, timeLimit: s.timeLimit, teams, items: s.items, slots };
    conn.send({ t: 'start', cfg, owners });
  }

  back() {
    this.app.conn?.leave();
    this.app.ui.pop();
    return true;
  }
}

function platformIcon(p: string): string {
  return ({ steam: 'STEAM', desktop: 'PC', android: 'ANDROID', ios: 'iOS', web: 'WEB' } as Record<string, string>)[p] ?? p;
}

// ------------------------------------------------------------------ settings
export class SettingsScreen extends Screen {
  constructor(private app: AppApi) {
    super('solid');
  }
  render() {
    this.el.innerHTML = '';
    this.el.appendChild(h('h2', {}, 'SETTINGS'));
    const list = h('div', { class: 'list' });
    const save = () => {
      saveSettings();
      applySettingsSideEffects(this.app);
    };
    list.append(
      slider('MUSIC', () => settings.music, (v) => { settings.music = v; save(); }, 0, 1, 0.1, 'music'),
      slider('SOUND FX', () => settings.sfx, (v) => { settings.sfx = v; save(); audio.play(SFX.select, { volume: 0.6 }); }, 0, 1, 0.1, 'sfx'),
      slider('SCREEN SHAKE', () => settings.shake, (v) => { settings.shake = v; save(); }, 0, 1, 0.25, 'shake'),
      toggle('RUMBLE / HAPTICS', () => settings.rumble, (v) => { settings.rumble = v; save(); }, 'rumble'),
      slider('TOUCH BUTTON SIZE', () => settings.touchSize, (v) => { settings.touchSize = v; save(); }, 0.7, 1.4, 0.1, 'tsize'),
      slider('TOUCH OPACITY', () => settings.touchOpacity, (v) => { settings.touchOpacity = v; save(); }, 0.2, 1, 0.1, 'topacity'),
      toggle('LEFT-HANDED TOUCH', () => settings.touchLeftHanded, (v) => { settings.touchLeftHanded = v; save(); }, 'lefty'),
      selector('ONLINE INPUT DELAY', [{ label: 'AUTO', value: 0 }, 1, 2, 3, 4].map((v) => (typeof v === 'number' ? { label: `${v} FRAME${v > 1 ? 'S' : ''}`, value: v } : v)), () => settings.inputDelay, (v) => { settings.inputDelay = v; save(); }, 'delay'),
      toggle('SHOW PING', () => settings.showPing, (v) => { settings.showPing = v; save(); }, 'ping'),
      toggle('SHOW FPS', () => settings.showFps, (v) => { settings.showFps = v; save(); }, 'fps'),
    );
    this.el.appendChild(list);
    const row = h('div', { class: 'row' });
    row.style.marginTop = '12px';
    row.append(
      button('FULLSCREEN', () => toggleFullscreen(), { cls: 'small', key: 'fs' }),
      button('DONE', () => this.back(), { cls: 'primary small', key: 'done' }),
    );
    this.el.appendChild(row);
    this.el.appendChild(hints([[g('confirm'), 'Select'], ['◀ ▶', 'Adjust'], [g('back'), 'Back']]));
  }
  back() {
    this.app.ui.pop();
    return true;
  }
}

// ------------------------------------------------------------------ how to play
export class HowToScreen extends Screen {
  constructor(private app: AppApi) {
    super('solid');
  }
  render() {
    this.el.innerHTML = '';
    this.el.appendChild(h('h2', {}, 'HOW TO PLAY'));
    this.el.appendChild(h('div', { class: 'sub' }, 'Knock out your rivals with projectiles. Every KO is a point - first to the target wins!<br>Open chests for new weapons and armor. Jump on heads for a bonk.'));
    const grid = h('div', { class: 'controls-grid panel' });
    grid.style.marginTop = '10px';
    grid.innerHTML = `
      <div><b style="color:var(--gold)">CONTROLLER</b><br>Move: Stick / D-pad<br>Jump: A / ✕ / B(Switch) — press again to double jump<br>Throw: X / □ / Y(Switch), RB, RT<br>Aim up / down: hold Up / Down while throwing<br>Drop through platforms: Down + Jump<br>Pause: Menu / Options / +</div>
      <div><b style="color:var(--gold)">KEYBOARD</b><br>P1: WASD move, Space/C jump, F/V throw, Esc pause<br>P2: Arrows move, . (period)/K jump, / (slash)/L throw, Enter pause<br>Two players can share one keyboard.</div>
      <div><b style="color:var(--gold)">TOUCH</b><br>Drag on the left half to move (up/down aims)<br>JUMP and THROW buttons on the right<br>Left-handed layout & button size in Settings<br>Bluetooth controllers work too!</div>
      <div><b style="color:var(--gold)">MOVES</b><br>Wall slide & wall jump off any wall<br>Coyote time + jump buffering = forgiving jumps<br>Hold jump for higher jumps, hold down to fast-fall<br>Strong shots clash with and destroy weaker ones</div>`;
    this.el.appendChild(grid);
    this.el.appendChild(h('h2', {}, 'WEAPONS'));
    const ws = h('div', { class: 'weapons' });
    for (const w of WEAPONS) {
      const item = h('div', { class: 'weapon' });
      item.append(iconCanvas(WEAPON_ICONS[w.id], 40), h('div', {}, `<b>${w.name.toUpperCase()}</b>${w.blurb}<br><span style="color:var(--muted)">DMG ${w.damage} · ${(60 / w.cooldown).toFixed(1)}/s</span>`));
      ws.appendChild(item);
    }
    this.el.appendChild(ws);
    const row = h('div', { class: 'row' });
    row.style.margin = '14px 0 30px';
    row.append(button('GOT IT', () => this.back(), { cls: 'primary', autofocus: true }));
    this.el.appendChild(row);
  }
  back() {
    settings.tutorialSeen = true;
    saveSettings();
    this.app.ui.pop();
    return true;
  }
}

// ------------------------------------------------------------------ pause
export class PauseScreen extends Screen {
  constructor(private app: AppApi) {
    super('dim center');
  }
  render() {
    this.el.innerHTML = '';
    const online = this.app.session?.kind === 'online';
    this.el.appendChild(h('h1', {}, online ? 'MENU' : 'PAUSED'));
    if (online) this.el.appendChild(h('div', { class: 'sub' }, 'The match keeps running while this menu is open.'));
    const menu = h('div', { class: 'menu' });
    menu.append(button('RESUME', () => this.back(), { cls: 'primary', autofocus: true }));
    if (!online) {
      menu.append(button('RESTART', () => {
        const last = this.app.last;
        if (last) this.app.startLocal({ ...last.cfg, seed: newSeed() }, last.locals, last.names);
      }));
    }
    menu.append(
      button('SETTINGS', () => this.app.ui.push(new SettingsScreen(this.app))),
      button('HOW TO PLAY', () => this.app.ui.push(new HowToScreen(this.app))),
      button(online ? 'LEAVE MATCH' : 'QUIT TO MENU', () => {
        if (online) {
          this.app.stopSession();
          this.app.conn?.leave();
          this.app.goMainMenu();
        } else {
          this.app.stopSession();
          this.app.ui.set(new MainMenuScreen(this.app));
          this.app.ui.push(new FightersScreen(this.app));
        }
      }, { cls: 'danger' }),
    );
    this.el.appendChild(menu);
  }
  onEnter() {
    if (this.app.session && this.app.session.kind === 'local') this.app.session.paused = true;
    this.app.touch.show(false);
    audio.play(SFX.pause, { volume: 0.5 });
  }
  onExit() {
    if (this.app.session) this.app.session.paused = false;
  }
  back() {
    this.app.ui.pop();
    return true;
  }
  private age = 0;
  update(dt: number) {
    // The Start press that opened this menu must not close it again.
    this.age += dt;
    if (this.age > 0.15 && input.nav.start) this.back();
  }
}

// ------------------------------------------------------------------ results
export class ResultsScreen extends Screen {
  constructor(private app: AppApi) {
    super('dim');
  }
  render() {
    this.el.innerHTML = '';
    const sess = this.app.session;
    if (!sess) return;
    const m = sess.match;
    const s = sess.state;
    const winner = s.winner;
    const teams = m.cfg.teams;
    const win = h('div', { class: 'winner' });
    if (winner >= 0) {
      const knight = m.cfg.slots[winner].knight;
      win.appendChild(knightCanvas(knight, 5, ''));
      const name = teams ? `${s.winnerTeam === 0 ? 'RED' : 'BLUE'} TEAM` : sess.names[winner] || `P${winner + 1}`;
      const t = h('h1', {}, `${name.toUpperCase()} WINS!`);
      t.style.color = KNIGHTS[knight].color;
      win.appendChild(t);
    } else {
      win.appendChild(h('h1', {}, 'DRAW!'));
    }
    this.el.appendChild(win);
    const table = h('table', { class: 'stats' });
    table.innerHTML = '<tr><th>FIGHTER</th><th>KOs</th><th>FALLS</th><th>DAMAGE</th><th>ACCURACY</th></tr>';
    const rows = s.players.filter((p) => p.active).sort((a, b) => b.score - a.score || a.deaths - b.deaths);
    for (const p of rows) {
      const tr = h('tr', p.slot === winner || (teams && m.cfg.slots[p.slot].team === s.winnerTeam) ? { class: 'win' } : {});
      const kv = KNIGHTS[m.cfg.slots[p.slot].knight];
      const acc = p.shots ? Math.round((p.hits / p.shots) * 100) : 0;
      tr.innerHTML = `<td><span style="color:${kv.color}">■</span> ${escapeHtml(sess.names[p.slot] || `P${p.slot + 1}`)}${m.cfg.slots[p.slot].bot ? ' (CPU)' : ''}</td><td>${p.score}</td><td>${p.deaths}</td><td>${p.damageDealt}</td><td>${acc}%</td>`;
      table.appendChild(tr);
    }
    this.el.appendChild(table);
    const row = h('div', { class: 'row' });
    row.style.marginTop = '16px';
    if (sess.kind === 'local') {
      row.append(
        button('REMATCH', () => {
          const last = this.app.last!;
          this.app.startLocal({ ...last.cfg, seed: newSeed() }, last.locals, last.names);
        }, { cls: 'primary', autofocus: true }),
        button('CHANGE FIGHTERS', () => {
          this.app.stopSession();
          this.app.ui.set(new MainMenuScreen(this.app));
          this.app.ui.push(new FightersScreen(this.app));
        }),
        button('MAIN MENU', () => {
          this.app.stopSession();
          this.app.goMainMenu();
        }, { cls: 'small' }),
      );
    } else {
      row.append(
        button('BACK TO ROOM', () => {
          this.app.stopSession();
          this.app.goRoom();
        }, { cls: 'primary', autofocus: true }),
        button('LEAVE', () => {
          this.app.stopSession();
          this.app.conn?.leave();
          this.app.goMainMenu();
        }, { cls: 'small danger' }),
      );
    }
    this.el.appendChild(row);
  }
  onEnter() {
    this.app.touch.show(false);
    audio.playMusic(MUSIC.results);
    const s = this.app.session?.state;
    if (s && s.phase === Phase.End) {
      for (const [slot, dev] of this.app.session!.locals) {
        input.device(dev)?.rumble(slot === s.winner ? 0.4 : 0.1, 0.4, 300);
      }
    }
  }
  back() {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
