import { beforeEach, describe, expect, it } from 'vitest';
import { ItemId } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

describe('the collection book', () => {
  it('marks what a new farmer starts with', () => {
    expect([...store().collected].sort()).toEqual(['carrot', 'egg', 'wheat']);
  });

  it('marks something the first time it lands in the bag', () => {
    useGameStore.setState({ collected: [], items: {} });
    store().interactAnimal('ani_chicken_1');
    expect(store().collected).toEqual(['egg']);
  });

  it('pays a complete set once', () => {
    const beach: ItemId[] = ['shell', 'starfish', 'coral', 'pearl'];
    useGameStore.setState({ collected: beach, gold: 0, gems: 0, collectionClaimed: [] });
    store().claimCollection('beach');
    store().claimCollection('beach');
    expect(store().gold).toBe(200);
    expect(store().gems).toBe(10);
    expect(store().collectionClaimed).toEqual(['beach']);
  });

  it('pays nothing for a set still missing pieces', () => {
    useGameStore.setState({ collected: ['shell', 'starfish'], gold: 0, collectionClaimed: [] });
    store().claimCollection('beach');
    expect(store().gold).toBe(0);
    expect(store().collectionClaimed).toEqual([]);
  });
});
