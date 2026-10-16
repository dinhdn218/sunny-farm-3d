import { beforeEach, describe, expect, it } from 'vitest';
import { Order, QuestItem } from '@/types/game';
import { RESIDENTS } from '@/config/npcs';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const linh = RESIDENTS.linh_chi;
const friendship = () => store().friendship.linh_chi ?? 0;

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

describe('talking to a resident', () => {
  it('makes friends, once a day', () => {
    store().talkTo('linh_chi');
    store().talkTo('linh_chi');
    expect(friendship()).toBe(2);
    useGameStore.setState({ day: store().day + 1 });
    store().talkTo('linh_chi');
    expect(friendship()).toBe(4);
  });
});

describe('a gift', () => {
  it('leaves the bag and pleases them as much as they like it', () => {
    useGameStore.setState({ items: { [linh.loves[0]]: 2 } });
    store().giveGift('linh_chi', linh.loves[0]);
    expect(store().items).toEqual({ [linh.loves[0]]: 1 });
    expect(friendship()).toBe(10);
    expect(store().giftLog.linh_chi).toEqual([linh.loves[0]]);
  });

  it('is given once a day', () => {
    useGameStore.setState({ items: { [linh.likes[0]]: 2 } });
    store().giveGift('linh_chi', linh.likes[0]);
    store().giveGift('linh_chi', linh.likes[0]);
    expect(store().items).toEqual({ [linh.likes[0]]: 1 });
    expect(friendship()).toBe(5);
  });

  it('they hate costs friendship, but never below nothing', () => {
    useGameStore.setState({ friendship: { linh_chi: 3 }, items: { [linh.hates[0]]: 1 } });
    store().giveGift('linh_chi', linh.hates[0]);
    expect(friendship()).toBe(0);
  });

  it('counts for gift quests', () => {
    const quest: QuestItem = {
      id: 'test_gift', category: 'daily', title: 'T', desc: '', icon: '', type: 'give_gift',
      target: 1, progress: 0, claimed: false, rewardGold: 0, rewardGems: 0,
    };
    useGameStore.setState({ items: { carrot: 1 }, quests: [quest] });
    store().giveGift('linh_chi', 'carrot');
    expect(store().quests[0].progress).toBe(1);
  });
});

describe('a new heart', () => {
  it('brings a letter from the resident with a gift', () => {
    useGameStore.setState({ friendship: { linh_chi: 8 }, mail: [] });
    store().talkTo('linh_chi');
    expect(store().mail).toEqual([
      expect.objectContaining({ id: 'friend_linh_chi_1', from: linh.name, gift: { gold: 50, gems: 1 } }),
    ]);
  });
});

describe('delivering an order', () => {
  it('makes friends with the resident who placed it', () => {
    const order: Order = { id: 'o', customer: RESIDENTS.minh_quan.name, items: { carrot: 1 }, rewardGold: 60, rewardGems: 0 };
    useGameStore.setState({ orders: [order], items: { carrot: 1 } });
    store().deliverOrder('o');
    expect(store().friendship.minh_quan).toBe(3);
  });
});
