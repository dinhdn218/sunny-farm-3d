import { WorldConfig, WorldId } from '@/types/game';

export const WORLDS: Record<WorldId, WorldConfig> = {
  farm: {
    id: 'farm',
    name: 'Nông Trại Của Tôi',
    icon: '🏡',
    description:
      'Trồng trọt, thu hoạch nông sản, nuôi thú cưng và trang trí khu vườn riêng của bạn.',
    groundColor: '#65a30d',
    spawn: [0, 6.2],
    portalPos: [0, 11.2],
  },
  park: {
    id: 'park',
    name: 'Công Viên Trung Tâm',
    icon: '🌸',
    description:
      'Sảnh gặp gỡ đông vui với đài phun nước, rừng hoa anh đào, ghế đá và thảm dã ngoại.',
    groundColor: '#4d7c0f',
    spawn: [0, 7.5],
    portalPos: [0, 11.2],
  },
  beach: {
    id: 'beach',
    name: 'Bãi Biển Nhiệt Đới',
    icon: '🏖️',
    description:
      'Bãi cát vàng, sóng biển rì rào, cầu cảng du thuyền, ghế tắm nắng và ngọn hải đăng.',
    groundColor: '#fde047',
    spawn: [0, -4.5],
    portalPos: [0, 11.2],
  },
  mall: {
    id: 'mall',
    name: 'Trung Tâm Thương Mại',
    icon: '🛍️',
    description:
      'Phố mua sắm hiện đại với Boutique thời trang, cửa hàng thú cưng và Sàn diễn Runway.',
    groundColor: '#475569',
    spawn: [0, 7.2],
    portalPos: [0, 11.2],
  },
  cinema: {
    id: 'cinema',
    name: 'Rạp Chiếu Phim 3D',
    icon: '🎬',
    description:
      'Màn ảnh rộng khổng lồ chiếu phim hoạt họa sống động, quầy bắp rang bơ và ghế nhung đỏ.',
    groundColor: '#334155',
    spawn: [0, 7.5],
    portalPos: [0, 11.2],
  },
};

export const WORLD_LIST: WorldConfig[] = Object.values(WORLDS);
