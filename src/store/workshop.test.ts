import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemCounts, ItemId, MachineId, RecipeId } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { ITEMS } from '@/config/items';
import { MACHINE_LIST, RECIPES } from '@/config/machines';
import { COLLECTION_SETS } from '@/lib/collection';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

// A machine bought and set down on the farm, and what is in the bag
const withMachine = (id: MachineId, items: ItemCounts) =>
  useGameStore.setState({
    machines: { [id]: { job: null } },
    decorPlacements: { [id]: { x: 9, z: 4, rotY: 0 } },
    items,
  });

const worth = (counts: ItemCounts) =>
  (Object.entries(counts) as [ItemId, number][]).reduce((sum, [id, n]) => sum + ITEMS[id].sellPrice * n, 0);

describe('recipes', () => {
  it('are each listed by the machine that makes them, and by no other', () => {
    (Object.keys(RECIPES) as RecipeId[]).forEach((id) => {
      const makers = MACHINE_LIST.filter((m) => m.recipes.includes(id)).map((m) => m.id);
      expect(makers, id).toEqual([RECIPES[id].machine]);
    });
  });

  it('make goods worth about half again what went into them', () => {
    Object.values(RECIPES).forEach(({ id, inputs, output }) => {
      if (output.id === 'bread') return;
      const ratio = worth({ [output.id]: output.count }) / worth(inputs);
      expect(ratio, id).toBeGreaterThanOrEqual(1.4);
      expect(ratio, id).toBeLessThanOrEqual(1.65);
    });
  });

  it('can each be started with just their ingredients', () => {
    Object.values(RECIPES).forEach((recipe) => {
      useGameStore.setState(initialState, true);
      withMachine(recipe.machine, { ...recipe.inputs });
      store().startRecipe(recipe.id);
      expect(store().items, recipe.id).toEqual({});
      expect(store().machines[recipe.machine]?.job?.recipeId, recipe.id).toBe(recipe.id);
    });
  });
});

describe('the blender and the crock', () => {
  const start = new Date('2026-10-16T08:00:00Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(start);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('are sold at the workshop', () => {
    useGameStore.setState({ gold: 1000 });
    store().buyMachine('machine_blender');
    store().buyMachine('machine_crock');
    expect(store().gold).toBe(1000 - 300 - 500);
    expect(store().machines).toEqual({ machine_blender: { job: null }, machine_crock: { job: null } });
  });

  it('blends a mango from the farm’s tree into a smoothie in a minute', () => {
    withMachine('machine_blender', { mango: 2 });
    store().startRecipe('mango_smoothie');
    expect(store().items).toEqual({ mango: 1 });
    vi.setSystemTime(start + 61_000);
    store().collectMachine('machine_blender');
    expect(store().items).toEqual({ mango: 1, mango_smoothie: 1 });
  });

  it('brews fish sauce from three anchovies, slowly', () => {
    withMachine('machine_crock', { anchovy: 3 });
    store().startRecipe('fish_sauce');
    vi.setSystemTime(start + 120_000);
    store().collectMachine('machine_crock');
    expect(store().items).toEqual({});
    vi.setSystemTime(start + 241_000);
    store().collectMachine('machine_crock');
    expect(store().items).toEqual({ fish_sauce: 1 });
  });

  it('salts duck eggs only two at a time', () => {
    withMachine('machine_crock', { duck_egg: 1 });
    store().startRecipe('salted_egg');
    expect(store().items).toEqual({ duck_egg: 1 });
    expect(store().machines.machine_crock?.job).toBeNull();
  });
});

describe('the collection book', () => {
  it('has the new goods in the workshop set', () => {
    const artisan = COLLECTION_SETS.find((s) => s.id === 'artisan')!;
    expect(artisan.items).toEqual(
      expect.arrayContaining(['mango_smoothie', 'watermelon_ice', 'fish_sauce', 'truffle_oil', 'grilled_squid', 'fish_cake'])
    );
  });
});
