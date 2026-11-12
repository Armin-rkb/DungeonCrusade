// Persisted user settings (per device).

export interface Settings {
  name: string;
  sfx: number;
  music: number;
  shake: number; // 0..1 screen shake intensity
  rumble: boolean;
  touchSize: number; // 0.7..1.4
  touchOpacity: number;
  touchLeftHanded: boolean;
  showFps: boolean;
  showPing: boolean;
  server: string;
  inputDelay: number; // online frames of input delay (1..4)
  lastLevel: string;
  targetScore: number;
  timeLimit: number;
  items: boolean;
  teams: boolean;
  botLevel: number;
  tutorialSeen: boolean;
  /** 'classic' (original rules) or 'crusade' (the remix). */
  mode: 'classic' | 'crusade';
  /** Coloured outline around every knight (readability). */
  outlines: boolean;
}

const KEY = 'dungeon-crusade-settings-v2';

const defaults: Settings = {
  name: '',
  sfx: 0.8,
  music: 0.5,
  shake: 1,
  rumble: true,
  touchSize: 1,
  touchOpacity: 0.55,
  touchLeftHanded: false,
  showFps: false,
  showPing: true,
  server: '',
  inputDelay: 2,
  lastLevel: 'dungeon',
  targetScore: 5,
  timeLimit: 0,
  items: true,
  teams: false,
  botLevel: 2,
  tutorialSeen: false,
  mode: 'classic',
  outlines: true,
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* storage blocked */
  }
  return { ...defaults };
}

export const settings: Settings = load();

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

const ADJ = ['Brave', 'Shiny', 'Sneaky', 'Mighty', 'Rusty', 'Speedy', 'Grumpy', 'Lucky', 'Wobbly', 'Noble'];
const NOUN = ['Knight', 'Squire', 'Paladin', 'Pizza', 'Duck', 'Sock', 'Barrel', 'Dragon', 'Ninja', 'Bard'];

export function playerName(): string {
  if (!settings.name) {
    settings.name = ADJ[Math.floor(Math.random() * ADJ.length)] + NOUN[Math.floor(Math.random() * NOUN.length)];
    saveSettings();
  }
  return settings.name;
}
