import { ForageId, ItemConfig } from '@/types/game';

// Washed up on the Beach: a few spots hold something new every day
export const FORAGE_ITEMS: Record<ForageId, ItemConfig & { weight: number }> = {
  shell: { id: 'shell', name: 'Vỏ Sò', icon: '🐚', sellPrice: 18, kind: 'forage', weight: 50 },
  starfish: { id: 'starfish', name: 'Sao Biển', icon: '⭐', sellPrice: 32, kind: 'forage', weight: 28 },
  coral: { id: 'coral', name: 'San Hô', icon: '🪸', sellPrice: 60, kind: 'forage', weight: 14 },
  pearl: { id: 'pearl', name: 'Ngọc Trai', icon: '🦪', sellPrice: 150, kind: 'forage', weight: 8 },
};

// Patches of sand where finds can turn up (clear of umbrellas, palms and buildings)
export const BEACH_SPOTS: [number, number][] = [
  [-14, -6],
  [-11, 12],
  [-6, -15],
  [-3, 8],
  [2, -10],
  [6, 13],
  [10, 3],
  [14, -9],
  [17, 7],
  [-19, 2],
  [-8, -3],
  [4, -2],
  [11, -16],
  [-13, -12],
  [19, -2],
  [-17, 9],
];

export const BEACH_FINDS_PER_DAY = 6;
