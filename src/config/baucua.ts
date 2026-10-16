import { BauCuaFace } from '@/types/game';

export interface BauCuaFaceConfig {
  id: BauCuaFace;
  name: string;
  // There is no emoji for a gourd: the Bầu is drawn instead (see BauCuaModal and the casino's mat)
  icon: string | null;
  // The square's colour on the mat
  color: string;
}

// The mat's squares, in its order: Nai, Bầu, Gà on top, Cá, Cua, Tôm below
export const BAU_CUA_FACES: BauCuaFaceConfig[] = [
  { id: 'nai', name: 'Nai', icon: '🦌', color: '#b45309' },
  { id: 'bau', name: 'Bầu', icon: null, color: '#4d7c0f' },
  { id: 'ga', name: 'Gà', icon: '🐓', color: '#b91c1c' },
  { id: 'ca', name: 'Cá', icon: '🐟', color: '#0369a1' },
  { id: 'cua', name: 'Cua', icon: '🦀', color: '#c2410c' },
  { id: 'tom', name: 'Tôm', icon: '🦐', color: '#be185d' },
];

export const BAU_CUA_NAMES = Object.fromEntries(BAU_CUA_FACES.map((f) => [f.id, f.name])) as Record<
  BauCuaFace,
  string
>;

// Chips to bet with, and the most that can go on the mat in one round
export const BAU_CUA_CHIPS = [10, 50, 100];
export const BAU_CUA_MAX_BET = 500;
