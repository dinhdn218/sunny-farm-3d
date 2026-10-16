import { AnimalSpecies, BuildPiece, CropId, FarmAnimal, ResidentId, SaveData, TileData } from '@/types/game';
import { STARTER_PLOTS } from '@/config/farm';
import { RESIDENTS } from '@/config/npcs';
import { levelInfo } from '@/lib/leveling';
import { createEmptyGrid } from '@/lib/newGame';
import { snapToCell } from '@/lib/build';

// What a visitor sees of a farm: the land and what stands on it, and the farmer's look and level
export type FarmView = Pick<
  SaveData,
  | 'playerName'
  | 'day'
  | 'xp'
  | 'tiles'
  | 'ownedPlots'
  | 'decorPlacements'
  | 'ownedCosmetics'
  | 'buildPieces'
  | 'animals'
  | 'machines'
  | 'cosmetics'
>;

export const farmViewOf = (save: SaveData): FarmView => ({
  playerName: save.playerName,
  day: save.day,
  xp: save.xp,
  tiles: save.tiles,
  ownedPlots: save.ownedPlots,
  decorPlacements: save.decorPlacements,
  ownedCosmetics: save.ownedCosmetics,
  buildPieces: save.buildPieces,
  animals: save.animals,
  machines: save.machines,
  cosmetics: save.cosmetics,
});

export function farmSummary(farm: FarmView) {
  return {
    level: levelInfo(farm.xp).level,
    planted: farm.tiles.filter((t) => t.state === 'planted').length,
    animals: farm.animals.length,
    decor: Object.keys(farm.decorPlacements).length,
  };
}

export interface FarmListing {
  id: string;
  name: string;
  level: number;
  day: number;
}

// Recently played farms from the public `profiles` table, the player's own left out
export function farmListFromRows(rows: unknown[], ownId: string): FarmListing[] {
  return rows
    .map((raw) => raw as { id?: string; full_name?: string | null; day?: number | null; xp?: number | null })
    .filter((row): row is { id: string; full_name?: string | null; day?: number | null; xp?: number | null } =>
      !!row.id && row.id !== ownId
    )
    .map((row) => ({
      id: row.id,
      name: row.full_name || 'Nông Dân',
      level: levelInfo(typeof row.xp === 'number' ? row.xp : 0).level,
      day: typeof row.day === 'number' ? row.day : 1,
    }));
}

interface ResidentFarmPlan {
  crops: [CropId, CropId];
  decor: [string, number, number][];
  pieces: [BuildPiece['kind'], number, number][];
  animals: AnimalSpecies[];
  xp: number;
  day: number;
}

// Each resident's farm says something about them (their levels match the village board)
const PLANS: Record<ResidentId, ResidentFarmPlan> = {
  linh_chi: {
    crops: ['strawberry', 'tomato'],
    decor: [
      ['decor_sakura_grove', 9.8, 9.0],
      ['decor_flower_arch', 4.6, 9.4],
      ['decor_swing', -7.6, -12.0],
    ],
    pieces: [
      ['flowerbed', -8.6, -8.6],
      ['flowerbed', -9.9, -8.6],
    ],
    animals: ['chicken', 'chicken', 'sheep'],
    xp: 1750,
    day: 24,
  },
  minh_quan: {
    crops: ['pumpkin', 'corn'],
    decor: [
      ['decor_gold_statue', 7.4, 4.2],
      ['decor_windmill', -9.6, -3.2],
      ['decor_fountain', -4.2, 10.0],
    ],
    pieces: [
      ['lamp', 8.6, 6.6],
      ['lamp', 8.6, -5.3],
    ],
    animals: ['cow', 'cow', 'pig', 'chicken'],
    xp: 5200,
    day: 61,
  },
  bao_ngoc: {
    crops: ['carrot', 'wheat'],
    decor: [
      ['decor_koi_pond', 9.6, -3.6],
      ['decor_mailbox', -1.2, -9.6],
      ['decor_scarecrow', -6.9, 0.0],
    ],
    pieces: [
      ['fence', 7.3, 5.9],
      ['fence', 8.6, 5.9],
      ['fence', 9.9, 5.9],
    ],
    animals: ['chicken', 'duck', 'sheep'],
    xp: 3250,
    day: 40,
  },
  hoang_nam: {
    crops: ['watermelon', 'corn'],
    decor: [
      ['decor_hot_air_balloon', -1.0, -10.6],
      ['decor_hoian_lanterns', -4.4, -12.4],
      ['decor_scarecrow', -6.9, 0.0],
    ],
    pieces: [
      ['mango_tree', -8.6, -8.6],
      ['mango_tree', 8.6, 6.6],
      ['orange_tree', 9.9, 6.6],
    ],
    animals: ['duck', 'duck', 'cow'],
    xp: 1000,
    day: 15,
  },
  thao_vy: {
    crops: ['strawberry', 'cabbage'],
    decor: [
      ['decor_beehive', 8.6, 2.2],
      ['decor_flower_arch', 4.6, 9.4],
      ['decor_sakura_grove', 9.8, 9.0],
    ],
    pieces: [
      ['flowerbed', 9.9, -2.6],
      ['flowerbed', 9.9, -3.9],
      ['flowerbed', 11.2, -2.6],
    ],
    animals: ['sheep', 'sheep', 'chicken'],
    xp: 2200,
    day: 30,
  },
};

// Two crops in alternate rows of the field, most of them ripe
function plantedField([a, b]: [CropId, CropId]): TileData[] {
  return createEmptyGrid().map((t) =>
    t.r >= 4 && t.r <= 11 && t.c >= 4 && t.c <= 11
      ? { ...t, state: 'planted', crop: t.r % 2 === 0 ? a : b, stage: (t.r + t.c) % 3 === 0 ? 2 : 3, watered: true }
      : t
  );
}

// The farm of one of the island's residents, to visit without the cloud
export function residentFarm(id: ResidentId): FarmView {
  const resident = RESIDENTS[id];
  const plan = PLANS[id];
  const animals: FarmAnimal[] = plan.animals.map((species, i) => ({
    id: `${id}_${species}_${i}`,
    species,
    name: species,
    fedToday: true,
    hasProduct: i % 2 === 0,
    affection: 80,
    x: -12 + (i % 3) * 1.6,
    z: 5.8 + Math.floor(i / 3) * 1.8,
  }));
  return {
    playerName: resident.name,
    day: plan.day,
    xp: plan.xp,
    tiles: plantedField(plan.crops),
    ownedPlots: [...STARTER_PLOTS],
    decorPlacements: Object.fromEntries(plan.decor.map(([item, x, z]) => [item, { x, z, rotY: 0 }])),
    ownedCosmetics: plan.decor.map(([item]) => item),
    buildPieces: plan.pieces.map(([kind, x, z]) => ({
      kind,
      x: snapToCell(x),
      z: snapToCell(z),
      rotY: 0,
      ...(kind.endsWith('_tree') ? { planted: 1, fruit: 2 } : {}),
    })),
    animals,
    machines: {},
    cosmetics: resident.cosmetics,
  };
}
