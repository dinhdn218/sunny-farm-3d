import { beforeEach, describe, expect, it } from 'vitest';
import { QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { bugsInPark, netZoneWidth } from '@/lib/bugs';
import { BUGS } from '@/config/bugs';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const eatQuest: QuestItem = {
  id: 'test_eat',
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type: 'eat',
  target: 3,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
};

describe('eating a dish from the workshop', () => {
  it('takes one from the bag, gives stamina back and its buff until bedtime', () => {
    useGameStore.setState({ day: 4, energy: 50, items: { fish_stew: 2 }, quests: [eatQuest] });
    store().eatFood('fish_stew');
    expect(store().items).toEqual({ fish_stew: 1 });
    expect(store().energy).toBe(80);
    expect(store().buff).toEqual({ id: 'angler', food: 'fish_stew', day: 4 });
    expect(store().quests[0].progress).toBe(1);
  });

  it('only eats food that is in the bag', () => {
    useGameStore.setState({ day: 4, energy: 50, items: { fish_sauce: 1, carrot: 3 } });
    store().eatFood('fish_sauce');
    store().eatFood('carrot');
    store().eatFood('flan');
    expect(store().items).toEqual({ fish_sauce: 1, carrot: 3 });
    expect(store().energy).toBe(50);
    expect(store().buff).toBeNull();
  });

  it('still gives the buff on a full stomach', () => {
    useGameStore.setState({ day: 4, energy: 100, items: { orange_juice: 1 } });
    store().eatFood('orange_juice');
    expect(store().energy).toBe(100);
    expect(store().buff?.id).toBe('swift');
  });

  it('lets a hearty meal fill the stamina bar past 100, and bread top it up', () => {
    useGameStore.setState({ day: 4, energy: 100, items: { pumpkin_pie: 1 }, breadCount: 1 });
    store().eatFood('pumpkin_pie');
    expect(store().energy).toBe(130);
    useGameStore.setState({ energy: 110 });
    store().eatBread();
    expect(store().energy).toBe(130);
    expect(store().breadCount).toBe(0);
  });

  it('swaps the buff for the new dish’s, and the extra stamina goes with it', () => {
    useGameStore.setState({ day: 4, energy: 125, items: { mango_smoothie: 1 }, buff: { id: 'stamina', food: 'honey_cake', day: 4 } });
    store().eatFood('mango_smoothie');
    expect(store().buff?.id).toBe('swift');
    expect(store().energy).toBe(100);
  });

  it('wears off overnight', () => {
    useGameStore.setState({ day: 4, energy: 120, buff: { id: 'stamina', food: 'cheese', day: 4 } });
    store().nextDay();
    expect(store().buff).toBeNull();
    expect(store().energy).toBe(100);
  });
});

describe('a sweet dish and the bug net', () => {
  const DAY = 3;
  const first = () => bugsInPark(DAY, 'morning')[0];

  it('widens the green zone by 40%, so a near miss is netted', () => {
    useGameStore.setState({
      currentWorld: 'park',
      day: DAY,
      timePhaseIndex: 0,
      energy: 50,
      items: {},
      buff: { id: 'netter', food: 'flan', day: DAY },
    });
    store().startBugCatch(first().spot);
    const plain = netZoneWidth(BUGS[first().bug].difficulty);
    const { zone, width } = store().bugCatch!;
    expect(width).toBeCloseTo(plain * 1.4);
    // Outside the usual zone, inside the wider one
    const offset = plain * 0.6;
    store().swingNet(zone > 0.5 ? zone - offset : zone + offset);
    expect(store().bugCatch).toMatchObject({ stage: 'result', caught: true });
  });

  it('keeps the usual zone without one', () => {
    useGameStore.setState({ currentWorld: 'park', day: DAY, timePhaseIndex: 0, energy: 50, items: {} });
    store().startBugCatch(first().spot);
    expect(store().bugCatch!.width).toBe(netZoneWidth(BUGS[first().bug].difficulty));
  });
});
