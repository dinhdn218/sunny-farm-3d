import { describe, expect, it } from 'vitest';
import {
  Card,
  RANK_LABELS,
  SUIT_LABELS,
  TienLenGame,
  analyze,
  applyMove,
  botMove,
  canBeat,
  combosIn,
  deal,
  instantWin,
  newGame,
  seededRandom,
  settle,
} from '@/lib/tienlen';

// '10♥' → card number
const c = (label: string): Card => {
  const suit = SUIT_LABELS.indexOf(label.slice(-1));
  const rank = RANK_LABELS.indexOf(label.slice(0, -1));
  if (suit < 0 || rank < 0) throw new Error(`bad card ${label}`);
  return rank * 4 + suit;
};
const cards = (labels: string) => labels.split(' ').map(c);
const combo = (labels: string) => {
  const result = analyze(cards(labels));
  if (!result) throw new Error(`not a combo: ${labels}`);
  return result;
};

const play = (game: TienLenGame, seat: number, labels: string) => {
  const next = applyMove(game, seat, { kind: 'play', cards: cards(labels) });
  if (typeof next === 'string') throw new Error(next);
  return next;
};
const pass = (game: TienLenGame, seat: number) => {
  const next = applyMove(game, seat, { kind: 'pass' });
  if (typeof next === 'string') throw new Error(next);
  return next;
};

describe('combinations', () => {
  it('recognises rác, đôi, sám and tứ quý', () => {
    expect(analyze(cards('7♦'))?.type).toBe('single');
    expect(analyze(cards('9♠ 9♥'))?.type).toBe('pair');
    expect(analyze(cards('Q♠ Q♣ Q♥'))?.type).toBe('triple');
    expect(analyze(cards('5♠ 5♣ 5♦ 5♥'))?.type).toBe('quad');
  });

  it('recognises sảnh up to the ace, never through the 2', () => {
    expect(analyze(cards('3♠ 4♦ 5♥'))).toMatchObject({ type: 'straight', size: 3 });
    expect(analyze(cards('10♠ J♦ Q♥ K♣ A♠'))).toMatchObject({ type: 'straight', size: 5 });
    expect(analyze(cards('K♠ A♦ 2♥'))).toBeNull();
    expect(analyze(cards('3♠ 4♦ 6♥'))).toBeNull();
  });

  it('recognises đôi thông of three pairs or more', () => {
    expect(analyze(cards('3♠ 3♥ 4♣ 4♦ 5♠ 5♥'))).toMatchObject({ type: 'pairs', size: 3 });
    expect(analyze(cards('8♠ 8♥ 9♣ 9♦ 10♠ 10♥ J♠ J♣'))).toMatchObject({ type: 'pairs', size: 4 });
    expect(analyze(cards('3♠ 3♥ 4♣ 4♦'))).toBeNull();
    expect(analyze(cards('K♠ K♥ A♣ A♦ 2♠ 2♥'))).toBeNull();
  });

  it('rejects anything else', () => {
    expect(analyze(cards('3♠ 4♠'))).toBeNull();
    expect(analyze(cards('3♠ 3♥ 4♣'))).toBeNull();
    expect(analyze([])).toBeNull();
  });
});

describe('beating a play', () => {
  it('needs the same shape and a higher top card, suits breaking ties', () => {
    expect(canBeat(combo('8♣'), combo('8♠'))).toBe(true);
    expect(canBeat(combo('8♠'), combo('8♣'))).toBe(false);
    expect(canBeat(combo('J♠ J♥'), combo('J♣ J♦'))).toBe(true);
    expect(canBeat(combo('4♠ 5♠ 6♠'), combo('3♥ 4♥ 5♥'))).toBe(true);
    expect(canBeat(combo('4♠ 5♠ 6♠ 7♠'), combo('3♥ 4♥ 5♥'))).toBe(false);
    expect(canBeat(combo('9♠ 9♥'), combo('8♠'))).toBe(false);
  });

  it('lets 3 đôi thông chop a single 2 but not a pair of 2s', () => {
    const pairs3 = combo('3♠ 3♥ 4♣ 4♦ 5♠ 5♥');
    expect(canBeat(pairs3, combo('2♥'))).toBe(true);
    expect(canBeat(pairs3, combo('2♠ 2♥'))).toBe(false);
    expect(canBeat(pairs3, combo('A♥'))).toBe(false);
  });

  it('lets tứ quý chop a 2, a pair of 2s and 3 đôi thông', () => {
    const quad = combo('6♠ 6♣ 6♦ 6♥');
    expect(canBeat(quad, combo('2♠'))).toBe(true);
    expect(canBeat(quad, combo('2♠ 2♦'))).toBe(true);
    expect(canBeat(quad, combo('9♠ 9♥ 10♣ 10♦ J♠ J♥'))).toBe(true);
    expect(canBeat(combo('7♠ 7♣ 7♦ 7♥'), quad)).toBe(true);
  });

  it('lets 4 đôi thông chop tứ quý', () => {
    const pairs4 = combo('3♠ 3♥ 4♣ 4♦ 5♠ 5♥ 6♠ 6♦');
    expect(canBeat(pairs4, combo('A♠ A♣ A♦ A♥'))).toBe(true);
    expect(canBeat(combo('A♠ A♣ A♦ A♥'), pairs4)).toBe(false);
  });
});

describe('a game', () => {
  // Four short hands so a whole game fits in a test
  const hands = () => [cards('3♠ 4♠ 5♠ 9♦'), cards('6♠ 7♠ 8♠ 2♥'), cards('3♣ 3♥ J♦ K♣'), cards('10♠ 10♣ 10♦ 10♥')];

  it('starts with the holder of 3♠, who must play it', () => {
    const game = newGame(hands(), null);
    expect(game.turn).toBe(0);
    expect(applyMove(game, 0, { kind: 'play', cards: cards('9♦') })).toBe('Lượt đầu phải đánh kèm 3♠');
    expect(applyMove(game, 0, { kind: 'pass' })).toMatch(/không thể bỏ lượt/);
    expect(play(game, 0, '3♠ 4♠ 5♠').turn).toBe(1);
  });

  it('only lets the player whose turn it is move, with cards they hold', () => {
    const game = newGame(hands(), null);
    expect(applyMove(game, 1, { kind: 'play', cards: cards('6♠') })).toBe('Chưa đến lượt');
    expect(applyMove(game, 0, { kind: 'play', cards: cards('3♠ 6♠') })).toBe('Bài không có trên tay');
  });

  it('starts a new round for the winner when everyone else passes', () => {
    let game = play(newGame(hands(), null), 0, '3♠ 4♠ 5♠');
    game = play(game, 1, '6♠ 7♠ 8♠');
    game = pass(pass(pass(game, 2), 3), 0);
    expect(game.lead).toBeNull();
    expect(game.turn).toBe(1);
    expect(game.passed).toEqual([false, false, false, false]);
  });

  it('records a chop: the owner of the 2 pays the chopper', () => {
    let game = newGame(hands(), 1);
    game = play(game, 1, '2♥');
    game = pass(game, 2);
    game = play(game, 3, '10♠ 10♣ 10♦ 10♥');
    expect(game.last?.kind).toBe('chop');
    expect(game.transfers).toEqual([{ from: 1, to: 3, units: 2, why: 'Chặt Heo' }]);
  });

  it('ends when one player is left holding cards, and the payouts add up to zero', () => {
    let game = newGame(hands(), 3);
    game = play(game, 3, '10♠ 10♣ 10♦ 10♥');
    expect(game.finished).toEqual([3]);
    // Nobody else got to play a card: all cóng
    expect(game.frozen).toEqual([0, 1, 2]);
    expect(game.over).toBe(true);
    const { ranking, units } = settle(game);
    expect(ranking[0]).toBe(3);
    expect(units.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('charges thối heo to the last player and cóng to the frozen', () => {
    // Seat 0 goes out; seat 1 played but still holds 2♥; seat 2 never played
    let game = newGame([cards('3♠ 4♠ 5♠'), cards('6♦ 2♥'), cards('7♣ 8♣')], null);
    game = play(game, 0, '3♠ 4♠ 5♠');
    expect(game.over).toBe(true);
    // Seat 1 and 2 both never played → both frozen
    expect(game.frozen).toEqual([1, 2]);
    const { ranking, units } = settle(game);
    expect(ranking).toEqual([0, 1, 2]);
    // Place +1/0/−1, cóng 2 each, thối heo 2♥ = 2 (seat 1 is frozen too)
    expect(units).toEqual([1 + 4 + 2, 0 - 2 - 2, -1 - 2]);
  });

  it('pays a tới trắng hand at once', () => {
    const dragon = cards('3♠ 4♠ 5♠ 6♠ 7♠ 8♠ 9♠ 10♠ J♠ Q♠ K♠ A♠ 2♠');
    const game = newGame([cards('3♣ 4♣'), dragon], null);
    expect(game.instant).toEqual({ seat: 1, reason: 'Sảnh Rồng' });
    expect(settle(game).units).toEqual([-2, 2]);
  });
});

describe('instant wins', () => {
  it('spots tứ quý heo, 5 đôi thông and 6 đôi', () => {
    expect(instantWin(cards('2♠ 2♣ 2♦ 2♥ 3♠ 5♦ 7♥ 9♣ J♦ K♠ 4♠ 6♥ 8♣'))).toBe('Tứ Quý Heo');
    expect(instantWin(cards('3♠ 3♥ 4♣ 4♦ 5♠ 5♥ 6♠ 6♦ 7♣ 7♥ 9♠ J♦ K♥'))).toBe('5 Đôi Thông');
    expect(instantWin(cards('3♠ 3♥ 6♣ 6♦ 9♠ 9♥ J♠ J♦ K♣ K♥ A♠ A♦ 2♥'))).toBe('6 Đôi');
    expect(instantWin(cards('3♠ 3♥ 6♣ 6♦ 9♠ 9♥ J♠ J♦ K♣ K♥ A♠ Q♦ 2♥'))).toBeNull();
  });
});

describe('the computer player', () => {
  it('finds the combinations in a hand', () => {
    const found = combosIn(cards('3♠ 4♦ 5♥ 5♠ 2♣'));
    expect(found.some((x) => x.type === 'straight' && x.size === 3)).toBe(true);
    expect(found.some((x) => x.type === 'pair')).toBe(true);
    expect(found.filter((x) => x.type === 'single')).toHaveLength(5);
  });

  it('chops a 2 when it holds a bomb', () => {
    let game = newGame([cards('2♥ 3♦'), cards('9♠ 9♣ 9♦ 9♥ 4♣')], 0);
    game = play(game, 0, '2♥');
    expect(botMove(game, 1, seededRandom(1))).toEqual({ kind: 'play', cards: cards('9♠ 9♣ 9♦ 9♥') });
  });

  it('plays only legal moves, and every game ends with payouts that add up to zero', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const random = seededRandom(seed);
      const players = 2 + (seed % 3);
      let game = newGame(deal(players, random), seed % 2 === 0 ? null : seed % players);
      let moves = 0;
      while (!game.over) {
        const move = botMove(game, game.turn, random);
        const next = applyMove(game, game.turn, move);
        if (typeof next === 'string') throw new Error(`seed ${seed}: illegal ${JSON.stringify(move)}: ${next}`);
        game = next;
        if (++moves > 400) throw new Error(`seed ${seed}: game did not end`);
      }
      const { ranking, units } = settle(game);
      expect(new Set(ranking).size).toBe(players);
      expect(units.reduce((a, b) => a + b, 0)).toBe(0);
    }
  });
});
