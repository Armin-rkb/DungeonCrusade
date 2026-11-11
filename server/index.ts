// Dungeon Crusade relay & matchmaking server.
//
//  * Rooms with 4-letter codes (shareable links / Steam invites carry the code)
//  * Quick match into public rooms
//  * Relays inputs between peers (each peer runs the deterministic simulation
//    with rollback), so every platform plays with every other: crossplay.
//  * Serves the web build from ./dist when present (one deployable).
//
// Env: PORT (default 8787), HOST, STATIC_DIR (default ./dist), ALLOWED_ORIGINS
// (comma separated, default: any).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { RoomManager } from './rooms';

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const STATIC_DIR = path.resolve(process.env.STATIC_DIR ?? 'dist');
const ALLOWED = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
// Testing aid: simulate network latency (one way, ms) and jitter on every message.
const LAG_MS = Number(process.env.LAG_MS ?? 0);
const JITTER_MS = Number(process.env.JITTER_MS ?? 0);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

const rooms = new RoomManager();
setInterval(() => rooms.tick(), 1000).unref();

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...rooms.stats() }));
    return;
  }
  if (url.pathname === '/api/stats') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(rooms.stats()));
    return;
  }
  serveStatic(url.pathname, res);
});

function serveStatic(pathname: string, res: http.ServerResponse) {
  if (!fs.existsSync(STATIC_DIR)) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Dungeon Crusade server is running. (No web build found in ./dist)');
    return;
  }
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(STATIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(file, (err, st) => {
    const target = !err && st.isFile() ? file : path.join(STATIC_DIR, 'index.html');
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    fs.createReadStream(target).pipe(res);
  });
}

const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const origin = req.headers.origin ?? '';
  if (ALLOWED.length && origin && !ALLOWED.includes(origin)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (ws: WebSocket) => {
  // Optional simulated latency keeps message order (a single FIFO per client).
  const queue: Array<{ due: number; data: string }> = [];
  let timer: NodeJS.Timeout | null = null;
  const pump = () => {
    timer = null;
    const now = Date.now();
    while (queue.length && queue[0].due <= now) {
      const { data } = queue.shift()!;
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
    if (queue.length) timer = setTimeout(pump, Math.max(1, queue[0].due - now));
  };
  const client = rooms.connect((msg) => {
    const data = JSON.stringify(msg);
    if (!LAG_MS && !JITTER_MS) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
      return;
    }
    const last = queue.length ? queue[queue.length - 1].due : 0;
    queue.push({ due: Math.max(last, Date.now() + LAG_MS + Math.random() * JITTER_MS), data });
    if (!timer) timer = setTimeout(pump, Math.max(1, queue[0].due - Date.now()));
  });
  let alive = true;
  let budget = 400; // messages per second
  const refill = setInterval(() => (budget = 400), 1000);
  const heartbeat = setInterval(() => {
    if (!alive) {
      ws.terminate();
      return;
    }
    alive = false;
    ws.ping();
  }, 10_000);
  ws.on('pong', () => (alive = true));
  ws.on('message', (data: RawData) => {
    alive = true;
    if (--budget < 0) return;
    let msg: unknown;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    rooms.handle(client, msg);
  });
  ws.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(refill);
    rooms.disconnect(client);
  });
  ws.on('error', () => ws.terminate());
});

server.listen(PORT, HOST, () => {
  console.log(`Dungeon Crusade server listening on http://${HOST}:${PORT} (ws path /ws)`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    wss.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
