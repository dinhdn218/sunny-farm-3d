// Tiến Lên tables at the casino. One player at each table (the host) runs it: deals, applies
// moves, plays the computer players and times turns; lib/casinoNet syncs the state to everyone.
import { Move, Random, TienLenGame, applyMove, botMove, deal, newGame, settle } from './tienlen';

export type TableId = 'dong' | 'bac' | 'vang';

export interface TableConfig {
  id: TableId;
  name: string;
  stake: number;
  // Felt colour and where the table stands in the casino hall
  felt: string;
  x: number;
  z: number;
}

export const CASINO_TABLES: Record<TableId, TableConfig> = {
  dong: { id: 'dong', name: 'Bàn Đồng', stake: 10, felt: '#15803d', x: -8, z: -1 },
  bac: { id: 'bac', name: 'Bàn Bạc', stake: 50, felt: '#0f766e', x: 0, z: -6 },
  vang: { id: 'vang', name: 'Bàn Vàng', stake: 200, felt: '#7f1d1d', x: 8, z: -1 },
};
export const TABLE_LIST = Object.values(CASINO_TABLES);

export const SEATS = 4;
// Chairs round a table, counter-clockwise from the south: south, east, north, west
export const SEAT_OFFSETS: [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
export const CHAIR_DISTANCE = 1.75;

// Where a player sits at a table and which way they face (towards its middle)
export function seatSpot(table: TableId, seat: number) {
  const { x, z } = CASINO_TABLES[table];
  const [dx, dz] = SEAT_OFFSETS[seat];
  return { x: x + dx * CHAIR_DISTANCE, z: z + dz * CHAIR_DISTANCE, rotY: Math.atan2(-dx, -dz) };
}
// Gold needed to sit down, enough to cover a very bad game
export const minGoldFor = (stake: number) => stake * 10;
// Leaving in the middle of a game costs this many stakes (a computer player finishes the hand)
export const FORFEIT_UNITS = 4;

export const START_DELAY_MS = 5000;
export const TURN_MS = 20000;
export const RESULT_MS = 7000;
const BOT_THINK_MS: [number, number] = [800, 1600];

const BOT_NAMES = ['Chú Ba Đờn', 'Cô Tư Mập', 'Anh Năm Lửa', 'Bé Út Rồng'];

export interface SeatInfo {
  kind: 'human' | 'bot';
  uid: string;
  name: string;
}

export interface TableResult {
  gameId: string;
  // Gold won (+) or lost (−) at each seat
  gold: number[];
  // Seats from first to last
  ranking: number[];
  notes: string[][];
  instant: string | null;
}

export interface TableState {
  id: TableId;
  // Grows with every change; everyone keeps the newest
  rev: number;
  // The player running the table ('' once everyone has left)
  host: string;
  seats: (SeatInfo | null)[];
  // Players who came during a game and sit down for the next one
  waiting: SeatInfo[];
  phase: 'waiting' | 'playing' | 'result';
  // Game positions are the seat numbers: computer players fill the empty seats
  game: TienLenGame | null;
  gameId: string;
  // waiting / result: when the next game is dealt; playing: when the turn runs out
  deadline: number;
  // playing: when the computer player to move acts
  botAt: number;
  // Seat that leads the next game; null for the table's first game (3♠ starts)
  lastWinner: number | null;
  result: TableResult | null;
}

const bump = (t: TableState): TableState => ({ ...t, rev: t.rev + 1 });
const think = (random: Random) => BOT_THINK_MS[0] + random() * (BOT_THINK_MS[1] - BOT_THINK_MS[0]);

export const botSeat = (table: TableId, seat: number): SeatInfo => ({
  kind: 'bot',
  uid: `bot_${table}_${seat}`,
  name: `🤖 ${BOT_NAMES[seat]}`,
});

export const humans = (t: TableState) => t.seats.filter((s): s is SeatInfo => s?.kind === 'human');
export const seatOf = (t: TableState, uid: string) => t.seats.findIndex((s) => s?.uid === uid && s.kind === 'human');

export function createTable(id: TableId, host: SeatInfo, now: number): TableState {
  return {
    id,
    rev: 1,
    host: host.uid,
    seats: [host, null, null, null],
    waiting: [],
    phase: 'waiting',
    game: null,
    gameId: '',
    deadline: now + START_DELAY_MS,
    botAt: 0,
    lastWinner: null,
    result: null,
  };
}

// A player sits down: in a free or computer seat, or for the next game if one is being played
export function seatPlayer(t: TableState, player: SeatInfo, now: number): TableState | string {
  if (seatOf(t, player.uid) >= 0 || t.waiting.some((w) => w.uid === player.uid)) return t;
  if (humans(t).length + t.waiting.length >= SEATS) return 'Bàn đã đủ người';
  if (t.phase === 'playing') return bump({ ...t, waiting: [...t.waiting, player] });
  const free = t.seats.findIndex((s) => !s || s.kind === 'bot');
  const seats = [...t.seats];
  seats[free] = player;
  // Give the newcomer a moment before the deal
  const deadline = t.phase === 'waiting' ? Math.max(t.deadline, now + 2500) : t.deadline;
  return bump({ ...t, seats, deadline });
}

// A player leaves: a computer player takes over their hand if a game is on, and the table
// passes to the next player if they were running it
export function removePlayer(t: TableState, uid: string): TableState {
  const waiting = t.waiting.filter((w) => w.uid !== uid);
  const seat = seatOf(t, uid);
  if (seat < 0 && waiting.length === t.waiting.length) return t;
  const seats = [...t.seats];
  if (seat >= 0) seats[seat] = t.phase === 'playing' ? botSeat(t.id, seat) : null;
  const next = { ...t, seats, waiting };
  const host = t.host === uid ? humans(next)[0]?.uid ?? waiting[0]?.uid ?? '' : t.host;
  return bump({ ...next, host });
}

export function startGame(t: TableState, now: number, random: Random): TableState {
  const seats = [...t.seats];
  const waiting = [...t.waiting];
  for (let i = 0; i < SEATS && waiting.length > 0; i++) {
    if (!seats[i] || seats[i]?.kind === 'bot') seats[i] = waiting.shift() ?? null;
  }
  for (let i = 0; i < SEATS; i++) if (!seats[i]) seats[i] = botSeat(t.id, i);
  const game = newGame(deal(SEATS, random), t.lastWinner);
  const started: TableState = {
    ...t,
    seats,
    waiting,
    phase: 'playing',
    game,
    gameId: `${t.id}_${now}_${Math.floor(random() * 1e6)}`,
    result: null,
  };
  return afterMove(started, game, now, random);
}

// After every move: the next turn's timers, or the payouts when the game is over
function afterMove(t: TableState, game: TienLenGame, now: number, random: Random): TableState {
  if (!game.over) return bump({ ...t, game, deadline: now + TURN_MS, botAt: now + think(random) });
  const { ranking, units, notes } = settle(game);
  const stake = CASINO_TABLES[t.id].stake;
  return bump({
    ...t,
    game,
    phase: 'result',
    deadline: now + RESULT_MS,
    lastWinner: ranking[0],
    result: { gameId: t.gameId, gold: units.map((u) => u * stake), ranking, notes, instant: game.instant?.reason ?? null },
  });
}

// A seated player's move, checked by the host
export function act(t: TableState, uid: string, move: Move, now: number, random: Random): TableState | string {
  if (t.phase !== 'playing' || !t.game) return 'Ván chưa bắt đầu';
  const seat = seatOf(t, uid);
  if (seat < 0) return 'Bạn không ngồi ở bàn này';
  const next = applyMove(t.game, seat, move);
  if (typeof next === 'string') return next;
  return afterMove(t, next, now, random);
}

// Runs the table on the host: deals when it is time, plays the computer players and moves for
// players who let their turn run out. Null when nothing changed.
export function tick(t: TableState, now: number, random: Random): TableState | null {
  if (!t.host) return null;
  if (t.phase !== 'playing' || !t.game) {
    if (humans(t).length + t.waiting.length === 0 || now < t.deadline) return null;
    return startGame(t, now, random);
  }
  const game = t.game;
  const seat = t.seats[game.turn];
  const due = seat?.kind === 'human' ? now >= t.deadline : now >= t.botAt;
  if (!due) return null;
  // Out of time: pass, or lead the weakest cards when the round is theirs
  const move: Move = seat?.kind === 'human' && game.lead ? { kind: 'pass' } : botMove(game, game.turn, random);
  const next = applyMove(game, game.turn, move);
  if (typeof next === 'string') return null;
  return afterMove(t, next, now, random);
}
