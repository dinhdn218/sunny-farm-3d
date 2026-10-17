import { ItemCounts, SaveData, TileData } from '@/types/game';
import { COSMETICS } from '@/config/cosmetics';
import { GRID_SIZE, PLOT_TILES, STARTER_PLOTS } from '@/config/farm';
import { defaultDecorPlacements } from '@/lib/farmLayout';
import { createInitialQuests, reconcileQuests } from '@/lib/quests';
import { addItems } from '@/lib/inventory';
import { estimateXp } from '@/lib/leveling';
import { discoveriesFrom } from '@/lib/collection';
import { createEmptyGrid, createNewGameSave } from '@/lib/newGame';
import { gameDayAt, now as clockNow } from '@/lib/clock';
import { cycleMs, waterTile } from '@/lib/growth';

export const SAVE_VERSION = 6;

// A save as read back from storage: possibly from an older version, possibly with extra keys
export type StoredSave = Partial<SaveData> & Record<string, unknown>;

// Listing every key here (the compiler checks it against SaveData) keeps saves complete
const SAVE_FIELDS: Record<keyof SaveData, true> = {
  playerName: true,
  gold: true,
  gems: true,
  energy: true,
  energyAt: true,
  water: true,
  day: true,
  visitedWorlds: true,
  tiles: true,
  ownedPlots: true,
  seeds: true,
  items: true,
  shippingBin: true,
  breadCount: true,
  animals: true,
  animalFeed: true,
  machines: true,
  lastFreeSnackDay: true,
  lastWheelDate: true,
  beachDay: true,
  beachTaken: true,
  bugDay: true,
  bugsTaken: true,
  fishLog: true,
  xp: true,
  toolTiers: true,
  sprinklers: true,
  fertilizer: true,
  fastCropsLeft: true,
  festivalTokens: true,
  loginStreak: true,
  lastGiftDate: true,
  cosmetics: true,
  ownedCosmetics: true,
  decorPlacements: true,
  buildStock: true,
  buildPieces: true,
  quests: true,
  dailyDay: true,
  orders: true,
  beehiveHoney: true,
  mail: true,
  pendingThanks: true,
  collected: true,
  collectionClaimed: true,
  friendship: true,
  residentDay: true,
  talkedTo: true,
  giftedTo: true,
  giftLog: true,
  weekly: true,
  buff: true,
  neighborVisitsSeen: true,
  likedFarms: true,
};

export const SAVE_KEYS = Object.keys(SAVE_FIELDS) as (keyof SaveData)[];

export function pickSaveData(state: SaveData): SaveData {
  return Object.fromEntries(SAVE_KEYS.map((key) => [key, state[key]])) as unknown as SaveData;
}

// A new game nobody has played yet: nothing to lose by replacing it with a cloud save (every day played counts
// towards an achievement, so a save that went through a day is not fresh)
export function isFreshSave(save: Pick<SaveData, 'quests'>) {
  return save.quests.every((q) => !q.claimed && q.progress === 0);
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

// v0 saves: an 8×8 field and one-off quests. Centre the old field in the
// 16×16 grid, place owned decor at its old spots and switch to the new quest system.
function fromV0(saved: StoredSave): StoredSave {
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

// v1 saves kept crops and animal products apart and the shipping bin took crops only
function fromV1(saved: StoredSave): StoredSave {
  const { harvested, animalProducts, ...rest } = saved as StoredSave & {
    harvested?: ItemCounts;
    animalProducts?: ItemCounts;
  };
  return {
    ...rest,
    items: addItems(addItems({}, harvested ?? {}), animalProducts ?? {}),
    shippingBin: addItems({}, saved.shippingBin ?? {}),
    machines: {},
    lastFreeSnackDay: 0,
  };
}

// v2 saves predate farmer levels and the daily gift: experience is estimated from the achievement counters
function fromV2(saved: StoredSave): StoredSave {
  return {
    ...saved,
    xp: estimateXp(saved.quests ?? []),
    loginStreak: 0,
    lastGiftDate: null,
  };
}

// v3 saves had one festival and kept its candy on its own
function fromV3(saved: StoredSave): StoredSave {
  const { candy, ...rest } = saved as StoredSave & { candy?: number };
  return { ...rest, festivalTokens: candy ? { halloween: candy } : {} };
}

// v4 saves predate the collection book: it starts from what the save holds and has caught
function fromV4(saved: StoredSave): StoredSave {
  return { ...saved, collected: discoveriesFrom(saved), collectionClaimed: [] };
}

// v5 saves ran on days slept through: crops grow on the clock now, stamina comes back by itself and the day is the
// date in Vietnam. The save opens as if a night just went by (so on a morning report); fruit trees and letters keep
// their age.
function fromV5(saved: StoredSave, at: number): StoredSave {
  const day = gameDayAt(at) - 1;
  const shift = day - (saved.day ?? 1);
  // Only what the save holds is converted: anything it lacks is filled in as in a new game (saveFromCloud)
  return {
    ...saved,
    day,
    ...(saved.tiles && {
      tiles: saved.tiles.map((t) => {
        const { daysWatered: _daysWatered, ...tile } = t as TileData & { daysWatered?: number };
        if (tile.state !== 'planted' || !tile.crop || tile.stage >= 3) return tile;
        const waiting: TileData = { ...tile, watered: false, growMs: cycleMs(tile), readyAt: null, midAt: null };
        return tile.watered ? waterTile(waiting, at) : waiting;
      }),
    }),
    energyAt: at,
    fastCropsLeft: 0,
    buff: null,
    ...(saved.buildPieces && {
      buildPieces: saved.buildPieces.map((p) => (p.planted === undefined ? p : { ...p, planted: p.planted + shift })),
    }),
    ...(saved.mail && { mail: saved.mail.map((letter) => ({ ...letter, day: letter.day + shift })) }),
  };
}

// Brings a save written by an older version of the game up to date
export function migrateSave(raw: Record<string, unknown>, version: number, at = clockNow()): StoredSave {
  let save = raw as StoredSave;
  if (version < 1) save = fromV0(save);
  if (version < 2) save = fromV1(save);
  if (version < 3) save = fromV2(save);
  if (version < 4) save = fromV3(save);
  if (version < 5) save = fromV4(save);
  if (version < 6) save = fromV5(save, at);
  return save;
}

// A cloud save is complete game data: anything it lacks starts as in a new game, anything extra is dropped
export function saveFromCloud(raw: Record<string, unknown>, version: number): SaveData {
  const save = pickSaveData({ ...createNewGameSave(), ...migrateSave(raw, version) } as SaveData);
  return { ...save, quests: reconcileQuests(save.quests, save.day) };
}
