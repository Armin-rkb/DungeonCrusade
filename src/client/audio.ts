// WebAudio sound engine: decoded buffers for effects (with pitch variation and
// voice limiting), streamed <audio> elements for music.

import { assets, url } from './assets';

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  musicGain!: GainNode;
  buffers = new Map<string, AudioBuffer>();
  loading = new Map<string, Promise<AudioBuffer | null>>();
  music: HTMLAudioElement | null = null;
  musicId = '';
  musicSource: MediaElementAudioSourceNode | null = null;
  voices = new Map<string, number>();
  sfxVolume = 0.8;
  musicVolume = 0.55;
  unlocked = false;
  /** Effects are muted while the menu's attract-mode match plays. */
  sfxMuted = false;

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = this.sfxVolume;
    this.sfx.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);
  }

  /** Must be called from a user gesture on mobile browsers. */
  unlock() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.unlocked) {
      // Play a silent buffer: required by iOS to unlock audio.
      const b = this.ctx.createBuffer(1, 1, 22050);
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      s.connect(this.ctx.destination);
      s.start(0);
      this.unlocked = true;
    }
    if (this.music && this.music.paused && this.musicId) void this.music.play().catch(() => {});
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.ctx) {
      this.sfx.gain.value = sfx;
      this.musicGain.gain.value = music;
    }
    if (this.music && !this.musicSource) this.music.volume = music;
  }

  async preload(ids: string[]) {
    await Promise.all(ids.map((id) => this.load(id)));
  }

  load(id: string): Promise<AudioBuffer | null> {
    const cached = this.buffers.get(id);
    if (cached) return Promise.resolve(cached);
    let p = this.loading.get(id);
    if (p) return p;
    this.init();
    const entry = assets.manifest.audio[id];
    if (!entry || !this.ctx) return Promise.resolve(null);
    p = fetch(url(entry.url))
      .then((r) => r.arrayBuffer())
      .then((data) => new Promise<AudioBuffer>((res, rej) => this.ctx!.decodeAudioData(data, res, rej)))
      .then((buf) => {
        this.buffers.set(id, buf);
        return buf;
      })
      .catch((e) => {
        console.warn('audio failed', id, e);
        return null;
      });
    this.loading.set(id, p);
    return p;
  }

  /**
   * Plays a sound effect. pitch is a playback rate multiplier, vary adds random
   * +-variation, pan is -1..1. Max 4 simultaneous voices per sound.
   */
  play(id: string, opts: { volume?: number; pitch?: number; vary?: number; pan?: number; maxVoices?: number } = {}) {
    if (this.sfxMuted || !this.ctx || this.ctx.state !== 'running') return;
    const buf = this.buffers.get(id);
    if (!buf) {
      void this.load(id);
      return;
    }
    const max = opts.maxVoices ?? 4;
    const v = this.voices.get(id) ?? 0;
    if (v >= max) return;
    this.voices.set(id, v + 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const vary = opts.vary ?? 0.06;
    src.playbackRate.value = (opts.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * vary);
    const gain = this.ctx.createGain();
    gain.gain.value = opts.volume ?? 1;
    let node: AudioNode = gain;
    if (opts.pan && this.ctx.createStereoPanner) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, opts.pan));
      gain.connect(pan);
      node = pan;
    }
    src.connect(gain);
    node.connect(this.sfx);
    src.onended = () => this.voices.set(id, Math.max(0, (this.voices.get(id) ?? 1) - 1));
    src.start();
  }

  playMusic(id: string, volume = 1) {
    if (this.musicId === id && this.music) {
      if (this.music.paused) void this.music.play().catch(() => {});
      return;
    }
    this.stopMusic();
    const entry = assets.manifest.audio[id];
    if (!entry) return;
    this.musicId = id;
    const el = new Audio(url(entry.url));
    el.loop = true;
    el.preload = 'auto';
    el.volume = Math.min(1, this.musicVolume * volume);
    this.music = el;
    void el.play().catch(() => {
      /* waits for unlock() */
    });
  }

  duckMusic(amount: number, seconds: number) {
    if (!this.music) return;
    const el = this.music;
    const base = this.musicVolume;
    el.volume = Math.max(0, base * amount);
    window.setTimeout(() => {
      if (this.music === el) el.volume = base;
    }, seconds * 1000);
  }

  stopMusic() {
    if (this.music) {
      this.music.pause();
      this.music.src = '';
    }
    this.music = null;
    this.musicId = '';
  }
}

export const audio = new AudioEngine();

/** Short names for the original sound effects. */
export const SFX = {
  stone: 'sound/fx/bullets/stone',
  pill: 'sound/fx/bullets/pill',
  shuriken: 'sound/fx/bullets/shuriken',
  hadouken: 'sound/fx/bullets/hadouken',
  pizza: 'sound/fx/bullets/pizza-projectile',
  sock: 'sound/fx/bullets/sock',
  barrel: 'sound/fx/bullets/barrel',
  explosion: 'sound/fx/bullets/explosion',
  duckExplosion: 'sound/fx/bullets/duckexplosion',
  quack: 'sound/fx/bullets/quack',
  bomb: 'sound/fx/bullets/bomb',
  confetti: 'sound/fx/bullets/confetti',
  bulletHit: 'sound/fx/bullets/hit',
  noteBig: 'sound/fx/bullets/musicnotes/musicnotebig',
  noteMed: 'sound/fx/bullets/musicnotes/musicnotemed',
  noteSmall: 'sound/fx/bullets/musicnotes/musicnotesmall',
  chest: 'sound/fx/pickup/chest',
  armor: 'sound/fx/pickup/armor',
  spawn: 'sound/fx/pickup/spawn',
  jump: 'sound/fx/player/jump',
  doubleJump: 'sound/fx/player/doublejump',
  footstool: 'sound/fx/player/footstool',
  hit: 'sound/fx/player/hit',
  death: 'sound/fx/player/playerdeath',
  plusOne: 'sound/fx/ui/plusone',
  win: 'sound/fx/ui/winsfx',
  select: 'sound/fx/ui/select',
  button: 'sound/fx/ui/butten-press',
  pause: 'sound/fx/ui/pause',
  lightning: 'sound/fx/level/dungeon/lightning',
  seagull: 'sound/fx/level/beach/seagull',
  dragonAwake: 'sound/fx/level/dragon/dragonawake',
  dragonEnter: 'sound/fx/level/dragon/dragonenter',
} as const;

export const MUSIC = {
  menu: 'sound/music/mainmenu',
  dungeon: 'sound/music/dungeon',
  beach: 'sound/music/wackybeach',
  dragon: 'sound/music/dragon',
  results: 'sound/music/royalty-free-game-music-8-bit-joy-by-heatleybros',
  lobby: 'sound/music/chiptune_motorcade',
} as const;
