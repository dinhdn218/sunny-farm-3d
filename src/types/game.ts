export type WorldId = 'farm' | 'park' | 'beach' | 'mall' | 'cinema' | 'casino';
export type TileState = 'empty' | 'tilled' | 'planted';
export type CropId = 'carrot' | 'wheat' | 'tomato' | 'pumpkin';
export type AnimalSpecies = 'chicken' | 'sheep' | 'cow' | 'duck' | 'pig';
export type AnimalProductId = 'egg' | 'wool' | 'milk' | 'duck_egg' | 'truffle';
export type ArtisanId =
  | 'carrot_juice'
  | 'tomato_sauce'
  | 'flan'
  | 'cheese'
  | 'wool_scarf'
  | 'pumpkin_pie'
  | 'fish_stew';
export type FishId =
  | 'carp'
  | 'tilapia'
  | 'catfish'
  | 'snakehead'
  | 'koi'
  | 'dragon_carp'
  | 'anchovy'
  | 'clownfish'
  | 'pufferfish'
  | 'mackerel'
  | 'crab'
  | 'squid'
  | 'tuna'
  | 'octopus'
  | 'moonfish'
  | 'old_boot';
// Anything that can come up on the fishing line: a fish (or junk) for the bag, or a treasure chest
export type CatchId = FishId | 'treasure';
// Found on the sand at the Beach
export type ForageId = 'shell' | 'starfish' | 'coral' | 'pearl';
// Everything that goes in the bag and can be sold
export type ItemId = CropId | AnimalProductId | ArtisanId | FishId | ForageId;
// Where a line can be cast: the sea off the Beach jetty or the lotus pond in the Park
export type FishingSpotId = 'beach' | 'park';
export type ItemCounts = Partial<Record<ItemId, number>>;
export type TreeType = 'pine' | 'oak' | 'sakura' | 'palm';

export type MachineId = 'machine_oven' | 'machine_kitchen' | 'machine_cheese' | 'machine_loom';
export type RecipeId =
  | 'bread'
  | 'pumpkin_pie'
  | 'carrot_juice'
  | 'tomato_sauce'
  | 'flan'
  | 'cheese'
  | 'wool_scarf'
  | 'fish_stew';

export type TimePhaseId = 'morning' | 'noon' | 'sunset' | 'night';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

// Calendar festivals (config/festivals)
export type FestivalId = 'halloween' | 'christmas';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';

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
  // Sells for 20% more in this season (it can be grown all year)
  season: SeasonId;
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
  // Model used when "GLB" models are switched on; the others always use the built-in look
  glbPath?: string;
  description: string;
}

export interface ItemConfig {
  id: ItemId;
  name: string;
  icon: string;
  sellPrice: number;
  kind: 'crop' | 'animal' | 'artisan' | 'fish' | 'forage';
}

export interface CatchConfig {
  id: CatchId;
  name: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'junk' | 'treasure';
  // Times of day it bites (empty: any time)
  phases: TimePhaseId[];
  // Relative chance among what bites at that time
  weight: number;
  // 0 comes up without a fight; harder fish dart about more and leave a narrower catch zone
  difficulty: number;
  // Length range in cm (fish only)
  size?: [number, number];
  sellPrice: number;
  // Salt water off the jetty, fresh water in the pond (junk and treasure turn up in both)
  waters: ('sea' | 'pond')[];
}

// One cast of the line: wait for a bite, strike in time, then reel the fish in
export interface FishingSession {
  spot: FishingSpotId;
  stage: 'waiting' | 'bite' | 'reeling' | 'result';
  catchId: CatchId;
  size: number;
  // waiting: when the fish bites; bite: when it lets go
  until: number;
  escaped?: boolean;
  firstOfKind?: boolean;
}

export interface RecipeConfig {
  id: RecipeId;
  machine: MachineId;
  inputs: ItemCounts;
  // 'bread' goes to the hotbar's bread slot instead of the bag
  output: { id: ArtisanId | 'bread'; count: number };
  seconds: number;
}

export interface MachineConfig {
  id: MachineId;
  name: string;
  icon: string;
  price: number;
  // Radius kept clear around the machine when placing it on the farm
  footprint: number;
  description: string;
  recipes: RecipeId[];
}

export interface MachineJob {
  recipeId: RecipeId;
  // Epoch ms when the batch is done (sleeping finishes it at once)
  readyAt: number;
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
  // A sprinkler stands on this tile: it can't be worked and waters its neighbours each morning
  sprinkler?: boolean;
}

export interface WorldConfig {
  id: WorldId;
  name: string;
  icon: string;
  description: string;
  groundColor: string;
  // Radius of the island (the farm's grows further as land is bought)
  islandRadius: number;
  spawn: [number, number];
  portalPos: [number, number];
}

export interface TimePhase {
  id: TimePhaseId;
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
  // Festival items are traded for that festival's tokens at its stall instead of bought with gold
  festival?: FestivalId;
  priceTokens?: number;
  // Pets only: how it helps around the farm
  perk?: string;
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
  | 'buy_plot'
  | 'buy_machine'
  | 'craft'
  | 'market_sell'
  | 'fish'
  | 'night_fish'
  | 'event_shop'
  | 'card_game'
  | 'card_win'
  | 'forage'
  | 'deliver_order';

export type QuestCategory = 'main' | 'daily' | 'achievement' | 'event';

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
  // Event quests: the festival they belong to, and its tokens as a reward
  festival?: FestivalId;
  rewardTokens?: number;
  // Only events for this crop count
  crop?: CropId;
  // Story chapter label (main quests)
  chapter?: string;
  // Achievements: current tier (0-based) out of `tiers`
  tier?: number;
  tiers?: number;
}

// A resident's order on the order board: the goods are delivered from the bag (lib/orders)
export interface Order {
  id: string;
  // Resident who placed it
  customer: string;
  items: ItemCounts;
  rewardGold: number;
  rewardGems: number;
}

// Gameplay state that makes up a farm: what is saved on this device and in the cloud.
// Identity (player id, Google account) and device settings live outside it.
export type BuildPieceId = 'fence' | 'path' | 'lamp' | 'flowerbed' | 'bush';

// A building piece on the farm grid (one per cell, see lib/build)
export interface BuildPiece {
  kind: BuildPieceId;
  x: number;
  z: number;
  rotY: number;
}

export interface SaveData {
  playerName: string;
  gold: number;
  gems: number;
  energy: number;
  water: number;
  day: number;
  visitedWorlds: WorldId[];
  tiles: TileData[];
  ownedPlots: string[];
  seeds: Record<CropId, number>;
  // The bag: harvests, animal products and artisan goods
  items: ItemCounts;
  // Sold overnight at full price
  shippingBin: ItemCounts;
  breadCount: number;
  animals: FarmAnimal[];
  animalFeed: number;
  // Processing machines owned (placed ones also have an entry in decorPlacements)
  machines: Partial<Record<MachineId, { job: MachineJob | null }>>;
  // Day the free daily popcorn was last eaten
  lastFreeSnackDay: number;
  // Calendar date of the casino's free lucky-wheel spin (one a day)
  lastWheelDate: string | null;
  // Beach finds picked up today (spot numbers), and the day they belong to
  beachDay: number;
  beachTaken: number[];
  // Fishing journal: how many of each kind were caught and the biggest one (cm)
  fishLog: Partial<Record<FishId, { caught: number; best: number }>>;
  // Farmer experience; the level is derived from it (lib/leveling)
  xp: number;
  // Hoe and watering can upgrades: 0 basic, 1 copper, 2 gold (lib/tools)
  toolTiers: { hoe: number; water: number };
  // Sprinklers bought but not placed on the field
  sprinklers: number;
  // Each festival's own currency (config/festivals), kept after it ends
  festivalTokens: Partial<Record<FestivalId, number>>;
  // Daily login gift: day of the 7-day streak last claimed and the calendar date it was claimed
  loginStreak: number;
  lastGiftDate: string | null;
  cosmetics: PlayerCosmetics;
  ownedCosmetics: string[];
  // Decor and machines placed on the farm
  decorPlacements: Record<string, DecorPlacement>;
  // Building pieces bought but not yet placed, and those laid out on the farm
  buildStock: Partial<Record<BuildPieceId, number>>;
  buildPieces: BuildPiece[];
  quests: QuestItem[];
  dailyDay: number;
  // The order board: open orders stay until delivered or refused, empty slots refill each morning
  orders: Order[];
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
  level?: number;
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

// Something clicked on the farm: the player walks over and does the job there (not saved)
export interface WalkGoal {
  x: number;
  z: number;
  // Close enough once the player is this far from (x, z), centre to centre
  reach: number;
  // The job, done on arrival
  act: () => void;
  // Where it is now, for something that moves around (a wandering animal)
  track?: () => { x: number; z: number } | null | undefined;
}
