import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

const DURING = new Date(2026, 9, 20, 10, 0);
const AFTER = new Date(2026, 11, 1, 10, 0);
const NIGHT = 3;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(DURING);
});
afterEach(() => {
  vi.useRealTimers();
});

const questOf = (type: QuestItem['type'], patch: Partial<QuestItem> = {}): QuestItem => ({
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
  ...patch,
});

// A ripe pumpkin on tile 6-6 of the starter field
const ripePumpkin = () =>
  useGameStore.setState({
    tiles: store().tiles.map((t) =>
      t.id === '6-6' ? { ...t, state: 'planted' as const, crop: 'pumpkin' as const, stage: 3 } : t
    ),
    activeTool: 'basket',
  });

describe('candy', () => {
  it('comes with every pumpkin harvested during the festival', () => {
    ripePumpkin();
    useGameStore.setState({ candy: 0 });
    store().interactTile(6, 6);
    expect(store().candy).toBe(3);
  });

  it('is not handed out once the festival is over', () => {
    vi.setSystemTime(AFTER);
    ripePumpkin();
    useGameStore.setState({ candy: 0 });
    store().interactTile(6, 6);
    expect(store().candy).toBe(0);
  });

  it('comes with fish caught at night, which also counts for night fishing quests', () => {
    useGameStore.setState({
      candy: 0,
      timePhaseIndex: NIGHT,
      quests: [questOf('night_fish')],
      fishing: { spot: 'beach', stage: 'reeling', catchId: 'squid', size: 30, until: 0 },
    });
    store().landCatch();
    expect(store().candy).toBe(2);
    expect(store().quests[0].progress).toBe(1);
  });

  it('does not come with fish caught in the daytime', () => {
    useGameStore.setState({
      candy: 0,
      timePhaseIndex: 0,
      fishing: { spot: 'beach', stage: 'reeling', catchId: 'anchovy', size: 8, until: 0 },
    });
    store().landCatch();
    expect(store().candy).toBe(0);
  });
});

describe('the candy shop', () => {
  it('trades candy for a festival hat and puts it on', () => {
    useGameStore.setState({ currentWorld: 'park', candy: 30, quests: [questOf('event_shop')] });
    store().buyCandyItem('pumpkin_hat');
    expect(store().ownedCosmetics).toContain('pumpkin_hat');
    expect(store().cosmetics.hat).toBe('pumpkin_hat');
    expect(store().candy).toBe(5);
    expect(store().quests[0].progress).toBe(1);
  });

  it('only trades at its stall in the Park', () => {
    useGameStore.setState({ currentWorld: 'farm', candy: 30 });
    store().buyCandyItem('pumpkin_hat');
    expect(store().ownedCosmetics).not.toContain('pumpkin_hat');
    expect(store().candy).toBe(30);
  });

  it('needs enough candy', () => {
    useGameStore.setState({ currentWorld: 'park', candy: 10 });
    store().buyCandyItem('pumpkin_hat');
    expect(store().ownedCosmetics).not.toContain('pumpkin_hat');
  });

  it('is closed after the festival', () => {
    vi.setSystemTime(AFTER);
    useGameStore.setState({ currentWorld: 'park', candy: 30 });
    store().buyCandyItem('pumpkin_hat');
    expect(store().ownedCosmetics).not.toContain('pumpkin_hat');
  });

  it('festival items cannot be bought with gold in the fashion shop', () => {
    useGameStore.setState({ gold: 99999, gems: 9999 });
    store().buyOrEquipCosmetic('pumpkin_hat');
    expect(store().ownedCosmetics).not.toContain('pumpkin_hat');
    expect(store().gold).toBe(99999);
  });
});

describe('festival quests', () => {
  const doneEventQuest = () =>
    questOf('harvest', { id: 'e_pumpkins', category: 'event', target: 5, progress: 5, rewardCandy: 15, rewardGems: 5 });

  it('pay their candy reward', () => {
    useGameStore.setState({ candy: 0, gems: 0, quests: [doneEventQuest()] });
    store().claimQuest('e_pumpkins');
    expect(store().candy).toBe(15);
    expect(store().gems).toBe(5);
  });

  it('cannot be claimed once the festival is over', () => {
    vi.setSystemTime(AFTER);
    useGameStore.setState({ candy: 0, gems: 0, quests: [doneEventQuest()] });
    store().claimQuest('e_pumpkins');
    expect(store().candy).toBe(0);
    expect(store().quests[0].claimed).toBe(false);
  });
});
