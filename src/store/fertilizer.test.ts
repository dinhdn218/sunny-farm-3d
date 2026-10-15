import { beforeEach, describe, expect, it } from 'vitest';
import { QuestItem, TileData } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const tile66 = () => store().tiles.find((t) => t.id === '6-6')!;
const setTile66 = (patch: Partial<TileData>) =>
  useGameStore.setState({ tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, ...patch } : t)) });

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const harvestQuest: QuestItem = {
  id: 'test_harvest',
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type: 'harvest',
  target: 10,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
};

describe('fertilizer', () => {
  it('is sold at the seed shop', () => {
    useGameStore.setState({ gold: 200, fertilizer: 0 });
    store().buyFertilizer(5);
    expect(store().fertilizer).toBe(5);
    expect(store().gold).toBe(200 - 5 * 30);
  });

  it('goes on worked soil, one bag a tile', () => {
    setTile66({ state: 'tilled' });
    useGameStore.setState({ fertilizer: 2, activeTool: 'fertilizer' });
    store().interactTile(6, 6);
    expect(tile66().fertilized).toBe(true);
    expect(store().fertilizer).toBe(1);
  });

  it('is not wasted on grass or on soil already fertilized', () => {
    useGameStore.setState({ fertilizer: 2, activeTool: 'fertilizer' });
    store().interactTile(6, 6);
    expect(tile66().fertilized).toBeFalsy();
    setTile66({ state: 'tilled', fertilized: true });
    store().interactTile(6, 6);
    expect(store().fertilizer).toBe(2);
  });

  it('doubles the next harvest from the tile and is used up by it', () => {
    setTile66({ state: 'planted', crop: 'carrot', stage: 3, fertilized: true });
    useGameStore.setState({ activeTool: 'basket', items: {}, quests: [harvestQuest] });
    store().interactTile(6, 6);
    expect(store().items).toEqual({ carrot: 2 });
    expect(store().quests[0].progress).toBe(2);
    expect(tile66().fertilized).toBe(false);
  });
});
