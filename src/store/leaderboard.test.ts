import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Order } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 7, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the week's counters", () => {
  it('add up gold earned, fish caught and orders delivered', () => {
    const order: Order = { id: 'o', customer: 'X', items: { carrot: 1 }, rewardGold: 60, rewardGems: 0 };
    useGameStore.setState({ orders: [order], items: { carrot: 3 } });
    store().deliverOrder('o');
    store().sellNow('carrot', 2);
    store().incrementQuest('fish', 1);
    expect(store().weekly).toEqual({ week: '2026-W50', gold: 60 + 56, fish: 1, orders: 1, likes: 0 });
  });

  it('start again from nothing in a new week', () => {
    useGameStore.setState({ weekly: { week: '2026-W49', gold: 999, fish: 9, orders: 9 } });
    store().incrementQuest('earn_gold', 10);
    expect(store().weekly).toEqual({ week: '2026-W50', gold: 10, fish: 0, orders: 0, likes: 0 });
  });
});
