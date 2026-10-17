import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { dayStartMs, gameDayAt } from '@/lib/clock';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const HOUR = 3_600_000;
// 23:59:50 on Thursday 05/11/2026 in Vietnam (no festival runs)
const DAY = gameDayAt(Date.UTC(2026, 10, 5, 3));
const LATE = dayStartMs(DAY + 1) - 10_000;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(LATE);
  useGameStore.setState({ day: DAY, clockStarted: true, activeModal: null, lastGiftDate: '2026-11-05', loginStreak: 1 });
});
afterEach(() => vi.useRealTimers());

describe('the day turns over on the clock', () => {
  it('at midnight while playing: the morning report opens when nothing else is open', () => {
    vi.setSystemTime(LATE + 20_000);
    store().tickClock();
    expect(store().day).toBe(DAY + 1);
    expect(store().activeModal).toBe('summary');
    expect(store().lastDaySummary).toMatchObject({ day: DAY + 1, daysPassed: 1 });
  });

  it('at midnight while fishing: only a note, the cast goes on', () => {
    useGameStore.setState({ fishing: { spot: 'beach', stage: 'waiting', catchId: 'tuna', size: 40, until: LATE } as never });
    vi.setSystemTime(LATE + 20_000);
    store().tickClock();
    expect(store().day).toBe(DAY + 1);
    expect(store().activeModal).toBeNull();
    expect(store().fishing).not.toBeNull();
  });

  it("on opening the game days later: the morning report, then the day's gift", () => {
    useGameStore.setState({ clockStarted: false, timePhaseIndex: 2 });
    vi.setSystemTime(dayStartMs(DAY + 3) + 9 * HOUR);
    store().tickClock();
    expect(store().lastDaySummary).toMatchObject({ day: DAY + 3, daysPassed: 3 });
    expect(store().activeModal).toBe('summary');
    expect(store().timePhaseIndex).toBe(0);
    store().closeDaySummary();
    expect(store().activeModal).toBe('dailyGift');
  });

  it('on opening the game the same day: just the gift, if there is one', () => {
    useGameStore.setState({ clockStarted: false, lastGiftDate: null });
    store().tickClock();
    expect(store().day).toBe(DAY);
    expect(store().activeModal).toBe('dailyGift');
  });

  it("counts the day's visit and gives new daily quests", () => {
    const visits = store().quests.find((q) => q.id === 'a_days')?.progress ?? 0;
    store().startNewDay(DAY + 1);
    expect(store().quests.find((q) => q.id === 'a_days')?.progress).toBe(visits + 1);
    expect(store().quests.filter((q) => q.category === 'daily').every((q) => q.id.endsWith(`_day${DAY + 1}`))).toBe(true);
    expect(store().dailyDay).toBe(DAY + 1);
  });
});
