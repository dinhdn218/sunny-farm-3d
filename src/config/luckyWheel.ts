import { CropId } from '@/types/game';

export interface WheelPrize {
  label: string;
  icon: string;
  // Relative chance of landing on it
  weight: number;
  gold?: number;
  gems?: number;
  bread?: number;
  seeds?: Partial<Record<CropId, number>>;
}

// The eight slices of the casino's lucky wheel, clockwise from the top (the 3D wheel draws them in this order)
export const WHEEL_PRIZES: WheelPrize[] = [
  { label: '50 Vàng', icon: '🪙', weight: 26, gold: 50 },
  { label: '2 Kim Cương', icon: '💎', weight: 14, gems: 2 },
  { label: '3 Bánh Mì', icon: '🥖', weight: 14, bread: 3 },
  { label: '150 Vàng', icon: '🪙', weight: 16, gold: 150 },
  { label: 'Túi Hạt Giống', icon: '🌱', weight: 12, seeds: { carrot: 3, wheat: 3, tomato: 2 } },
  { label: '5 Kim Cương', icon: '💎', weight: 6, gems: 5 },
  { label: '400 Vàng', icon: '🪙', weight: 9, gold: 400 },
  { label: 'Độc Đắc 1000🪙 + 10💎', icon: '🎁', weight: 3, gold: 1000, gems: 10 },
];

// Slice colours, in the same order (the 3D wheel and the spin window both use them)
export const WHEEL_COLORS = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#9333ea', '#db2777', '#0891b2', '#ca8a04'];

export function rollWheel(random: () => number = Math.random) {
  const total = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let roll = random() * total;
  const index = WHEEL_PRIZES.findIndex((p) => (roll -= p.weight) < 0);
  return index < 0 ? WHEEL_PRIZES.length - 1 : index;
}
