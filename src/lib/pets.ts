import { CropId, ForageId, ItemCounts, TileData, TimePhaseId } from '@/types/game';
import { CROPS, CROP_LIST } from '@/config/crops';
import { FORAGE_ITEMS } from '@/config/forage';
import { seeded } from '@/lib/random';
import { canWater, waterTile } from '@/lib/growth';

// What the Shiba digs up overnight
export type ShibaFind =
  | { kind: 'seeds'; crop: CropId; count: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'bread' }
  | { kind: 'gems'; amount: number };

// The Shiba's gift on the morning of `day`; fixed per day so a reload can't change it
export function shibaFind(day: number): ShibaFind {
  const random = seeded(day * 7919 + 17);
  const roll = random();
  if (roll < 0.08) return { kind: 'gems', amount: random() < 0.3 ? 2 : 1 };
  if (roll < 0.42) {
    return { kind: 'seeds', crop: CROP_LIST[Math.floor(random() * CROP_LIST.length)].id, count: random() < 0.4 ? 2 : 1 };
  }
  if (roll < 0.78) return { kind: 'gold', amount: 15 + Math.floor(random() * 26) };
  return { kind: 'bread' };
}

export const ROBO_CAT_TILES = 6;

// Robo Cat waters a few dry tiles each morning (from `at`): growing crops first, then bare tilled soil
export function roboCatWater(tiles: TileData[], at: number) {
  const growing = tiles.filter((t) => canWater(t) && t.state === 'planted');
  const soil = tiles.filter((t) => canWater(t) && t.state === 'tilled');
  const chosen = new Set([...growing, ...soil].slice(0, ROBO_CAT_TILES).map((t) => t.id));
  return {
    tiles: chosen.size ? tiles.map((t) => (chosen.has(t.id) ? waterTile(t, at) : t)) : tiles,
    watered: chosen.size,
  };
}

// The bat sees in the dark: at night the fishing catch zone is a quarter wider
export const reelZoneScale = (pet: string, phase: TimePhaseId) =>
  pet === 'bat_pet' && phase === 'night' ? 1.25 : 1;

// Line for the morning report
export function shibaFindLabel(find: ShibaFind) {
  switch (find.kind) {
    case 'seeds':
      return `🐕 Shiba đào được ${find.count} Hạt ${CROPS[find.crop].name}`;
    case 'gold':
      return `🐕 Shiba đào được ${find.amount} Vàng 🪙`;
    case 'bread':
      return '🐕 Shiba tha về 1 Bánh Mì 🥖';
    case 'gems':
      return `🐕 Shiba đào được ${find.amount} Kim Cương 💎!`;
  }
}

// What the bunny, the sea turtle, the panda, the reindeer and the lucky cat bring home on the morning of `day` (fixed per day)
export interface PetGift {
  items?: ItemCounts;
  feed?: number;
  // Loaves for the hotbar's bread slot
  bread?: number;
  gold?: number;
  label: string;
}

export function petMorningGift(pet: string, day: number): PetGift | null {
  const random = seeded(day * 104729 + pet.length * 31);
  switch (pet) {
    case 'bunny_pet': {
      const count = random() < 0.35 ? 2 : 1;
      return { items: { carrot: count }, label: `🐇 Thỏ Bông đào được ${count} Cà Rốt 🥕` };
    }
    case 'sea_turtle': {
      const roll = random();
      const find: ForageId = roll < 0.1 ? 'pearl' : roll < 0.45 ? 'starfish' : 'shell';
      const item = FORAGE_ITEMS[find];
      return { items: { [find]: 1 }, label: `🐢 Rùa Biển mang về 1 ${item.name} ${item.icon}` };
    }
    case 'panda':
      return { feed: 2, label: '🐼 Gấu Trúc gom được 2 phần Thức Ăn Chăn Nuôi 🌾' };
    case 'reindeer_pet':
      return { bread: 2, label: '🦌 Tuần Lộc kéo xe trượt tuyết mang về 2 Bánh Mì 🥖' };
    case 'lucky_cat': {
      const gold = 20 + Math.floor(random() * 31);
      return { gold, label: `🐱 Mèo Thần Tài vẫy tay mời lộc: +${gold} Vàng 🪙` };
    }
    default:
      return null;
  }
}
