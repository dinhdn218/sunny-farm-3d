import { CropId, TileData, ToolId } from '@/types/game';
import { GRID_SIZE } from '@/config/farm';
import { CROP_LIST } from '@/config/crops';

export type UpgradableTool = 'hoe' | 'water';

// Tier 0 is the starting tool; tiers 1 (copper) and 2 (gold) are bought at the seed shop
export const TOOL_NAMES: Record<UpgradableTool, string[]> = {
  hoe: ['Cuốc Đất', 'Cuốc Đồng', 'Cuốc Vàng'],
  water: ['Bình Tưới', 'Bình Tưới Đồng', 'Bình Tưới Vàng'],
};

// Price of reaching tier 1 and tier 2
export const TOOL_UPGRADES: Record<UpgradableTool, { gold: number; gems: number }[]> = {
  hoe: [
    { gold: 500, gems: 0 },
    { gold: 2000, gems: 20 },
  ],
  water: [
    { gold: 400, gems: 0 },
    { gold: 1800, gems: 15 },
  ],
};

export const MAX_TOOL_TIER = 2;
export const SPRINKLER_PRICE = 300;
export const FERTILIZER_PRICE = 30;

const AREA_OFFSETS: [number, number][][] = [
  [[0, 0]],
  [
    [0, 0],
    [0, -1],
    [0, 1],
  ],
  [
    [0, 0],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ],
];

// Tiles a tool works when a tile is clicked: the clicked tile first, then its neighbours in the field
export function areaTiles(r: number, c: number, tier: number): [number, number][] {
  return AREA_OFFSETS[Math.min(tier, MAX_TOOL_TIER)]
    .map(([dr, dc]): [number, number] => [r + dr, c + dc])
    .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < GRID_SIZE && cc < GRID_SIZE);
}

export const waterCapacity = (tier: number) => [10, 20, 40][Math.min(tier, MAX_TOOL_TIER)];

// Upgraded tools are easier on the back: 1 energy per tile instead of 2
export const energyPerTile = (tier: number) => (tier >= 1 ? 1 : 2);

// The hotbar's one seed slot: it takes out the seeds used last, and again moves on to the next crop's
export function nextSeedTool(activeTool: ToolId, lastSeedCrop: CropId): ToolId {
  if (!activeTool.startsWith('seed_')) return `seed_${lastSeedCrop}`;
  const current = CROP_LIST.findIndex((c) => `seed_${c.id}` === activeTool);
  return `seed_${CROP_LIST[(current + 1) % CROP_LIST.length].id}`;
}

const NEIGHBOURS: [number, number][] = AREA_OFFSETS[2].slice(1);

// Each morning sprinklers water the worked (tilled or planted) tiles around them
export function applySprinklers(tiles: TileData[]): TileData[] {
  const reached = new Set<string>();
  tiles
    .filter((t) => t.sprinkler)
    .forEach((s) => NEIGHBOURS.forEach(([dr, dc]) => reached.add(`${s.r + dr}-${s.c + dc}`)));
  if (reached.size === 0) return tiles;
  return tiles.map((t) =>
    reached.has(t.id) && !t.sprinkler && t.state !== 'empty' && !t.watered ? { ...t, watered: true } : t
  );
}
