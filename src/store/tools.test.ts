import { beforeEach, describe, expect, it } from 'vitest';
import { QuestItem, TileData } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
// The farm turned over to the next morning, as the clock does at midnight
const nextDay = () => store().startNewDay(store().day + 1);
const tileAt = (id: string) => store().tiles.find((t) => t.id === id) as TileData;

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const questOf = (type: QuestItem['type']): QuestItem => ({
  id: `test_${type}`,
  category: 'daily',
  title: 'Test',
  desc: '',
  icon: '',
  type,
  target: 50,
  progress: 0,
  claimed: false,
  rewardGold: 0,
  rewardGems: 0,
});

// Freshly tilled, dry 3×3 block around tile 6-6 (the starter carrot on 7-7 is cleared too)
const tillAround66 = () =>
  useGameStore.setState({
    tiles: store().tiles.map((t) =>
      t.r >= 5 && t.r <= 7 && t.c >= 5 && t.c <= 7
        ? { ...t, state: 'tilled' as const, crop: null, stage: 0, watered: false }
        : t
    ),
  });

describe('upgraded tools', () => {
  it('a copper hoe tills the clicked tile and its row neighbours for 1 energy each', () => {
    useGameStore.setState({
      toolTiers: { hoe: 1, water: 0 },
      activeTool: 'hoe',
      energy: 50,
      quests: [questOf('till')],
    });
    store().interactTile(6, 6);
    expect(['6-5', '6-6', '6-7'].map((id) => tileAt(id).state)).toEqual(['tilled', 'tilled', 'tilled']);
    expect(tileAt('5-6').state).toBe('empty');
    expect(store().energy).toBe(47);
    expect(store().quests[0].progress).toBe(3);
  });

  it('a gold watering can waters the 3×3 square, one water per tile', () => {
    tillAround66();
    useGameStore.setState({ toolTiers: { hoe: 0, water: 2 }, activeTool: 'water', energy: 50, water: 40 });
    store().interactTile(6, 6);
    expect(store().tiles.filter((t) => t.watered && t.r >= 5 && t.r <= 7 && t.c >= 5 && t.c <= 7)).toHaveLength(9);
    expect(store().water).toBe(31);
    expect(store().energy).toBe(41);
  });

  it('stops when the can runs dry, starting with the clicked tile', () => {
    tillAround66();
    useGameStore.setState({ toolTiers: { hoe: 0, water: 2 }, activeTool: 'water', energy: 50, water: 2 });
    store().interactTile(6, 6);
    expect(tileAt('6-6').watered).toBe(true);
    expect(store().tiles.filter((t) => t.watered && t.r >= 5 && t.r <= 7 && t.c >= 5 && t.c <= 7)).toHaveLength(2);
    expect(store().water).toBe(0);
  });

  it('leaves land that is not yours alone', () => {
    // 4-4 is the north-west corner of the starter field; the tiles north and west of it are locked
    useGameStore.setState({ toolTiers: { hoe: 2, water: 0 }, activeTool: 'hoe', energy: 50 });
    store().interactTile(4, 4);
    expect(store().tiles.filter((t) => t.state === 'tilled' && t.r <= 5 && t.c <= 5)).toHaveLength(4);
    expect(store().energy).toBe(46);
  });
});

describe('buying upgrades', () => {
  it('upgrades the hoe for gold', () => {
    useGameStore.setState({ gold: 500, gems: 0 });
    store().buyToolUpgrade('hoe');
    expect(store().toolTiers.hoe).toBe(1);
    expect(store().gold).toBe(0);
  });

  it('needs the gems as well for a gold tool', () => {
    useGameStore.setState({ toolTiers: { hoe: 1, water: 0 }, gold: 5000, gems: 0 });
    store().buyToolUpgrade('hoe');
    expect(store().toolTiers.hoe).toBe(1);
    expect(store().gold).toBe(5000);
  });

  it('fills a bigger watering can at the well', () => {
    useGameStore.setState({ toolTiers: { hoe: 0, water: 2 }, water: 0 });
    store().refillWater();
    expect(store().water).toBe(40);
  });
});

describe('sprinklers', () => {
  it('are bought at the shop', () => {
    useGameStore.setState({ gold: 300, sprinklers: 0 });
    store().buySprinkler();
    expect(store().sprinklers).toBe(1);
    expect(store().gold).toBe(0);
  });

  it('stand on an empty field tile', () => {
    useGameStore.setState({ sprinklers: 1, placingSprinkler: true });
    store().placeSprinkler(6, 6);
    expect(tileAt('6-6').sprinkler).toBe(true);
    expect(store().sprinklers).toBe(0);
    expect(store().placingSprinkler).toBe(false);
  });

  it('cannot stand on a growing crop', () => {
    // 7-7 holds a carrot in a new game
    useGameStore.setState({ sprinklers: 1, placingSprinkler: true });
    store().placeSprinkler(7, 7);
    expect(tileAt('7-7').sprinkler).toBeFalsy();
    expect(store().sprinklers).toBe(1);
  });

  it('water the worked tiles around them every morning', () => {
    useGameStore.setState({
      tiles: store().tiles.map((t) =>
        t.id === '6-6' ? { ...t, sprinkler: true } : t.id === '6-7' ? { ...t, state: 'tilled' as const } : t
      ),
    });
    nextDay();
    expect(tileAt('6-7').watered).toBe(true);
  });

  it('are picked back up with the basket', () => {
    useGameStore.setState({
      tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, sprinkler: true } : t)),
      sprinklers: 0,
      activeTool: 'basket',
    });
    store().interactTile(6, 6);
    expect(tileAt('6-6').sprinkler).toBeFalsy();
    expect(store().sprinklers).toBe(1);
  });

  it('are not tilled over by a wide hoe', () => {
    useGameStore.setState({
      tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, sprinkler: true } : t)),
      toolTiers: { hoe: 1, water: 0 },
      activeTool: 'hoe',
      energy: 50,
    });
    store().interactTile(6, 5);
    expect(tileAt('6-6')).toMatchObject({ sprinkler: true, state: 'empty' });
    expect(tileAt('6-4').state).toBe('tilled');
    expect(tileAt('6-5').state).toBe('tilled');
  });
});
