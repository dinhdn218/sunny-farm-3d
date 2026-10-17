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
