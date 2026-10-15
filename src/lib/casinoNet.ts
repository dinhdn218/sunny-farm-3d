'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useCasinoStore } from '@/store/useCasinoStore';
import { isSupabaseConfigured, supabase } from './supabase';
import {
  CASINO_TABLES,
  FORFEIT_UNITS,
  SEATS,
  SeatInfo,
  TableId,
  TableState,
  act,
  createTable,
  humans,
  minGoldFor,
  removePlayer,
  seatOf,
  seatPlayer,
  tick,
} from './casino';
import { Move } from './tienlen';

// Syncs the casino's card tables between players: Supabase Realtime when configured, plus
// other tabs via BroadcastChannel. The host of a table runs it (lib/casino) and shares every
// change; everyone else sends their requests to the host.

type Request = { kind: 'sit'; seat: SeatInfo } | { kind: 'leave' } | { kind: 'move'; move: Move };
type NetMessage =
  | { t: 'state'; state: TableState }
  | { t: 'req'; table: TableId; uid: string; req: Request }
  | { t: 'hello' };

// A table whose host is silent this long is taken over by the next player sitting at it
const HOST_TIMEOUT_MS = 7000;
const HEARTBEAT_MS = 2000;
// Nobody wins or loses more than this many stakes in one game; anything bigger is a bad message
const MAX_UNITS = 30;

let send: ((msg: NetMessage) => void) | null = null;
const lastBeat: Partial<Record<TableId, number>> = {};

const myId = () => useGameStore.getState().playerId;
const mySeat = (): SeatInfo => ({ kind: 'human', uid: myId(), name: useGameStore.getState().playerName });
const queued = (t: TableState, uid: string) => t.waiting.some((w) => w.uid === uid);

// Each game is paid once per player, even if its result is seen again after a reload
function firstPayment(gameId: string) {
  const key = `sunny-casino-paid-${myId()}`;
  try {
    const paid: string[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (paid.includes(gameId)) return false;
    localStorage.setItem(key, JSON.stringify([...paid.slice(-49), gameId]));
  } catch {
    // Storage blocked: pay anyway
  }
  return true;
}

function payMine(t: TableState) {
  const result = t.result;
  if (t.phase !== 'result' || !result) return;
  const seat = seatOf(t, myId());
  const gold = result.gold[seat];
  if (seat < 0 || typeof gold !== 'number' || !firstPayment(result.gameId)) return;
  const cap = CASINO_TABLES[t.id].stake * MAX_UNITS;
  useGameStore.getState().casinoPayout(Math.max(-cap, Math.min(cap, gold)), result.ranking.indexOf(seat));
}

// A higher revision wins; at the same revision the lower host id (two players opened the table at once)
const isNewer = (incoming: TableState, current?: TableState) =>
  !current || incoming.rev > current.rev || (incoming.rev === current.rev && incoming.host < current.host);

function keep(state: TableState) {
  const store = useCasinoStore.getState();
  if (!state.host) {
    store.dropTable(state.id);
    return;
  }
  store.setTable(state);
  payMine(state);
}

// The host shares every change to its table
function publish(state: TableState) {
  keep(state);
  lastBeat[state.id] = Date.now();
  send?.({ t: 'state', state });
}

function onState(state: TableState) {
  if (!state || !CASINO_TABLES[state.id] || !Array.isArray(state.seats)) return;
  const current = useCasinoStore.getState().tables[state.id];
  if (!isNewer(state, current)) {
    if (current && state.host === current.host) useCasinoStore.getState().heardFrom(state.id);
    return;
  }
  const me = myId();
  const wasSitting = !!current && current.host === me && (seatOf(current, me) >= 0 || queued(current, me));
  keep(state);
  // Someone else opened the same table at the same moment: follow theirs and sit down there
  if (wasSitting && state.host !== me && seatOf(state, me) < 0 && !queued(state, me)) {
    send?.({ t: 'req', table: state.id, uid: me, req: { kind: 'sit', seat: mySeat() } });
  }
}

function onRequest(table: TableId, uid: string, req: Request) {
  const t = useCasinoStore.getState().tables[table];
  if (!t || t.host !== myId() || !req) return;
  const now = Date.now();
  const next =
    req.kind === 'sit'
      ? seatPlayer(t, { kind: 'human', uid, name: String(req.seat?.name ?? 'Người chơi').slice(0, 24) }, now)
      : req.kind === 'leave'
      ? removePlayer(t, uid)
      : act(t, uid, req.move, now, Math.random);
  if (typeof next !== 'string' && next !== t) publish(next);
}

// Sit down at a table, opening it if nobody is there. An error to show, or null.
export function sitAt(table: TableId): string | null {
  const { stake, name } = CASINO_TABLES[table];
  if (useGameStore.getState().gold < minGoldFor(stake)) {
    return `Cần ít nhất ${minGoldFor(stake)}🪙 để ngồi ${name}`;
  }
  const t = useCasinoStore.getState().tables[table];
  const now = Date.now();
  if (!t) {
    publish(createTable(table, mySeat(), now));
    return null;
  }
  if (t.host === myId()) {
    const next = seatPlayer(t, mySeat(), now);
    if (typeof next === 'string') return next;
    if (next !== t) publish(next);
    return null;
  }
  if (humans(t).length + t.waiting.length >= SEATS) return 'Bàn đã đủ người';
  send?.({ t: 'req', table, uid: myId(), req: { kind: 'sit', seat: mySeat() } });
  return null;
}

// Stand up (or leave the queue); walking out of a game costs a forfeit
export function leaveTable(table: TableId) {
  const t = useCasinoStore.getState().tables[table];
  const me = myId();
  if (!t || (seatOf(t, me) < 0 && !queued(t, me))) return;
  if (seatOf(t, me) >= 0 && t.phase === 'playing') {
    useGameStore.getState().casinoForfeit(CASINO_TABLES[table].stake * FORFEIT_UNITS);
  }
  if (t.host === me) publish(removePlayer(t, me));
  else send?.({ t: 'req', table, uid: me, req: { kind: 'leave' } });
}

// Play cards or pass. An error to show, or null.
export function playMove(table: TableId, move: Move): string | null {
  const t = useCasinoStore.getState().tables[table];
  if (!t) return 'Bàn đã đóng';
  if (t.host !== myId()) {
    send?.({ t: 'req', table, uid: myId(), req: { kind: 'move', move } });
    return null;
  }
  const next = act(t, myId(), move, Date.now(), Math.random);
  if (typeof next === 'string') return next;
  publish(next);
  return null;
}

// How close the player stands to open a table's window
const TABLE_REACH = 2.8;

// Walk up to a table, then open its window
export function goToTable(table: TableId) {
  const { x, z } = CASINO_TABLES[table];
  useGameStore.getState().walkTo({
    x,
    z,
    reach: TABLE_REACH,
    act: () => useCasinoStore.getState().setOpen(table),
  });
}

const leaveAll = () => {
  const { tables } = useCasinoStore.getState();
  (Object.keys(tables) as TableId[]).forEach(leaveTable);
};

// Connected while the player is in the casino
export function useCasinoSync() {
  const inCasino = useGameStore((s) => s.currentWorld === 'casino');

  useEffect(() => {
    if (!inCasino || typeof window === 'undefined') return;

    const receive = (msg: NetMessage) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'state') onState(msg.state);
      else if (msg.t === 'req') onRequest(msg.table, msg.uid, msg.req);
      else if (msg.t === 'hello') {
        // A newcomer: hosts share their tables
        Object.values(useCasinoStore.getState().tables).forEach((t) => {
          if (t && t.host === myId()) send?.({ t: 'state', state: t });
        });
      }
    };

    const sbChannel =
      isSupabaseConfigured && supabase
        ? supabase.channel('sunny_casino_v1', { config: { broadcast: { self: false } } })
        : null;
    const local = 'BroadcastChannel' in window ? new BroadcastChannel('sunny_casino_v1') : null;
    send = (msg) => {
      sbChannel?.send({ type: 'broadcast', event: 'casino', payload: msg });
      local?.postMessage(msg);
    };
    sbChannel
      ?.on('broadcast', { event: 'casino' }, ({ payload }) => receive(payload as NetMessage))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') send?.({ t: 'hello' });
      });
    if (local) local.onmessage = (e) => receive(e.data as NetMessage);
    send({ t: 'hello' });

    const loop = setInterval(() => {
      const now = Date.now();
      const me = myId();
      const { tables, heard } = useCasinoStore.getState();
      Object.values(tables).forEach((t) => {
        if (!t) return;
        if (t.host === me) {
          const next = tick(t, now, Math.random);
          if (next) publish(next);
          else if (now - (lastBeat[t.id] ?? 0) > HEARTBEAT_MS) {
            lastBeat[t.id] = now;
            send?.({ t: 'state', state: t });
          }
          return;
        }
        if (now - (heard[t.id] ?? now) < HOST_TIMEOUT_MS) return;
        // The host has gone quiet: the next player at the table takes over (a computer player
        // finishes the old host's hand); a table being only watched is forgotten
        const next = humans(t).filter((h) => h.uid !== t.host)[0];
        if (next?.uid === me) publish(removePlayer({ ...t, host: me }, t.host));
        else if (seatOf(t, me) < 0) useCasinoStore.getState().dropTable(t.id);
      });
    }, 250);

    window.addEventListener('beforeunload', leaveAll);
    return () => {
      window.removeEventListener('beforeunload', leaveAll);
      leaveAll();
      clearInterval(loop);
      send = null;
      local?.close();
      if (sbChannel && supabase) supabase.removeChannel(sbChannel);
      useCasinoStore.getState().reset();
    };
  }, [inCasino]);
}
