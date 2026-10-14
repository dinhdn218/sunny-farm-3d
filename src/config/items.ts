import { AnimalSpecies, ArtisanId, CropId, ItemConfig, ItemId } from '@/types/game';
import { CROPS } from './crops';
import { ANIMALS } from './animals';

// Goods made in the workshop; worth about 1.4–1.6× their ingredients
export const ARTISAN_GOODS: Record<ArtisanId, ItemConfig> = {
  carrot_juice: { id: 'carrot_juice', name: 'Nước Ép Cà Rốt', icon: '🧃', sellPrice: 170, kind: 'artisan' },
  tomato_sauce: { id: 'tomato_sauce', name: 'Sốt Cà Chua', icon: '🥫', sellPrice: 280, kind: 'artisan' },
  flan: { id: 'flan', name: 'Bánh Flan', icon: '🍮', sellPrice: 300, kind: 'artisan' },
  cheese: { id: 'cheese', name: 'Phô Mai', icon: '🧀', sellPrice: 260, kind: 'artisan' },
  wool_scarf: { id: 'wool_scarf', name: 'Khăn Len', icon: '🧣', sellPrice: 300, kind: 'artisan' },
  pumpkin_pie: { id: 'pumpkin_pie', name: 'Bánh Bí Ngô', icon: '🥧', sellPrice: 480, kind: 'artisan' },
};

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

export const ITEMS = {
  ...cropItems,
  ...animalItems,
  ...ARTISAN_GOODS,
} as Record<ItemId, ItemConfig>;

export const ITEM_LIST: ItemConfig[] = Object.values(ITEMS);
