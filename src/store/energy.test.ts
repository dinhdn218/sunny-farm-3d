import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { gameDayAt } from '@/lib/clock';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const T = Date.UTC(2026, 9, 20, 3); // 10:00 in Vietnam
const MIN = 60_000;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T);
  useGameStore.setState({ day: gameDayAt(T), energy: 50, energyAt: T, buff: null });
});
afterEach(() => vi.useRealTimers());

describe('stamina on the clock', () => {
  it('comes back while the game runs', () => {
    vi.setSystemTime(T + 30 * MIN);
    store().tickClock();
    expect(store().energy).toBe(60);
  });

  it('counts what came back before it is spent', () => {
    useGameStore.setState({ energy: 1, currentWorld: 'beach' });
    vi.setSystemTime(T + 9 * MIN);
    store().startFishing();
    expect(store().fishing).not.toBeNull();
    expect(store().energy).toBe(0);
  });

  it('counts what came back before eating', () => {
    useGameStore.setState({ energy: 90, breadCount: 1 });
    vi.setSystemTime(T + 30 * MIN);
    store().eatBread();
    expect(store().energy).toBe(100);
    expect(store().breadCount).toBe(1);
  });
});
