import { describe, expect, it } from 'vitest';
import { RoomManager, type Client } from '../server/rooms';
import { PROTOCOL_VERSION, type ServerMsg } from '../src/shared/protocol';

const VALID_CFG = { level: 'dungeon', seed: 1, targetScore: 5, timeLimit: 0, teams: false, items: true, slots: [0, 1, 2, 3].map((k) => ({ active: k < 2, knight: k, bot: 0, team: 0, name: '' })) } as const;

function setup() {
  const rm = new RoomManager();
  const inbox = new Map<Client, ServerMsg[]>();
  const join = (name: string) => {
    const box: ServerMsg[] = [];
    const c = rm.connect((m) => box.push(m));
    inbox.set(c, box);
    rm.handle(c, { t: 'hello', v: PROTOCOL_VERSION, name, platform: 'web' });
    return c;
  };
  const last = (c: Client, t: string) => [...inbox.get(c)!].reverse().find((m) => m.t === t);
  return { rm, join, last, inbox };
}

const P = (name: string, knight = 0) => [{ name, knight }];

describe('room manager', () => {
  it('rejects clients with an old protocol version', () => {
    const rm = new RoomManager();
    const box: ServerMsg[] = [];
    const c = rm.connect((m) => box.push(m));
    rm.handle(c, { t: 'hello', v: 1, name: 'old', platform: 'web' });
    expect(box[0]).toMatchObject({ t: 'error', code: 'version' });
    rm.handle(c, { t: 'create', public: false, players: P('x') });
    expect(rm.rooms.size).toBe(0);
  });

  it('creates rooms with 4-letter codes and lets friends join by code', () => {
    const { rm, join, last } = setup();
    const a = join('Alice');
    rm.handle(a, { t: 'create', public: false, players: P('Alice') });
    const room = (last(a, 'room') as Extract<ServerMsg, { t: 'room' }>).room;
    expect(room.code).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{4}$/);
    expect(room.host).toBe(a.id);
    const b = join('Bob');
    rm.handle(b, { t: 'join', code: room.code.toLowerCase(), players: P('Bob', 1) });
    const rb = (last(b, 'room') as Extract<ServerMsg, { t: 'room' }>).room;
    expect(rb.peers.map((p) => p.name)).toEqual(['Alice', 'Bob']);
    const c = join('Carl');
    rm.handle(c, { t: 'join', code: 'ZZZZ', players: P('Carl') });
    expect(last(c, 'error')).toMatchObject({ code: 'not-found' });
  });

  it('enforces 4 players including couch players on one device', () => {
    const { rm, join, last } = setup();
    const a = join('A');
    rm.handle(a, { t: 'create', public: false, players: [{ name: 'A1', knight: 0 }, { name: 'A2', knight: 1 }, { name: 'A3', knight: 2 }] });
    const code = (last(a, 'room') as Extract<ServerMsg, { t: 'room' }>).room.code;
    const b = join('B');
    rm.handle(b, { t: 'join', code, players: P('B') });
    expect(last(b, 'room')).toBeDefined();
    const c = join('C');
    rm.handle(c, { t: 'join', code, players: P('C') });
    expect(last(c, 'error')).toMatchObject({ code: 'full' });
  });

  it('quick match fills public rooms before creating new ones', () => {
    const { rm, join, last } = setup();
    const a = join('A');
    rm.handle(a, { t: 'quick', players: P('A') });
    const b = join('B');
    rm.handle(b, { t: 'quick', players: P('B') });
    const ra = (last(a, 'room') as Extract<ServerMsg, { t: 'room' }>).room;
    expect(ra.public).toBe(true);
    expect(ra.peers.length).toBe(2);
    expect(rm.rooms.size).toBe(1);
    // Private rooms are never used for quick match.
    const p = join('P');
    rm.handle(p, { t: 'create', public: false, players: P('P') });
    const q = join('Q');
    rm.handle(q, { t: 'quick', players: P('Q') });
    expect((last(q, 'room') as Extract<ServerMsg, { t: 'room' }>).room.code).toBe(ra.code);
  });

  it('only the host changes settings and starts; inputs are relayed; leavers become CPUs', () => {
    const { rm, join, last, inbox } = setup();
    const a = join('A');
    rm.handle(a, { t: 'create', public: false, players: P('A') });
    const code = (last(a, 'room') as Extract<ServerMsg, { t: 'room' }>).room.code;
    const b = join('B');
    rm.handle(b, { t: 'join', code, players: P('B', 1) });
    rm.handle(b, { t: 'settings', settings: { level: 'beach' } });
    expect(rm.rooms.get(code)!.settings.level).toBe('dungeon');
    rm.handle(a, { t: 'settings', settings: { level: 'beach', targetScore: 99, cpus: 2 } });
    expect(rm.rooms.get(code)!.settings).toMatchObject({ level: 'beach', targetScore: 20, cpus: 2 });
    const cfg = VALID_CFG;
    rm.handle(b, { t: 'start', cfg, owners: [a.id, b.id, null, null] });
    expect(last(a, 'start')).toBeUndefined();
    rm.handle(a, { t: 'start', cfg, owners: [a.id, b.id, null, null] });
    expect(last(b, 'start')).toBeDefined();
    rm.handle(a, { t: 'i', f: 5, d: [17] });
    rm.handle(a, { t: 'i', f: 6, d: [300] });
    const relayed = inbox.get(b)!.filter((m) => m.t === 'i');
    expect(relayed).toEqual([{ t: 'i', p: a.id, f: 5, d: [17] }, { t: 'i', p: a.id, f: 6, d: [300 & 255] }]);
    expect(inbox.get(a)!.some((m) => m.t === 'i')).toBe(false);
    rm.disconnect(a);
    expect(last(b, 'peer-left')).toEqual({ t: 'peer-left', p: a.id, lastFrame: 6 });
    // The remaining player becomes host.
    expect((last(b, 'room') as Extract<ServerMsg, { t: 'room' }>).room.host).toBe(b.id);
    rm.disconnect(b);
    expect(rm.rooms.size).toBe(0);
  });

  it('drops players whose game stopped sending inputs', () => {
    const { rm, join, last } = setup();
    let now = 1000;
    rm.now = () => now;
    const a = join('A');
    rm.handle(a, { t: 'create', public: false, players: P('A') });
    const code = (last(a, 'room') as Extract<ServerMsg, { t: 'room' }>).room.code;
    const b = join('B');
    rm.handle(b, { t: 'join', code, players: P('B') });
    rm.handle(a, { t: 'start', cfg: VALID_CFG, owners: [a.id, b.id, null, null] });
    now += 6000;
    rm.handle(a, { t: 'i', f: 300, d: [0] });
    rm.handle(b, { t: 'i', f: 120, d: [0] });
    now += 7000;
    rm.handle(a, { t: 'i', f: 700, d: [0] });
    rm.tick();
    expect(last(a, 'peer-left')).toEqual({ t: 'peer-left', p: b.id, lastFrame: 120 });
    expect(last(b, 'error')).toMatchObject({ code: 'dropped' });
    rm.handle(b, { t: 'i', f: 121, d: [1] });
    expect(b.lastFrame).toBe(120);
  });
});
