// Dungeon Crusade client entry: boot, main loop, and wiring between the menus,
// the running match (local or online) and the renderer.

import type { AppApi, CouchSlot, LastMatch, OnlineLocal } from './app-api';
import { assets, loadFonts, loadImages, loadManifest } from './assets';
import { audio, MUSIC, SFX } from './audio';
import { Effects, type FxContext } from './fx';
import { input, isTouchDevice } from './input/input';
import { TouchControls } from './input/touch';
import { Connection, defaultServerUrl } from './net/connection';
import { OnlineSession } from './net/online-session';
import { applySettingsSideEffects } from './options';
import { achievement, initPlatform, launchJoinCode, lockLandscape, onJoinRequest, platformName, setPresence } from './platform';
import { Renderer } from './render/renderer';
import { WorldRenderer } from './render/world';
import { LocalSession, type Session } from './session';
import { playerName, settings } from './settings';
import { toast, UI } from './ui/core';
import { MainMenuScreen, OnlineScreen, PauseScreen, ResultsScreen, RoomScreen, TitleScreen } from './ui/screens';
import { LEVELS, levelInfo } from '../shared/levels';
import type { StartInfo } from '../shared/protocol';
import { Phase, type LevelId, type MatchConfig } from '../shared/types';

class App implements AppApi {
  ui: UI;
  touch: TouchControls;
  couch: CouchSlot[] = [null, null, null, null];
  onlineLocals: OnlineLocal[] = [];
  conn: Connection | null = null;
  session: Session | null = null;
  last: LastMatch | null = null;
  renderer: Renderer;
  world = new WorldRenderer();
  fx = new Effects();
  attract: LocalSession | null = null;
  private lastT = 0;
  private resultsShown = false;
  private frameDt = 1 / 60;

  constructor() {
    this.renderer = new Renderer(document.getElementById('game') as HTMLCanvasElement);
    this.ui = new UI(document.getElementById('ui')!);
    this.touch = new TouchControls(document.body);
    this.touch.onPause = () => this.pause();
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.renderer.resize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.session?.kind === 'local' && !this.ui.top) this.pause();
    });
    input.listeners.push((d, connected) => {
      toast(`${d.name} ${connected ? 'connected' : 'disconnected'}`, !connected, 1800);
      if (!connected && this.session?.kind === 'local' && [...this.session.locals.values()].includes(d.id) && !this.ui.top) this.pause();
    });
    // First interaction unlocks audio (mobile autoplay policies).
    const unlock = () => {
      audio.unlock();
      if (isTouchDevice()) void lockLandscape();
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  async boot() {
    const fill = document.getElementById('boot-fill')!;
    const text = document.getElementById('boot-text')!;
    try {
      await loadManifest();
    } catch (e) {
      text.textContent = 'Could not load game data. Run "npm run assets".';
      throw e;
    }
    await loadImages(() => true, (p) => {
      fill.style.width = `${Math.round(p * 90)}%`;
    });
    text.textContent = 'Loading fonts...';
    await loadFonts();
    fill.style.width = '100%';
    initPlatform();
    input.install();
    applySettingsSideEffects(this);
    audio.init();
    void audio.preload(Object.values(SFX));
    document.getElementById('boot')!.classList.add('done');
    setTimeout(() => document.getElementById('boot')?.remove(), 600);
    this.updateRotateHint();
    window.addEventListener('resize', () => this.updateRotateHint());

    this.setAttract(true);
    this.ui.set(new TitleScreen(this));

    const code = await launchJoinCode();
    if (code) this.openJoin(code);
    onJoinRequest((c) => this.openJoin(c));
    requestAnimationFrame((t) => this.loop(t));
  }

  private updateRotateHint() {
    const el = document.getElementById('rotate-hint');
    el?.classList.toggle('active', isTouchDevice() && window.innerHeight > window.innerWidth);
  }

  private openJoin(code: string) {
    if (this.session) {
      toast(`Invite to room ${code.toUpperCase()} - finish this match first.`);
      return;
    }
    audio.unlock();
    this.ui.set(new MainMenuScreen(this));
    this.ui.push(new OnlineScreen(this, code));
  }

  // ---------------------------------------------------------------- AppApi
  async ensureConnection(): Promise<Connection> {
    if (this.conn && this.conn.status === 'open') return this.conn;
    this.conn?.close();
    const conn = new Connection(settings.server || defaultServerUrl(), playerName(), platformName());
    this.conn = conn;
    conn.on((m) => {
      if (m.t === 'room') setPresence(m.room.phase === 'game' ? 'In a match' : 'In a lobby', m.room.code);
      if (m.t === 'left') setPresence('In the menus', null);
    });
    await conn.connect();
    return conn;
  }

  disconnect() {
    this.conn?.close();
    this.conn = null;
    setPresence('In the menus', null);
  }

  setAttract(on: boolean) {
    if (on && !this.attract && !this.session) {
      const level = LEVELS[Math.floor(Math.random() * LEVELS.length)].id;
      const cfg: MatchConfig = {
        level, seed: (Math.random() * 1e9) | 0, targetScore: 99, timeLimit: 0, teams: false, items: true,
        slots: [0, 1, 2, 3].map((k) => ({ active: true, knight: k, bot: 1 + (k % 3), team: 0, name: `CPU ${k + 1}` })),
      };
      this.attract = new LocalSession(cfg, new Map(), cfg.slots.map((s) => s.name));
      this.fx.reset();
      this.renderer.setView(this.attract.match.level.view);
    } else if (!on) {
      this.attract = null;
    }
  }

  startLocal(cfg: MatchConfig, locals: Map<number, string>, names: string[]) {
    this.stopSession();
    this.setAttract(false);
    this.session = new LocalSession(cfg, locals, names);
    this.last = { kind: 'local', cfg, locals, names };
    this.beginMatch();
  }

  startOnline(start: StartInfo) {
    const conn = this.conn;
    if (!conn) return;
    this.stopSession();
    this.setAttract(false);
    const locals = new Map<number, string>();
    let k = 0;
    start.owners.forEach((o, slot) => {
      if (o === conn.id) {
        const l = this.onlineLocals[k++];
        if (l) locals.set(slot, l.device);
      }
    });
    let delay = settings.inputDelay;
    if (!delay) {
      const worst = Math.max(conn.rtt, ...(conn.room?.peers ?? []).map((p) => p.ping));
      delay = worst < 70 ? 1 : worst < 140 ? 2 : worst < 220 ? 3 : 4;
    }
    this.session = new OnlineSession(conn, start, locals, delay);
    this.last = { kind: 'online', cfg: start.cfg, locals, names: this.session.names };
    this.beginMatch();
  }

  private beginMatch() {
    const s = this.session!;
    this.resultsShown = false;
    this.ui.set(null);
    this.fx.reset();
    this.world.setLevel(s.match.level);
    this.renderer.setView(s.match.level.view);
    audio.playMusic(levelInfo(s.match.cfg.level as LevelId).music || MUSIC.dungeon);
    this.touch.show([...s.locals.values()].includes('touch'));
  }

  stopSession() {
    this.session?.dispose();
    this.session = null;
    this.touch.show(false);
  }

  goMainMenu() {
    this.stopSession();
    this.setAttract(true);
    this.ui.set(new MainMenuScreen(this));
  }

  goRoom() {
    this.stopSession();
    this.setAttract(true);
    if (!this.conn?.room) {
      this.goMainMenu();
      return;
    }
    this.ui.set(new MainMenuScreen(this));
    this.ui.push(new OnlineScreen(this));
    this.ui.push(new RoomScreen(this));
  }

  private pause() {
    if (!this.session || this.ui.top) return;
    this.ui.push(new PauseScreen(this));
  }

  // ---------------------------------------------------------------- loop
  private fxContext(s: Session | LocalSession, live: boolean): FxContext {
    return {
      level: s.match.level,
      knights: s.match.cfg.slots.map((x) => x.knight),
      names: s.names,
      rumble: (slot, strong, weak, ms) => {
        if (!live || slot < 0) return;
        const dev = s.locals.get(slot);
        if (dev) input.device(dev)?.rumble(strong, weak, ms);
      },
    };
  }

  private loop(t: number) {
    const dt = Math.min(0.1, this.lastT ? (t - this.lastT) / 1000 : 1 / 60);
    this.lastT = t;
    this.frameDt = this.frameDt * 0.9 + dt * 0.1;
    try {
      this.tick(t, dt);
    } catch (e) {
      console.error(e);
    }
    requestAnimationFrame((n) => this.loop(n));
  }

  private tick(t: number, dt: number) {
    input.poll(t);
    const s = this.session;
    if (s) {
      if (!this.ui.top) {
        for (const dev of new Set(s.locals.values())) {
          const d = input.device(dev);
          if (d && (d.nav.start || (d.kind === 'keyboard' && d.nav.back))) {
            this.pause();
            break;
          }
        }
        if (s.locals.size === 0 && (input.nav.start || input.nav.back)) this.pause();
      }
      const events = s.update(t);
      this.fx.handle(events, s.state, this.fxContext(s, true));
      const st = s.state;
      if (st.phase === Phase.End && st.slowmo === 0 && st.phaseTimer > 50 && !this.resultsShown) {
        this.resultsShown = true;
        this.touch.show(false);
        if (s.kind === 'online' && this.conn?.isHost()) this.conn.send({ t: 'end' });
        const myWin = [...s.locals.keys()].includes(st.winner) || (s.match.cfg.teams && [...s.locals.keys()].some((k) => s.match.cfg.slots[k].team === st.winnerTeam));
        if (myWin) achievement(s.kind === 'online' ? 'WIN_ONLINE' : 'WIN_LOCAL');
        this.ui.set(new ResultsScreen(this));
      }
      this.touch.show(!this.ui.top && [...s.locals.values()].includes('touch'));
    } else if (this.attract) {
      const events = this.attract.update(t);
      audio.sfxMuted = true;
      this.fx.handle(events, this.attract.state, this.fxContext(this.attract, false));
      audio.sfxMuted = false;
      if (this.attract.state.phase === Phase.End) this.attract = null, this.setAttract(true);
    }
    this.ui.update(dt);

    const view = s ?? this.attract;
    this.fx.update(dt, view?.match.level ?? null);
    if (view) {
      const pts = view.state.players.filter((p) => p.active && p.alive).map((p) => ({ x: p.x, y: p.y + 0.4 }));
      // Wrap-around arenas always show everything.
      this.renderer.follow(view.match.level.wrapX || !s ? [] : pts, dt, isTouchDevice() ? 1.6 : 1.35);
    }
    this.fx.applyCamera(this.renderer);
    this.world.fpsDt = this.frameDt;
    if (view) {
      const hud = {
        names: view.names,
        local: [0, 1, 2, 3].map((i) => view.locals.has(i)),
        ping: s?.ping(),
        status: s?.status(),
        tags: !!s,
        hidden: !s,
      };
      this.world.draw(this.renderer, view.match, view.state, this.fx, hud, dt);
    } else {
      this.renderer.clear('#0b0b16');
    }
  }
}

const app = new App();
void app.boot();
(window as unknown as { __app: App }).__app = app;
export { assets };
