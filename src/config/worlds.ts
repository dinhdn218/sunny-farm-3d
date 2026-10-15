import { WorldConfig, WorldId } from '@/types/game';

// The public zones are bigger islands than the farm; each arrives just north of its portal
export const WORLDS: Record<WorldId, WorldConfig> = {
  farm: {
    id: 'farm',
    name: 'Nông Trại Của Tôi',
    icon: '🏡',
    description:
      'Trồng trọt, thu hoạch nông sản, nuôi thú cưng và trang trí khu vườn riêng của bạn.',
    groundColor: '#65a30d',
    islandRadius: 18.5,
    spawn: [0, 6.2],
    portalPos: [0, 11.2],
  },
  park: {
    id: 'park',
    name: 'Công Viên Trung Tâm',
    icon: '🌸',
    description:
      'Đài phun nước, rừng hoa anh đào và hồ sen để câu cá nước ngọt. Ghé xe kem mát lạnh để hồi thể lực!',
    groundColor: '#4d7c0f',
    islandRadius: 28,
    spawn: [0, 16.8],
    portalPos: [0, 20.5],
  },
  beach: {
    id: 'beach',
    name: 'Bãi Biển Nhiệt Đới',
    icon: '🏖️',
    description:
      'Câu cá biển trên cầu cảng, nhặt vỏ sò, sao biển và ngọc trai trên cát, uống nước dừa dưới tán cọ.',
    groundColor: '#fde047',
    islandRadius: 28,
    spawn: [0, 16.8],
    portalPos: [0, 20.5],
  },
  mall: {
    id: 'mall',
    name: 'Trung Tâm Thương Mại',
    icon: '🛍️',
    description:
      'Chợ Phiên nông sản, Boutique thời trang, cửa hàng thú cưng, Sàn diễn Runway và quầy trà sữa.',
    groundColor: '#475569',
    islandRadius: 26,
    spawn: [0, 14.9],
    portalPos: [0, 18.6],
  },
  cinema: {
    id: 'cinema',
    name: 'Rạp Chiếu Phim 3D',
    icon: '🎬',
    description:
      'Màn ảnh rộng khổng lồ, quầy bắp rang bơ và khu máy gắp thú trúng Vàng, Kim Cương cùng quà tặng.',
    groundColor: '#334155',
    islandRadius: 24,
    spawn: [0, 13],
    portalPos: [0, 16.7],
  },
  casino: {
    id: 'casino',
    name: 'Sảnh Casino Hoàng Gia',
    icon: '🎰',
    description:
      'Đánh Tiến Lên Miền Nam với người chơi khác để kiếm Vàng, và quay Vòng Quay May Mắn miễn phí mỗi ngày.',
    groundColor: '#3f0d12',
    islandRadius: 24,
    spawn: [0, 13],
    portalPos: [0, 16.7],
  },
};

export const WORLD_LIST: WorldConfig[] = Object.values(WORLDS);
