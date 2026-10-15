import { CropId } from '@/types/game';

// Arcade claw machines at the cinema: a coin per go, a prize if the claw holds on
export const CLAW_PRICE = 20;
// How close (as a share of the machine's width) the claw must stop over a prize, and how often it holds on
export const CLAW_REACH = 0.07;
export const CLAW_GRIP = 0.7;

export interface ClawPrize {
  toy: string;
  label: string;
  weight: number;
  gold?: number;
  gems?: number;
  bread?: number;
  feed?: number;
  seeds?: Partial<Record<CropId, number>>;
}

// Each toy in the machine stands for one of these
export const CLAW_PRIZES: ClawPrize[] = [
  { toy: '🐥', label: '10 Vàng', weight: 28, gold: 10 },
  { toy: '🐰', label: '30 Vàng', weight: 18, gold: 30 },
  { toy: '🧸', label: '100 Vàng', weight: 6, gold: 100 },
  { toy: '🦄', label: '2 Kim Cương', weight: 7, gems: 2 },
  { toy: '🐻', label: '1 Bánh Mì', weight: 15, bread: 1 },
  { toy: '🐶', label: '3 Thức Ăn Chăn Nuôi', weight: 14, feed: 3 },
  { toy: '🐸', label: '2 Hạt Bí Ngô', weight: 12, seeds: { pumpkin: 2 } },
];

// Five toys to fill the machine for a go
export function stockClaw(random: () => number = Math.random): number[] {
  const total = CLAW_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  return Array.from({ length: 5 }, () => {
    let roll = random() * total;
    const index = CLAW_PRIZES.findIndex((p) => (roll -= p.weight) < 0);
    return index < 0 ? 0 : index;
  });
}
