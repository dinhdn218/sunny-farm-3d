import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

describe('experience', () => {
  // Tile 6-6 is an untilled tile inside the starter field
  it('is earned by farm work', () => {
    useGameStore.setState({ xp: 0, activeTool: 'hoe', energy: 50 });
    store().interactTile(6, 6);
    expect(store().xp).toBe(1);
  });

  it('pays the level reward when an action crosses into a new level', () => {
    useGameStore.setState({ xp: 99, gold: 0, gems: 0, activeTool: 'hoe', energy: 50 });
    store().interactTile(6, 6);
    expect(store().xp).toBe(100);
    expect(store().gold).toBe(100);
    expect(store().gems).toBe(2);
  });

  it('pays every level passed when one action jumps several', () => {
    useGameStore.setState({ xp: 0, gold: 0, gems: 0 });
    // 5 plots × 50 XP = 250 XP: level 1 → 3
    store().incrementQuest('buy_plot', 5);
    expect(store().gold).toBe(100 + 150);
    expect(store().gems).toBe(4);
  });
});

describe('daily gift', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("hands out today's gift only once", () => {
    useGameStore.setState({ gold: 0, loginStreak: 0, lastGiftDate: null });
    store().claimDailyGift();
    store().claimDailyGift();
    expect(store().gold).toBe(50);
    expect(store().loginStreak).toBe(1);
    expect(store().lastGiftDate).toBe('2026-10-15');
  });

  it('gives the next gift of the streak on the following day', () => {
    useGameStore.setState({ breadCount: 0, loginStreak: 1, lastGiftDate: '2026-10-14' });
    store().claimDailyGift();
    expect(store().breadCount).toBe(3);
    expect(store().loginStreak).toBe(2);
  });

  it('starts the streak over after a missed day', () => {
    useGameStore.setState({ gold: 0, loginStreak: 4, lastGiftDate: '2026-10-12' });
    store().claimDailyGift();
    expect(store().gold).toBe(50);
    expect(store().loginStreak).toBe(1);
  });
});
