import { ArtisanId, FishId, ForageId, ItemCounts, ItemId, MachineId, Order, SaveData } from '@/types/game';
import { CROP_LIST } from '@/config/crops';
import { ANIMAL_LIST } from '@/config/animals';
import { CATCH_LIST } from '@/config/fish';
import { ITEMS } from '@/config/items';
import { MACHINES, RECIPES } from '@/config/machines';
import { NPC_PRESETS } from '@/config/npcs';
import { levelInfo } from '@/lib/leveling';
import { seeded } from '@/lib/random';

// What the order board needs to know about the farm
export type OrderFarm = Pick<
  SaveData,
  'day' | 'xp' | 'orders' | 'animals' | 'machines' | 'fishLog' | 'visitedWorlds'
>;

// Orders pay half again what the goods fetch in the shipping bin, plus a diamond for every 400 gold (up to 3)
export const ORDER_PAY_PERCENT = 150;
const GOLD_PER_GEM = 400;
const MAX_ORDER_GEMS = 3;

// Pearls turn up too seldom to be ordered
const BEACH_FINDS: ForageId[] = ['shell', 'starfish', 'coral'];

// Cheap goods are ordered by the handful, dear ones one or two at a time (by sell price)
const QUANTITIES: { upTo: number; min: number; max: number }[] = [
  { upTo: 50, min: 3, max: 6 },
  { upTo: 120, min: 2, max: 4 },
  { upTo: Infinity, min: 1, max: 2 },
];

// The board holds three orders, and a fourth from level 10
export const EXTRA_SLOT_LEVEL = 10;
export const orderSlots = (level: number) => (level >= EXTRA_SLOT_LEVEL ? 4 : 3);

// Goods a resident may ask this farm for: what it can produce
export function orderableItems(farm: OrderFarm): ItemId[] {
  const species = new Set(farm.animals.map((a) => a.species));
  const basics: ItemId[] = [
    ...CROP_LIST.map((c) => c.id),
    ...ANIMAL_LIST.filter((a) => species.has(a.species)).map((a) => a.productId),
    // Fish the farmer has landed before, but no rare ones (or junk)
    ...CATCH_LIST.filter(
      (c) =>
        (c.rarity === 'common' || c.rarity === 'uncommon') &&
        (farm.fishLog[c.id as FishId]?.caught ?? 0) > 0
    ).map((c) => c.id as FishId),
    ...(farm.visitedWorlds.includes('beach') ? BEACH_FINDS : []),
  ];
  // Workshop goods from the machines owned, when the farm gets every ingredient
  const crafted = (Object.keys(farm.machines) as MachineId[])
    .flatMap((id) => MACHINES[id].recipes.map((recipe) => RECIPES[recipe]))
    .filter(
      (r) => r.output.id !== 'bread' && (Object.keys(r.inputs) as ItemId[]).every((id) => basics.includes(id))
    )
    .map((r) => r.output.id as ArtisanId);
  return [...basics, ...crafted];
}

export function orderReward(items: ItemCounts) {
  const value = (Object.entries(items) as [ItemId, number][]).reduce(
    (sum, [id, n]) => sum + ITEMS[id].sellPrice * n,
    0
  );
  const rewardGold = Math.round((value * ORDER_PAY_PERCENT) / 100 / 5) * 5;
  return { rewardGold, rewardGems: Math.min(MAX_ORDER_GEMS, Math.floor(rewardGold / GOLD_PER_GEM)) };
}

// Animal products: no more than two days of what the herd gives
function herdCap(id: ItemId, farm: OrderFarm) {
  const animal = ANIMAL_LIST.find((a) => a.productId === id);
  return animal ? 2 * farm.animals.filter((a) => a.species === animal.species).length : Infinity;
}

// Fixed by the day and the slot it fills, so the same morning always posts the same order
function createOrder(farm: OrderFarm, index: number, pool: ItemId[], level: number): Order {
  const random = seeded(farm.day * 6151 + index * 97 + 29);
  const customer = NPC_PRESETS[Math.floor(random() * NPC_PRESETS.length)].name;
  const kinds = 1 + Math.floor(random() * Math.min(pool.length, level >= 5 ? 3 : 2));
  const left = [...pool];
  const items: ItemCounts = {};
  for (let i = 0; i < kinds; i++) {
    const [id] = left.splice(Math.floor(random() * left.length), 1);
    const { min, max } = QUANTITIES.find((q) => ITEMS[id].sellPrice <= q.upTo)!;
    items[id] = Math.min(min + Math.floor(random() * (max - min + 1)), herdCap(id, farm));
  }
  return { id: `ord_${farm.day}_${index}`, customer, items, ...orderReward(items) };
}

// The board in the morning: open orders stay and every empty slot gets a new order for the day
export function refillOrders(farm: OrderFarm): Order[] {
  const level = levelInfo(farm.xp).level;
  const missing = orderSlots(level) - farm.orders.length;
  if (missing <= 0) return farm.orders;
  const pool = orderableItems(farm);
  return [...farm.orders, ...Array.from({ length: missing }, (_, i) => createOrder(farm, i, pool, level))];
}
