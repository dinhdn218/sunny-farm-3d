import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';

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
