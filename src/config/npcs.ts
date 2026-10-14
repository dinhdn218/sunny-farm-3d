import { PlayerCosmetics, WorldId } from '@/types/game';

export interface NpcPreset {
  name: string;
  cosmetics: PlayerCosmetics;
  phrases: string[];
}

export const NPC_PRESETS: NpcPreset[] = [
  {
    name: 'Linh Chi 🌸',
    cosmetics: { hat: 'cat_ears', outfit: 'sakura_pink', wing: 'angel_wings', pet: 'none_pet' },
    phrases: ['Chào bạn mới nha! 👋', 'Hôm nay thời tiết đẹp quá!', 'Bộ đồ của bạn xinh thế 😍'],
  },
  {
    name: 'Minh Quân ⚡',
    cosmetics: { hat: 'crown', outfit: 'royal_gold', wing: 'none_wing', pet: 'shiba_inu' },
    phrases: ['Shiba chạy theo nhìn cưng ghê 🐕', 'Có ai đi xem phim cùng không?', 'Vừa thu hoạch được Bí Ngô khổng lồ!'],
  },
  {
    name: 'Bảo Ngọc 🐱',
    cosmetics: { hat: 'straw_hat', outfit: 'casual_hoodie', wing: 'backpack', pet: 'none_pet' },
    phrases: ['Đang làm nhiệm vụ kiếm Kim Cương 💎', 'Ghé nông trại mình chơi nhé!', 'Mọi người nhảy cùng đi 💃'],
  },
  {
    name: 'Hoàng Nam 🎸',
    cosmetics: { hat: 'cowboy_hat', outfit: 'beach_vibe', wing: 'none_wing', pet: 'none_pet' },
    phrases: ['Ra biển tắm nắng thích thật 🏖️', 'Hello cả nhà!', 'Chúc một ngày vui vẻ nha 🎉'],
  },
  {
    name: 'Thảo Vy 🦋',
    cosmetics: { hat: 'halo', outfit: 'cyber_neon', wing: 'fairy_wings', pet: 'none_pet' },
    phrases: ['Cánh tiên phát sáng đẹp quá ✨', 'Đi dạo công viên ngắm hoa anh đào 🌸', 'Thả tim cho mọi người nè ❤️'],
  },
];

// Same pick as the HTML version: 2 residents wander the farm, 4 in each public zone
export function npcPresetsFor(world: WorldId): NpcPreset[] {
  const count = world === 'farm' ? 2 : 4;
  return Array.from(
    { length: count },
    (_, i) => NPC_PRESETS[(i + world.length) % NPC_PRESETS.length]
  );
}
