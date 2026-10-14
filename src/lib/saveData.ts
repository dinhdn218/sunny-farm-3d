import { SaveData } from '@/types/game';
import { COSMETICS } from '@/config/cosmetics';
import { GRID_SIZE, PLOT_TILES, STARTER_PLOTS } from '@/config/farm';
import { defaultDecorPlacements } from '@/lib/farmLayout';
import { createInitialQuests } from '@/lib/quests';
import { createEmptyGrid, createNewGameSave } from '@/lib/newGame';

export const SAVE_VERSION = 1;

// A save as read back from storage: possibly from an older version, possibly with extra keys
export type StoredSave = Partial<SaveData> & Record<string, unknown>;

// Listing every key here (the compiler checks it against SaveData) keeps saves complete
const SAVE_FIELDS: Record<keyof SaveData, true> = {
  playerName: true,
  gold: true,
  gems: true,
  energy: true,
  water: true,
  day: true,
  visitedWorlds: true,
  tiles: true,
  ownedPlots: true,
  seeds: true,
  harvested: true,
  shippingBin: true,
  breadCount: true,
  animals: true,
  animalFeed: true,
  animalProducts: true,
  cosmetics: true,
  ownedCosmetics: true,
  decorPlacements: true,
  quests: true,
  dailyDay: true,
};

export const SAVE_KEYS = Object.keys(SAVE_FIELDS) as (keyof SaveData)[];

export function pickSaveData(state: SaveData): SaveData {
  return Object.fromEntries(SAVE_KEYS.map((key) => [key, state[key]])) as unknown as SaveData;
}

// A new game nobody has played yet: nothing to lose by replacing it with a cloud save
export function isFreshSave(save: Pick<SaveData, 'day' | 'quests'>) {
  return save.day <= 1 && save.quests.every((q) => !q.claimed && q.progress === 0);
}

const cosmeticById = (id: string) => COSMETICS.find((c) => c.id === id);

const isPaidWearable = (id: string) => {
  const item = cosmeticById(id);
  return !!item && item.category !== 'decor' && (item.priceGold > 0 || item.priceGems > 0);
};

// Achievement progress implied by an older save (things bought, days played)
const achievementProgressFrom = (ownedCosmetics: string[], day: number) => ({
  a_fashion: ownedCosmetics.filter(isPaidWearable).length,
  a_decor: ownedCosmetics.filter((id) => cosmeticById(id)?.category === 'decor').length,
  a_days: day - 1,
});

// Brings a save written by an older version of the game up to date
export function migrateSave(raw: Record<string, unknown>, version: number): StoredSave {
  const saved = raw as StoredSave;
  if (version >= 1) return saved;

  // v0 saves: an 8×8 field and one-off quests. Centre the old field in the
  // 16×16 grid, place owned decor at its old spots and switch to the new quest system.
  const tiles = createEmptyGrid();
  (saved.tiles ?? []).forEach((t) => {
    const r = t.r + PLOT_TILES;
    const c = t.c + PLOT_TILES;
    tiles[r * GRID_SIZE + c] = { ...t, id: `${r}-${c}`, r, c };
  });
  const owned = saved.ownedCosmetics ?? [];
  const day = saved.day ?? 1;
  return {
    ...saved,
    tiles,
    ownedPlots: [...STARTER_PLOTS],
    decorPlacements: defaultDecorPlacements(owned),
    dailyDay: day,
    quests: createInitialQuests(day, achievementProgressFrom(owned, day)),
  };
}

// A cloud save is complete game data: anything it lacks starts as in a new game, anything extra is dropped
export function saveFromCloud(raw: Record<string, unknown>, version: number): SaveData {
  return pickSaveData({ ...createNewGameSave(), ...migrateSave(raw, version) } as SaveData);
}
