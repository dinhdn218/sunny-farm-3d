import { beforeEach, describe, expect, it } from 'vitest';
import { BuildPiece, QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { snapToCell } from '@/lib/build';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

// A free cell east of the starter field
const X = snapToCell(8.5);
const Z = snapToCell(-3);
const tree = (patch: Partial<BuildPiece> = {}): BuildPiece => ({
  kind: 'orange_tree',
  x: X,
  z: Z,
  rotY: 0,
  planted: 1,
  fruit: 0,
  ...patch,
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

describe('fruit trees', () => {
  it('are bought one at a time', () => {
    useGameStore.setState({ gold: 1000, buildStock: {} });
    store().buyBuildPieces('orange_tree', 1);
    expect(store().buildStock.orange_tree).toBe(1);
    expect(store().gold).toBe(1000 - 450);
  });

  it('remember the day they were planted', () => {
    useGameStore.setState({ day: 4, buildStock: { orange_tree: 1 }, buildMode: { kind: 'orange_tree', rotY: 0 } });
    store().buildAt(X, Z);
    expect(store().buildPieces).toEqual([tree({ planted: 4 })]);
  });

  it('ripen overnight once grown, and the morning report says so', () => {
    // Orange trees take 5 days to grow
    useGameStore.setState({ day: 5, buildPieces: [tree()], shippingBin: {} });
    store().nextDay();
    expect(store().buildPieces[0].fruit).toBe(1);
    expect(store().lastDaySummary?.fruitRipened).toBe(1);
  });

  it('give their fruit to the bag when picked, which counts as a harvest', () => {
    useGameStore.setState({ buildPieces: [tree({ fruit: 2 })], items: {}, quests: [harvestQuest] });
    store().pickFruit(X, Z);
    expect(store().items).toEqual({ orange: 2 });
    expect(store().buildPieces[0].fruit).toBe(0);
    expect(store().quests[0].progress).toBe(2);
  });

  it('give nothing while bare', () => {
    useGameStore.setState({ buildPieces: [tree()], items: {} });
    store().pickFruit(X, Z);
    expect(store().items).toEqual({});
  });
});
