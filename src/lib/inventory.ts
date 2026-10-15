import { ItemCounts, ItemId } from '@/types/game';
import { ITEMS } from '@/config/items';

// "Bán Ngay" pays less than the shipping bin (full price, overnight) or a good day at the market.
// Kept as a whole percentage: 45 × 0.7 in floating point is 31.4999…, which would round down.
export const INSTANT_SELL_PERCENT = 70;

const entries = (counts: ItemCounts) => Object.entries(counts) as [ItemId, number][];

export function addItems(bag: ItemCounts, add: ItemCounts): ItemCounts {
  const next = { ...bag };
  entries(add).forEach(([id, n]) => {
    if (n > 0) next[id] = (next[id] ?? 0) + n;
  });
  return next;
}

// The bag without `take`, or null if it does not hold that much
export function takeItems(bag: ItemCounts, take: ItemCounts): ItemCounts | null {
  const next = { ...bag };
  for (const [id, n] of entries(take)) {
    const left = (next[id] ?? 0) - n;
    if (left < 0) return null;
    if (left === 0) delete next[id];
    else next[id] = left;
  }
  return next;
}

export function missingItems(bag: ItemCounts, need: ItemCounts): ItemCounts {
  const missing: ItemCounts = {};
  entries(need).forEach(([id, n]) => {
    const short = n - (bag[id] ?? 0);
    if (short > 0) missing[id] = short;
  });
  return missing;
}

export const hasItems = (bag: ItemCounts, need: ItemCounts) => takeItems(bag, need) !== null;

export const countItems = (bag: ItemCounts) =>
  entries(bag).reduce((sum, [, n]) => sum + n, 0);

export const instantSellPrice = (id: ItemId) =>
  Math.round((ITEMS[id].sellPrice * INSTANT_SELL_PERCENT) / 100);
