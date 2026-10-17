# Multiplayer theo khu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi đồng bộ multiplayer sang kênh theo khu + gửi theo thay đổi để 50 người chơi được với Supabase Realtime.

**Architecture:** `src/lib/netSync.ts` (thuần, có test) định nghĩa tin nhắn, kiểm tra tin và quy tắc khi nào gửi.
`src/lib/multiplayer.ts` có lớp `MultiplayerSync` nói chuyện với Supabase (kênh khu + kênh sảnh có Presence) và
BroadcastChannel giữa các tab, nhận client qua tham số để test bằng client giả; hook `useMultiplayerSync` nối nó với
store. Vị trí người chơi khác giữ trong `livePeers` (ngoài React), `RemotePlayers` đọc mỗi khung.

**Tech Stack:** Next.js 14, React 18, @react-three/fiber 8, zustand 5, @supabase/supabase-js 2.117 (Realtime), vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-17-multiplayer-zones-design.md`

## Global Constraints

- Kênh: `sunny_zone_v4:<khu>` (sự kiện `p`), `sunny_lobby_v4` (Presence `{ n, w, l }`, sự kiện `chat`); BroadcastChannel `sunny_zone_v4`, `sunny_lobby_v4`.
- Ngưỡng: lấy mẫu 100 ms; đứng < 0,2 đơn vị/s; rẽ > 20°; đổi tốc > 25%; cách nhau ≥ 250 ms; đang đi 1 s/tin; đứng yên 8 s/tin; ngoại suy ≤ 1,5 s; im lặng 25 s thì xoá; tab-roster 5 s, hết hạn 15 s.
- Chuỗi: tên ≤ 24, bong bóng chat ≤ 120, chat ≤ 200, mã ≤ 64; tên trống → "Nông Dân".
- Chỉ gọi `send()` trên kênh Supabase sau khi kênh báo `SUBSCRIBED`.
- Không tự commit: repo chỉ commit (thẳng lên `main`) khi người dùng yêu cầu.
- Code theo phong cách repo: comment tiếng Anh ngắn kiểu "vì sao", nháy đơn, CRLF giữ nguyên khi sửa file có sẵn.
- `tsconfig` không đặt `target`: không spread/`for…of` trên `Map`/`Set` (dùng `forEach`, `Array.from`).

---

### Task 1: Tin nhắn và quy tắc gửi (`netSync`)

**Files:**
- Create: `src/lib/netSync.ts`
- Test: `src/lib/netSync.test.ts`

**Interfaces:**
- Produces: `SAMPLE_MS`, `MOVING_SPEED`, `MOVING_REFRESH_MS`, `IDLE_REFRESH_MS`, `MAX_EXTRAPOLATE_S`, `PEER_TIMEOUT_MS`, `MAX_SPEED`, `ZONES`;
  `interface PeerMessage { u; n; w: WorldId; x; z; vx; vz; r; c: PlayerCosmetics; l; m?; e?; bye?: true }`;
  `interface RosterEntry { n; w: WorldId; l }`; `interface SentState { vx; vz; look: string; at: number }`;
  `lookKey(m: Pick<PeerMessage,'n'|'c'|'l'|'m'|'e'>): string`;
  `shouldSend(last: SentState | null, vx: number, vz: number, look: string, now: number): boolean`;
  `predict(p: {x;z;vx;vz}, ageMs: number): {x; z}`;
  `parsePeerMessage(raw: unknown): PeerMessage | null`; `parseRosterEntry(raw: unknown): RosterEntry | null`;
  `parseChat(raw: unknown): ChatMessage | null`.

- [ ] **Step 1: Write the failing test** — `src/lib/netSync.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  MAX_EXTRAPOLATE_S,
  MOVING_REFRESH_MS,
  SAMPLE_MS,
  SentState,
  lookKey,
  parseChat,
  parsePeerMessage,
  parseRosterEntry,
  predict,
  shouldSend,
} from './netSync';

const LOOK = { hat: 'straw_hat', outfit: 'farmer_blue', wing: 'none', pet: 'none' };
const valid = { u: 'farmer_a', n: 'An', w: 'park', x: 1, z: 2, vx: 0, vz: 0, r: 0.5, c: LOOK, l: 4 };
const sent = (vx: number, vz: number, at: number, look = 'L'): SentState => ({ vx, vz, look, at });

// Samples a walk every SAMPLE_MS for `ms` and counts the messages it costs
function countSends(ms: number, velocity: (t: number) => [number, number]) {
  let last: SentState | null = null;
  let count = 0;
  for (let t = 0; t <= ms; t += SAMPLE_MS) {
    const [vx, vz] = velocity(t);
    if (shouldSend(last, vx, vz, 'L', t)) {
      count++;
      last = { vx, vz, look: 'L', at: t };
    }
  }
  return count;
}

describe('when a player sends their state', () => {
  it('sends the first sample', () => {
    expect(shouldSend(null, 0, 0, 'L', 0)).toBe(true);
  });

  it('standing still sends one refresh every 8 seconds', () => {
    expect(countSends(16000, () => [0, 0])).toBe(3);
  });

  it('walking straight sends about once a second', () => {
    const count = countSends(10000, () => [6, 0]);
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(12);
  });

  it('a walk round a square costs about two messages a side (the old way: 40)', () => {
    const sides: [number, number][] = [[6, 0], [0, 6], [-6, 0], [0, -6]];
    expect(countSends(8000, (t) => sides[Math.floor(t / 2000) % 4])).toBeLessThanOrEqual(10);
  });

  it('starting and stopping are sent at once', () => {
    expect(shouldSend(sent(0, 0, 0), 6, 0, 'L', 100)).toBe(true);
    expect(shouldSend(sent(6, 0, 0), 0, 0, 'L', 100)).toBe(true);
  });

  it('a turn of more than 20 degrees is sent, but not sooner than 250 ms after the last message', () => {
    const turned: [number, number] = [6 * Math.cos(0.5), 6 * Math.sin(0.5)];
    expect(shouldSend(sent(6, 0, 0), ...turned, 'L', 100)).toBe(false);
    expect(shouldSend(sent(6, 0, 0), ...turned, 'L', 300)).toBe(true);
  });

  it('a slight turn or a small change of speed waits for the next refresh', () => {
    const slight: [number, number] = [6 * Math.cos(0.2), 6 * Math.sin(0.2)];
    expect(shouldSend(sent(6, 0, 0), ...slight, 'L', 500)).toBe(false);
    expect(shouldSend(sent(6, 0, 0), 6.6, 0, 'L', 500)).toBe(false);
    expect(shouldSend(sent(6, 0, 0), 6.6, 0, 'L', MOVING_REFRESH_MS)).toBe(true);
  });

  it('a big change of speed is sent', () => {
    expect(shouldSend(sent(6, 0, 0), 8.5, 0, 'L', 300)).toBe(true);
  });

  it('a new look (outfit, name, level, chat bubble, emote) is sent at once', () => {
    expect(shouldSend(sent(0, 0, 0, 'L'), 0, 0, 'L2', 100)).toBe(true);
  });
});

describe('where another player is drawn', () => {
  it('carries on along their walk', () => {
    expect(predict({ x: 1, z: 2, vx: 6, vz: -3 }, 500)).toEqual({ x: 4, z: 0.5 });
  });

  it('stops carrying on 1.5 seconds after the last message', () => {
    expect(predict({ x: 0, z: 0, vx: 6, vz: 0 }, 5000)).toEqual({ x: 6 * MAX_EXTRAPOLATE_S, z: 0 });
  });

  it('a standing player stays put', () => {
    expect(predict({ x: 3, z: 4, vx: 0, vz: 0 }, 2000)).toEqual({ x: 3, z: 4 });
  });
});

describe('messages from the network', () => {
  it('a well-formed state passes unchanged', () => {
    expect(parsePeerMessage(valid)).toEqual(valid);
  });

  it('broken or impossible messages are dropped', () => {
    expect(parsePeerMessage(null)).toBeNull();
    expect(parsePeerMessage({ ...valid, u: '' })).toBeNull();
    expect(parsePeerMessage({ ...valid, w: 'moon' })).toBeNull();
    expect(parsePeerMessage({ ...valid, x: Infinity })).toBeNull();
    expect(parsePeerMessage({ ...valid, vx: 999 })).toBeNull();
    expect(parsePeerMessage({ ...valid, c: null })).toBeNull();
  });

  it('long text is cut short and a missing name gets a stand-in', () => {
    const message = parsePeerMessage({ ...valid, n: 'x'.repeat(100), m: 'y'.repeat(500) });
    expect(message?.n).toHaveLength(24);
    expect(message?.m).toHaveLength(120);
    expect(parsePeerMessage({ ...valid, n: 42 })?.n).toBe('Nông Dân');
  });

  it('a goodbye is kept', () => {
    expect(parsePeerMessage({ ...valid, bye: true })?.bye).toBe(true);
  });

  it('lobby presence and chat are checked too', () => {
    expect(parseRosterEntry({ n: 'An', w: 'beach', l: 3 })).toEqual({ n: 'An', w: 'beach', l: 3 });
    expect(parseRosterEntry({ n: 'An', w: 'space', l: 3 })).toBeNull();
    const chat = { id: 'msg_1', uid: 'farmer_a', sender: 'An', world: 'park', text: ' chào ', createdAt: 1 };
    expect(parseChat(chat)).toEqual({ ...chat, text: 'chào' });
    expect(parseChat({ ...chat, text: '   ' })).toBeNull();
  });

  it('the look key follows the outfit and the chat bubble, not the position', () => {
    const base = lookKey(valid);
    expect(lookKey({ ...valid, x: 9 } as typeof valid)).toBe(base);
    expect(lookKey({ ...valid, m: 'hi' })).not.toBe(base);
    expect(lookKey({ ...valid, c: { ...LOOK, hat: 'crown' } })).not.toBe(base);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/netSync.test.ts`
Expected: FAIL — `Failed to resolve import "./netSync"`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/netSync.ts`

```ts
import { ChatMessage, PlayerCosmetics, WorldId } from '@/types/game';

// What players tell each other and when (pure: lib/multiplayer does the talking). Supabase counts a broadcast
// to N listeners as 1 + N messages, so a player speaks only when what the others see would change: a walk starts,
// stops, turns or changes speed, the look changes, or a refresh is due.

// How often the local player is sampled
export const SAMPLE_MS = 100;
// Slower than this counts as standing
export const MOVING_SPEED = 0.2;
const TURN_DEGREES = 20;
const SPEED_CHANGE = 0.25;
// Turns and speed changes are sent no closer together than this
const MIN_GAP_MS = 250;
// Refreshes while walking and while standing (newcomers to a zone see everyone by the next one)
export const MOVING_REFRESH_MS = 1000;
export const IDLE_REFRESH_MS = 8000;
// A walk is carried on for at most this long after its last message
export const MAX_EXTRAPOLATE_S = 1.5;
// Players not heard from for this long have gone
export const PEER_TIMEOUT_MS = 25000;
// Faster than any walk (a teleport between two samples): sent as standing
export const MAX_SPEED = 20;

export const ZONES: WorldId[] = ['farm', 'park', 'beach', 'mall', 'cinema', 'casino'];

// A player's state on a zone channel. Every message carries all of it, so newcomers can draw the player from any one.
export interface PeerMessage {
  u: string;
  n: string;
  w: WorldId;
  x: number;
  z: number;
  // Velocity in units per second, 0 while standing
  vx: number;
  vz: number;
  r: number;
  c: PlayerCosmetics;
  l: number;
  // Chat bubble and emote
  m?: string;
  e?: string;
  // Leaving the zone
  bye?: true;
}

// Someone online anywhere, as their lobby presence describes them: name, zone, level
export interface RosterEntry {
  n: string;
  w: WorldId;
  l: number;
}

// What was last sent, to judge whether a new sample is worth a message
export interface SentState {
  vx: number;
  vz: number;
  look: string;
  at: number;
}

// Everything about a player except where they are; a change goes out at once
export const lookKey = (m: Pick<PeerMessage, 'n' | 'c' | 'l' | 'm' | 'e'>) =>
  [m.n, m.c.hat, m.c.outfit, m.c.wing, m.c.pet, m.l, m.m ?? '', m.e ?? ''].join('|');

export function shouldSend(last: SentState | null, vx: number, vz: number, look: string, now: number) {
  if (!last || look !== last.look) return true;
  const speed = Math.hypot(vx, vz);
  const lastSpeed = Math.hypot(last.vx, last.vz);
  const moving = speed > MOVING_SPEED;
  if (moving !== lastSpeed > MOVING_SPEED) return true;
  const gap = now - last.at;
  if (!moving) return gap >= IDLE_REFRESH_MS;
  if (gap >= MOVING_REFRESH_MS) return true;
  if (gap < MIN_GAP_MS) return false;
  const turned = (vx * last.vx + vz * last.vz) / (speed * lastSpeed) < Math.cos((TURN_DEGREES * Math.PI) / 180);
  const sped = Math.abs(speed - lastSpeed) / Math.max(speed, lastSpeed) > SPEED_CHANGE;
  return turned || sped;
}

// Where a player is `ageMs` after their message: their walk carried on, for at most MAX_EXTRAPOLATE_S
export function predict(p: { x: number; z: number; vx: number; vz: number }, ageMs: number) {
  const t = Math.min(Math.max(ageMs, 0) / 1000, MAX_EXTRAPOLATE_S);
  return { x: p.x + p.vx * t, z: p.z + p.vz * t };
}

const isNum = (v: unknown, limit: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isZone = (v: unknown): v is WorldId => ZONES.includes(v as WorldId);
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

// Anyone can broadcast on a public channel, so nothing from the network is trusted: malformed messages are dropped,
// numbers must be finite and sane, text is cut short
export function parsePeerMessage(raw: unknown): PeerMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const { u, n, w, x, z, vx, vz, r, c, l, m, e, bye } = raw as Record<string, unknown>;
  if (!isId(u) || !isZone(w) || !c || typeof c !== 'object') return null;
  if (!isNum(x, 500) || !isNum(z, 500) || !isNum(vx, 50) || !isNum(vz, 50) || !isNum(r, 100) || !isNum(l, 1000)) {
    return null;
  }
  const look = c as Record<string, unknown>;
  const message: PeerMessage = {
    u,
    n: clip(n, 24) || 'Nông Dân',
    w,
    x,
    z,
    vx,
    vz,
    r,
    c: { hat: clip(look.hat, 40), outfit: clip(look.outfit, 40), wing: clip(look.wing, 40), pet: clip(look.pet, 40) },
    l: Math.round(l),
  };
  const bubble = clip(m, 120);
  const emote = clip(e, 8);
  if (bubble) message.m = bubble;
  if (emote) message.e = emote;
  if (bye === true) message.bye = true;
  return message;
}

export function parseRosterEntry(raw: unknown): RosterEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const { n, w, l } = raw as Record<string, unknown>;
  if (!isZone(w) || !isNum(l, 1000)) return null;
  return { n: clip(n, 24) || 'Nông Dân', w, l: Math.round(l) };
}

export function parseChat(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, uid, sender, world, text, createdAt } = raw as Record<string, unknown>;
  const clean = clip(text, 200).trim();
  if (!isId(id) || !isId(uid) || !isZone(world) || !clean || !isNum(createdAt, 1e14)) return null;
  return { id, uid, sender: clip(sender, 24) || 'Nông Dân', world, text: clean, createdAt };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/netSync.test.ts`
Expected: PASS (17 tests).

---

### Task 2: Kênh khu, sảnh và tab (`MultiplayerSync`) + store

**Files:**
- Modify: `src/types/game.ts:514-527` (interface `RemotePlayer`; thêm `OnlinePlayer`)
- Modify: `src/store/useGameStore.ts` (import `OnlinePlayer`; `onlinePlayers` + `setOnlinePlayers` cạnh `remotePlayers`/`setRemotePlayers` ở dòng ~259, ~400, ~569, ~2699)
- Modify (viết lại): `src/lib/multiplayer.ts`
- Test: `src/lib/multiplayer.test.ts`

**Interfaces:**
- Consumes (Task 1): `SAMPLE_MS`, `MAX_SPEED`, `PEER_TIMEOUT_MS`, `PeerMessage`, `SentState`, `lookKey`, `shouldSend`, `parsePeerMessage`, `parseRosterEntry`, `parseChat`.
- Produces: `RemotePlayer { uid; name; world; cosmetics; level; chatMsg?; emote? }`, `OnlinePlayer { uid; name; world; level }`;
  store `onlinePlayers: Record<string, OnlinePlayer>`, `setOnlinePlayers(players)`;
  `interface LivePeer { x; z; vx; vz; r; at }`, `const livePeers: Map<string, LivePeer>`;
  `RealtimeChannelLike`, `RealtimeClientLike`, `LocalChannelLike`, `LocalPlayer`, `SyncOptions`;
  `class MultiplayerSync { tick(): void; sendChat(m: ChatMessage): void; dispose(): void }`; `useMultiplayerSync()`.

- [ ] **Step 1: Types and store**

`src/types/game.ts` — thay interface `RemotePlayer` cũ bằng:

```ts
// Another player in the same zone, as drawn on screen (where they stand lives in lib/multiplayer's livePeers)
export interface RemotePlayer {
  uid: string;
  name: string;
  world: WorldId;
  cosmetics: PlayerCosmetics;
  level: number;
  chatMsg?: string;
  emote?: string;
}

// Someone online anywhere in the game, for the lobby list
export interface OnlinePlayer {
  uid: string;
  name: string;
  world: WorldId;
  level: number;
}
```

`src/store/useGameStore.ts`: thêm `OnlinePlayer` vào import từ `@/types/game`; trong `GameState` ngay dưới
`remotePlayers: Record<string, RemotePlayer>;` thêm `onlinePlayers: Record<string, OnlinePlayer>;`; dưới
`setRemotePlayers: (players: Record<string, RemotePlayer>) => void;` thêm
`setOnlinePlayers: (players: Record<string, OnlinePlayer>) => void;`; trong state ban đầu dưới `remotePlayers: {},`
thêm `onlinePlayers: {},`; dưới action `setRemotePlayers: (players) => set({ remotePlayers: players }),` thêm
`setOnlinePlayers: (players) => set({ onlinePlayers: players }),`. (Cả hai không nằm trong `partialize` nên không lưu.)

- [ ] **Step 2: Write the failing test** — `src/lib/multiplayer.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatMessage, OnlinePlayer, RemotePlayer } from '@/types/game';
import {
  LocalChannelLike,
  LocalPlayer,
  MultiplayerSync,
  RealtimeChannelLike,
  RealtimeClientLike,
  livePeers,
} from './multiplayer';
import { SAMPLE_MS } from './netSync';

const LOOK = { hat: 'straw_hat', outfit: 'farmer_blue', wing: 'none', pet: 'none' };
const LOBBY = 'sunny_lobby_v4';
const PARK = 'sunny_zone_v4:park';

class FakeChannel implements RealtimeChannelLike {
  sent: { event: string; payload: unknown }[] = [];
  tracked: Record<string, unknown>[] = [];
  presence: Record<string, unknown[]> = {};
  removed = false;
  private handlers = new Map<string, (message: { payload?: unknown }) => void>();
  private status?: (status: string) => void;
  constructor(readonly name: string) {}
  on(type: string, filter: { event: string }, callback: (message: { payload?: unknown }) => void) {
    this.handlers.set(`${type}:${filter.event}`, callback);
    return this;
  }
  subscribe(callback?: (status: string) => void) {
    this.status = callback;
    return this;
  }
  send(message: { type: 'broadcast'; event: string; payload: unknown }) {
    this.sent.push({ event: message.event, payload: message.payload });
  }
  track(payload: Record<string, unknown>) {
    this.tracked.push(payload);
  }
  presenceState() {
    return this.presence;
  }
  join() {
    this.status?.('SUBSCRIBED');
  }
  emit(type: string, event: string, payload?: unknown) {
    this.handlers.get(`${type}:${event}`)?.({ payload });
  }
}

class FakeClient implements RealtimeClientLike {
  channels: FakeChannel[] = [];
  channel(name: string) {
    const channel = new FakeChannel(name);
    this.channels.push(channel);
    return channel;
  }
  removeChannel(channel: RealtimeChannelLike) {
    (channel as FakeChannel).removed = true;
  }
  named(name: string) {
    return this.channels.filter((c) => c.name === name).pop() as FakeChannel;
  }
}

// BroadcastChannel stand-in: a message reaches every other open channel of the same name
class Bus {
  private channels: FakeLocal[] = [];
  open = (name: string): LocalChannelLike => {
    const channel = new FakeLocal(name, this);
    this.channels.push(channel);
    return channel;
  };
  deliver(from: FakeLocal, data: unknown) {
    this.channels
      .filter((c) => c !== from && c.name === from.name && !c.closed)
      .forEach((c) => c.onmessage?.({ data } as MessageEvent));
  }
}

class FakeLocal implements LocalChannelLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;
  constructor(readonly name: string, private readonly bus: Bus) {}
  postMessage(data: unknown) {
    this.bus.deliver(this, data);
  }
  close() {
    this.closed = true;
  }
}

const player = (overrides: Partial<LocalPlayer> = {}): LocalPlayer => ({
  id: 'me',
  name: 'Tôi',
  world: 'farm',
  x: 0,
  z: 0,
  rotY: 0,
  cosmetics: LOOK,
  level: 3,
  chat: '',
  emote: '',
  ...overrides,
});

const peerState = (overrides: Record<string, unknown> = {}) => ({
  u: 'other', n: 'Bạn', w: 'park', x: 1, z: 1, vx: 0, vz: 0, r: 0, c: LOOK, l: 2, ...overrides,
});

function setup(client: FakeClient | null, me: LocalPlayer, bus = new Bus(), clock = { now: 0 }) {
  const peers: Record<string, RemotePlayer>[] = [];
  const rosters: Record<string, OnlinePlayer>[] = [];
  const chats: ChatMessage[] = [];
  const sync = new MultiplayerSync({
    client,
    openLocal: bus.open,
    me: () => me,
    now: () => clock.now,
    onPeers: (p) => peers.push(p),
    onRoster: (r) => rosters.push(r),
    onChat: (m) => chats.push(m),
  });
  const tick = (times = 1) => {
    for (let i = 0; i < times; i++) {
      clock.now += SAMPLE_MS;
      sync.tick();
    }
  };
  return { sync, peers, rosters, chats, tick, clock };
}

function inPark() {
  const client = new FakeClient();
  const world = setup(client, player({ world: 'park' }));
  world.tick();
  client.named(PARK).join();
  world.tick();
  return { client, ...world };
}

beforeEach(() => livePeers.clear());

describe('zone channels', () => {
  it('on their own farm a player joins no zone channel', () => {
    const client = new FakeClient();
    const { tick } = setup(client, player({ world: 'farm' }));
    tick(20);
    expect(client.channels.map((c) => c.name)).toEqual([LOBBY]);
  });

  it('in a public zone the player joins its channel and sends their state once it is joined', () => {
    const client = new FakeClient();
    const { tick } = setup(client, player({ world: 'park' }));
    tick();
    const park = client.named(PARK);
    expect(park.sent).toHaveLength(0);
    park.join();
    tick();
    expect(park.sent).toHaveLength(1);
    expect(park.sent[0]).toMatchObject({ event: 'p', payload: { u: 'me', w: 'park', l: 3 } });
  });

  it('moving to another zone says goodbye on the old channel and joins the new one', () => {
    const client = new FakeClient();
    const me = player({ world: 'park' });
    const { tick } = setup(client, me);
    tick();
    client.named(PARK).join();
    tick();
    me.world = 'beach';
    tick();
    const park = client.named(PARK);
    expect(park.sent.at(-1)).toMatchObject({ payload: { u: 'me', w: 'park', bye: true } });
    expect(park.removed).toBe(true);
    expect(client.named('sunny_zone_v4:beach')).toBeDefined();
  });
});

describe('other players in the zone', () => {
  it('a message shows the player, a move only updates where they are, a goodbye removes them', () => {
    const { client, peers } = inPark();
    const park = client.named(PARK);
    park.emit('broadcast', 'p', peerState());
    expect(Object.keys(peers.at(-1) ?? {})).toEqual(['other']);
    const published = peers.length;
    park.emit('broadcast', 'p', peerState({ x: 5, vx: 6 }));
    expect(peers).toHaveLength(published);
    expect(livePeers.get('other')).toMatchObject({ x: 5, vx: 6 });
    park.emit('broadcast', 'p', peerState({ m: 'Chào!' }));
    expect(peers.at(-1)?.other.chatMsg).toBe('Chào!');
    park.emit('broadcast', 'p', peerState({ bye: true }));
    expect(peers.at(-1)).toEqual({});
    expect(livePeers.has('other')).toBe(false);
  });

  it('players silent for 25 seconds are dropped', () => {
    const { client, peers, clock, sync } = inPark();
    client.named(PARK).emit('broadcast', 'p', peerState());
    clock.now += 26000;
    sync.tick();
    expect(peers.at(-1)).toEqual({});
  });

  it('messages for another zone, from the player themselves or malformed are ignored', () => {
    const { client, peers } = inPark();
    const park = client.named(PARK);
    const before = peers.length;
    park.emit('broadcast', 'p', peerState({ w: 'beach' }));
    park.emit('broadcast', 'p', peerState({ u: 'me' }));
    park.emit('broadcast', 'p', { u: 'x', w: 'park' });
    expect(peers).toHaveLength(before);
  });
});

describe('who is online (lobby)', () => {
  it('the player is tracked once the lobby is joined, and again when the zone changes', () => {
    const client = new FakeClient();
    const me = player({ world: 'farm' });
    const { tick } = setup(client, me);
    const lobby = client.named(LOBBY);
    lobby.join();
    expect(lobby.tracked).toEqual([{ n: 'Tôi', w: 'farm', l: 3 }]);
    tick();
    expect(lobby.tracked).toHaveLength(1);
    me.world = 'mall';
    tick();
    expect(lobby.tracked.at(-1)).toEqual({ n: 'Tôi', w: 'mall', l: 3 });
  });

  it('presence becomes the online list, without the player themselves', () => {
    const client = new FakeClient();
    const { rosters } = setup(client, player());
    const lobby = client.named(LOBBY);
    lobby.presence = { me: [{ n: 'Tôi', w: 'farm', l: 3 }], other: [{ n: 'Bạn', w: 'beach', l: 7 }] };
    lobby.emit('presence', 'sync');
    expect(rosters.at(-1)).toEqual({ other: { uid: 'other', name: 'Bạn', world: 'beach', level: 7 } });
  });

  it('chat goes out on the lobby; others’ chat comes in and an echo of one’s own is ignored', () => {
    const client = new FakeClient();
    const { sync, chats } = setup(client, player());
    const lobby = client.named(LOBBY);
    const mine: ChatMessage = { id: 'msg_1', uid: 'me', sender: 'Tôi', world: 'farm', text: 'Chào', createdAt: 1 };
    sync.sendChat(mine);
    expect(lobby.sent).toEqual([{ event: 'chat', payload: mine }]);
    lobby.emit('broadcast', 'chat', { ...mine, id: 'msg_2', uid: 'other', sender: 'Bạn' });
    lobby.emit('broadcast', 'chat', mine);
    expect(chats.map((m) => m.id)).toEqual(['msg_2']);
  });
});

describe('between tabs of one browser (no Supabase)', () => {
  it('two players in the same zone see each other and list each other online', () => {
    const bus = new Bus();
    const clock = { now: 0 };
    const a = setup(null, player({ id: 'a', name: 'A', world: 'park' }), bus, clock);
    const b = setup(null, player({ id: 'b', name: 'B', world: 'park' }), bus, clock);
    // b joins after a's first message: it sees a by a's 8 s refresh
    for (let i = 0; i < 90; i++) {
      clock.now += SAMPLE_MS;
      a.sync.tick();
      b.sync.tick();
    }
    expect(Object.keys(a.peers.at(-1) ?? {})).toEqual(['b']);
    expect(Object.keys(b.peers.at(-1) ?? {})).toEqual(['a']);
    expect(a.rosters.at(-1)).toEqual({ b: { uid: 'b', name: 'B', world: 'park', level: 3 } });
  });

  it('a player on their farm is listed online but not seen', () => {
    const bus = new Bus();
    const clock = { now: 0 };
    const a = setup(null, player({ id: 'a', world: 'park' }), bus, clock);
    setup(null, player({ id: 'b', name: 'B', world: 'farm' }), bus, clock).tick(3);
    a.tick(3);
    expect(a.peers.at(-1) ?? {}).toEqual({});
    expect(a.rosters.at(-1)).toMatchObject({ b: { world: 'farm' } });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/multiplayer.test.ts`
Expected: FAIL — `MultiplayerSync` / `livePeers` không được export.

- [ ] **Step 4: Write implementation** — viết lại toàn bộ `src/lib/multiplayer.ts`

```ts
'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { ChatMessage, OnlinePlayer, PlayerCosmetics, RemotePlayer, WorldId } from '@/types/game';
import { supabase, isSupabaseConfigured } from './supabase';
import { levelInfo } from './leveling';
import {
  MAX_SPEED,
  PEER_TIMEOUT_MS,
  PeerMessage,
  SAMPLE_MS,
  SentState,
  lookKey,
  parseChat,
  parsePeerMessage,
  parseRosterEntry,
  shouldSend,
} from './netSync';

// Multiplayer over Supabase Realtime, and over BroadcastChannel between tabs of one browser. Each public zone has
// its own channel, so a player hears only the players in their zone (and nobody while on their own farm); the lobby
// channel carries the chat and who is online where (presence). lib/netSync has the message and when it is sent.

const LOBBY = 'sunny_lobby_v4';
const ZONE = 'sunny_zone_v4';
// Tabs have no presence: each says who it is now and then
const TAB_ROSTER_MS = 5000;
const TAB_ROSTER_TIMEOUT_MS = 15000;

// Where each player in this zone was at their last message (`at`: performance.now() when heard). <RemotePlayers />
// reads it every frame, so a position update never re-renders React.
export interface LivePeer {
  x: number;
  z: number;
  vx: number;
  vz: number;
  r: number;
  at: number;
}
export const livePeers = new Map<string, LivePeer>();

// The parts of Supabase Realtime used here (tests stand in for them)
export interface RealtimeChannelLike {
  on(type: string, filter: { event: string }, callback: (message: { payload?: unknown }) => void): RealtimeChannelLike;
  subscribe(callback?: (status: string) => void): RealtimeChannelLike;
  send(message: { type: 'broadcast'; event: string; payload: unknown }): unknown;
  track(payload: Record<string, unknown>): unknown;
  presenceState(): Record<string, unknown[]>;
}
export interface RealtimeClientLike {
  channel(name: string, options?: Record<string, unknown>): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): unknown;
}
export interface LocalChannelLike {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
  close(): void;
}

// The local player as the network sees them
export interface LocalPlayer {
  id: string;
  name: string;
  world: WorldId;
  x: number;
  z: number;
  rotY: number;
  cosmetics: PlayerCosmetics;
  level: number;
  chat: string;
  emote: string;
}

export interface SyncOptions {
  client: RealtimeClientLike | null;
  openLocal: (name: string) => LocalChannelLike | null;
  me: () => LocalPlayer;
  now: () => number;
  onPeers: (peers: Record<string, RemotePlayer>) => void;
  onRoster: (online: Record<string, OnlinePlayer>) => void;
  onChat: (message: ChatMessage) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const presenceKey = (me: LocalPlayer) => `${me.name}|${me.world}|${me.level}`;

export class MultiplayerSync {
  private zone: WorldId | null = null;
  private zoneChannel: RealtimeChannelLike | null = null;
  private zoneReady = false;
  private readonly lobby: RealtimeChannelLike | null = null;
  private lobbyReady = false;
  private tracked = '';
  private readonly tabZone: LocalChannelLike | null;
  private readonly tabLobby: LocalChannelLike | null;
  private last: SentState | null = null;
  private prev: { x: number; z: number; at: number } | null = null;
  private readonly looks = new Map<string, { look: string; player: RemotePlayer }>();
  private presence: Record<string, OnlinePlayer> = {};
  private readonly tabs = new Map<string, { player: OnlinePlayer; at: number }>();
  private tabRosterKey = '';
  private tabRosterAt = -Infinity;
  private rosterPublished = '';

  constructor(private readonly opts: SyncOptions) {
    this.tabZone = opts.openLocal(ZONE);
    this.tabLobby = opts.openLocal(LOBBY);
    if (this.tabZone) this.tabZone.onmessage = (event) => this.receive(event.data);
    if (this.tabLobby) this.tabLobby.onmessage = (event) => this.receiveTabLobby(event.data);
    if (opts.client) {
      const lobby = opts.client.channel(LOBBY, {
        config: { broadcast: { self: false }, presence: { key: opts.me().id } },
      });
      this.lobby = lobby;
      lobby
        .on('broadcast', { event: 'chat' }, ({ payload }) => this.receiveChat(payload))
        .on('presence', { event: 'sync' }, () => this.syncPresence())
        .subscribe((status) => {
          this.lobbyReady = status === 'SUBSCRIBED';
          if (this.lobbyReady) this.track(true);
        });
    }
  }

  // Every SAMPLE_MS: follow the player into their zone, send their state if it is worth it, forget silent players
  tick() {
    const me = this.opts.me();
    const now = this.opts.now();
    const zone = me.world === 'farm' ? null : me.world;
    if (zone !== this.zone) this.enter(zone, me);

    const prev = this.prev;
    this.prev = { x: me.x, z: me.z, at: now };
    let vx = 0;
    let vz = 0;
    if (prev && now > prev.at) {
      vx = ((me.x - prev.x) * 1000) / (now - prev.at);
      vz = ((me.z - prev.z) * 1000) / (now - prev.at);
      if (Math.hypot(vx, vz) > MAX_SPEED) vx = vz = 0;
    }
    if (this.zone) {
      const message = this.message(me, vx, vz);
      const look = lookKey(message);
      if (shouldSend(this.last, vx, vz, look, now)) {
        this.broadcast(message);
        this.last = { vx, vz, look, at: now };
      }
    }

    livePeers.forEach((peer, uid) => {
      if (now - peer.at > PEER_TIMEOUT_MS) this.drop(uid);
    });
    this.track(false);
    this.tabRoster(me, now);
  }

  sendChat(message: ChatMessage) {
    this.lobby?.send({ type: 'broadcast', event: 'chat', payload: message });
    this.tabLobby?.postMessage({ t: 'chat', message });
  }

  dispose() {
    const me = this.opts.me();
    this.enter(null, me);
    if (this.lobby) this.opts.client?.removeChannel(this.lobby);
    this.tabLobby?.postMessage({ t: 'gone', u: me.id });
    this.tabZone?.close();
    this.tabLobby?.close();
  }

  private message(me: LocalPlayer, vx: number, vz: number): PeerMessage {
    const message: PeerMessage = {
      u: me.id,
      n: me.name,
      w: me.world,
      x: round2(me.x),
      z: round2(me.z),
      vx: round2(vx),
      vz: round2(vz),
      r: round2(me.rotY),
      c: me.cosmetics,
      l: me.level,
    };
    if (me.chat) message.m = me.chat;
    if (me.emote) message.e = me.emote;
    return message;
  }

  private broadcast(message: PeerMessage) {
    if (this.zoneReady) this.zoneChannel?.send({ type: 'broadcast', event: 'p', payload: message });
    this.tabZone?.postMessage(message);
  }

  // Leaves the zone (saying goodbye) and joins the next public zone's channel, if any
  private enter(zone: WorldId | null, me: LocalPlayer) {
    if (this.zone) {
      this.broadcast({ ...this.message(me, 0, 0), w: this.zone, bye: true });
      if (this.zoneChannel) this.opts.client?.removeChannel(this.zoneChannel);
    }
    this.zone = zone;
    this.zoneChannel = null;
    this.zoneReady = false;
    this.last = null;
    this.prev = null;
    livePeers.clear();
    this.looks.clear();
    this.publishPeers();
    if (!zone || !this.opts.client) return;
    const channel = this.opts.client.channel(`${ZONE}:${zone}`, { config: { broadcast: { self: false } } });
    this.zoneChannel = channel;
    channel
      .on('broadcast', { event: 'p' }, ({ payload }) => this.receive(payload))
      .subscribe((status) => {
        if (this.zoneChannel !== channel) return;
        this.zoneReady = status === 'SUBSCRIBED';
        // Introduce the player as soon as the channel is joined
        if (this.zoneReady) this.last = null;
      });
  }

  private receive(raw: unknown) {
    const message = parsePeerMessage(raw);
    if (!message || message.u === this.opts.me().id || message.w !== this.zone) return;
    if (message.bye) {
      this.drop(message.u);
      return;
    }
    livePeers.set(message.u, {
      x: message.x,
      z: message.z,
      vx: message.vx,
      vz: message.vz,
      r: message.r,
      at: this.opts.now(),
    });
    const look = lookKey(message);
    if (this.looks.get(message.u)?.look === look) return;
    this.looks.set(message.u, {
      look,
      player: {
        uid: message.u,
        name: message.n,
        world: message.w,
        cosmetics: message.c,
        level: message.l,
        chatMsg: message.m,
        emote: message.e,
      },
    });
    this.publishPeers();
  }

  private drop(uid: string) {
    livePeers.delete(uid);
    if (this.looks.delete(uid)) this.publishPeers();
  }

  private publishPeers() {
    const peers: Record<string, RemotePlayer> = {};
    this.looks.forEach(({ player }, uid) => (peers[uid] = player));
    this.opts.onPeers(peers);
  }

  // Presence is sent again only when the name, zone or level changes
  private track(force: boolean) {
    if (!this.lobby || !this.lobbyReady) return;
    const me = this.opts.me();
    const key = presenceKey(me);
    if (!force && key === this.tracked) return;
    this.tracked = key;
    this.lobby.track({ n: me.name, w: me.world, l: me.level });
  }

  private syncPresence() {
    if (!this.lobby) return;
    const state = this.lobby.presenceState();
    const me = this.opts.me().id;
    const online: Record<string, OnlinePlayer> = {};
    Object.keys(state).forEach((uid) => {
      const entry = parseRosterEntry(state[uid]?.[0]);
      if (uid !== me && entry) online[uid] = { uid, name: entry.n, world: entry.w, level: entry.l };
    });
    this.presence = online;
    this.publishRoster();
  }

  private tabRoster(me: LocalPlayer, now: number) {
    if (!this.tabLobby) return;
    const key = presenceKey(me);
    if (key !== this.tabRosterKey || now - this.tabRosterAt >= TAB_ROSTER_MS) {
      this.tabRosterKey = key;
      this.tabRosterAt = now;
      this.tabLobby.postMessage({ t: 'roster', u: me.id, n: me.name, w: me.world, l: me.level });
    }
    let changed = false;
    this.tabs.forEach((tab, uid) => {
      if (now - tab.at <= TAB_ROSTER_TIMEOUT_MS) return;
      this.tabs.delete(uid);
      changed = true;
    });
    if (changed) this.publishRoster();
  }

  private receiveTabLobby(raw: unknown) {
    if (!raw || typeof raw !== 'object') return;
    const data = raw as { t?: unknown; u?: unknown; message?: unknown };
    if (data.t === 'chat') {
      this.receiveChat(data.message);
      return;
    }
    if (typeof data.u !== 'string' || data.u === this.opts.me().id) return;
    if (data.t === 'gone') {
      if (this.tabs.delete(data.u)) this.publishRoster();
      return;
    }
    const entry = data.t === 'roster' ? parseRosterEntry(raw) : null;
    if (!entry) return;
    this.tabs.set(data.u, {
      player: { uid: data.u, name: entry.n, world: entry.w, level: entry.l },
      at: this.opts.now(),
    });
    this.publishRoster();
  }

  private publishRoster() {
    const online: Record<string, OnlinePlayer> = { ...this.presence };
    this.tabs.forEach(({ player }, uid) => (online[uid] = player));
    const key = JSON.stringify(online);
    if (key === this.rosterPublished) return;
    this.rosterPublished = key;
    this.opts.onRoster(online);
  }

  private receiveChat(raw: unknown) {
    const message = parseChat(raw);
    if (message && message.uid !== this.opts.me().id) this.opts.onChat(message);
  }
}

// Connects the game to the other players while the page is open
export function useMultiplayerSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const client = isSupabaseConfigured && supabase ? (supabase as unknown as RealtimeClientLike) : null;
    const store = useGameStore.getState;
    store().setNetworkMode(client ? 'supabase' : 'local');

    const sync = new MultiplayerSync({
      client,
      openLocal: (name) =>
        'BroadcastChannel' in window ? (new BroadcastChannel(name) as unknown as LocalChannelLike) : null,
      me: () => {
        const s = store();
        return {
          id: s.playerId,
          name: s.playerName,
          world: s.currentWorld,
          x: s.playerPos.x,
          z: s.playerPos.z,
          rotY: s.playerPos.rotY,
          cosmetics: s.cosmetics,
          level: levelInfo(s.xp).level,
          chat: s.localChatMsg,
          emote: s.localEmote,
        };
      },
      now: () => performance.now(),
      onPeers: (peers) => store().setRemotePlayers(peers),
      onRoster: (online) => store().setOnlinePlayers(online),
      onChat: (message) => store().addChatMessage(message),
    });

    // The player's own chat goes out as soon as it is sent
    const unsubscribe = useGameStore.subscribe((s, prev) => {
      if (s.chatMessages === prev.chatMessages) return;
      const latest = s.chatMessages[s.chatMessages.length - 1];
      if (latest && latest.uid === s.playerId && !prev.chatMessages.includes(latest)) sync.sendChat(latest);
    });
    const timer = setInterval(() => sync.tick(), SAMPLE_MS);

    return () => {
      clearInterval(timer);
      unsubscribe();
      sync.dispose();
    };
  }, []);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/multiplayer.test.ts src/lib/netSync.test.ts`
Expected: PASS (11 + 17 tests). `npx tsc --noEmit -p .` báo lỗi ở `RemotePlayers.tsx` và `AuthModal.tsx` (dùng trường cũ) — sửa ở Task 3.

---

### Task 3: Vẽ người chơi khác và Sảnh

**Files:**
- Modify (viết lại): `src/components/canvas/RemotePlayers.tsx`
- Modify: `src/components/hud/modals/AuthModal.tsx:109` (selector) và `:168-187` (danh sách)

**Interfaces:**
- Consumes: `livePeers` (Task 2), `predict`, `MOVING_SPEED`, `MAX_EXTRAPOLATE_S` (Task 1), store `remotePlayers`, `onlinePlayers`, `setWorld`, `createMotion` (`./models/AvatarMesh`).

- [ ] **Step 1: `src/components/canvas/RemotePlayers.tsx`**

```tsx
'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { RemotePlayer } from '@/types/game';
import { livePeers } from '@/lib/multiplayer';
import { MAX_EXTRAPOLATE_S, MOVING_SPEED, predict } from '@/lib/netSync';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';

// Another player in this zone. Where they are comes from lib/multiplayer's livePeers, not from React: drawn where
// their last message puts them now (their walk carried on), eased there so a correction never jumps, facing where
// they walk, legs swinging. React re-renders this only when their look changes.
const RemotePlayerActor = memo(function RemotePlayerActor({ data }: { data: RemotePlayer }) {
  const groupRef = useRef<THREE.Group>(null);
  const motion = useRef(createMotion()).current;
  const placed = useRef(false);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const peer = livePeers.get(data.uid);
    if (!group || !peer) return;
    const dt = Math.min(delta, 0.1);
    const age = performance.now() - peer.at;
    const target = predict(peer, age);
    const walking = Math.hypot(peer.vx, peer.vz) > MOVING_SPEED && age < MAX_EXTRAPOLATE_S * 1000;
    const facing = walking ? Math.atan2(peer.vx, peer.vz) : peer.r;
    if (!placed.current) {
      placed.current = true;
      group.position.set(target.x, 0.08, target.z);
      group.rotation.y = facing;
    }
    const ease = 1 - Math.exp(-dt * 12);
    group.position.x += (target.x - group.position.x) * ease;
    group.position.z += (target.z - group.position.z) * ease;
    // Turn the short way round
    const turn = facing - group.rotation.y;
    group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * ease;
    motion.moving = walking;
    if (walking) motion.walkTime += dt * 12;
    group.position.y = walking ? 0.08 + Math.abs(Math.sin(motion.walkTime)) * 0.08 : 0.08;
  });

  return (
    <group ref={groupRef}>
      <AvatarMesh cosmetics={data.cosmetics} motion={motion} />
      <PlayerTag name={data.name} chatText={data.chatMsg} level={data.level} />
    </group>
  );
});

// The other players in this zone (lib/multiplayer keeps only them: nobody shows on the player's own farm)
export function RemotePlayers() {
  const remotePlayers = useGameStore((s) => s.remotePlayers);

  return (
    <group>
      {Object.values(remotePlayers).map((player) => (
        <RemotePlayerActor key={player.uid} data={player} />
      ))}
    </group>
  );
}
```

- [ ] **Step 2: `src/components/hud/modals/AuthModal.tsx`** — selector `remotePlayers` → `onlinePlayers`, và danh sách:

```tsx
  const onlinePlayers = useGameStore((s) => s.onlinePlayers);
```

```tsx
        {Object.values(onlinePlayers).map((p) => {
          const peerZone = WORLDS[p.world] ?? WORLDS.farm;
          return (
            <div
              key={p.uid}
              className="flex items-center justify-between rounded-xl border border-amber-700/20 bg-white/80 p-2.5"
            >
              <div>
                <div className="text-sm font-black text-amber-950">
                  🟢 {p.name} <span className="text-[10px] font-bold text-amber-700">Lv{p.level}</span>
                </div>
                <div className="break-all font-mono text-[10px] text-slate-600">ID: {p.uid}</div>
              </div>
              {p.world === 'farm' ? (
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                  🏡 Ở nông trại
                </span>
              ) : (
                <button
                  onClick={() => setWorld(peerZone.id)}
                  className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-black text-white"
                >
                  {peerZone.icon} Ghé thăm
                </button>
              )}
            </div>
          );
        })}
```

- [ ] **Step 3: Typecheck and full test suite**

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: tsc không lỗi; toàn bộ test PASS (493 cũ + 28 mới).

---

### Task 4: Kiểm chứng trên bản production (3 tab)

**Files:**
- Harness (chỉ bản sao tạm, không vào repo): `scratchpad/perf/sync.sh` thêm `window.__livePeers = livePeers` vào cuối
  `src/lib/multiplayer.ts` của bản sao; script `scratchpad/perf/mp-v4.mjs`.

- [ ] **Step 1: Build bản sao tạm** (không chạy `next build` trong repo khi dev server cổng 3000 đang chạy)

Run: `scratchpad/perf/sync.sh && cd scratchpad/app && npx next build && node node_modules/next/dist/bin/next start -p 3123`
Expected: build thành công, server ở cổng 3123.

- [ ] **Step 2: Chạy script 3 tab** — mỗi tab đặt `playerId`/`playerName` riêng qua `window.__game`, đếm tin
`postMessage` trên BroadcastChannel `sunny_zone_v4`, rồi kiểm:
  1. cả 3 ở `park`: mỗi tab có đúng 2 người trong `remotePlayers`, 3 nhãn tên;
  2. tab 3 về `farm`: tab 1 còn 1 người trong `remotePlayers`, `onlinePlayers` vẫn có tab 3 với `world: 'farm'`;
  3. chat từ tab 1 (đang ở park) tới tab 3 (ở farm);
  4. đứng yên 10 s: ≤ 2 tin/tab; tab 2 đi thẳng 4 s (giữ phím W): 4–8 tin;
  5. trong lúc tab 2 đi, vị trí dự đoán `predict(__livePeers.get(tab2))` ở tab 1 lệch < 1,5 đơn vị so với `playerPos` thật của tab 2;
  6. không có lỗi trang.
Expected: cả 6 điểm đạt.

- [ ] **Step 3: Đo lại tải đám đông** — `node scratchpad/perf/mp-load.mjs http://localhost:3123 0,24,49 2` (script cũ dùng
`setRemotePlayers` với vị trí; với bản mới cần ghi vị trí vào `__livePeers` thay vì kèm trong `remotePlayers`).
Expected: fps với 49 người không thấp hơn bản cũ (58 fps).

- [ ] **Step 4: Báo cáo và hỏi commit** — tóm tắt kết quả, hỏi người dùng có commit thẳng lên `main` không.
