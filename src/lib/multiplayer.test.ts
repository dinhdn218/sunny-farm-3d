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
  u: 'other',
  n: 'Bạn',
  w: 'park',
  x: 1,
  z: 1,
  vx: 0,
  vz: 0,
  r: 0,
  c: LOOK,
  l: 2,
  ...overrides,
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
