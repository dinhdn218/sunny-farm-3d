import { FarmAnimal, SaveData, TileData } from '@/types/game';
import { GRID_SIZE, STARTER_PLOTS } from '@/config/farm';
import { createInitialQuests } from '@/lib/quests';

export const createEmptyGrid = (): TileData[] => {
  const grid: TileData[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      grid.push({
        id: `${r}-${c}`,
        r,
        c,
        state: 'empty',
        watered: false,
        crop: null,
        stage: 0,
        daysWatered: 0,
      });
    }
  }
  return grid;
};

// Same starter plot as the HTML version (ripe carrot & wheat, a tomato bush, one tilled tile), in the field centre
const STARTER_TILES: Record<
  string,
  Pick<TileData, 'state' | 'crop' | 'stage' | 'watered'>
> = {
  '7-7': { state: 'planted', crop: 'carrot', stage: 3, watered: true },
  '7-8': { state: 'planted', crop: 'wheat', stage: 3, watered: true },
  '8-7': { state: 'planted', crop: 'tomato', stage: 2, watered: true },
  '8-8': { state: 'tilled', crop: null, stage: 0, watered: false },
};

const createInitialGrid = (): TileData[] =>
  createEmptyGrid().map((t) => ({ ...t, ...STARTER_TILES[t.id] }));

const createInitialAnimals = (): FarmAnimal[] => [
  {
    id: 'ani_chicken_1',
    species: 'chicken',
    name: 'Gà Chip',
    fedToday: false,
    hasProduct: true,
    affection: 45,
    x: -10.8,
    z: 6.2,
  },
  {
    id: 'ani_sheep_1',
    species: 'sheep',
    name: 'Cừu Bông',
    fedToday: false,
    hasProduct: true,
    affection: 55,
    x: -9.0,
    z: 7.4,
  },
  {
    id: 'ani_cow_1',
    species: 'cow',
    name: 'Bò Mộc Châu',
    fedToday: false,
    hasProduct: false,
    affection: 65,
    x: -11.5,
    z: 8.5,
  },
];

// The farm a new player starts with
export function createNewGameSave(): SaveData {
  return {
    playerName: 'Nông Dân ' + Math.floor(100 + Math.random() * 899),
    gold: 810,
    gems: 130,
    energy: 98,
    water: 10,
    day: 1,
    visitedWorlds: ['farm'],
    tiles: createInitialGrid(),
    ownedPlots: [...STARTER_PLOTS],
    seeds: { carrot: 6, wheat: 4, tomato: 3, pumpkin: 2 },
    items: { carrot: 2, wheat: 1, egg: 1 },
    shippingBin: {},
    breadCount: 2,
    animals: createInitialAnimals(),
    animalFeed: 8,
    machines: {},
    lastFreeSnackDay: 0,
    cosmetics: {
      hat: 'straw_hat',
      outfit: 'farmer_blue',
      wing: 'none_wing',
      pet: 'shiba_inu',
    },
    ownedCosmetics: [
      'none_hat',
      'straw_hat',
      'farmer_blue',
      'none_wing',
      'none_pet',
      'shiba_inu',
    ],
    decorPlacements: {},
    quests: createInitialQuests(1),
    dailyDay: 1,
  };
}
