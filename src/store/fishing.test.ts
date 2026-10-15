import { beforeEach, describe, expect, it } from 'vitest';
import { CatchId, QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { CATCHES, FISHING_SPOTS } from '@/config/fish';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const fishQuest = (): QuestItem => ({
  id: 'test_fish',
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type: 'fish',
  target: 5,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
});

const onTheLine = (catchId: CatchId, size: number, stage: 'bite' | 'reeling' = 'reeling') =>
  useGameStore.setState({
    currentWorld: 'beach',
    fishing: { spot: 'beach', stage, catchId, size, until: Date.now() + 1000 },
  });

describe('casting', () => {
  it('only works at the Beach', () => {
    useGameStore.setState({ currentWorld: 'farm', energy: 50 });
    store().startFishing();
    expect(store().fishing).toBeNull();
    expect(store().energy).toBe(50);
  });

  it('stands the player at the end of the jetty and costs 4 energy', () => {
    useGameStore.setState({ currentWorld: 'beach', energy: 50 });
    store().startFishing();
    expect(store().fishing).toMatchObject({ stage: 'waiting', spot: 'beach' });
    expect(store().energy).toBe(46);
    expect(store().playerPos).toMatchObject({ x: FISHING_SPOTS.beach.x, z: FISHING_SPOTS.beach.z });
  });

  it('casts into the Park pond for fresh-water fish', () => {
    useGameStore.setState({ currentWorld: 'park', energy: 50 });
    store().startFishing();
    expect(store().fishing?.spot).toBe('park');
    expect(CATCHES[store().fishing!.catchId].waters).toContain('pond');
  });

  it('walks to the zone’s fishing spot before casting', () => {
    useGameStore.setState({ currentWorld: 'park', energy: 50, playerPos: { x: 0, z: 16, rotY: 0, actionTime: 0 } });
    store().goFishing();
    expect(store().fishing).toBeNull();
    expect(store().walkGoal).toMatchObject({ x: FISHING_SPOTS.park.x, z: FISHING_SPOTS.park.z });
    store().reachGoal();
    expect(store().fishing?.spot).toBe('park');
  });

  it('needs the energy for a cast', () => {
    useGameStore.setState({ currentWorld: 'beach', energy: 3 });
    store().startFishing();
    expect(store().fishing).toBeNull();
    expect(store().energy).toBe(3);
  });

  it('does not cast again while a fish is on the line', () => {
    onTheLine('tuna', 100);
    useGameStore.setState({ energy: 50 });
    store().startFishing();
    expect(store().fishing).toMatchObject({ stage: 'reeling', catchId: 'tuna' });
    expect(store().energy).toBe(50);
  });

  it('lets the fish bite after the wait', () => {
    useGameStore.setState({ fishing: { spot: 'beach', stage: 'waiting', catchId: 'anchovy', size: 8, until: 0 } });
    store().fishBite();
    expect(store().fishing?.stage).toBe('bite');
  });

  it('stops when the player leaves the Beach', () => {
    useGameStore.setState({ currentWorld: 'beach', fishing: { spot: 'beach', stage: 'waiting', catchId: 'anchovy', size: 8, until: 0 } });
    store().setWorld('park');
    expect(store().fishing).toBeNull();
  });
});

describe('striking', () => {
  it('starts the fight with a fish that bit', () => {
    onTheLine('tuna', 100, 'bite');
    store().hookFish();
    expect(store().fishing?.stage).toBe('reeling');
  });

  it('pulls junk straight up without a fight', () => {
    onTheLine('old_boot', 26, 'bite');
    useGameStore.setState({ items: {} });
    store().hookFish();
    expect(store().items).toEqual({ old_boot: 1 });
    expect(store().fishing?.stage).toBe('result');
  });
});

describe('landing a catch', () => {
  it('puts the fish in the bag, logs it and counts it for fishing quests', () => {
    onTheLine('mackerel', 42);
    useGameStore.setState({ items: {}, fishLog: { mackerel: { caught: 2, best: 50 } }, quests: [fishQuest()] });

    store().landCatch();

    expect(store().items).toEqual({ mackerel: 1 });
    expect(store().fishLog.mackerel).toEqual({ caught: 3, best: 50 });
    expect(store().quests[0].progress).toBe(1);
    expect(store().fishing).toMatchObject({ stage: 'result', escaped: false, firstOfKind: false });
  });

  it('keeps the size record when a bigger fish comes up', () => {
    onTheLine('mackerel', 66);
    useGameStore.setState({ fishLog: { mackerel: { caught: 1, best: 50 } } });
    store().landCatch();
    expect(store().fishLog.mackerel).toEqual({ caught: 2, best: 66 });
  });

  it('marks the first catch of a kind', () => {
    onTheLine('octopus', 70);
    useGameStore.setState({ fishLog: {} });
    store().landCatch();
    expect(store().fishing?.firstOfKind).toBe(true);
    expect(store().fishLog.octopus).toEqual({ caught: 1, best: 70 });
  });

  it('opens a treasure chest for gold and gems', () => {
    onTheLine('treasure', 0);
    useGameStore.setState({ gold: 0, gems: 0, items: {} });
    store().landCatch();
    expect(store().gold).toBe(100);
    expect(store().gems).toBe(5);
    expect(store().items).toEqual({});
  });

  it('does not count an old boot as a fish', () => {
    onTheLine('old_boot', 27);
    useGameStore.setState({ items: {}, quests: [fishQuest()] });
    store().landCatch();
    expect(store().quests[0].progress).toBe(0);
  });

  it('gives nothing for a fish that got away', () => {
    onTheLine('tuna', 120);
    useGameStore.setState({ items: {} });
    store().loseFish();
    expect(store().items).toEqual({});
    expect(store().fishing).toMatchObject({ stage: 'result', escaped: true });
  });
});
