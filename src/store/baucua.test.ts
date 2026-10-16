import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { reconcileQuests } from '@/lib/quests';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const bauCuaQuest = () => store().quests.find((q) => q.id === 't_baucua')!;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  // Mùng 1 Tết Đinh Mùi
  vi.setSystemTime(new Date(2027, 1, 6, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Bầu Cua at the casino', () => {
  it('takes the bets and pays what the dice win, all at once', () => {
    useGameStore.setState({ gold: 1000 });
    // Cua, Cua, Tôm
    const dice = [0.75, 0.75, 0.9];
    vi.spyOn(Math, 'random').mockImplementation(() => dice.shift() ?? 0);
    expect(store().playBauCua({ cua: 100, nai: 50 })).toEqual(['cua', 'cua', 'tom']);
    // -150 staked, +300 back on the crab
    expect(store().gold).toBe(1150);
  });

  it('counts each round for the Tết quest', () => {
    useGameStore.setState({ gold: 1000, quests: reconcileQuests([], 1) });
    store().playBauCua({ ga: 10 });
    store().playBauCua({ ga: 10 });
    expect(bauCuaQuest().progress).toBe(2);
  });

  it('turns away a round over 500 gold, or more than the purse', () => {
    useGameStore.setState({ gold: 1000 });
    expect(store().playBauCua({ nai: 300, bau: 300 })).toBeNull();
    useGameStore.setState({ gold: 40 });
    expect(store().playBauCua({ nai: 50 })).toBeNull();
    expect(store().gold).toBe(40);
  });

  it('is only played while Tết runs', () => {
    vi.setSystemTime(new Date(2027, 2, 10, 10, 0));
    useGameStore.setState({ gold: 1000 });
    expect(store().playBauCua({ nai: 50 })).toBeNull();
    expect(store().gold).toBe(1000);
  });
});
