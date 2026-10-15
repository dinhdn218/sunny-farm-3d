import { CropConfig, CropId } from '@/types/game';

export const CROPS: Record<CropId, CropConfig> = {
  carrot: {
    id: 'carrot',
    name: 'Cà Rốt',
    icon: '🥕',
    seedPrice: 15,
    sellPrice: 40,
    daysPerStage: 1,
    regrow: false,
    color: '#ff6b1a',
    description: 'Lớn nhanh (2 ngày), dễ trồng.',
    season: 'spring',
  },
  wheat: {
    id: 'wheat',
    name: 'Lúa Mì',
    icon: '🌾',
    seedPrice: 25,
    sellPrice: 70,
    daysPerStage: 1,
    regrow: false,
    color: '#facc15',
    description: 'Bông lúa vàng óng (2 ngày).',
    season: 'winter',
  },
  tomato: {
    id: 'tomato',
    name: 'Cà Chua',
    icon: '🍅',
    seedPrice: 45,
    sellPrice: 65,
    daysPerStage: 1,
    regrow: true,
    color: '#ef4444',
    description: 'Thu hoạch nhiều đợt không mất gốc!',
    season: 'summer',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Bí Ngô',
    icon: '🎃',
    seedPrice: 80,
    sellPrice: 210,
    daysPerStage: 2,
    regrow: false,
    color: '#f97316',
    description: 'Quả khổng lồ bán giá cực cao.',
    season: 'autumn',
  },
};

export const CROP_LIST: CropConfig[] = Object.values(CROPS);
