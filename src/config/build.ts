import { BuildPieceId, FruitId } from '@/types/game';

export interface BuildPieceConfig {
  id: BuildPieceId;
  name: string;
  icon: string;
  price: number;
  description: string;
  // Bought this many at a time (5 unless given)
  buyCount?: number;
  // Fruit trees: what they bear, once grown (lib/trees)
  fruit?: { item: FruitId; growDays: number };
}

// Pieces for laying out the farm, one per grid cell (lib/build)
export const BUILD_PIECES: Record<BuildPieceId, BuildPieceConfig> = {
  fence: { id: 'fence', name: 'Hàng Rào Gỗ', icon: '🪵', price: 15, description: 'Rào gỗ trắng; nhấn R để xoay ngang hoặc dọc.' },
  path: { id: 'path', name: 'Lối Đi Lát Đá', icon: '🪨', price: 10, description: 'Ô đá lát để làm đường đi trong trang trại.' },
  lamp: { id: 'lamp', name: 'Đèn Đường', icon: '💡', price: 60, description: 'Cột đèn sáng ấm, rực rỡ nhất vào ban đêm.' },
  flowerbed: { id: 'flowerbed', name: 'Bồn Hoa', icon: '🌷', price: 40, description: 'Bồn gỗ trồng hoa nhiều màu.' },
  bush: { id: 'bush', name: 'Bụi Cây', icon: '🌳', price: 25, description: 'Bụi cây tròn, đổi màu lá theo mùa.' },
  mango_tree: {
    id: 'mango_tree',
    name: 'Cây Xoài',
    icon: '🥭',
    price: 600,
    description: 'Lớn sau 6 ngày, rồi mỗi sáng ra 1 trái xoài (tối đa 3 trái trên cây).',
    buyCount: 1,
    fruit: { item: 'mango', growDays: 6 },
  },
  orange_tree: {
    id: 'orange_tree',
    name: 'Cây Cam',
    icon: '🍊',
    price: 450,
    description: 'Lớn sau 5 ngày, rồi mỗi sáng ra 1 trái cam (tối đa 3 trái trên cây).',
    buyCount: 1,
    fruit: { item: 'orange', growDays: 5 },
  },
};

export const BUILD_PIECE_LIST = Object.values(BUILD_PIECES);
