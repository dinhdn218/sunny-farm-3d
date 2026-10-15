import { ForageId } from '@/types/game';
import { BEACH_FINDS_PER_DAY, BEACH_SPOTS, FORAGE_ITEMS } from '@/config/forage';

// Seeded by the day, so every visit that day finds the same things in the same places
function seededRandom(day: number) {
  let seed = (day * 7349 + 1231) % 233280;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const FORAGE_LIST = Object.values(FORAGE_ITEMS);
const TOTAL_WEIGHT = FORAGE_LIST.reduce((sum, f) => sum + f.weight, 0);

// Today's finds on the Beach: which spots hold something, and what
export function beachFinds(day: number): { spot: number; item: ForageId }[] {
  const random = seededRandom(day);
  const spots = BEACH_SPOTS.map((_, i) => i);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots.slice(0, BEACH_FINDS_PER_DAY).map((spot) => {
    let roll = random() * TOTAL_WEIGHT;
    const found = FORAGE_LIST.find((f) => (roll -= f.weight) < 0) ?? FORAGE_LIST[0];
    return { spot, item: found.id as ForageId };
  });
}
