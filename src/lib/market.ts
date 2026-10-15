import { ItemId } from '@/types/game';
import { ITEM_LIST } from '@/config/items';
import { seasonalPrice } from '@/lib/seasons';

// Today's market at the Mall: every item swings 80–120%, one is sought after (140–160%), one glutted (60–70%)
export interface MarketDay {
  multipliers: Record<ItemId, number>;
  hot: ItemId;
  glut: ItemId;
}

// Seeded by the day like the daily quests, so every visit that day sees the same prices
function seededRandom(day: number) {
  let seed = (day * 4241 + 1013) % 233280;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function marketDay(day: number): MarketDay {
  const random = seededRandom(day);
  const multipliers = {} as Record<ItemId, number>;
  ITEM_LIST.forEach((item) => {
    multipliers[item.id] = round2(0.8 + random() * 0.4);
  });
  const count = ITEM_LIST.length;
  const hotIndex = Math.floor(random() * count);
  const glutIndex = (hotIndex + 1 + Math.floor(random() * (count - 1))) % count;
  const hot = ITEM_LIST[hotIndex].id;
  const glut = ITEM_LIST[glutIndex].id;
  multipliers[hot] = round2(1.4 + random() * 0.2);
  multipliers[glut] = round2(0.6 + random() * 0.1);
  return { multipliers, hot, glut };
}

// Today's swing applied to the season's price (in-season crops start higher)
export function marketPrice(id: ItemId, day: number) {
  return Math.round(seasonalPrice(id, day) * marketDay(day).multipliers[id]);
}
