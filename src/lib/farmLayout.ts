import { BuildPiece, DecorPlacement, TreeType, WorldId } from '@/types/game';
import { FIELD_BORDER, PLOT_SIZE, PLOTS_PER_SIDE, parsePlotKey } from '@/config/farm';
import { COSMETICS } from '@/config/cosmetics';
import { MACHINES, isMachineId } from '@/config/machines';
import { WORLDS } from '@/config/worlds';
import { BUILD_PIECE_RADIUS, pieceAt } from '@/lib/build';

export interface FarmBands {
  west: number;
  east: number;
  north: number;
  south: number;
}

export interface IslandShape {
  cx: number;
  cz: number;
  rx: number;
  rz: number;
}

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

type Collider = { x: number; z: number; r: number } | Rect;

export const BASE_ISLAND_RADIUS = 18.5;
// How far inside the island rim the player may walk
export const WALK_MARGIN = 3.3;
// Half-size of the starting 8×8 field incl. its border; anything beyond it slides outward when land is added
const BASE_FIELD_HALF = PLOT_SIZE + FIELD_BORDER;
// The island widens a bit more than the inserted strip so the corners of moved buildings stay on land
const ISLAND_GROWTH = 0.75;

// Farm layout of the HTML version, before any land is added
export const FARM_SITES: Record<
  'house' | 'shippingBin' | 'seedShop' | 'well' | 'ranch',
  [number, number]
> = {
  house: [-5.4, -8.5],
  shippingBin: [-2.1, -7.4],
  seedShop: [4.5, -8.0],
  well: [7.6, 0],
  ranch: [-10.5, 6.8],
};

export const FARM_TREES: { x: number; z: number; scale: number; type: TreeType }[] = [
  { x: -11, z: -7, scale: 1.1, type: 'pine' },
  { x: -12, z: 2, scale: 1.0, type: 'oak' },
  { x: 11.5, z: 4, scale: 1.05, type: 'pine' },
  { x: 10, z: -8, scale: 1.2, type: 'oak' },
];

// Barn position relative to the ranch pasture
export const BARN_OFFSET: [number, number] = [1.5, -3.9];

// Each side gains one strip of land (one plot wide) once any plot on that edge is owned
export function farmBands(ownedPlots: string[]): FarmBands {
  const plots = ownedPlots.map(parsePlotKey);
  const last = PLOTS_PER_SIDE - 1;
  return {
    west: plots.some((p) => p.px === 0) ? PLOT_SIZE : 0,
    east: plots.some((p) => p.px === last) ? PLOT_SIZE : 0,
    north: plots.some((p) => p.pz === 0) ? PLOT_SIZE : 0,
    south: plots.some((p) => p.pz === last) ? PLOT_SIZE : 0,
  };
}

// New land is inserted between the field and its surroundings: points outside the starting field slide outward
export function stretchPoint(x: number, z: number, bands: FarmBands): [number, number] {
  const sx = x < -BASE_FIELD_HALF ? x - bands.west : x > BASE_FIELD_HALF ? x + bands.east : x;
  const sz = z < -BASE_FIELD_HALF ? z - bands.north : z > BASE_FIELD_HALF ? z + bands.south : z;
  return [sx, sz];
}

export function farmPoint(x: number, z: number, ownedPlots: string[]) {
  return stretchPoint(x, z, farmBands(ownedPlots));
}

// Bounding box of the owned plots (plus the brown border), in plot indices and world units
export function fieldRect(ownedPlots: string[]) {
  const plots = ownedPlots.map(parsePlotKey);
  const minPx = Math.min(...plots.map((p) => p.px));
  const maxPx = Math.max(...plots.map((p) => p.px));
  const minPz = Math.min(...plots.map((p) => p.pz));
  const maxPz = Math.max(...plots.map((p) => p.pz));
  const mid = PLOTS_PER_SIDE / 2;
  return {
    minPx,
    maxPx,
    minPz,
    maxPz,
    minX: (minPx - mid) * PLOT_SIZE - FIELD_BORDER,
    maxX: (maxPx + 1 - mid) * PLOT_SIZE + FIELD_BORDER,
    minZ: (minPz - mid) * PLOT_SIZE - FIELD_BORDER,
    maxZ: (maxPz + 1 - mid) * PLOT_SIZE + FIELD_BORDER,
  };
}

export function islandShape(world: WorldId, ownedPlots: string[]): IslandShape {
  if (world !== 'farm') {
    return { cx: 0, cz: 0, rx: BASE_ISLAND_RADIUS, rz: BASE_ISLAND_RADIUS };
  }
  const b = farmBands(ownedPlots);
  return {
    cx: (b.east - b.west) / 2,
    cz: (b.south - b.north) / 2,
    rx: BASE_ISLAND_RADIUS + ISLAND_GROWTH * (b.west + b.east),
    rz: BASE_ISLAND_RADIUS + ISLAND_GROWTH * (b.north + b.south),
  };
}

export function insideIsland(x: number, z: number, shape: IslandShape, margin: number) {
  const dx = (x - shape.cx) / (shape.rx - margin);
  const dz = (z - shape.cz) / (shape.rz - margin);
  return dx * dx + dz * dz < 1;
}

export function worldSpawn(world: WorldId, ownedPlots: string[]): [number, number] {
  const [x, z] = WORLDS[world].spawn;
  return world === 'farm' ? farmPoint(x, z, ownedPlots) : [x, z];
}

export function worldPortal(world: WorldId, ownedPlots: string[]): [number, number] {
  const [x, z] = WORLDS[world].portalPos;
  return world === 'farm' ? farmPoint(x, z, ownedPlots) : [x, z];
}

// The ranch (pasture, barn and its animals) moves as one piece
export function ranchOffset(ownedPlots: string[]): [number, number] {
  const [x, z] = FARM_SITES.ranch;
  const [sx, sz] = farmPoint(x, z, ownedPlots);
  return [sx - x, sz - z];
}

export type ExpansionSide = 'west' | 'east' | 'north' | 'south';

// "Mở rộng" signboards just outside the field on every side that can still grow
export function expansionSigns(ownedPlots: string[]) {
  const f = fieldRect(ownedPlots);
  const signs: { side: ExpansionSide; x: number; z: number }[] = [];
  if (f.minPx > 0) signs.push({ side: 'west', x: f.minX - 1.15, z: -2.5 });
  if (f.maxPx < PLOTS_PER_SIDE - 1) signs.push({ side: 'east', x: f.maxX + 1.15, z: -2.5 });
  if (f.minPz > 0) signs.push({ side: 'north', x: 2.0, z: f.minZ - 1.15 });
  if (f.maxPz < PLOTS_PER_SIDE - 1) signs.push({ side: 'south', x: 2.5, z: f.maxZ + 1.15 });
  return signs;
}

const rectAround = ([x, z]: [number, number], hw: number, hd: number): Rect => ({
  minX: x - hw,
  maxX: x + hw,
  minZ: z - hd,
  maxZ: z + hd,
});

function farmColliders(ownedPlots: string[]): Collider[] {
  const bands = farmBands(ownedPlots);
  const at = ([x, z]: [number, number]) => stretchPoint(x, z, bands);
  const [ox, oz] = ranchOffset(ownedPlots);
  const [ranchX, ranchZ] = FARM_SITES.ranch;
  const [shopX, shopZ] = at(FARM_SITES.seedShop);
  const [wellX, wellZ] = at(FARM_SITES.well);
  const [portalX, portalZ] = worldPortal('farm', ownedPlots);

  return [
    rectAround(at(FARM_SITES.house), 1.9, 1.6),
    rectAround(at(FARM_SITES.shippingBin), 0.75, 0.55),
    { x: shopX, z: shopZ, r: 2.0 },
    { x: wellX, z: wellZ, r: 1.3 },
    { x: portalX, z: portalZ, r: 1.7 },
    rectAround([ranchX + ox, ranchZ + oz], 3.2, 2.8),
    rectAround([ranchX + BARN_OFFSET[0] + ox, ranchZ + BARN_OFFSET[1] + oz], 1.8, 1.4),
    ...FARM_TREES.map((t) => {
      const [x, z] = at([t.x, t.z]);
      return { x, z, r: 1.2 * t.scale };
    }),
    ...expansionSigns(ownedPlots).map((s) => ({ x: s.x, z: s.z, r: 0.6 })),
  ];
}

// Anything placed on the farm: decor from the wardrobe shop or a workshop machine
export function placeableInfo(id: string) {
  if (isMachineId(id)) return MACHINES[id];
  const item = COSMETICS.find((c) => c.id === id && c.category === 'decor');
  return item && { name: item.name, icon: item.icon, footprint: item.footprint ?? 1 };
}

export const decorFootprint = (id: string) => placeableInfo(id)?.footprint ?? 1;

function circleHitsRect(x: number, z: number, r: number, rect: Rect) {
  const nx = Math.max(rect.minX, Math.min(x, rect.maxX));
  const nz = Math.max(rect.minZ, Math.min(z, rect.maxZ));
  return (x - nx) ** 2 + (z - nz) ** 2 < r * r;
}

// A circle of radius r at (x, z) on the island's grass, off the field, buildings, trees and signs
function onFreeGround(x: number, z: number, r: number, ownedPlots: string[]) {
  if (!insideIsland(x, z, islandShape('farm', ownedPlots), r + 0.6)) return false;
  if (circleHitsRect(x, z, r, fieldRect(ownedPlots))) return false;
  return !farmColliders(ownedPlots).some((c) =>
    'r' in c ? Math.hypot(c.x - x, c.z - z) < c.r + r : circleHitsRect(x, z, r, c)
  );
}

// Decor must stay on free ground and clear of other decor and building pieces
export function canPlaceDecor(
  id: string,
  x: number,
  z: number,
  ownedPlots: string[],
  placements: Record<string, DecorPlacement>,
  pieces: BuildPiece[] = []
) {
  const r = decorFootprint(id);
  if (!onFreeGround(x, z, r, ownedPlots)) return false;
  if (pieces.some((p) => Math.hypot(p.x - x, p.z - z) < r + BUILD_PIECE_RADIUS)) return false;
  return Object.entries(placements).every(
    ([other, p]) => other === id || Math.hypot(p.x - x, p.z - z) >= r + decorFootprint(other)
  );
}

// A building piece needs free ground, room around decor and machines, and a cell of its own
export function canPlaceBuildPiece(
  x: number,
  z: number,
  ownedPlots: string[],
  placements: Record<string, DecorPlacement>,
  pieces: BuildPiece[]
) {
  const r = BUILD_PIECE_RADIUS;
  if (!onFreeGround(x, z, r, ownedPlots)) return false;
  if (Object.entries(placements).some(([id, p]) => Math.hypot(p.x - x, p.z - z) < r + decorFootprint(id))) {
    return false;
  }
  return !pieceAt(pieces, x, z);
}

const DEFAULT_DECOR_SPOTS: Record<string, [number, number]> = {
  decor_scarecrow: [-6.8, 0],
  decor_windmill: [-9.2, -4.2],
  decor_fountain: [9.6, 9.2],
  decor_sakura_grove: [11.5, -4.0],
  decor_gold_statue: [6.9, 6.9],
};

// Spots for decor that was bought before decorations became movable
export function defaultDecorPlacements(ownedCosmetics: string[]) {
  const placements: Record<string, DecorPlacement> = {};
  ownedCosmetics.forEach((id) => {
    const spot = DEFAULT_DECOR_SPOTS[id];
    if (spot) placements[id] = { x: spot[0], z: spot[1], rotY: 0 };
  });
  return placements;
}
