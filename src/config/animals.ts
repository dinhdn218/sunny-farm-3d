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
    description: 'Vật nuôi giá trị cao nhất trang trại! Cho Sữa Tươi cực kỳ lời mỗi sáng.',
  },
};

export const ANIMAL_LIST: AnimalConfig[] = Object.values(ANIMALS);
