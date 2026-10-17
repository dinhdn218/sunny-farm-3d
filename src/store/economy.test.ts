import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { marketPrice } from '@/lib/market';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
// The farm turned over to the next morning, as the clock does at midnight
const nextDay = () => store().startNewDay(store().day + 1);

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const dailyQuest = (type: QuestItem['type'], target: number): QuestItem => ({
  id: `test_${type}`,
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type,
  target,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
});

describe('harvesting', () => {
  it('puts crops and animal products in the bag', () => {
    // A new game starts with a ripe carrot on tile 7-7 and an egg waiting under Gà Chip
    useGameStore.setState({ items: {} });
    store().interactTile(7, 7);
    store().interactAnimal('ani_chicken_1');
    expect(store().items).toEqual({ carrot: 1, egg: 1 });
  });
});

describe('selling', () => {
  it('pays 70% for selling straight from the bag', () => {
    useGameStore.setState({ gold: 0, items: { carrot: 2 } });
    store().sellNow('carrot', 2);
    expect(store().gold).toBe(56);
    expect(store().items).toEqual({});
  });

  it('can sell only the animal products in the bag', () => {
    useGameStore.setState({ gold: 0, items: { egg: 1, milk: 1, carrot: 2 } });
    store().sellAllNow('animal');
    expect(store().gold).toBe(32 + 112);
    expect(store().items).toEqual({ carrot: 2 });
  });

  it('moves items into the shipping bin and back', () => {
    useGameStore.setState({ items: { egg: 2 }, shippingBin: {} });
    store().moveToBin('egg', 1);
    expect(store().items).toEqual({ egg: 1 });
    expect(store().shippingBin).toEqual({ egg: 1 });
    store().returnFromBin('egg', 1);
    expect(store().items).toEqual({ egg: 2 });
    expect(store().shippingBin).toEqual({});
  });

  it('sells the shipping bin at full price overnight and keeps the bag', () => {
    // Day 10 is summer: no seasonal bonus on carrots
    useGameStore.setState({ day: 10, gold: 0, items: { wheat: 1 }, shippingBin: { carrot: 3, cheese: 1 } });
    nextDay();
    expect(store().gold).toBe(3 * 40 + 260);
    expect(store().items).toEqual({ wheat: 1 });
    expect(store().shippingBin).toEqual({});
  });

  it("sells at today's market price, but only at the Mall", () => {
    useGameStore.setState({ gold: 0, day: 5, items: { milk: 1 }, currentWorld: 'farm' });
    store().sellAtMarket('milk', 1);
    expect(store().gold).toBe(0);

    useGameStore.setState({ currentWorld: 'mall', quests: [dailyQuest('market_sell', 1000)] });
    store().sellAtMarket('milk', 1);
    expect(store().gold).toBe(marketPrice('milk', 5));
    expect(store().items).toEqual({});
    expect(store().quests[0].progress).toBe(marketPrice('milk', 5));
  });
});

describe('workshop', () => {
  const start = new Date('2026-10-15T08:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const withPlacedOven = () =>
    useGameStore.setState({
      machines: { machine_oven: { job: null } },
      decorPlacements: { machine_oven: { x: -6.8, z: 0, rotY: 0 } },
    });

  it('sells a machine for gold', () => {
    useGameStore.setState({ gold: 300 });
    store().buyMachine('machine_oven');
    expect(store().gold).toBe(50);
    expect(store().machines.machine_oven).toEqual({ job: null });
  });

  it('does not hand out a machine the player cannot afford', () => {
    useGameStore.setState({ gold: 100 });
    store().buyMachine('machine_oven');
    expect(store().gold).toBe(100);
    expect(store().machines.machine_oven).toBeUndefined();
  });

  it('turns one wheat into three loaves of bread once the batch is done', () => {
    withPlacedOven();
    useGameStore.setState({ items: { wheat: 2 }, breadCount: 0 });

    store().startRecipe('bread');
    expect(store().items).toEqual({ wheat: 1 });

    store().collectMachine('machine_oven');
    expect(store().breadCount).toBe(0);

    vi.setSystemTime(start + 31_000);
    store().collectMachine('machine_oven');
    expect(store().breadCount).toBe(3);
    expect(store().machines.machine_oven).toEqual({ job: null });
  });

  it('puts finished artisan goods in the bag and counts the batch for crafting quests', () => {
    withPlacedOven();
    useGameStore.setState({
      items: { pumpkin: 1, egg: 1, wheat: 1 },
      quests: [dailyQuest('craft', 5)],
    });
    store().startRecipe('pumpkin_pie');
    vi.setSystemTime(start + 181_000);
    store().collectMachine('machine_oven');
    expect(store().items).toEqual({ pumpkin_pie: 1 });
    expect(store().quests[0].progress).toBe(1);
  });

  it('cannot start a batch without every ingredient', () => {
    withPlacedOven();
    useGameStore.setState({ items: { pumpkin: 1, wheat: 1 } });
    store().startRecipe('pumpkin_pie');
    expect(store().items).toEqual({ pumpkin: 1, wheat: 1 });
    expect(store().machines.machine_oven?.job).toBeNull();
  });

  it('runs one batch at a time on a machine', () => {
    withPlacedOven();
    useGameStore.setState({ items: { wheat: 2 } });
    store().startRecipe('bread');
    store().startRecipe('bread');
    expect(store().items).toEqual({ wheat: 1 });
  });

  it('only works with machines placed on the farm', () => {
    useGameStore.setState({
      machines: { machine_oven: { job: null } },
      decorPlacements: {},
      items: { wheat: 1 },
    });
    store().startRecipe('bread');
    expect(store().items).toEqual({ wheat: 1 });
  });

  it('leaves a batch on its own time over a new day', () => {
    withPlacedOven();
    useGameStore.setState({ items: { pumpkin: 1, egg: 1, wheat: 1 } });
    store().startRecipe('pumpkin_pie');
    const readyAt = store().machines.machine_oven?.job?.readyAt;
    nextDay();
    expect(store().machines.machine_oven?.job?.readyAt).toBe(readyAt);
  });
});

describe('popcorn at the cinema', () => {
  it('is free once a day, then costs 15 gold', () => {
    useGameStore.setState({ gold: 100, energy: 10, day: 3, lastFreeSnackDay: 0 });
    store().eatPopcornOrSnack('Bắp rang bơ', 30);
    expect(store().gold).toBe(100);
    expect(store().energy).toBe(40);

    store().eatPopcornOrSnack('Bắp rang bơ', 30);
    expect(store().gold).toBe(85);
    expect(store().energy).toBe(70);
  });

  it('is not eaten when energy is already full', () => {
    useGameStore.setState({ gold: 100, energy: 100, day: 3, lastFreeSnackDay: 0 });
    store().eatPopcornOrSnack('Bắp rang bơ', 30);
    expect(store().lastFreeSnackDay).toBe(0);
  });

  it('cannot be bought without the gold', () => {
    useGameStore.setState({ gold: 10, energy: 10, day: 3, lastFreeSnackDay: 3 });
    store().eatPopcornOrSnack('Bắp rang bơ', 30);
    expect(store().energy).toBe(10);
    expect(store().gold).toBe(10);
  });
});
