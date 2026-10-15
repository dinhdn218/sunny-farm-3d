import { BuildPieceId } from '@/types/game';

export interface BuildPieceConfig {
  id: BuildPieceId;
  name: string;
  icon: string;
  price: number;
  description: string;
}

// Pieces for laying out the farm, one per grid cell (lib/build)
export const BUILD_PIECES: Record<BuildPieceId, BuildPieceConfig> = {
  fence: { id: 'fence', name: 'Hàng Rào Gỗ', icon: '🪵', price: 15, description: 'Rào gỗ trắng; nhấn R để xoay ngang hoặc dọc.' },
  path: { id: 'path', name: 'Lối Đi Lát Đá', icon: '🪨', price: 10, description: 'Ô đá lát để làm đường đi trong trang trại.' },
  lamp: { id: 'lamp', name: 'Đèn Đường', icon: '💡', price: 60, description: 'Cột đèn sáng ấm, rực rỡ nhất vào ban đêm.' },
  flowerbed: { id: 'flowerbed', name: 'Bồn Hoa', icon: '🌷', price: 40, description: 'Bồn gỗ trồng hoa nhiều màu.' },
  bush: { id: 'bush', name: 'Bụi Cây', icon: '🌳', price: 25, description: 'Bụi cây tròn, đổi màu lá theo mùa.' },
};

export const BUILD_PIECE_LIST = Object.values(BUILD_PIECES);
