import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const luckyMoney = () => store().festivalTokens.tet ?? 0;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  // Mùng 1 Tết Đinh Mùi
  vi.setSystemTime(new Date(2027, 1, 6, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Tết Nguyên Đán', () => {
  it('gives lucky money for every fish caught', () => {
    useGameStore.setState({
      festivalTokens: {},
      timePhaseIndex: 0,
      fishing: { spot: 'beach', stage: 'reeling', catchId: 'anchovy', size: 8, until: 0 },
    });
    store().landCatch();
    expect(luckyMoney()).toBe(2);
  });

  it('trades lucky money for its items at the flower market in the Park', () => {
    useGameStore.setState({ currentWorld: 'park', festivalTokens: { tet: 30 } });
    store().buyFestivalItem('khan_dong');
    expect(store().cosmetics.hat).toBe('khan_dong');
    expect(luckyMoney()).toBe(5);
  });
});
