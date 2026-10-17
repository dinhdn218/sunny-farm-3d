import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { beachFinds } from '@/lib/forage';
import { WHEEL_PRIZES } from '@/config/luckyWheel';
import { CLAW_PRICE, CLAW_PRIZES } from '@/config/claw';
import { DAY_MS, resetClock, skipClock, todayKey } from '@/lib/clock';
import { QuestItem } from '@/types/game';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState({ ...initialState, playerPos: { x: 0, z: 0, rotY: 0, actionTime: 0 } }, true);
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

describe('beach finds', () => {
  it('go into the bag once each, only at the Beach', () => {
    const [first] = beachFinds(1);
    useGameStore.setState({ currentWorld: 'park', day: 1, items: {} });
    store().collectBeachFind(first.spot);
    expect(store().items).toEqual({});

    useGameStore.setState({ currentWorld: 'beach' });
    store().collectBeachFind(first.spot);
    store().collectBeachFind(first.spot);
    expect(store().items[first.item]).toBe(1);
    expect(store().beachTaken).toEqual([first.spot]);
  });

  it('come back the next day', () => {
    const [first] = beachFinds(1);
    useGameStore.setState({ currentWorld: 'beach', day: 1, items: {} });
    store().collectBeachFind(first.spot);
    useGameStore.setState({ day: 2 });
    const [next] = beachFinds(2);
    store().collectBeachFind(next.spot);
    expect(store().beachTaken).toEqual([next.spot]);
  });

  it('ignore spots with nothing on them today', () => {
    const used = new Set(beachFinds(1).map((f) => f.spot));
    const empty = Array.from({ length: 16 }, (_, i) => i).find((i) => !used.has(i))!;
    useGameStore.setState({ currentWorld: 'beach', day: 1, items: {} });
    store().collectBeachFind(empty);
    expect(store().items).toEqual({});
  });
});

describe('lucky wheel', () => {
  it('spins once a day and pays the prize at once', () => {
    useGameStore.setState({ lastWheelDate: null, gold: 0, gems: 0, breadCount: 0 });
    const index = store().spinLuckyWheel();
    expect(index).not.toBeNull();
    const prize = WHEEL_PRIZES[index!];
    expect(store().gold).toBe(prize.gold ?? 0);
    expect(store().gems).toBe(prize.gems ?? 0);
    expect(store().lastWheelDate).toBe(todayKey());
    expect(store().spinLuckyWheel()).toBeNull();
  });

  it('follows the game clock, not the device date', () => {
    useGameStore.setState({ lastWheelDate: null });
    store().spinLuckyWheel();
    expect(store().spinLuckyWheel()).toBeNull();
    skipClock(DAY_MS);
    expect(store().spinLuckyWheel()).not.toBeNull();
    resetClock();
  });
});

describe('claw machine', () => {
  it('takes a coin per go, and only with enough gold', () => {
    useGameStore.setState({ gold: CLAW_PRICE });
    expect(store().payClaw()).toBe(true);
    expect(store().gold).toBe(0);
    expect(store().payClaw()).toBe(false);
  });

  it('pays out the toy that was grabbed', () => {
    const bear = CLAW_PRIZES.findIndex((p) => p.bread);
    useGameStore.setState({ breadCount: 0 });
    store().winClawPrize(bear);
    expect(store().breadCount).toBe(CLAW_PRIZES[bear].bread);
  });
});

describe('card games', () => {
  it('pay winnings and count the game', () => {
    useGameStore.setState({ gold: 100, quests: [questOf('card_game'), questOf('card_win')] });
    store().casinoPayout(40, 0);
    expect(store().gold).toBe(140);
    expect(store().quests.map((q) => q.progress)).toEqual([1, 1]);
  });

  it('never take gold below zero', () => {
    useGameStore.setState({ gold: 30 });
    store().casinoPayout(-100, 3);
    expect(store().gold).toBe(0);
    useGameStore.setState({ gold: 30 });
    store().casinoForfeit(200);
    expect(store().gold).toBe(0);
  });
});
