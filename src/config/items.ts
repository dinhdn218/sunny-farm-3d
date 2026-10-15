import { AnimalSpecies, ArtisanId, CropId, FishId, ItemConfig, ItemId } from '@/types/game';
import { CROPS } from './crops';
import { ANIMALS } from './animals';
import { CATCH_LIST } from './fish';
import { FORAGE_ITEMS } from './forage';
import { BUG_LIST } from './bugs';

// Goods made in the workshop; worth about 1.4–1.6× their ingredients
export const ARTISAN_GOODS: Record<ArtisanId, ItemConfig> = {
  carrot_juice: { id: 'carrot_juice', name: 'Nước Ép Cà Rốt', icon: '🧃', sellPrice: 170, kind: 'artisan' },
  tomato_sauce: { id: 'tomato_sauce', name: 'Sốt Cà Chua', icon: '🥫', sellPrice: 280, kind: 'artisan' },
  flan: { id: 'flan', name: 'Bánh Flan', icon: '🍮', sellPrice: 300, kind: 'artisan' },
  cheese: { id: 'cheese', name: 'Phô Mai', icon: '🧀', sellPrice: 260, kind: 'artisan' },
  wool_scarf: { id: 'wool_scarf', name: 'Khăn Len', icon: '🧣', sellPrice: 300, kind: 'artisan' },
  pumpkin_pie: { id: 'pumpkin_pie', name: 'Bánh Bí Ngô', icon: '🥧', sellPrice: 480, kind: 'artisan' },
  fish_stew: { id: 'fish_stew', name: 'Cá Kho Tộ', icon: '🍲', sellPrice: 230, kind: 'artisan' },
  honey_cake: { id: 'honey_cake', name: 'Bánh Mật Ong', icon: '🍰', sellPrice: 320, kind: 'artisan' },
  strawberry_jam: { id: 'strawberry_jam', name: 'Mứt Dâu', icon: '🫙', sellPrice: 250, kind: 'artisan' },
};

// Everything off the fishing line except treasure chests, which are opened on the spot
const fishItems = Object.fromEntries(
  CATCH_LIST.filter((c) => c.id !== 'treasure').map((c) => [
    c.id,
    { id: c.id, name: c.name, icon: c.icon, sellPrice: c.sellPrice, kind: 'fish' },
  ])
) as Record<FishId, ItemConfig>;

const cropItems = Object.fromEntries(
  (Object.keys(CROPS) as CropId[]).map((id) => {
    const crop = CROPS[id];
    return [id, { id, name: crop.name, icon: crop.icon, sellPrice: crop.sellPrice, kind: 'crop' }];
  })
) as Record<CropId, ItemConfig>;

const animalItems = Object.fromEntries(
  (Object.keys(ANIMALS) as AnimalSpecies[]).map((species) => {
    const a = ANIMALS[species];
    return [
      a.productId,
      { id: a.productId, name: a.productName, icon: a.productIcon, sellPrice: a.productSellPrice, kind: 'animal' },
    ];
  })
) as Record<ItemConfig['id'], ItemConfig>;

// Fruit from the trees planted on the farm (lib/trees), sold with the crops
const fruitItems = {
  mango: { id: 'mango', name: 'Xoài', icon: '🥭', sellPrice: 120, kind: 'crop' },
  orange: { id: 'orange', name: 'Cam', icon: '🍊', sellPrice: 100, kind: 'crop' },
} as Record<ItemConfig['id'], ItemConfig>;

// Honey from the hive on the farm (lib/beehive), sold with the animal products
const hiveItems = {
  honey: { id: 'honey', name: 'Mật Ong', icon: '🍯', sellPrice: 90, kind: 'animal' },
} as Record<ItemConfig['id'], ItemConfig>;

// Bugs netted in the Park
const bugItems = Object.fromEntries(
  BUG_LIST.map((b) => [b.id, { id: b.id, name: b.name, icon: b.icon, sellPrice: b.sellPrice, kind: 'bug' }])
) as Record<ItemConfig['id'], ItemConfig>;

// Beach finds, without their spawn weights
const forageItems = Object.fromEntries(
  Object.values(FORAGE_ITEMS).map(({ weight: _weight, ...item }) => [item.id, item])
) as Record<ItemConfig['id'], ItemConfig>;

export const ITEMS = {
  ...cropItems,
  ...fruitItems,
  ...animalItems,
  ...hiveItems,
  ...fishItems,
  ...forageItems,
  ...bugItems,
  ...ARTISAN_GOODS,
} as Record<ItemId, ItemConfig>;

export const ITEM_LIST: ItemConfig[] = Object.values(ITEMS);
