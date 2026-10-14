export type WorldId = 'farm' | 'park' | 'beach' | 'mall' | 'cinema';
export type TileState = 'empty' | 'tilled' | 'planted';
export type CropId = 'carrot' | 'wheat' | 'tomato' | 'pumpkin';
export type AnimalSpecies = 'chicken' | 'sheep' | 'cow';
export type AnimalProductId = 'egg' | 'wool' | 'milk';
export type TreeType = 'pine' | 'oak' | 'sakura' | 'palm';

export type ToolId =
  | 'hoe'
  | 'water'
  | 'basket'
  | 'seed_carrot'
  | 'seed_wheat'
  | 'seed_tomato'
  | 'seed_pumpkin'
  | 'bread'
  | 'feed';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: 'google' | 'guest';
  lastSyncedAt?: number;
}

export interface CropConfig {
  id: CropId;
  name: string;
  icon: string;
  seedPrice: number;
  sellPrice: number;
  daysPerStage: number;
  regrow: boolean;
  color: string;
  description: string;
}

export interface AnimalConfig {
  species: AnimalSpecies;
  name: string;
  icon: string;
  buyPrice: number;
  productId: AnimalProductId;
  productName: string;
  productIcon: string;
  productSellPrice: number;
  glbPath: string;
  description: string;
}

export interface FarmAnimal {
  id: string;
  species: AnimalSpecies;
  name: string;
  fedToday: boolean;
  hasProduct: boolean;
  affection: number;
  x: number;
  z: number;
}

export interface TileData {
  id: string;
  r: number;
  c: number;
  state: TileState;
  watered: boolean;
  crop: CropId | null;
  stage: number;
  daysWatered: number;
}

export interface WorldConfig {
  id: WorldId;
  name: string;
  icon: string;
  description: string;
  groundColor: string;
  spawn: [number, number];
  portalPos: [number, number];
}

export interface TimePhase {
  id: string;
  label: string;
  sky: string;
  fog: string;
  sunColor: string;
  sunIntensity: number;
  ambientIntensity: number;
}

export type CosmeticCategory = 'hat' | 'outfit' | 'wing' | 'pet' | 'decor';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  icon: string;
  priceGold: number;
  priceGems: number;
  description: string;
  // Decor only: radius kept clear around the item when placing it on the farm
  footprint?: number;
}

export interface PlayerCosmetics {
  hat: string;
  outfit: string;
  wing: string;
  pet: string;
}

export interface DecorPlacement {
  x: number;
  z: number;
  rotY: number;
}

export type QuestType =
  | 'till'
  | 'plant'
  | 'water'
  | 'harvest'
  | 'sleep'
  | 'earn_gold'
  | 'eat'
  | 'visit_world'
  | 'visit_worlds'
  | 'cinema_channel'
  | 'chat'
  | 'buy_cosmetic'
  | 'buy_decor'
  | 'place_decor'
  | 'feed_animal'
  | 'collect_animal'
  | 'buy_animal'
  | 'buy_plot';

export type QuestCategory = 'main' | 'daily' | 'achievement';

export interface QuestItem {
  id: string;
  category: QuestCategory;
  title: string;
  desc: string;
  icon: string;
  type: QuestType;
  target: number;
  progress: number;
  claimed: boolean;
  rewardGold: number;
  rewardGems: number;
  // Only events for this crop count
  crop?: CropId;
  // Story chapter label (main quests)
  chapter?: string;
  // Achievements: current tier (0-based) out of `tiers`
  tier?: number;
  tiers?: number;
}

export interface RemotePlayer {
  uid: string;
  name: string;
  avatarUrl?: string;
  world: WorldId;
  x: number;
  z: number;
  rotY: number;
  cosmetics: PlayerCosmetics;
  chatMsg?: string;
  emote?: string;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  uid: string;
  sender: string;
  world: WorldId;
  text: string;
  createdAt: number;
}

export interface FloatingLabel {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

export interface HoverTooltip {
  title: string;
  desc: string;
  x: number;
  y: number;
}
