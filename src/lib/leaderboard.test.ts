import { describe, expect, it } from 'vitest';
import { addWeekly, boardFromRows, villageBoard, weekKey } from '@/lib/leaderboard';

describe('weekKey', () => {
  it('names the ISO week a day falls in', () => {
    expect(weekKey(new Date(2026, 9, 16))).toBe('2026-W42');
    expect(weekKey(new Date(2026, 11, 28))).toBe('2026-W53');
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(weekKey(new Date(2027, 0, 4))).toBe('2027-W01');
  });
});

describe('addWeekly', () => {
  it('adds to this week', () => {
    expect(addWeekly({ week: '2026-W42', gold: 100, fish: 1, orders: 0 }, '2026-W42', { gold: 50 })).toEqual({
      week: '2026-W42',
      gold: 150,
      fish: 1,
      orders: 0,
      // A week from before likes starts counting them from nothing
      likes: 0,
    });
  });

  it('starts a new week from nothing', () => {
    expect(addWeekly({ week: '2026-W41', gold: 900, fish: 5, orders: 3, likes: 4 }, '2026-W42', { fish: 2 })).toEqual({
      week: '2026-W42',
      gold: 0,
      fish: 2,
      orders: 0,
      likes: 0,
    });
  });
});

describe('boardFromRows', () => {
  const rows = [
    { id: 'a', full_name: 'An', weekly: { week: '2026-W42', gold: 500, fish: 2, orders: 1 }, xp: 120 },
    { id: 'b', full_name: 'Bình', weekly: { week: '2026-W42', gold: 1200, fish: 0, orders: 4 }, xp: 2700 },
    { id: 'c', full_name: 'Cúc', weekly: { week: '2026-W41', gold: 9000, fish: 9, orders: 9 }, xp: 50 },
    { id: 'd', full_name: null, weekly: null, xp: null },
  ];

  it("ranks this week's scores, leaving out other weeks and empty rows", () => {
    expect(boardFromRows(rows, 'gold', '2026-W42')).toEqual([
      { id: 'b', name: 'Bình', score: 1200 },
      { id: 'a', name: 'An', score: 500 },
    ]);
  });

  it('ranks farmer levels from their experience', () => {
    expect(boardFromRows(rows, 'level', '2026-W42').map((e) => [e.id, e.score])).toEqual([
      ['b', 10],
      ['a', 2],
      ['c', 1],
    ]);
  });
});

describe('villageBoard', () => {
  it('ranks the player among the five residents, the same all week', () => {
    const board = villageBoard('fish', '2026-W42', { name: 'Tôi', score: 7 });
    expect(board).toHaveLength(6);
    expect(board.filter((e) => e.you)).toEqual([{ id: 'you', name: 'Tôi', score: 7, you: true }]);
    expect(board.map((e) => e.score)).toEqual([...board.map((e) => e.score)].sort((a, b) => b - a));
    expect(villageBoard('fish', '2026-W42', { name: 'Tôi', score: 7 })).toEqual(board);
  });
});
