import { ArtisanId, BuffId, ItemId } from '@/types/game';

// How much each buff helps (lib/food)
export const STAMINA_BONUS = 30;
export const SWIFT_SPEED = 1.3;
export const ANGLER_ZONE = 1.3;
export const NETTER_ZONE = 1.4;

export interface BuffConfig {
  id: BuffId;
  name: string;
  icon: string;
  // What it does, as the inventory and the HUD put it
  effect: string;
}

export const BUFFS: Record<BuffId, BuffConfig> = {
  stamina: { id: 'stamina', name: 'Sung Sức', icon: '💪', effect: `+${STAMINA_BONUS} thể lực tối đa` },
  swift: { id: 'swift', name: 'Nhanh Nhẹn', icon: '👟', effect: 'Đi nhanh hơn 30%' },
  angler: { id: 'angler', name: 'Tay Câu Vững', icon: '🎣', effect: 'Vùng xanh khi kéo cá rộng hơn 30%' },
  netter: { id: 'netter', name: 'Tay Vợt Khéo', icon: '🦋', effect: 'Vùng xanh khi vung vợt rộng hơn 40%' },
};

export interface FoodConfig {
  // Stamina it gives back at once
  energy: number;
  // What it does until the player sleeps
  buff: BuffId;
  // Drunk rather than eaten (the inventory's button says so)
  drink?: boolean;
}

// Workshop goods that can be eaten or drunk; the sauces, the oil and the scarf can't
export const FOODS: Partial<Record<ArtisanId, FoodConfig>> = {
  // Drinks: light on the stomach, quick on the feet
  carrot_juice: { energy: 15, buff: 'swift', drink: true },
  mango_smoothie: { energy: 15, buff: 'swift', drink: true },
  orange_juice: { energy: 15, buff: 'swift', drink: true },
  watermelon_ice: { energy: 20, buff: 'swift', drink: true },
  // Fish dishes: an angler's lunch
  fish_stew: { energy: 30, buff: 'angler' },
  sour_fish_soup: { energy: 30, buff: 'angler' },
  fish_cake: { energy: 25, buff: 'angler' },
  grilled_squid: { energy: 25, buff: 'angler' },
  // Sweets: bugs flutter slowly round the smell of sugar
  strawberry_jam: { energy: 20, buff: 'netter' },
  flan: { energy: 25, buff: 'netter' },
  corn_pudding: { energy: 25, buff: 'netter' },
  // Hearty food: a long day's work in it
  pumpkin_pie: { energy: 40, buff: 'stamina' },
  honey_cake: { energy: 35, buff: 'stamina' },
  cheese: { energy: 30, buff: 'stamina' },
  salted_egg: { energy: 25, buff: 'stamina' },
  pickled_cabbage: { energy: 20, buff: 'stamina' },
};

// How an item in the bag can be eaten, if it can
export const foodOf = (id: ItemId): FoodConfig | undefined => FOODS[id as ArtisanId];
