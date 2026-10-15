import { AnimalConfig, AnimalSpecies } from '@/types/game';

export const ANIMALS: Record<AnimalSpecies, AnimalConfig> = {
  chicken: {
    species: 'chicken',
    name: 'Gà Đẻ Trứng',
    icon: '🐔',
    buyPrice: 120,
    productId: 'egg',
    productName: 'Trứng Gà Tươi',
    productIcon: '🥚',
    productSellPrice: 45,
    glbPath: '/models/chicken.glb',
    description: 'Cho ăn mỗi ngày để thu hoạch Trứng Gà Tươi vào sáng hôm sau.',
  },
  sheep: {
    species: 'sheep',
    name: 'Cừu Lông Xù',
    icon: '🐑',
    buyPrice: 280,
    productId: 'wool',
    productName: 'Lông Cừu Mềm',
    productIcon: '🧶',
    productSellPrice: 95,
    glbPath: '/models/sheep.glb',
    description: 'Cừu trắng đáng yêu trên đồng cỏ. Cung cấp Lông Cừu thượng hạng.',
  },
  cow: {
    species: 'cow',
    name: 'Bò Sữa Hà Lan',
    icon: '🐄',
    buyPrice: 450,
    productId: 'milk',
    productName: 'Sữa Tươi Nguyên Chất',
    productIcon: '🥛',
    productSellPrice: 160,
    glbPath: '/models/cow.glb',
    description: 'Bò sữa hiền lành cho Sữa Tươi cực kỳ lời mỗi sáng.',
  },
  duck: {
    species: 'duck',
    name: 'Vịt Bầu',
    icon: '🦆',
    buyPrice: 180,
    productId: 'duck_egg',
    productName: 'Trứng Vịt',
    productIcon: '🪺',
    productSellPrice: 60,
    description: 'Vịt trắng lạch bạch quanh chuồng, đẻ Trứng Vịt to hơn trứng gà.',
  },
  pig: {
    species: 'pig',
    name: 'Heo Ủn Ỉn',
    icon: '🐖',
    buyPrice: 600,
    productId: 'truffle',
    productName: 'Nấm Truffle',
    productIcon: '🍄',
    productSellPrice: 220,
    description: 'Mũi thính số một! Mỗi sáng sục đất tìm Nấm Truffle quý hiếm.',
  },
};

export const MAX_ANIMALS = 12;

// Close friends (affection at least this) sometimes give two products at once
export const DOUBLE_PRODUCT_AFFECTION = 80;
export const DOUBLE_PRODUCT_CHANCE = 0.3;

export const ANIMAL_LIST: AnimalConfig[] = Object.values(ANIMALS);
