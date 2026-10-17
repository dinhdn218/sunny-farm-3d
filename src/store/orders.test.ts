import { beforeEach, describe, expect, it } from 'vitest';
import { Order, QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
// The farm turned over to the next morning, as the clock does at midnight
const nextDay = () => store().startNewDay(store().day + 1);

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const order = (over: Partial<Order> = {}): Order => ({
  id: 'ord_test',
  customer: 'Linh Chi 🌸',
  items: { carrot: 3, egg: 1 },
  rewardGold: 250,
  rewardGems: 1,
  ...over,
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

describe('the order board', () => {
  it('holds three orders in a new game', () => {
    expect(store().orders).toHaveLength(3);
  });
});

describe('delivering an order', () => {
  it('takes the goods from the bag and pays the reward', () => {
    useGameStore.setState({ orders: [order()], items: { carrot: 5, egg: 1, milk: 1 }, gold: 0, gems: 0 });
    store().deliverOrder('ord_test');
    expect(store().items).toEqual({ carrot: 2, milk: 1 });
    expect(store().gold).toBe(250);
    expect(store().gems).toBe(1);
    expect(store().orders).toEqual([]);
  });

  it('delivers nothing while the bag is short', () => {
    useGameStore.setState({ orders: [order()], items: { carrot: 2, egg: 1 }, gold: 0, gems: 0 });
    store().deliverOrder('ord_test');
    expect(store().items).toEqual({ carrot: 2, egg: 1 });
    expect(store().gold).toBe(0);
    expect(store().orders).toEqual([order()]);
  });

  it('counts as a sale and as a delivered order for quests', () => {
    useGameStore.setState({
      orders: [order()],
      items: { carrot: 3, egg: 1 },
      quests: [dailyQuest('earn_gold', 1000), dailyQuest('deliver_order', 2)],
    });
    store().deliverOrder('ord_test');
    expect(store().quests.map((q) => q.progress)).toEqual([250, 1]);
  });

  it('earns experience for the order and for the gold', () => {
    useGameStore.setState({ orders: [order()], items: { carrot: 3, egg: 1 }, xp: 0 });
    store().deliverOrder('ord_test');
    // 10 XP for the order and 1 XP per 25 gold earned
    expect(store().xp).toBe(20);
  });
});

describe('refusing an order', () => {
  it('takes it off the board and leaves the bag and the purse alone', () => {
    useGameStore.setState({
      orders: [order(), order({ id: 'ord_other' })],
      items: { carrot: 3, egg: 1 },
      gold: 0,
    });
    store().discardOrder('ord_test');
    expect(store().orders.map((o) => o.id)).toEqual(['ord_other']);
    expect(store().items).toEqual({ carrot: 3, egg: 1 });
    expect(store().gold).toBe(0);
  });
});

describe('a new morning', () => {
  it('fills the free slots and keeps the open orders', () => {
    useGameStore.setState({ orders: [order()] });
    nextDay();
    expect(store().orders).toHaveLength(3);
    expect(store().orders[0]).toEqual(order());
  });

  it('reports how many new orders came in', () => {
    useGameStore.setState({ orders: [order()] });
    nextDay();
    expect(store().lastDaySummary?.newOrders).toBe(2);
  });
});
