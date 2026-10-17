import { CropId, TileData } from '@/types/game';
import { CROPS } from '@/config/crops';
import { formatDuration } from '@/lib/clock';

// A new player's first crops ripen this fast, so the first harvest comes in the first session
export const FAST_CROP_MS = 5 * 60_000;
export const FAST_CROPS_FOR_NEW_PLAYERS = 5;

const MINUTE = 60_000;

export const growMsOf = (crop: CropId) => CROPS[crop].growMinutes * MINUTE;
export const regrowMsOf = (crop: CropId) => (CROPS[crop].regrowMinutes ?? CROPS[crop].growMinutes / 2) * MINUTE;

// How long the tile's crop needs once watered; crops from before real time have no `growMs`
export function cycleMs(tile: TileData) {
  if (tile.growMs) return tile.growMs;
  if (!tile.crop) return 0;
  if (tile.stage < 2) return growMsOf(tile.crop);
  return CROPS[tile.crop].regrow ? regrowMsOf(tile.crop) : growMsOf(tile.crop) / 2;
}

// A crop waiting for water (the field shows a drop over it)
export const needsWater = (t: TileData) => t.state === 'planted' && !!t.crop && t.stage < 3 && !t.watered;

// Worked soil still dry: what the watering can, a sprinkler, the rain or a pet waters
export const canWater = (t: TileData) =>
  !t.sprinkler && t.state !== 'empty' && !t.watered && !(t.state === 'planted' && t.stage >= 3);

const startGrowing = (tile: TileData, at: number): TileData => {
  const ms = cycleMs(tile);
  return { ...tile, watered: true, growMs: ms, readyAt: at + ms, midAt: tile.stage < 2 ? at + ms / 2 : null };
};

// Water at `at`: the soil is wet, and a crop waiting for it starts growing
export function waterTile(tile: TileData, at: number): TileData {
  if (!canWater(tile)) return tile;
  return tile.state === 'planted' && tile.crop ? startGrowing(tile, at) : { ...tile, watered: true };
}

// Sow on tilled soil; on soil already wet the crop starts growing at once
export function plantTile(tile: TileData, crop: CropId, at: number, fast = false): TileData {
  const sown: TileData = {
    ...tile,
    state: 'planted',
    crop,
    stage: 1,
    growMs: fast ? FAST_CROP_MS : growMsOf(crop),
    readyAt: null,
    midAt: null,
  };
  return tile.watered ? startGrowing(sown, at) : sown;
}

// After picking: tilled soil again, or a plant that grows back once watered
export function harvestTile(tile: TileData): TileData {
  if (tile.crop && CROPS[tile.crop].regrow) {
    return {
      ...tile,
      stage: 2,
      watered: false,
      fertilized: false,
      growMs: regrowMsOf(tile.crop),
      readyAt: null,
      midAt: null,
    };
  }
  return {
    ...tile,
    state: 'tilled',
    crop: null,
    stage: 0,
    watered: false,
    fertilized: false,
    growMs: undefined,
    readyAt: null,
    midAt: null,
  };
}

// The stage reached by `now`, never lower than the one stored
export function stageAt(tile: TileData, now: number) {
  if (tile.state !== 'planted' || tile.readyAt == null) return tile.stage;
  if (now >= tile.readyAt) return 3;
  if (tile.midAt != null && now >= tile.midAt) return Math.max(tile.stage, 2);
  return tile.stage;
}

// Time left until ripe, or null while the crop waits for water
export const msLeft = (tile: TileData, now: number) => (tile.readyAt == null ? null : Math.max(0, tile.readyAt - now));

// Every crop at the stage it has reached by `now` (the same array when none moved on). A crop watered before real
// time came in (no `readyAt`) starts growing now.
export function refreshStages(tiles: TileData[], now: number): TileData[] {
  let changed = false;
  const next = tiles.map((t) => {
    let tile =
      t.state === 'planted' && t.crop && t.watered && t.stage < 3 && t.readyAt == null ? startGrowing(t, now) : t;
    const stage = stageAt(tile, now);
    if (stage !== tile.stage) tile = { ...tile, stage };
    if (tile !== t) changed = true;
    return tile;
  });
  return changed ? next : tiles;
}

const AROUND: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// Dry worked tiles that get watered at `at` without the can: every one on a wet day, otherwise the 8 around a sprinkler
export function autoWater(tiles: TileData[], at: number, wet: boolean) {
  const nearSprinkler = new Set<string>();
  tiles
    .filter((t) => t.sprinkler)
    .forEach((s) => AROUND.forEach(([dr, dc]) => nearSprinkler.add(`${s.r + dr}-${s.c + dc}`)));
  let watered = 0;
  const next = tiles.map((t) => {
    if (!canWater(t) || !(wet || nearSprinkler.has(t.id))) return t;
    watered++;
    return waterTile(t, at);
  });
  return { tiles: watered ? next : tiles, watered };
}

// What the field says about a crop: ripe, waiting for water, or the time it still needs
export function cropStatus(tile: TileData, now: number) {
  if (tile.stage >= 3) return '✨ ĐÃ CHÍN! Click để thu hoạch!';
  const left = msLeft(tile, now);
  return left === null ? '💧 Cần tưới để cây bắt đầu lớn' : `⏳ Còn ${formatDuration(left)}`;
}
