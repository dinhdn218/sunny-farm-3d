import { describe, expect, it } from 'vitest';
import {
  RESULT_MS,
  START_DELAY_MS,
  SeatInfo,
  TableState,
  act,
  createTable,
  removePlayer,
  seatPlayer,
  tick,
} from '@/lib/casino';
import { botMove, seededRandom } from '@/lib/tienlen';

const human = (uid: string): SeatInfo => ({ kind: 'human', uid, name: uid });
const ok = (t: TableState | string) => {
  if (typeof t === 'string') throw new Error(t);
  return t;
};

describe('sitting down', () => {
  it('opens a table with its first player running it', () => {
    const t = createTable('dong', human('an'), 0);
    expect(t.host).toBe('an');
    expect(t.seats[0]).toEqual(human('an'));
    expect(t.phase).toBe('waiting');
  });

  it('seats more players, and queues those who come during a game', () => {
    const random = seededRandom(3);
    let t = ok(seatPlayer(createTable('dong', human('an'), 0), human('binh'), 0));
    expect(t.seats[1]).toEqual(human('binh'));
    t = tick(t, START_DELAY_MS, random) as TableState;
    expect(t.phase).toBe('playing');
    t = ok(seatPlayer(t, human('chi'), START_DELAY_MS));
    expect(t.waiting).toEqual([human('chi')]);
    expect(t.seats.filter((s) => s?.kind === 'human')).toHaveLength(2);
  });

  it('does not seat a fifth player', () => {
    let t = createTable('dong', human('a'), 0);
    for (const uid of ['b', 'c', 'd']) t = ok(seatPlayer(t, human(uid), 0));
    expect(seatPlayer(t, human('e'), 0)).toBe('Bàn đã đủ người');
  });
});

describe('a game at the table', () => {
  const started = () => {
    const random = seededRandom(11);
    const t = tick(createTable('bac', human('an'), 0), START_DELAY_MS, random) as TableState;
    return { t, random };
  };

  it('deals 13 cards to four players, computer players in the empty seats', () => {
    const { t } = started();
    expect(t.game?.hands.every((h) => h.length === 13)).toBe(true);
    expect(t.seats.map((s) => s?.kind)).toEqual(['human', 'bot', 'bot', 'bot']);
  });

  it('waits until the computer player has had time to think', () => {
    const { t, random } = started();
    if (t.game?.turn === 0) return;
    expect(tick(t, START_DELAY_MS + 100, random)).toBeNull();
    expect(tick(t, START_DELAY_MS + 2000, random)?.rev).toBe(t.rev + 1);
  });

  it('only takes a move from the player whose turn it is', () => {
    const { t } = started();
    const turnUid = t.seats[t.game!.turn]!.uid;
    if (turnUid === 'an') return;
    expect(act(t, 'an', { kind: 'pass' }, START_DELAY_MS, seededRandom(1))).toBe('Chưa đến lượt');
    expect(act(t, 'stranger', { kind: 'pass' }, START_DELAY_MS, seededRandom(1))).toBe('Bạn không ngồi ở bàn này');
  });

  it('plays for a player who runs out of time', () => {
    let { t, random } = started();
    let now = START_DELAY_MS;
    // Let the bots play until it is the human's turn
    while (t.phase === 'playing' && t.game!.turn !== 0) {
      now += 2000;
      t = tick(t, now, random) ?? t;
    }
    if (t.phase !== 'playing') return;
    expect(tick(t, now + 1000, random)).toBeNull();
    const after = tick(t, t.deadline + 1, random) as TableState;
    expect(after.game!.last?.seat).toBe(0);
    // Following: a pass; leading: the weakest cards go down
    if (t.game!.lead) expect(after.game!.last?.kind).toBe('pass');
    else expect(after.game!.hands[0].length).toBeLessThan(t.game!.hands[0].length);
  });

  it('hands a leaving player’s cards to a computer player and the table to the next player', () => {
    const random = seededRandom(5);
    let t = ok(seatPlayer(createTable('vang', human('an'), 0), human('binh'), 0));
    t = tick(t, START_DELAY_MS, random) as TableState;
    t = removePlayer(t, 'an');
    expect(t.host).toBe('binh');
    expect(t.seats[0]?.kind).toBe('bot');
    expect(t.game?.hands[0]).toHaveLength(13);
  });

  it('closes when the last player leaves', () => {
    const t = removePlayer(createTable('dong', human('an'), 0), 'an');
    expect(t.host).toBe('');
    expect(tick(t, START_DELAY_MS * 10, seededRandom(1))).toBeNull();
  });

  it('runs whole games: payouts add up to zero and the winner leads the next game', () => {
    const random = seededRandom(21);
    let t = createTable('bac', human('an'), 0);
    let now = 0;
    for (let games = 0; games < 3; ) {
      now += 500;
      if (t.phase === 'playing' && t.seats[t.game!.turn]?.uid === 'an') {
        t = ok(act(t, 'an', botMove(t.game!, t.game!.turn, random), now, random));
      } else {
        t = tick(t, now, random) ?? t;
      }
      if (t.phase === 'result' && t.result) {
        expect(t.result.gold.reduce((a, b) => a + b, 0)).toBe(0);
        expect(t.lastWinner).toBe(t.result.ranking[0]);
        now += RESULT_MS;
        const winner = t.lastWinner!;
        t = tick(t, now, random) as TableState;
        games++;
        if (!t.game!.over) {
          expect(t.game!.turn).toBe(winner);
          expect(t.game!.mustInclude).toBeNull();
        }
      }
    }
  });
});
