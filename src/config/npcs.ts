import { ItemId, PlayerCosmetics, ResidentId, WorldId } from '@/types/game';

export interface NpcPreset {
  id: ResidentId;
  name: string;
  cosmetics: PlayerCosmetics;
  phrases: string[];
  // Gifts they love, like and hate (anything else is fine by them), see lib/friendship
  loves: ItemId[];
  likes: ItemId[];
  hates: ItemId[];
  // What they say when you talk to them, one line for each number of hearts (0–5)
  talk: string[];
}

export const NPC_PRESETS: NpcPreset[] = [
  {
    id: 'linh_chi',
    name: 'Linh Chi 🌸',
    cosmetics: { hat: 'cat_ears', outfit: 'sakura_pink', wing: 'angel_wings', pet: 'none_pet' },
    phrases: ['Chào bạn mới nha! 👋', 'Hôm nay thời tiết đẹp quá!', 'Bộ đồ của bạn xinh thế 😍'],
    loves: ['strawberry_jam', 'flan', 'strawberry'],
    likes: ['honey', 'carrot_juice', 'butterfly', 'tomato'],
    hates: ['old_boot', 'spider', 'truffle'],
    talk: [
      'Chào bạn! Mình là Linh Chi, mê hoa anh đào lắm 🌸',
      'Hôm nay bạn trồng gì thế? Kể mình nghe với!',
      'Mứt dâu với bánh flan là chân ái của mình đó nha 😋',
      'Có bạn hàng xóm như bạn vui ghê!',
      'Mình hay ra Công Viên ngắm hoa, lúc nào rảnh ra chơi nha.',
      'Bạn là người bạn thân nhất của mình ở hòn đảo này đó! 💖',
    ],
  },
  {
    id: 'minh_quan',
    name: 'Minh Quân ⚡',
    cosmetics: { hat: 'crown', outfit: 'royal_gold', wing: 'none_wing', pet: 'shiba_inu' },
    phrases: ['Shiba chạy theo nhìn cưng ghê 🐕', 'Có ai đi xem phim cùng không?', 'Vừa thu hoạch được Bí Ngô khổng lồ!'],
    loves: ['cheese', 'pumpkin_pie', 'tuna'],
    likes: ['milk', 'pumpkin', 'beetle', 'corn'],
    hates: ['ant', 'shell', 'cabbage'],
    talk: [
      'Chào, mình là Minh Quân. Shiba nhà mình hơi nghịch, thông cảm nha 🐕',
      'Nông trại của bạn dạo này nhộn nhịp quá!',
      'Phô mai mà ăn kèm bánh bí ngô thì hết sảy.',
      'Hôm nào đi câu cá ngừ với mình không?',
      'Bạn chăm chỉ ghê, mình phải học hỏi mới được.',
      'Có chuyện gì cứ gọi mình, anh em mình mà! ⚡',
    ],
  },
  {
    id: 'bao_ngoc',
    name: 'Bảo Ngọc 🐱',
    cosmetics: { hat: 'straw_hat', outfit: 'casual_hoodie', wing: 'backpack', pet: 'none_pet' },
    phrases: ['Đang làm nhiệm vụ kiếm Kim Cương 💎', 'Ghé nông trại mình chơi nhé!', 'Mọi người nhảy cùng đi 💃'],
    loves: ['fish_stew', 'koi', 'pearl'],
    likes: ['carp', 'mackerel', 'tomato_sauce', 'squid'],
    hates: ['spider', 'old_boot', 'caterpillar'],
    talk: [
      'Hi! Mình là Bảo Ngọc, đang săn nhiệm vụ kiếm Kim Cương nè 💎',
      'Bạn câu được con cá nào to chưa?',
      'Cá kho tộ ăn với cơm nóng là nhất luôn.',
      'Ngọc trai ở Bãi Biển lấp lánh dễ thương ghê.',
      'Cùng làm nhiệm vụ hằng ngày với mình nha!',
      'Bạn đúng là đồng đội số một của mình 🐱',
    ],
  },
  {
    id: 'hoang_nam',
    name: 'Hoàng Nam 🎸',
    cosmetics: { hat: 'cowboy_hat', outfit: 'beach_vibe', wing: 'none_wing', pet: 'none_pet' },
    phrases: ['Ra biển tắm nắng thích thật 🏖️', 'Hello cả nhà!', 'Chúc một ngày vui vẻ nha 🎉'],
    loves: ['mango', 'watermelon', 'coral'],
    likes: ['orange', 'starfish', 'corn', 'clownfish'],
    hates: ['cabbage', 'caterpillar', 'wool'],
    talk: [
      'Yo! Hoàng Nam đây, dân biển chính hiệu 🎸',
      'Ra biển hóng gió không bạn ơi?',
      'Xoài với dưa hấu mùa hè là đỉnh của chóp.',
      'Mình đang tập một bài mới, mai đàn cho bạn nghe.',
      'Sao biển với san hô ở Bãi Biển đẹp lắm đó.',
      'Bạn thân! Tối nay ra biển đốt lửa trại nhé 🔥',
    ],
  },
  {
    id: 'thao_vy',
    name: 'Thảo Vy 🦋',
    cosmetics: { hat: 'halo', outfit: 'cyber_neon', wing: 'fairy_wings', pet: 'none_pet' },
    phrases: ['Cánh tiên phát sáng đẹp quá ✨', 'Đi dạo công viên ngắm hoa anh đào 🌸', 'Thả tim cho mọi người nè ❤️'],
    loves: ['butterfly', 'firefly', 'honey_cake'],
    likes: ['honey', 'strawberry', 'ladybug', 'wool_scarf'],
    hates: ['beetle', 'old_boot', 'anchovy'],
    talk: [
      'Chào cậu, tớ là Thảo Vy 🦋',
      'Cậu có thấy đom đóm ở Công Viên vào ban đêm chưa?',
      'Tớ mê bướm lắm, cánh của chúng lấp lánh như tranh vẽ.',
      'Bánh mật ong thơm quá, cậu làm ngon ghê!',
      'Đi dạo cùng cậu vui thật đó.',
      'Cậu là người bạn tuyệt nhất mà tớ từng có ✨',
    ],
  },
];

export const RESIDENTS = Object.fromEntries(NPC_PRESETS.map((p) => [p.id, p])) as Record<ResidentId, NpcPreset>;

// Same pick as the HTML version: 2 residents wander the farm, 4 in each public zone
export function npcPresetsFor(world: WorldId): NpcPreset[] {
  const count = world === 'farm' ? 2 : 4;
  return Array.from(
    { length: count },
    (_, i) => NPC_PRESETS[(i + world.length) % NPC_PRESETS.length]
  );
}
