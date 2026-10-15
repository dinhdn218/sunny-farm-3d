import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Order } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const gingerbread = () => store().festivalTokens.christmas ?? 0;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 11, 20, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

const order: Order = { id: 'ord_x', customer: 'Linh Chi 🌸', items: { wheat: 2 }, rewardGold: 210, rewardGems: 0 };

describe('Giáng Sinh', () => {
  it('pays gingerbread for every order delivered', () => {
    useGameStore.setState({ festivalTokens: {}, orders: [order], items: { wheat: 2 } });
    store().deliverOrder('ord_x');
    expect(gingerbread()).toBe(5);
  });

  it('trades gingerbread for its own items at the stall in the Park', () => {
    useGameStore.setState({ currentWorld: 'park', festivalTokens: { christmas: 30 } });
    store().buyFestivalItem('santa_hat');
    expect(store().cosmetics.hat).toBe('santa_hat');
    expect(gingerbread()).toBe(5);
  });

  it("does not sell the other festivals' items", () => {
    useGameStore.setState({ currentWorld: 'park', festivalTokens: { christmas: 99, halloween: 99 } });
    store().buyFestivalItem('pumpkin_hat');
    expect(store().ownedCosmetics).not.toContain('pumpkin_hat');
  });
});
