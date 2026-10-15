import { beforeEach, describe, expect, it } from 'vitest';
import { QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const withHive = () =>
  useGameStore.setState({
    ownedCosmetics: [...initialState.ownedCosmetics, 'decor_beehive'],
    decorPlacements: { decor_beehive: { x: 10, z: -6, rotY: 0 } },
  });

const questOf = (type: QuestItem['type']): QuestItem => ({
  id: `test_${type}`,
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type,
  target: 10,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
});

describe('the beehive', () => {
  it('fills with honey overnight once it stands on the farm', () => {
    withHive();
    useGameStore.setState({ beehiveHoney: 0 });
    store().nextDay();
    expect(store().beehiveHoney).toBe(1);
    expect(store().lastDaySummary?.honeyMade).toBe(1);
  });

  it('holds no more than six jars', () => {
    withHive();
    useGameStore.setState({ beehiveHoney: 6 });
    store().nextDay();
    expect(store().beehiveHoney).toBe(6);
    expect(store().lastDaySummary?.honeyMade).toBe(0);
  });

  it('makes nothing while it is still in the shop', () => {
    useGameStore.setState({ beehiveHoney: 0 });
    store().nextDay();
    expect(store().beehiveHoney).toBe(0);
  });

  it('gives its honey to the bag when collected, and counts it as a farm product', () => {
    withHive();
    useGameStore.setState({ beehiveHoney: 3, items: {}, quests: [questOf('collect_animal')] });
    store().collectHoney();
    expect(store().items).toEqual({ honey: 3 });
    expect(store().beehiveHoney).toBe(0);
    expect(store().quests[0].progress).toBe(3);
  });

  it('gives nothing when the hive is empty', () => {
    withHive();
    useGameStore.setState({ beehiveHoney: 0, items: {} });
    store().collectHoney();
    expect(store().items).toEqual({});
  });
});

describe('honey cake', () => {
  it('is baked in the oven from wheat, honey and an egg', () => {
    useGameStore.setState({
      machines: { machine_oven: { job: null } },
      decorPlacements: { machine_oven: { x: 9, z: 4, rotY: 0 } },
      items: { wheat: 1, honey: 1, egg: 1, carrot: 2 },
    });
    store().startRecipe('honey_cake');
    expect(store().items).toEqual({ carrot: 2 });
    expect(store().machines.machine_oven?.job?.recipeId).toBe('honey_cake');
  });
});
