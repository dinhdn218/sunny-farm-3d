import { CatchConfig, CatchId, FishingSpotId, SeasonId, WorldId } from '@/types/game';

const ALL_YEAR: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

// What bites at the Beach jetty (sea) and the Park pond, by time of day (use the 🌤️ button to change it)
// and by season: carp and anchovies all year, the legends in one season each (the dragon carp in spring,
// the moonfish at the mid-autumn moon)
export const CATCHES: Record<CatchId, CatchConfig> = {
  // Fresh water: the lotus pond in the Park
  carp: { id: 'carp', name: 'Cá Chép', icon: '🐟', rarity: 'common', phases: [], weight: 30, difficulty: 1, size: [20, 50], sellPrice: 30, waters: ['pond'], seasons: ALL_YEAR },
  tilapia: { id: 'tilapia', name: 'Cá Rô Phi', icon: '🐟', rarity: 'common', phases: ['morning', 'noon'], weight: 22, difficulty: 2, size: [12, 30], sellPrice: 40, waters: ['pond'], seasons: ['spring', 'summer', 'autumn'] },
  catfish: { id: 'catfish', name: 'Cá Trê', icon: '🐟', rarity: 'uncommon', phases: ['sunset', 'night'], weight: 14, difficulty: 4, size: [25, 60], sellPrice: 75, waters: ['pond'], seasons: ['summer', 'autumn', 'winter'] },
  snakehead: { id: 'snakehead', name: 'Cá Lóc', icon: '🐟', rarity: 'uncommon', phases: [], weight: 12, difficulty: 5, size: [30, 80], sellPrice: 95, waters: ['pond'], seasons: ['autumn', 'winter', 'spring'] },
  koi: { id: 'koi', name: 'Cá Koi', icon: '🎏', rarity: 'rare', phases: ['morning'], weight: 5, difficulty: 6, size: [30, 70], sellPrice: 260, waters: ['pond'], seasons: ['spring', 'summer', 'autumn'] },
  dragon_carp: { id: 'dragon_carp', name: 'Cá Chép Hóa Rồng', icon: '🐉', rarity: 'legendary', phases: ['night'], weight: 1.2, difficulty: 9, size: [80, 160], sellPrice: 800, waters: ['pond'], seasons: ['spring'] },
  // Salt water: off the jetty at the Beach
  anchovy: { id: 'anchovy', name: 'Cá Cơm', icon: '🐟', rarity: 'common', phases: [], weight: 30, difficulty: 1, size: [5, 12], sellPrice: 25, waters: ['sea'], seasons: ALL_YEAR },
  clownfish: { id: 'clownfish', name: 'Cá Hề', icon: '🐠', rarity: 'common', phases: ['morning', 'noon'], weight: 20, difficulty: 2, size: [6, 11], sellPrice: 45, waters: ['sea'], seasons: ['spring', 'summer'] },
  pufferfish: { id: 'pufferfish', name: 'Cá Nóc', icon: '🐡', rarity: 'uncommon', phases: [], weight: 12, difficulty: 3, size: [10, 30], sellPrice: 60, waters: ['sea'], seasons: ['summer', 'autumn', 'winter'] },
  mackerel: { id: 'mackerel', name: 'Cá Thu', icon: '🐟', rarity: 'uncommon', phases: ['morning', 'sunset'], weight: 14, difficulty: 4, size: [30, 70], sellPrice: 80, waters: ['sea'], seasons: ['autumn', 'winter', 'spring'] },
  crab: { id: 'crab', name: 'Cua Biển', icon: '🦀', rarity: 'uncommon', phases: ['noon', 'sunset'], weight: 10, difficulty: 3, size: [10, 25], sellPrice: 90, waters: ['sea'], seasons: ['spring', 'summer', 'autumn'] },
  squid: { id: 'squid', name: 'Mực Ống', icon: '🦑', rarity: 'uncommon', phases: ['sunset', 'night'], weight: 12, difficulty: 5, size: [20, 45], sellPrice: 110, waters: ['sea'], seasons: ['spring', 'summer', 'autumn'] },
  tuna: { id: 'tuna', name: 'Cá Ngừ Đại Dương', icon: '🐟', rarity: 'rare', phases: ['noon'], weight: 5, difficulty: 7, size: [60, 150], sellPrice: 180, waters: ['sea'], seasons: ['spring', 'summer'] },
  octopus: { id: 'octopus', name: 'Bạch Tuộc', icon: '🐙', rarity: 'rare', phases: ['night'], weight: 5, difficulty: 7, size: [40, 100], sellPrice: 220, waters: ['sea'], seasons: ['autumn', 'winter'] },
  moonfish: { id: 'moonfish', name: 'Cá Mặt Trăng', icon: '🌕', rarity: 'legendary', phases: ['night'], weight: 1.5, difficulty: 9, size: [100, 250], sellPrice: 600, waters: ['sea'], seasons: ['autumn'] },
  old_boot: { id: 'old_boot', name: 'Chiếc Ủng Cũ', icon: '👢', rarity: 'junk', phases: [], weight: 6, difficulty: 0, size: [25, 30], sellPrice: 1, waters: ['sea', 'pond'], seasons: ALL_YEAR },
  treasure: { id: 'treasure', name: 'Rương Kho Báu', icon: '🎁', rarity: 'treasure', phases: [], weight: 2, difficulty: 5, sellPrice: 0, waters: ['sea', 'pond'], seasons: ALL_YEAR },
};

export const CATCH_LIST: CatchConfig[] = Object.values(CATCHES);

// A treasure chest is opened on the spot
export const TREASURE_REWARD = { gold: 100, gems: 5 };

export const FISHING_ENERGY = 4;
// Bite window: strike within this time or the fish lets go
export const BITE_MS = 1000;

export interface FishingSpot {
  id: FishingSpotId;
  world: WorldId;
  name: string;
  waters: 'sea' | 'pond';
  // Where the angler stands and faces, and where the float lands
  x: number;
  z: number;
  rotY: number;
  bobber: [number, number, number];
}

export const FISHING_SPOTS: Record<FishingSpotId, FishingSpot> = {
  // End of the jetty on the Beach's north shore, facing the open sea
  beach: { id: 'beach', world: 'beach', name: 'Cầu Câu Cá Biển', waters: 'sea', x: 3.5, z: -23.4, rotY: Math.PI, bobber: [3.5, -1.5, -29.6] },
  // Wooden dock on the east side of the Park's lotus pond, facing west across it
  park: { id: 'park', world: 'park', name: 'Hồ Sen', waters: 'pond', x: -11.4, z: -4, rotY: -Math.PI / 2, bobber: [-15.6, 0.06, -4] },
};

export const fishingSpotIn = (world: WorldId) =>
  (Object.values(FISHING_SPOTS) as FishingSpot[]).find((spot) => spot.world === world);

export const WATER_NAMES: Record<'sea' | 'pond', string> = { sea: 'Biển', pond: 'Hồ Sen' };

export const RARITY_LABEL: Record<CatchConfig['rarity'], string> = {
  common: 'Phổ biến',
  uncommon: 'Ít gặp',
  rare: 'Hiếm',
  legendary: 'Huyền thoại',
  junk: 'Đồ bỏ đi',
  treasure: 'Kho báu',
};
