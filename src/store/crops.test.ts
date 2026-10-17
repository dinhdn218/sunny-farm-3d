import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { dayStartMs, gameDayAt } from '@/lib/clock';
import { isWet, weatherOf } from '@/lib/seasons';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

const ripe = (crop: 'strawberry' | 'corn') =>
  useGameStore.setState({
    tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, state: 'planted' as const, crop, stage: 3 } : t)),
    activeTool: 'basket',
    items: {},
  });

describe('new crops', () => {
  it('sells strawberry, watermelon, corn and cabbage seeds at the shop', () => {
    useGameStore.setState({ gold: 1000, seeds: { carrot: 0, wheat: 0, tomato: 0, pumpkin: 0 } as never });
    store().buySeed('watermelon', 2);
    expect(store().seeds.watermelon).toBe(2);
    expect(store().gold).toBe(1000 - 2 * 70);
  });

  it('keeps the strawberry plant after picking, like tomatoes', () => {
    ripe('strawberry');
    store().interactTile(6, 6);
    expect(store().items).toEqual({ strawberry: 1 });
    expect(store().tiles.find((t) => t.id === '6-6')).toMatchObject({ state: 'planted', crop: 'strawberry', stage: 2 });
  });

  it('clears the tile once the corn is picked', () => {
    ripe('corn');
    store().interactTile(6, 6);
    expect(store().items).toEqual({ corn: 1 });
    expect(store().tiles.find((t) => t.id === '6-6')).toMatchObject({ state: 'tilled', crop: null });
  });
});

describe('the seed slot', () => {
  it('remembers the seeds last taken out', () => {
    store().setActiveTool('seed_corn');
    store().setActiveTool('hoe');
    expect(store().lastSeedCrop).toBe('corn');
  });
});

describe('strawberry jam', () => {
  it('is cooked in the kitchen from three strawberries', () => {
    useGameStore.setState({
      machines: { machine_kitchen: { job: null } },
      decorPlacements: { machine_kitchen: { x: 9, z: 4, rotY: 0 } },
      items: { strawberry: 3 },
    });
    store().startRecipe('strawberry_jam');
    expect(store().items).toEqual({});
    expect(store().machines.machine_kitchen?.job?.recipeId).toBe('strawberry_jam');
  });
});

const HOUR = 3_600_000;
// 10:00 in Vietnam on the first dry day from Monday 20/10/2026, so the rain waters nothing by itself
const DRY_DAY = (() => {
  for (let d = gameDayAt(Date.UTC(2026, 9, 20, 3)); ; d++) if (!isWet(weatherOf(d))) return d;
})();
const T = dayStartMs(DRY_DAY) + 10 * HOUR;
const tile66 = () => store().tiles.find((t) => t.id === '6-6')!;
const setTile66 = (patch: Partial<ReturnType<typeof tile66>>) =>
  useGameStore.setState({ tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, ...patch } : t)) });

describe('crops on real time', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T);
    useGameStore.setState({ day: DRY_DAY, fastCropsLeft: 0, energy: 100, water: 10 });
  });
  afterEach(() => vi.useRealTimers());

  it('a sown and watered carrot is ripe an hour later', () => {
    setTile66({ state: 'tilled', watered: false, crop: null, stage: 0 });
    useGameStore.setState({ activeTool: 'seed_carrot', seeds: { ...store().seeds, carrot: 1 } });
    store().interactTile(6, 6);
    expect(tile66()).toMatchObject({ state: 'planted', watered: false, readyAt: null });
    useGameStore.setState({ activeTool: 'water' });
    store().interactTile(6, 6);
    expect(tile66()).toMatchObject({ watered: true, readyAt: T + HOUR });
    vi.setSystemTime(T + HOUR - 1000);
    store().tickClock();
    expect(tile66().stage).toBe(2);
    vi.setSystemTime(T + HOUR);
    store().tickClock();
    expect(tile66().stage).toBe(3);
  });

  it("a new player's first crops ripen in five minutes", () => {
    setTile66({ state: 'tilled', watered: true, crop: null, stage: 0 });
    useGameStore.setState({ fastCropsLeft: 5, activeTool: 'seed_pumpkin', seeds: { ...store().seeds, pumpkin: 1 } });
    store().interactTile(6, 6);
    expect(store().fastCropsLeft).toBe(4);
    expect(tile66().readyAt).toBe(T + 5 * 60_000);
  });

  it('a crop next to a sprinkler is watered as soon as it is sown', () => {
    useGameStore.setState({
      tiles: store().tiles.map((t) =>
        t.id === '6-5' ? { ...t, sprinkler: true } : t.id === '6-6' ? { ...t, state: 'tilled' as const, watered: false } : t
      ),
      activeTool: 'seed_corn',
      seeds: { ...store().seeds, corn: 1 },
    });
    store().interactTile(6, 6);
    expect(tile66()).toMatchObject({ watered: true, readyAt: T + 2 * HOUR });
  });

  it('a picked tomato waits for water before growing back', () => {
    setTile66({ state: 'planted', crop: 'tomato', stage: 3, watered: true });
    useGameStore.setState({ activeTool: 'basket', items: {} });
    store().interactTile(6, 6);
    expect(store().items).toEqual({ tomato: 1 });
    expect(tile66()).toMatchObject({ stage: 2, watered: false, readyAt: null });
  });

  it('the watering can skips crops that are already growing', () => {
    setTile66({ state: 'planted', crop: 'carrot', stage: 1, watered: true, readyAt: T + HOUR, midAt: T + HOUR / 2 });
    useGameStore.setState({ activeTool: 'water', water: 5 });
    store().interactTile(6, 6);
    expect(store().water).toBe(5);
  });
});
