import { PlayerCosmetics, WorldId } from '@/types/game';
import { COSMETICS } from '@/config/cosmetics';
import {
  VISITORS_PER_WORLD,
  VISITOR_BACK_CHANCE,
  VISITOR_GIVEN_NAMES,
  VISITOR_HAT_CHANCE,
  VISITOR_NAME_TAGS,
  VISITOR_NICKNAMES,
  VISITOR_PET_CHANCE,
} from '@/config/visitors';
import { seeded } from '@/lib/random';

export interface Visitor {
  id: string;
  name: string;
  cosmetics: PlayerCosmetics;
}

// What there is to wear, festival pieces aside (those are earned at the festivals)
const wardrobe = (category: 'hat' | 'outfit' | 'wing' | 'pet') =>
  COSMETICS.filter((c) => c.category === category && !c.festival && !c.id.startsWith('none_')).map((c) => c.id);

const HATS = wardrobe('hat');
const OUTFITS = wardrobe('outfit');
const BACK_ITEMS = wardrobe('wing');
const PETS = wardrobe('pet');

// A whole number from a string, to seed each zone's crowd
const hash = (text: string) => Array.from(text).reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);

// The zone's visitors on this calendar day: the same crowd all day, a new one tomorrow
export function visitorsFor(world: WorldId, dateKey: string): Visitor[] {
  const random = seeded(hash(`${world}:${dateKey}`));
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const names = new Set<string>();
  while (names.size < VISITORS_PER_WORLD) {
    names.add(
      random() < 0.3
        ? pick(VISITOR_NICKNAMES)
        : `${pick(VISITOR_GIVEN_NAMES)}${random() < 0.5 ? ` ${pick(VISITOR_NAME_TAGS)}` : ''}`
    );
  }
  return Array.from(names).map((name, i) => ({
    id: `${world}_visitor_${i}`,
    name,
    cosmetics: {
      hat: random() < VISITOR_HAT_CHANCE ? pick(HATS) : 'none_hat',
      outfit: pick(OUTFITS),
      wing: random() < VISITOR_BACK_CHANCE ? pick(BACK_ITEMS) : 'none_wing',
      pet: random() < VISITOR_PET_CHANCE ? pick(PETS) : 'none_pet',
    },
  }));
}
