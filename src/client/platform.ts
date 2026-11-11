// Platform integration: Steam (via the Electron preload bridge), Capacitor
// (Android / iOS), and the plain web. Everything degrades gracefully.

import type { Platform } from '../shared/protocol';
import { setHapticImpl } from './input/input';

/** Exposed by platforms/electron/preload.cjs */
export interface NativeBridge {
  platform: 'electron';
  steam: boolean;
  steamUser(): Promise<{ name: string; id: string } | null>;
  setPresence(status: string, code: string | null): void;
  inviteFriends(code: string): Promise<boolean>;
  onJoin(cb: (code: string) => void): void;
  launchJoinCode(): Promise<string | null>;
  achievement(id: string): void;
  quit(): void;
  toggleFullscreen(): void;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
}

const w = window as unknown as { dcNative?: NativeBridge; Capacitor?: CapacitorGlobal };

export const native: NativeBridge | undefined = w.dcNative;
const cap = w.Capacitor?.isNativePlatform?.() ? w.Capacitor : undefined;

export function platformName(): Platform {
  if (native) return native.steam ? 'steam' : 'desktop';
  if (cap) return cap.getPlatform?.() === 'ios' ? 'ios' : 'android';
  return 'web';
}

export function isDesktopApp(): boolean {
  return !!native;
}

export function isMobileApp(): boolean {
  return !!cap;
}

/** Public URL used in shareable invite links. */
export function publicUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (env?.VITE_PUBLIC_URL) return env.VITE_PUBLIC_URL;
  const loc = window.location;
  if (loc.protocol.startsWith('http') && !/localhost|127\.0\.0\.1/.test(loc.hostname)) return `${loc.origin}${loc.pathname}`;
  return 'https://dungeon-crusade.fly.dev/';
}

export function inviteLink(code: string): string {
  return `${publicUrl().replace(/[?#].*$/, '')}?join=${code}`;
}

export async function share(code: string): Promise<'shared' | 'copied' | 'failed'> {
  const link = inviteLink(code);
  const text = `Join my Dungeon Crusade room ${code}!`;
  try {
    const sharePlugin = cap?.Plugins?.Share;
    if (sharePlugin?.share) {
      await sharePlugin.share({ title: 'Dungeon Crusade', text, url: link });
      return 'shared';
    }
    if (navigator.share && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
      await navigator.share({ title: 'Dungeon Crusade', text, url: link });
      return 'shared';
    }
  } catch {
    /* fall back to clipboard */
  }
  return (await copy(`${text} ${link}`)) ? 'copied' : 'failed';
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Join code from the launch URL (?join=ABCD), a deep link or Steam. */
export async function launchJoinCode(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('join') ?? new URLSearchParams(window.location.hash.slice(1)).get('join');
  if (fromUrl) return fromUrl;
  if (native) return native.launchJoinCode();
  return null;
}

export function onJoinRequest(cb: (code: string) => void) {
  native?.onJoin(cb);
  const app = cap?.Plugins?.App as unknown as { addListener?: (ev: string, fn: (d: { url: string }) => void) => void } | undefined;
  app?.addListener?.('appUrlOpen', (d) => {
    const m = /join[=/]([A-Za-z]{4})/.exec(d.url);
    if (m) cb(m[1]);
  });
}

export function setPresence(status: string, code: string | null) {
  native?.setPresence(status, code);
}

export function achievement(id: string) {
  native?.achievement(id);
}

export function quit() {
  native?.quit();
}

export function toggleFullscreen() {
  if (native) return native.toggleFullscreen();
  const d = document as Document & { webkitFullscreenElement?: Element };
  if (document.fullscreenElement || d.webkitFullscreenElement) void document.exitFullscreen?.();
  else void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
}

export async function lockLandscape() {
  try {
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await so.lock?.('landscape');
  } catch {
    /* not allowed outside fullscreen */
  }
}

export function initPlatform() {
  const haptics = cap?.Plugins?.Haptics;
  if (haptics?.impact) {
    setHapticImpl((style) => {
      void haptics.impact({ style: style.toUpperCase() }).catch(() => {});
    });
  }
  const statusBar = cap?.Plugins?.StatusBar;
  void statusBar?.hide?.().catch(() => {});
  const keepAwake = cap?.Plugins?.KeepAwake;
  void keepAwake?.keepAwake?.().catch(() => {});
}
