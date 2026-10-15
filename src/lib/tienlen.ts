// Tiến Lên Miền Nam for 2–4 players: rules, game flow, payouts and a computer player.
// Pure functions only: the casino table (lib/casino) runs the game and syncs it between players.

// A card is a number 0–51, rank * 4 + suit, so comparing two cards is comparing their numbers.
// Ranks 0–12: 3 4 5 6 7 8 9 10 J Q K A 2. Suits 0–3: ♠ bích < ♣ chuồn < ♦ rô < ♥ cơ.
export type Card = number;

export const RANK_LABELS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const SUIT_LABELS = ['♠', '♣', '♦', '♥'];
export const TWO = 12;
export const ACE = 11;
export const THREE_OF_SPADES: Card = 0;
export const HAND_SIZE = 13;

export const rankOf = (c: Card) => Math.floor(c / 4);
export const suitOf = (c: Card) => c % 4;
export const isRed = (c: Card) => suitOf(c) >= 2;
export const cardLabel = (c: Card) => `${RANK_LABELS[rankOf(c)]}${SUIT_LABELS[suitOf(c)]}`;
export const sortCards = (cards: Card[]) => [...cards].sort((a, b) => a - b);

// ---------------------------------------------------------------- combinations

// rác (single), đôi, sám (three of a kind), tứ quý, sảnh (straight), đôi thông (consecutive pairs)
export type ComboType = 'single' | 'pair' | 'triple' | 'quad' | 'straight' | 'pairs';

export interface Combo {
  type: ComboType;
  // Ascending
  cards: Card[];
  // Cards in a straight, pairs in đôi thông, otherwise the card count
  size: number;
  // The strongest card: same-shape plays are decided by it
  top: Card;
}

export const COMBO_NAMES: Record<ComboType, string> = {
  single: 'Rác',
  pair: 'Đôi',
  triple: 'Sám',
  quad: 'Tứ Quý',
  straight: 'Sảnh',
  pairs: 'Đôi Thông',
};

export function comboName(combo: Combo) {
  if (combo.type === 'straight') return `Sảnh ${combo.size} lá`;
  if (combo.type === 'pairs') return `${combo.size} Đôi Thông`;
  if (combo.type === 'single' && rankOf(combo.top) === TWO) return 'Heo';
  if (combo.type === 'pair' && rankOf(combo.top) === TWO) return 'Đôi Heo';
  return COMBO_NAMES[combo.type];
}

// The combination these cards make, or null if they don't make one
export function analyze(cards: Card[]): Combo | null {
  if (cards.length === 0) return null;
  const sorted = sortCards(cards);
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1]) return null;
  const n = sorted.length;
  const top = sorted[n - 1];
  const ranks = sorted.map(rankOf);

  if (ranks.every((r) => r === ranks[0])) {
    const type = (['single', 'pair', 'triple', 'quad'] as const)[n - 1];
    return type ? { type, cards: sorted, size: n, top } : null;
  }
  // No 2 (heo) in a straight or in đôi thông
  if (ranks[n - 1] === TWO) return null;
  if (n >= 3 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1)) {
    return { type: 'straight', cards: sorted, size: n, top };
  }
  if (n >= 6 && n % 2 === 0) {
    for (let i = 0; i < n; i += 2) {
      if (ranks[i] !== ranks[i + 1]) return null;
      if (i > 0 && ranks[i] !== ranks[i - 2] + 1) return null;
    }
    return { type: 'pairs', cards: sorted, size: n / 2, top };
  }
  return null;
}

const isTwos = (c: Combo) => rankOf(c.top) === TWO && (c.type === 'single' || c.type === 'pair');
// Hàng: what can chop (chặt) a 2 — three or more đôi thông, and tứ quý
export const isBomb = (c: Combo) => c.type === 'quad' || (c.type === 'pairs' && c.size >= 3);

// Can `play` go on top of `current`? Same shape and a higher top card, or a chop:
// 3 đôi thông chops a single 2; tứ quý chops a 2, a pair of 2s and 3 đôi thông;
// 4 đôi thông chops all of those and tứ quý.
export function canBeat(play: Combo, current: Combo): boolean {
  if (play.type === current.type && play.size === current.size) return play.top > current.top;
  if (current.type === 'single' && rankOf(current.top) === TWO) {
    return play.type === 'quad' || (play.type === 'pairs' && play.size >= 3);
  }
  if (current.type === 'pair' && rankOf(current.top) === TWO) {
    return play.type === 'quad' || (play.type === 'pairs' && play.size >= 4);
  }
  if (current.type === 'pairs' && current.size >= 3) {
    return (play.type === 'quad' && current.size === 3) || (play.type === 'pairs' && play.size > current.size);
  }
  if (current.type === 'quad') return play.type === 'pairs' && play.size >= 4;
  return false;
}

// A chop makes the chopped player pay: black 2 one stake, red 2 two; 3 đôi thông 3, tứ quý 4, 4 đôi thông 5
export function chopValue(chopped: Combo): number {
  if (isTwos(chopped)) return chopped.cards.reduce((sum, c) => sum + (isRed(c) ? 2 : 1), 0);
  if (chopped.type === 'quad') return 4;
  if (chopped.type === 'pairs') return chopped.size * 2 - 3;
  return 0;
}

const isChop = (play: Combo, current: Combo) => isBomb(play) && (isTwos(current) || isBomb(current));

// Penalty for 2s left in hand when the game ends (thối heo)
export const twosPenalty = (hand: Card[]) =>
  hand.filter((c) => rankOf(c) === TWO).reduce((sum, c) => sum + (isRed(c) ? 2 : 1), 0);

// ---------------------------------------------------------------- dealing

export type Random = () => number;

// Deterministic generator, so a table's deal can be replayed in tests
export function seededRandom(seed: number): Random {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function deal(players: number, random: Random): Card[][] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return Array.from({ length: players }, (_, p) => sortCards(deck.slice(p * HAND_SIZE, (p + 1) * HAND_SIZE)));
}

const rankCounts = (hand: Card[]) => {
  const counts = new Array(13).fill(0);
  hand.forEach((c) => counts[rankOf(c)]++);
  return counts as number[];
};

// Tới trắng: a hand that wins on the deal
export function instantWin(hand: Card[]): string | null {
  const counts = rankCounts(hand);
  if (counts.slice(0, ACE + 1).every((n) => n > 0)) return 'Sảnh Rồng';
  if (counts[TWO] === 4) return 'Tứ Quý Heo';
  let run = 0;
  for (let r = 0; r <= ACE; r++) {
    run = counts[r] >= 2 ? run + 1 : 0;
    if (run >= 5) return '5 Đôi Thông';
  }
  if (counts.reduce((sum, n) => sum + Math.floor(n / 2), 0) >= 6) return '6 Đôi';
  return null;
}

// ---------------------------------------------------------------- the game

export interface Transfer {
  from: number;
  to: number;
  units: number;
  why: string;
}

export interface TienLenGame {
  players: number;
  hands: Card[][];
  turn: number;
  // The play to beat in this round (vòng), and who made it
  lead: { combo: Combo; seat: number } | null;
  // Passed this round: out until the next round starts
  passed: boolean[];
  // Seats in the order they emptied their hands
  finished: number[];
  // Seats that had played no card when the first player went out (cóng)
  frozen: number[];
  playedAny: boolean[];
  // The first play of a session must include 3♠
  mustInclude: Card | null;
  // Chops paid at the end, in stake units
  transfers: Transfer[];
  // What just happened, for the table to show
  last: { seat: number; kind: 'play' | 'pass' | 'chop' | 'win'; combo?: Combo } | null;
  over: boolean;
  instant: { seat: number; reason: string } | null;
}

export type Move = { kind: 'play'; cards: Card[] } | { kind: 'pass' };

// `leader` starts (the last game's winner); in a session's first game the holder of 3♠ starts and must play it
export function newGame(hands: Card[][], leader: number | null): TienLenGame {
  const players = hands.length;
  const holder = hands.findIndex((h) => h.includes(THREE_OF_SPADES));
  // With fewer than 4 players 3♠ may be undealt: the lowest card starts instead
  const lowest = hands
    .map((h, seat) => ({ seat, card: Math.min(...h) }))
    .sort((a, b) => a.card - b.card)[0];
  const first = leader ?? (holder >= 0 ? holder : lowest.seat);
  const mustInclude = leader === null ? (holder >= 0 ? THREE_OF_SPADES : lowest.card) : null;

  const game: TienLenGame = {
    players,
    hands: hands.map(sortCards),
    turn: first,
    lead: null,
    passed: new Array(players).fill(false),
    finished: [],
    frozen: [],
    playedAny: new Array(players).fill(false),
    mustInclude,
    transfers: [],
    last: null,
    over: false,
    instant: null,
  };

  // Tới trắng: the best instant hand wins at once (Sảnh Rồng > Tứ Quý Heo > 5 Đôi Thông > 6 Đôi)
  const order = ['Sảnh Rồng', 'Tứ Quý Heo', '5 Đôi Thông', '6 Đôi'];
  const instant = hands
    .map((h, seat) => ({ seat, reason: instantWin(h) }))
    .filter((w): w is { seat: number; reason: string } => w.reason !== null)
    .sort((a, b) => order.indexOf(a.reason) - order.indexOf(b.reason))[0];
  if (instant) {
    return { ...game, over: true, instant, finished: [instant.seat], last: { seat: instant.seat, kind: 'win' } };
  }
  return game;
}

export const stillPlaying = (game: TienLenGame, seat: number) =>
  !game.finished.includes(seat) && !game.frozen.includes(seat);

// Next seat after `from` (going round the table) that passes the test
function nextSeat(game: TienLenGame, from: number, ok: (seat: number) => boolean) {
  for (let i = 1; i <= game.players; i++) {
    const seat = (from + i) % game.players;
    if (ok(seat)) return seat;
  }
  return null;
}

// Hand the turn on after `actor` moved: to the next player still answering this round,
// or a new round for the round's winner (or the player after them if they went out)
function advance(game: TienLenGame, actor: number): TienLenGame {
  const owner = game.lead?.seat ?? actor;
  const answering = (seat: number) => stillPlaying(game, seat) && !game.passed[seat] && seat !== owner;
  const next = nextSeat(game, actor, answering);
  if (next !== null) return { ...game, turn: next };
  const leader = stillPlaying(game, owner) ? owner : nextSeat(game, owner, (s) => stillPlaying(game, s));
  return {
    ...game,
    lead: null,
    passed: new Array(game.players).fill(false),
    turn: leader ?? owner,
  };
}

function finishIfDone(game: TienLenGame): TienLenGame {
  const left = Array.from({ length: game.players }, (_, s) => s).filter((s) => stillPlaying(game, s));
  if (left.length > 1) return game;
  return { ...game, over: true, finished: [...game.finished, ...left] };
}

export function applyMove(game: TienLenGame, seat: number, move: Move): TienLenGame | string {
  if (game.over) return 'Ván đã kết thúc';
  if (seat !== game.turn) return 'Chưa đến lượt';

  if (move.kind === 'pass') {
    if (!game.lead) return 'Bạn đang được đánh trước, không thể bỏ lượt';
    const passed = [...game.passed];
    passed[seat] = true;
    return advance({ ...game, passed, last: { seat, kind: 'pass' } }, seat);
  }

  const hand = game.hands[seat];
  if (!move.cards.every((c) => hand.includes(c))) return 'Bài không có trên tay';
  const combo = analyze(move.cards);
  if (!combo) return 'Bộ bài không hợp lệ';
  if (game.mustInclude !== null && !combo.cards.includes(game.mustInclude)) {
    return `Lượt đầu phải đánh kèm ${cardLabel(game.mustInclude)}`;
  }
  if (game.lead && !canBeat(combo, game.lead.combo)) return 'Bài không chặn được bài trên bàn';

  const chopped = game.lead && isChop(combo, game.lead.combo) ? game.lead : null;
  const transfers = chopped
    ? [...game.transfers, { from: chopped.seat, to: seat, units: chopValue(chopped.combo), why: `Chặt ${comboName(chopped.combo)}` }]
    : game.transfers;
  const hands = game.hands.map((h, s) => (s === seat ? h.filter((c) => !combo.cards.includes(c)) : h));
  const playedAny = game.playedAny.map((p, s) => p || s === seat);
  let next: TienLenGame = {
    ...game,
    hands,
    playedAny,
    transfers,
    mustInclude: null,
    lead: { combo, seat },
    last: { seat, kind: chopped ? 'chop' : 'play', combo },
  };

  if (hands[seat].length === 0) {
    const firstOut = next.finished.length === 0;
    next = { ...next, finished: [...next.finished, seat] };
    // Whoever hasn't played a single card when the first player goes out is frozen (cóng)
    if (firstOut) {
      const frozen = playedAny.map((p, s) => (!p ? s : -1)).filter((s) => s >= 0);
      next = { ...next, frozen };
    }
    next = finishIfDone(next);
    if (next.over) return next;
  }
  return advance(next, seat);
}

// ---------------------------------------------------------------- payouts

export interface Settlement {
  // Seats from first (về nhất) to last (về bét)
  ranking: number[];
  // Stake units won (+) or lost (−) by each seat; they add up to 0
  units: number[];
  notes: string[][];
}

// A frozen player (cóng) pays the winner this on top of their placement
export const COLD_PENALTY = 2;

// Placement pays the most for first and costs the most for last
const PLACE_UNITS: Record<number, number[]> = { 2: [1, -1], 3: [1, 0, -1], 4: [2, 1, -1, -2] };

export function settle(game: TienLenGame): Settlement {
  const n = game.players;
  const units = new Array(n).fill(0);
  const notes: string[][] = Array.from({ length: n }, () => []);
  const pay = (from: number, to: number, amount: number, why: string) => {
    if (amount <= 0 || from === to) return;
    units[from] -= amount;
    units[to] += amount;
    notes[from].push(`${why} −${amount}`);
    notes[to].push(`${why} +${amount}`);
  };

  if (game.instant) {
    const { seat, reason } = game.instant;
    const ranking = [seat, ...Array.from({ length: n }, (_, s) => s).filter((s) => s !== seat)];
    ranking.slice(1).forEach((s) => pay(s, seat, 2, `Tới trắng ${reason}`));
    return { ranking, units, notes };
  }

  // Frozen players come last, after whoever was still holding cards at the end
  const ranking = [...game.finished.filter((s) => !game.frozen.includes(s)), ...game.frozen];
  const winner = ranking[0];
  const places = PLACE_UNITS[n];
  ranking.forEach((seat, place) => {
    units[seat] += places[place];
    notes[seat].push(`${['Về nhất', 'Về nhì', 'Về ba', 'Về bét'][place === n - 1 ? 3 : place]} ${places[place] >= 0 ? '+' : '−'}${Math.abs(places[place])}`);
  });
  game.frozen.forEach((seat) => pay(seat, winner, COLD_PENALTY, 'Cóng'));
  // The last player and frozen players pay for the 2s they are left holding
  const losers = new Set([ranking[n - 1], ...game.frozen]);
  losers.forEach((seat) => pay(seat, winner, twosPenalty(game.hands[seat]), 'Thối heo'));
  game.transfers.forEach((t) => pay(t.from, t.to, t.units, t.why));
  return { ranking, units, notes };
}

// ---------------------------------------------------------------- computer player

// Every combination in a hand worth considering. Straights and đôi thông use the lowest
// suits below their top rank, with every choice of top card.
export function combosIn(hand: Card[]): Combo[] {
  const byRank: Card[][] = Array.from({ length: 13 }, () => []);
  sortCards(hand).forEach((c) => byRank[rankOf(c)].push(c));
  const out: Combo[] = [];
  const add = (cards: Card[]) => {
    const combo = analyze(cards);
    if (combo) out.push(combo);
  };

  byRank.forEach((cards) => {
    cards.forEach((c) => add([c]));
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        add([cards[i], cards[j]]);
        for (let k = j + 1; k < cards.length; k++) add([cards[i], cards[j], cards[k]]);
      }
    }
    if (cards.length === 4) add(cards);
  });

  for (let start = 0; start <= ACE - 2; start++) {
    for (let end = start; end <= ACE && byRank[end].length > 0; end++) {
      if (end - start < 2) continue;
      const base = Array.from({ length: end - start }, (_, i) => byRank[start + i][0]);
      byRank[end].forEach((topCard) => add([...base, topCard]));
    }
    for (let end = start; end <= ACE && byRank[end].length >= 2; end++) {
      if (end - start < 2) continue;
      const base = Array.from({ length: end - start }, (_, i) => byRank[start + i].slice(0, 2)).flat();
      const tops = byRank[end];
      for (let i = 0; i < tops.length; i++) {
        for (let j = i + 1; j < tops.length; j++) add([...base, tops[i], tops[j]]);
      }
    }
  }
  return out;
}

// Splits a hand into the plays it would naturally be shed in: bombs first, then the
// longest straights, then sám, đôi and rác. Fewer groups means fewer turns to go out.
export function planHand(hand: Card[]): Combo[] {
  let left = sortCards(hand);
  const groups: Combo[] = [];
  const take = (combo: Combo) => {
    groups.push(combo);
    left = left.filter((c) => !combo.cards.includes(c));
  };
  const best = (pick: (c: Combo) => boolean, score: (c: Combo) => number) =>
    combosIn(left)
      .filter(pick)
      .sort((a, b) => score(b) - score(a))[0];

  for (let combo = best(isBomb, (c) => c.cards.length); combo; combo = best(isBomb, (c) => c.cards.length)) take(combo);
  const longest = (c: Combo) => c.size * 100 - c.top;
  for (let combo = best((c) => c.type === 'straight', longest); combo; combo = best((c) => c.type === 'straight', longest)) {
    take(combo);
  }
  for (const type of ['triple', 'pair', 'single'] as const) {
    for (let combo = best((c) => c.type === type, (c) => -c.top); combo; combo = best((c) => c.type === type, (c) => -c.top)) {
      take(combo);
    }
  }
  return groups;
}

// What a computer player does on its turn. It sheds its weakest planned groups first, keeps
// 2s and bombs for later unless someone is about to go out, and chops 2s whenever it can.
export function botMove(game: TienLenGame, seat: number, random: Random = Math.random): Move {
  const hand = game.hands[seat];
  const plan = planHand(hand);
  const opponents = Array.from({ length: game.players }, (_, s) => s).filter((s) => s !== seat && stillPlaying(game, s));
  const danger = Math.min(...opponents.map((s) => game.hands[s].length));
  const groupOf = (c: Card) => plan.findIndex((g) => g.cards.includes(c));
  const usesTwos = (combo: Combo) => combo.cards.filter((c) => rankOf(c) === TWO).length;

  // Cost of a play: how high it is, how many planned groups it breaks, and the 2s and bombs it spends
  const cost = (combo: Combo) => {
    const groups = new Set(combo.cards.map(groupOf));
    const broken = Array.from(groups).filter((g) => plan[g] && plan[g].cards.length !== combo.cards.filter((c) => groupOf(c) === g).length).length;
    let value = combo.top / 4 + broken * 6 + usesTwos(combo) * 9 - combo.cards.length * 0.8;
    if (isBomb(combo)) value += 14;
    return value + random() * 0.5;
  };

  const legal = combosIn(hand).filter(
    (combo) =>
      (game.mustInclude === null || combo.cards.includes(game.mustInclude)) &&
      (!game.lead || canBeat(combo, game.lead.combo))
  );
  // Going out in one play beats everything
  const finishing = legal.find((combo) => combo.cards.length === hand.length);
  if (finishing) return { kind: 'play', cards: finishing.cards };

  if (!game.lead) {
    // Lead a planned group: the weakest one, but not a lone card if an opponent is down to one card
    let options = plan.filter(
      (g) => game.mustInclude === null || g.cards.includes(game.mustInclude)
    );
    if (options.length === 0) options = legal;
    if (danger === 1) {
      const safe = options.filter((g) => g.type !== 'single');
      if (safe.length > 0) options = safe;
      else options = [...options].sort((a, b) => b.top - a.top).slice(0, 1);
    }
    const choice = [...options].sort((a, b) => {
      const weak = (g: Combo) => (isBomb(g) ? 100 : 0) + usesTwos(g) * 50 + g.top / 4 - g.cards.length * 0.6;
      return weak(a) - weak(b);
    })[0];
    return choice ? { kind: 'play', cards: choice.cards } : { kind: 'pass' };
  }

  if (legal.length === 0) return { kind: 'pass' };
  const lead = game.lead.combo;
  // A 2 on the table: chop it with a bomb if possible
  if (isTwos(lead)) {
    const chop = legal.filter(isBomb).sort((a, b) => a.cards.length - b.cards.length)[0];
    if (chop) return { kind: 'play', cards: chop.cards };
  }
  const pressure = danger <= 3 || hand.length <= 5;
  const choices = legal
    .filter((combo) => pressure || (!isBomb(combo) && (usesTwos(combo) === 0 || rankOf(lead.top) >= ACE)))
    .sort((a, b) => cost(a) - cost(b));
  const choice = choices[0];
  if (!choice) return { kind: 'pass' };
  // Not worth breaking a strong hand for a low card early on
  if (!pressure && cost(choice) > 14 && random() < 0.7) return { kind: 'pass' };
  return { kind: 'play', cards: choice.cards };
}
