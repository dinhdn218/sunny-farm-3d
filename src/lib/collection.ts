import { CollectionSetId, ItemConfig, ItemId, SaveData } from '@/types/game';
import { ITEM_LIST } from '@/config/items';
import { CATCHES } from '@/config/fish';

export interface CollectionSet {
  id: CollectionSetId;
  name: string;
  icon: string;
  items: ItemId[];
  // Paid once the whole set has been found
  reward: { gold: number; gems: number };
}

const ofKind = (kind: ItemConfig['kind']) => ITEM_LIST.filter((i) => i.kind === kind).map((i) => i.id);

// Every item there is to find, in five sets; junk off the fishing line is in none
export const COLLECTION_SETS: CollectionSet[] = [
  { id: 'crops', name: 'Nông Sản', icon: '🌾', items: ofKind('crop'), reward: { gold: 300, gems: 15 } },
  { id: 'animal', name: 'Chăn Nuôi', icon: '🥚', items: ofKind('animal'), reward: { gold: 300, gems: 15 } },
  { id: 'artisan', name: 'Đồ Chế Biến', icon: '🏭', items: ofKind('artisan'), reward: { gold: 500, gems: 25 } },
  {
    id: 'fish',
    name: 'Cá',
    icon: '🐟',
    items: ofKind('fish').filter((id) => CATCHES[id as keyof typeof CATCHES].rarity !== 'junk'),
    reward: { gold: 500, gems: 25 },
  },
  { id: 'beach', name: 'Bãi Biển', icon: '🐚', items: ofKind('forage'), reward: { gold: 200, gems: 10 } },
];

export function setProgress(set: CollectionSet, collected: ItemId[]) {
  const found = set.items.filter((id) => collected.includes(id)).length;
  return { found, total: set.items.length, complete: found === set.items.length };
}

// What a save from before the book has clearly found: what it holds now and the fish it has caught
export function discoveriesFrom(save: Partial<Pick<SaveData, 'items' | 'shippingBin' | 'fishLog'>>): ItemId[] {
  const held = [save.items ?? {}, save.shippingBin ?? {}].flatMap(
    (counts) => (Object.entries(counts) as [ItemId, number][]).filter(([, n]) => n > 0).map(([id]) => id)
  );
  const caught = (Object.entries(save.fishLog ?? {}) as [ItemId, { caught: number }][])
    .filter(([, log]) => log.caught > 0)
    .map(([id]) => id);
  return Array.from(new Set([...held, ...caught]));
}
