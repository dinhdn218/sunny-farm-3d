import { BuildPiece, DecorPlacement } from '@/types/game';

export const BEEHIVE_ID = 'decor_beehive';
// Flowerbeds this close to the hive feed its bees
export const HIVE_REACH = 4.5;
// Jars the hive holds before the bees stop filling it
export const HIVE_CAPACITY = 6;

// Honey the hive makes overnight: a jar, plus one for every two flowerbeds nearby (three at most)
export function hiveHoneyToday(
  placements: Record<string, DecorPlacement>,
  owned: string[],
  pieces: BuildPiece[]
) {
  const hive = placements[BEEHIVE_ID];
  if (!hive || !owned.includes(BEEHIVE_ID)) return 0;
  const beds = pieces.filter(
    (p) => p.kind === 'flowerbed' && Math.hypot(p.x - hive.x, p.z - hive.z) <= HIVE_REACH
  ).length;
  return 1 + Math.min(2, Math.floor(beds / 2));
}
