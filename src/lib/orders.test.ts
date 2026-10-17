import { describe, expect, it } from 'vitest';
import { AnimalSpecies, BuildPiece, FarmAnimal, ItemId, Order } from '@/types/game';
import { NPC_PRESETS } from '@/config/npcs';
import { ITEMS } from '@/config/items';
import { OrderFarm, orderReward, orderableItems, refillOrders } from '@/lib/orders';

const animal = (species: AnimalSpecies, id: string = species): FarmAnimal => ({
  id,
  species,
  name: id,
  fedToday: false,
  hasProduct: false,
  affection: 0,
  x: 0,
  z: 0,
});

// A fruit tree planted on day 1: mango trees bear from day 7, orange trees from day 6
const tree = (kind: 'mango_tree' | 'orange_tree', x = 0): BuildPiece => ({ kind, x, z: 8, rotY: 0, planted: 1 });

// A hive on the farm, with no flowerbeds around it
const hive = {
  decorPlacements: { decor_beehive: { x: 6, z: 3, rotY: 0 } },
  ownedCosmetics: ['decor_beehive'],
};

// A young farm: one hen, no machines, no fish caught, never been to the beach, no trees or hive
const farm = (over: Partial<OrderFarm> = {}): OrderFarm => ({
  day: 1,
  xp: 0,
  orders: [],
  animals: [animal('chicken')],
  machines: {},
  fishLog: {},
  visitedWorlds: ['farm'],
  buildPieces: [],
  decorPlacements: {},
  ownedCosmetics: [],
  ...over,
});

const sorted = (ids: ItemId[]) => [...ids].sort();
// Every crop has seeds in the shop, so every farm can grow any of them
const CROPS: ItemId[] = ['cabbage', 'carrot', 'corn', 'pumpkin', 'strawberry', 'tomato', 'watermelon', 'wheat'];
const lines = (order: Order) => Object.entries(order.items) as [ItemId, number][];

// Every order posted over a couple of months, one fresh board per day
const ordersOver = (days: number, over: Partial<OrderFarm> = {}) =>
  Array.from({ length: days }, (_, i) => refillOrders(farm({ ...over, day: i + 1 }))).flat();

// XP needed to reach level 5 and level 10 (100 + 150 + … per level)
const LEVEL_5_XP = 700;
const LEVEL_10_XP = 2700;

describe('orderableItems', () => {
  it('asks a young farm only for crops and what its animals give', () => {
    expect(sorted(orderableItems(farm()))).toEqual(sorted([...CROPS, 'egg']));
  });

  it('adds goods from the machines owned, when the farm can get their ingredients', () => {
    const pool = orderableItems(
      farm({
        animals: [animal('chicken'), animal('cow')],
        // No sheep for the loom and no mackerel for the fish stew; the oven's bread goes to the hotbar
        machines: {
          machine_cheese: { job: null },
          machine_kitchen: { job: null },
          machine_loom: { job: null },
          machine_oven: { job: null },
        },
      })
    );
    expect(sorted(pool)).toEqual(
      sorted([
        ...CROPS,
        'carrot_juice',
        'cheese',
        'corn_pudding',
        'egg',
        'flan',
        'milk',
        'pumpkin_pie',
        'strawberry_jam',
        'tomato_sauce',
      ])
    );
  });

  it('asks for fruit once the trees bear, and for honey from a hive', () => {
    expect(orderableItems(farm({ day: 6, buildPieces: [tree('mango_tree')] }))).not.toContain('mango');
    expect(orderableItems(farm({ day: 7, buildPieces: [tree('mango_tree')] }))).toContain('mango');
    expect(orderableItems(farm({ day: 6, buildPieces: [tree('orange_tree')] }))).toContain('orange');
    expect(orderableItems(farm())).not.toContain('honey');
    expect(orderableItems(farm(hive))).toContain('honey');
  });

  it('blends fruit drinks only from fruit the farm grows', () => {
    const blender = { machine_blender: { job: null } };
    const drinks = (over: Partial<OrderFarm>) =>
      orderableItems(farm({ machines: blender, ...over })).filter((id) => ITEMS[id].kind === 'artisan');
    // Watermelon is a crop, so its shaved ice can always be made
    expect(sorted(drinks({}))).toEqual(['watermelon_ice']);
    expect(sorted(drinks({ day: 7, buildPieces: [tree('mango_tree'), tree('orange_tree', 2)] }))).toEqual(
      sorted(['mango_smoothie', 'orange_juice', 'watermelon_ice'])
    );
  });

  it('bakes honey cake for a farm with a hive', () => {
    const oven = { machine_oven: { job: null } };
    expect(orderableItems(farm({ machines: oven }))).not.toContain('honey_cake');
    expect(orderableItems(farm({ machines: oven, ...hive }))).toContain('honey_cake');
  });

  it('asks for fish the farmer has caught, but never rare fish or junk', () => {
    const caught = { caught: 1, best: 40 };
    const pool = orderableItems(
      farm({ animals: [], fishLog: { carp: caught, mackerel: caught, tuna: caught, old_boot: caught } })
    );
    expect(sorted(pool)).toEqual(sorted([...CROPS, 'carp', 'mackerel']));
  });

  it('asks only for fish that bite this season', () => {
    const caught = { caught: 1, best: 40 };
    const fishLog = { mackerel: caught, crab: caught };
    // Day 1 is in spring, day 8 in summer, when the mackerel are gone
    expect(orderableItems(farm({ day: 1, fishLog }))).toEqual(expect.arrayContaining(['mackerel', 'crab']));
    expect(orderableItems(farm({ day: 8, fishLog }))).not.toContain('mackerel');
    expect(orderableItems(farm({ day: 8, fishLog }))).toContain('crab');
  });

  it('cooks fish stew only for a farmer who has caught mackerel', () => {
    const kitchen = { machine_kitchen: { job: null } };
    expect(orderableItems(farm({ machines: kitchen }))).not.toContain('fish_stew');
    expect(
      orderableItems(farm({ machines: kitchen, fishLog: { mackerel: { caught: 1, best: 40 } } }))
    ).toContain('fish_stew');
  });

  it('asks for beach finds once the farmer has been to the beach, but not for pearls', () => {
    const pool = orderableItems(farm({ animals: [], visitedWorlds: ['farm', 'beach'] }));
    expect(sorted(pool)).toEqual(sorted([...CROPS, 'coral', 'shell', 'starfish']));
  });
});

describe('orderReward', () => {
  it('pays half again what the goods sell for, rounded to 5 gold', () => {
    expect(orderReward({ carrot: 4 })).toEqual({ rewardGold: 240, rewardGems: 0 });
    // 18 × 1.5 = 27 and 32 × 1.5 = 48
    expect(orderReward({ shell: 1 })).toEqual({ rewardGold: 25, rewardGems: 0 });
    expect(orderReward({ starfish: 1 })).toEqual({ rewardGold: 50, rewardGems: 0 });
  });

  it('adds a diamond for every 400 gold, up to 3', () => {
    expect(orderReward({ carrot_juice: 2 })).toEqual({ rewardGold: 510, rewardGems: 1 });
    expect(orderReward({ cheese: 2, egg: 2 })).toEqual({ rewardGold: 915, rewardGems: 2 });
    expect(orderReward({ pumpkin_pie: 2, milk: 2 })).toEqual({ rewardGold: 2310, rewardGems: 3 });
  });
});

describe('refillOrders', () => {
  const open: Order = { id: 'ord_old', customer: 'Linh Chi 🌸', items: { carrot: 3 }, rewardGold: 180, rewardGems: 0 };

  it('fills an empty board with three orders', () => {
    expect(refillOrders(farm())).toHaveLength(3);
  });

  it('keeps the open orders and fills only the empty slots', () => {
    const board = refillOrders(farm({ orders: [open] }));
    expect(board).toHaveLength(3);
    expect(board[0]).toEqual(open);
  });

  it('leaves a full board as it is', () => {
    const board = refillOrders(farm());
    expect(refillOrders(farm({ day: 2, orders: board }))).toEqual(board);
  });

  it('opens a fourth slot at level 10', () => {
    expect(refillOrders(farm({ xp: LEVEL_10_XP - 1 }))).toHaveLength(3);
    expect(refillOrders(farm({ xp: LEVEL_10_XP }))).toHaveLength(4);
  });

  it('posts the same orders for the same day, and new ones the next day', () => {
    const content = (orders: Order[]) => orders.map(({ id: _id, ...order }) => order);
    expect(refillOrders(farm({ day: 9 }))).toEqual(refillOrders(farm({ day: 9 })));
    expect(content(refillOrders(farm({ day: 10 })))).not.toEqual(content(refillOrders(farm({ day: 9 }))));
  });

  it('gives every order on the board its own id', () => {
    const first = refillOrders(farm({ day: 3 }));
    // The last one delivered on day 3; the board is topped up the next morning
    const next = refillOrders(farm({ day: 4, orders: first.slice(0, 2) }));
    expect(new Set(next.map((o) => o.id)).size).toBe(3);
  });

  it('only asks for goods the farm can produce', () => {
    const allowed = [...CROPS, 'egg'];
    ordersOver(40).forEach((order) => lines(order).forEach(([id]) => expect(allowed).toContain(id)));
  });

  it('asks for one or two kinds of goods below level 5, and up to three from level 5', () => {
    const kinds = (orders: Order[]) => orders.map((o) => lines(o).length);
    expect(Math.max(...kinds(ordersOver(40)))).toBe(2);
    expect(Math.min(...kinds(ordersOver(40)))).toBe(1);
    expect(Math.max(...kinds(ordersOver(40, { xp: LEVEL_5_XP })))).toBe(3);
  });

  it('asks for more of the cheap goods and fewer of the dear ones', () => {
    const range: Partial<Record<ItemId, [number, number]>> = {
      carrot: [3, 6],
      wheat: [2, 4],
      tomato: [2, 4],
      pumpkin: [1, 2],
      strawberry: [2, 4],
      watermelon: [1, 2],
      corn: [2, 4],
      cabbage: [2, 4],
    };
    ordersOver(60, { animals: [] }).forEach((order) =>
      lines(order).forEach(([id, n]) => {
        const [min, max] = range[id]!;
        expect(n).toBeGreaterThanOrEqual(min);
        expect(n).toBeLessThanOrEqual(max);
      })
    );
  });

  it('never asks for more animal products than two days of the herd give', () => {
    const eggs = (orders: Order[]) => orders.map((o) => o.items.egg ?? 0);
    expect(Math.max(...eggs(ordersOver(60)))).toBeLessThanOrEqual(2);
    const hens = [animal('chicken', 'c1'), animal('chicken', 'c2'), animal('chicken', 'c3')];
    expect(Math.max(...eggs(ordersOver(60, { animals: hens })))).toBeGreaterThan(2);
  });

  it('never asks for more fruit than two days of the trees give', () => {
    const mangoes = (orders: Order[]) => orders.map((o) => o.items.mango ?? 0);
    expect(Math.max(...mangoes(ordersOver(60, { buildPieces: [tree('mango_tree')] })))).toBe(2);
    const grove = [tree('mango_tree'), tree('mango_tree', 2), tree('mango_tree', 4)];
    expect(Math.max(...mangoes(ordersOver(60, { buildPieces: grove })))).toBeGreaterThan(2);
  });

  it('pays more than the shipping bin would for the same goods', () => {
    const price: Partial<Record<ItemId, number>> = {
      carrot: 40,
      wheat: 70,
      tomato: 65,
      pumpkin: 300,
      strawberry: 55,
      watermelon: 220,
      corn: 80,
      cabbage: 115,
      egg: 45,
    };
    ordersOver(40).forEach((order) => {
      const binValue = lines(order).reduce((sum, [id, n]) => sum + price[id]! * n, 0);
      expect(order.rewardGold).toBeGreaterThan(binValue);
    });
  });

  it('comes from the residents of the island', () => {
    const residents = NPC_PRESETS.map((npc) => npc.name);
    ordersOver(20).forEach((order) => expect(residents).toContain(order.customer));
  });
});
