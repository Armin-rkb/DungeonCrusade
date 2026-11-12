// WebSocket connection to the relay server with server-clock estimation.

import {
  PROTOCOL_VERSION,
  type ClientMsg,
  type LobbyPlayer,
  type Platform,
  type RoomState,
  type ServerMsg,
} from '../../shared/protocol';

type Listener = (m: ServerMsg) => void;

export function defaultServerUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  const configured = env?.VITE_SERVER_URL;
  if (configured) return configured;
  // Native apps (Capacitor serves the game from https://localhost or
  // capacitor://localhost) always use the public relay.
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return PUBLIC_SERVER;
  const loc = window.location;
  if (loc.protocol === 'http:' || loc.protocol === 'https:') {
    // Dev server (vite on 5173) talks to the local relay on 8787.
    if (loc.port === '5173' || loc.port === '4173') return `ws://${loc.hostname}:8787/ws`;
    return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws`;
  }
  // Electron (app://) uses the public server.
  return PUBLIC_SERVER;
}

/** Default public relay (override at build time with VITE_SERVER_URL). */
const PUBLIC_SERVER = 'wss://dungeon-crusade.fly.dev/ws';

export class Connection {
  ws: WebSocket | null = null;
  id = '';
  room: RoomState | null = null;
  rtt = 0;
  /** serverTime ≈ performance.now() + offset */
  offset = 0;
  private offsetSamples: Array<{ rtt: number; off: number }> = [];
  private listeners = new Set<Listener>();
  private pingTimer = 0;
  status: 'idle' | 'connecting' | 'open' | 'closed' | 'error' = 'idle';
  lastError = '';

  constructor(public url: string, public name: string, public platform: Platform) {}

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  connect(timeoutMs = 7000): Promise<void> {
    if (this.ws && this.status === 'open') return Promise.resolve();
    this.status = 'connecting';
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(this.url);
      this.ws = ws;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        this.status = 'error';
        this.lastError = 'Could not reach the game server.';
        ws.close();
        reject(new Error(this.lastError));
      }, timeoutMs);
      ws.onopen = () => {
        this.send({ t: 'hello', v: PROTOCOL_VERSION, name: this.name, platform: this.platform });
      };
      ws.onmessage = (ev) => {
        let m: ServerMsg;
        try {
          m = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (m.t === 'welcome') {
          this.id = m.id;
          this.status = 'open';
          this.startPings();
          if (!settled) {
            settled = true;
            window.clearTimeout(timer);
            resolve();
          }
        } else if (m.t === 'pong') {
          this.onPong(m.c, m.s);
        } else if (m.t === 'room') {
          this.room = m.room;
        } else if (m.t === 'left') {
          this.room = null;
        } else if (m.t === 'error' && m.code === 'version' && !settled) {
          settled = true;
          window.clearTimeout(timer);
          this.lastError = m.msg;
          reject(new Error(m.msg));
        }
        this.emit(m);
      };
      ws.onerror = () => {
        this.lastError = 'Connection error.';
      };
      ws.onclose = () => {
        this.status = 'closed';
        window.clearInterval(this.pingTimer);
        this.room = null;
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(new Error(this.lastError || 'Connection closed.'));
        }
        this.emit({ t: 'error', code: 'closed', msg: 'Disconnected from server.' });
      };
    });
  }

  /** A throwing listener must not stop the others (or the socket handler). */
  private emit(m: ServerMsg) {
    for (const l of [...this.listeners]) {
      try {
        l(m);
      } catch (e) {
        console.error('listener failed', e);
      }
    }
  }

  private startPings() {
    window.clearInterval(this.pingTimer);
    const ping = () => this.send({ t: 'ping', c: performance.now(), rtt: this.rtt || undefined });
    // A burst first for a good clock estimate, then every second.
    for (let i = 0; i < 5; i++) window.setTimeout(ping, i * 120);
    this.pingTimer = window.setInterval(ping, 1000);
  }

  private onPong(c: number, s: number) {
    const now = performance.now();
    const rtt = now - c;
    this.rtt = this.rtt ? this.rtt * 0.8 + rtt * 0.2 : rtt;
    // Offset estimate assuming symmetric latency; keep the samples with the
    // lowest RTT (least queueing noise).
    const off = s + rtt / 2 - now;
    this.offsetSamples.push({ rtt, off });
    if (this.offsetSamples.length > 12) this.offsetSamples.shift();
    const best = [...this.offsetSamples].sort((a, b) => a.rtt - b.rtt).slice(0, 4);
    const avg = best.reduce((a, b) => a + b.off, 0) / best.length;
    this.offset = this.offset === 0 ? avg : this.offset * 0.7 + avg * 0.3;
  }

  serverNow(): number {
    return performance.now() + this.offset;
  }

  send(m: ClientMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  create(pub: boolean, players: LobbyPlayer[]) {
    this.send({ t: 'create', public: pub, players });
  }

  join(code: string, players: LobbyPlayer[]) {
    this.send({ t: 'join', code, players });
  }

  quick(players: LobbyPlayer[]) {
    this.send({ t: 'quick', players });
  }

  leave() {
    this.send({ t: 'leave' });
    this.room = null;
  }

  close() {
    window.clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
    this.status = 'closed';
    this.room = null;
  }

  isHost(): boolean {
    return !!this.room && this.room.host === this.id;
  }
}
