import { beforeEach, describe, expect, it } from 'vitest';
import { NeighborVisit, QuestItem } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { weekKey } from '@/lib/leaderboard';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const helpQuest: QuestItem = {
  id: 'test_help',
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type: 'help_neighbor',
  target: 2,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
};

const visit = (id: number, kind: NeighborVisit['kind']): NeighborVisit => ({
  id,
  visitorId: `u${id}`,
  visitorName: `Người ${id}`,
  kind,
});

// Ten dry carrots still growing, and nothing else watered
const dryField = () =>
  store().tiles.map((t, i) =>
    i < 10 ? { ...t, state: 'planted' as const, crop: 'carrot' as const, stage: 1, watered: false } : { ...t, watered: false }
  );

describe('visits from other players', () => {
  it('water the field, leave a letter with gold and count the likes for the week', () => {
    useGameStore.setState({ tiles: dryField(), mail: [], neighborVisitsSeen: 0 });
    store().receiveNeighborVisits([visit(1, 'water'), visit(2, 'like'), visit(3, 'like')]);
    expect(store().tiles.filter((t) => t.watered)).toHaveLength(4);
    expect(store().mail[0]).toMatchObject({ id: 'visits_3', gift: { gold: 30 }, read: false });
    expect(store().weekly).toMatchObject({ week: weekKey(new Date()), likes: 2 });
    expect(store().neighborVisitsSeen).toBe(3);
  });

  it('count each visit once', () => {
    useGameStore.setState({ tiles: dryField(), mail: [], neighborVisitsSeen: 0 });
    store().receiveNeighborVisits([visit(1, 'like')]);
    store().receiveNeighborVisits([visit(1, 'like'), visit(2, 'water')]);
    store().receiveNeighborVisits([visit(2, 'water')]);
    expect(store().mail.map((l) => l.id)).toEqual(['visits_2', 'visits_1']);
    expect(store().weekly.likes).toBe(1);
    expect(store().tiles.filter((t) => t.watered)).toHaveLength(4);
  });
});

describe('liking a resident’s farm', () => {
  it('makes a little friendship once a day and counts for the neighbour quest', () => {
    useGameStore.setState({ day: 5, friendship: {}, quests: [helpQuest] });
    store().likeResidentFarm('linh_chi');
    store().likeResidentFarm('linh_chi');
    expect(store().friendship.linh_chi).toBe(2);
    expect(store().quests[0].progress).toBe(1);
  });

  it('can be done again the next day, even after talking to someone that day', () => {
    useGameStore.setState({ day: 5, friendship: {} });
    store().likeResidentFarm('linh_chi');
    useGameStore.setState({ day: 6 });
    store().talkTo('minh_quan');
    store().likeResidentFarm('linh_chi');
    expect(store().friendship.linh_chi).toBe(4);
  });
});

describe('helping another player', () => {
  it('counts for the neighbour quest', () => {
    useGameStore.setState({ quests: [helpQuest] });
    store().helpedNeighbor('water', 'Lan');
    store().helpedNeighbor('like', 'Lan');
    expect(store().quests[0].progress).toBe(2);
  });
});
