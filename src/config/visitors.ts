import { WorldId } from '@/types/game';

// Visitors strolling round every zone besides the residents, so the island feels busy (lib/visitors)
export const VISITORS_PER_WORLD = 10;

// Players' names as people pick them: a given name, now and then with an emoji, or a nickname
export const VISITOR_GIVEN_NAMES = [
  'An', 'Bình', 'Châu', 'Dung', 'Duy', 'Giang', 'Hà', 'Hải', 'Hiếu', 'Hòa', 'Huy', 'Khang', 'Khánh',
  'Lam', 'Long', 'Mai', 'My', 'Nam', 'Ngân', 'Nhi', 'Phong', 'Phúc', 'Quyên', 'Sơn', 'Tâm', 'Thư',
  'Trang', 'Tú', 'Tuấn', 'Uyên', 'Việt', 'Xuân', 'Yến',
];
export const VISITOR_NAME_TAGS = ['🌻', '⭐', '🍀', '🐣', '🎮', '🌙', '🍓', '🎧', '🌈', '🐳'];
export const VISITOR_NICKNAMES = [
  'Mèo Lười 🐱', 'Gấu Trúc Nhỏ 🐼', 'Cá Mập Con 🦈', 'Bé Bắp 🌽', 'Thỏ Ngọc 🐰', 'Sóc Nâu 🐿️',
  'Mây Trắng ☁️', 'Kẹo Dẻo 🍬', 'Trà Sữa 🧋', 'Nông Dân Nhí 👒', 'Hạt Tiêu 🌶️', 'Bánh Bao 🥟',
];

// Out of 100 visitors, about how many wear a hat, something on their back, or bring a pet
export const VISITOR_HAT_CHANCE = 0.75;
export const VISITOR_BACK_CHANCE = 0.25;
export const VISITOR_PET_CHANCE = 0.12;

// What they say as they stroll by, zone by zone
export const VISITOR_PHRASES: Record<WorldId, string[]> = {
  farm: [
    'Ruộng nhà bạn xanh mướt ghê! 🌱',
    'Gà nhà bạn mập quá 🐔',
    'Mùa này trồng gì lời nhất nhỉ?',
    'Cho mình xin ít hạt giống với 😆',
    'Nông trại đẹp như tranh luôn!',
  ],
  park: [
    'Hoa anh đào đẹp quá 🌸',
    'Ai đi câu cá ở hồ sen không?',
    'Kem ở đây ngon lắm 🍦',
    'Mình vừa bắt được con bướm vàng! 🦋',
    'Đi dạo chút cho khỏe nè',
  ],
  beach: [
    'Nước biển mát ghê 🌊',
    'Nhặt được vỏ sò xinh xỉu 🐚',
    'Có ai câu được cá ngừ chưa?',
    'Nước dừa ngon quá trời 🥥',
    'Hoàng hôn ở đây đẹp lắm 🌅',
  ],
  mall: [
    'Chợ phiên hôm nay giá tốt ghê!',
    'Bộ đồ này hợp với mình không? 👗',
    'Đi uống trà sữa không? 🧋',
    'Mua được món đồ mới rồi 🛍️',
    'Đông vui quá trời!',
  ],
  cinema: [
    'Phim hôm nay hay quá 🎬',
    'Bắp rang bơ thơm lừng 🍿',
    'Ai gắp thú với mình không?',
    'Đổi kênh đi, xem phim khác nào!',
    'Màn hình rạp này to ghê',
  ],
  casino: [
    'Có ai chơi Tiến Lên không? 🃏',
    'Hôm nay hên quá trời!',
    'Đi quay Vòng Quay May Mắn nè 🎡',
    'Bàn Vàng cược cao ghê',
    'Chơi vui thôi nha mọi người 😆',
  ],
};

// When the player clicks one of them
export const VISITOR_GREETINGS = ['Chào bạn! 👋', 'Hi hi, chào nha 😄', 'Gặp bạn vui ghê!', 'Bạn chơi lâu chưa?', 'Kết bạn nha! 🤝'];
