import { CatchConfig, CatchId } from '@/types/game';

// What bites off the fishing jetty at the Beach, by time of day (use the 🌤️ button to change it)
export const CATCHES: Record<CatchId, CatchConfig> = {
  anchovy: { id: 'anchovy', name: 'Cá Cơm', icon: '🐟', rarity: 'common', phases: [], weight: 30, difficulty: 1, size: [5, 12], sellPrice: 25 },
  clownfish: { id: 'clownfish', name: 'Cá Hề', icon: '🐠', rarity: 'common', phases: ['morning', 'noon'], weight: 20, difficulty: 2, size: [6, 11], sellPrice: 45 },
  pufferfish: { id: 'pufferfish', name: 'Cá Nóc', icon: '🐡', rarity: 'uncommon', phases: [], weight: 12, difficulty: 3, size: [10, 30], sellPrice: 60 },
  mackerel: { id: 'mackerel', name: 'Cá Thu', icon: '🐟', rarity: 'uncommon', phases: ['morning', 'sunset'], weight: 14, difficulty: 4, size: [30, 70], sellPrice: 80 },
  crab: { id: 'crab', name: 'Cua Biển', icon: '🦀', rarity: 'uncommon', phases: ['noon', 'sunset'], weight: 10, difficulty: 3, size: [10, 25], sellPrice: 90 },
  squid: { id: 'squid', name: 'Mực Ống', icon: '🦑', rarity: 'uncommon', phases: ['sunset', 'night'], weight: 12, difficulty: 5, size: [20, 45], sellPrice: 110 },
  tuna: { id: 'tuna', name: 'Cá Ngừ Đại Dương', icon: '🐟', rarity: 'rare', phases: ['noon'], weight: 5, difficulty: 7, size: [60, 150], sellPrice: 180 },
  octopus: { id: 'octopus', name: 'Bạch Tuộc', icon: '🐙', rarity: 'rare', phases: ['night'], weight: 5, difficulty: 7, size: [40, 100], sellPrice: 220 },
  moonfish: { id: 'moonfish', name: 'Cá Mặt Trăng', icon: '🌕', rarity: 'legendary', phases: ['night'], weight: 1.5, difficulty: 9, size: [100, 250], sellPrice: 600 },
  old_boot: { id: 'old_boot', name: 'Chiếc Ủng Cũ', icon: '👢', rarity: 'junk', phases: [], weight: 6, difficulty: 0, size: [25, 30], sellPrice: 1 },
  treasure: { id: 'treasure', name: 'Rương Kho Báu', icon: '🎁', rarity: 'treasure', phases: [], weight: 2, difficulty: 5, sellPrice: 0 },
};

export const CATCH_LIST: CatchConfig[] = Object.values(CATCHES);

// A treasure chest is opened on the spot
export const TREASURE_REWARD = { gold: 100, gems: 5 };

export const FISHING_ENERGY = 4;
// Bite window: strike within this time or the fish lets go
export const BITE_MS = 1000;

// On the jetty at the north shore of the Beach, facing the open sea (inside the walkable area)
export const FISHING_SPOT = { x: 3.5, z: -14.6, rotY: Math.PI };
export const BOBBER_POS: [number, number, number] = [3.5, -1.5, -20.6];

export const RARITY_LABEL: Record<CatchConfig['rarity'], string> = {
  common: 'Phổ biến',
  uncommon: 'Ít gặp',
  rare: 'Hiếm',
  legendary: 'Huyền thoại',
  junk: 'Đồ bỏ đi',
  treasure: 'Kho báu',
};
