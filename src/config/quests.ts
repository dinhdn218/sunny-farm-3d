import { CropId, QuestType } from '@/types/game';

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  type: QuestType;
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardCandy?: number;
  crop?: CropId;
  chapter?: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  icon: string;
  type: QuestType;
  // `{n}` is replaced by the current tier's target
  desc: string;
  tiers: { target: number; rewardGold: number; rewardGems: number }[];
}

// Story chain: one quest is active at a time, the next unlocks when its reward is claimed
export const MAIN_QUESTS: QuestDef[] = [
  { id: 'm_till', chapter: 'Chương 1 · Khởi Nghiệp', title: 'Khởi Đầu Nhà Nông', desc: 'Dùng Cuốc (phím 1) xới 5 ô đất trống.', icon: '⛏️', type: 'till', target: 5, rewardGold: 60, rewardGems: 3 },
  { id: 'm_plant', chapter: 'Chương 1 · Khởi Nghiệp', title: 'Gieo Mầm Hy Vọng', desc: 'Gieo 5 hạt giống bất kỳ lên đất đã xới.', icon: '🌱', type: 'plant', target: 5, rewardGold: 70, rewardGems: 3 },
  { id: 'm_water', chapter: 'Chương 1 · Khởi Nghiệp', title: 'Dòng Nước Mát Lành', desc: 'Tưới nước cho 5 ô đất (phím 2).', icon: '💧', type: 'water', target: 5, rewardGold: 80, rewardGems: 4 },
  { id: 'm_sleep', chapter: 'Chương 1 · Khởi Nghiệp', title: 'Giấc Ngủ Ngon', desc: 'Bấm Qua Ngày để cây trồng lớn lên.', icon: '🛌', type: 'sleep', target: 1, rewardGold: 60, rewardGems: 3 },
  { id: 'm_harvest', chapter: 'Chương 1 · Khởi Nghiệp', title: 'Vụ Mùa Đầu Tiên', desc: 'Thu hoạch 5 nông sản chín.', icon: '🧺', type: 'harvest', target: 5, rewardGold: 120, rewardGems: 6 },
  { id: 'm_earn', chapter: 'Chương 1 · Khởi Nghiệp', title: 'Thương Lái Tập Sự', desc: 'Bán nông sản thu về 300 Vàng.', icon: '🪙', type: 'earn_gold', target: 300, rewardGold: 100, rewardGems: 6 },
  { id: 'm_feed', chapter: 'Chương 2 · Chăn Nuôi', title: 'Người Bạn Gia Súc', desc: 'Cho vật nuôi ăn 3 lần ở Chuồng Trại.', icon: '🐔', type: 'feed_animal', target: 3, rewardGold: 120, rewardGems: 6 },
  { id: 'm_collect', chapter: 'Chương 2 · Chăn Nuôi', title: 'Quà Sáng Từ Chuồng', desc: 'Thu 3 sản phẩm Trứng, Lông Cừu hoặc Sữa.', icon: '🥚', type: 'collect_animal', target: 3, rewardGold: 150, rewardGems: 8 },
  { id: 'm_buy_animal', chapter: 'Chương 2 · Chăn Nuôi', title: 'Đàn Gia Súc Mới', desc: 'Mua thêm 1 vật nuôi ở Chuồng Trại.', icon: '🐄', type: 'buy_animal', target: 1, rewardGold: 150, rewardGems: 8 },
  { id: 'm_plot', chapter: 'Chương 3 · Mở Rộng Đất', title: 'Địa Chủ Tập Sự', desc: 'Mở khóa 1 lô đất mới (nút 🏗️ Mở Rộng).', icon: '🗺️', type: 'buy_plot', target: 1, rewardGold: 200, rewardGems: 10 },
  { id: 'm_plant_more', chapter: 'Chương 3 · Mở Rộng Đất', title: 'Cánh Đồng Bát Ngát', desc: 'Gieo thêm 15 hạt giống.', icon: '🌾', type: 'plant', target: 15, rewardGold: 180, rewardGems: 8 },
  { id: 'm_pumpkin', chapter: 'Chương 3 · Mở Rộng Đất', title: 'Bí Ngô Khổng Lồ', desc: 'Thu hoạch 3 Bí Ngô.', icon: '🎃', type: 'harvest', crop: 'pumpkin', target: 3, rewardGold: 250, rewardGems: 12 },
  { id: 'm_machine', chapter: 'Chương 4 · Nghệ Nhân', title: 'Xưởng Chế Biến Đầu Tiên', desc: 'Mua 1 máy chế biến ở Xưởng (phím X).', icon: '🏭', type: 'buy_machine', target: 1, rewardGold: 150, rewardGems: 8 },
  { id: 'm_craft', chapter: 'Chương 4 · Nghệ Nhân', title: 'Mẻ Hàng Thủ Công', desc: 'Chế biến xong 3 mẻ hàng.', icon: '🍳', type: 'craft', target: 3, rewardGold: 200, rewardGems: 10 },
  { id: 'm_market', chapter: 'Chương 4 · Nghệ Nhân', title: 'Phiên Chợ Đầu Tiên', desc: 'Bán hàng ở Chợ Phiên (Trung Tâm Thương Mại) thu về 500 Vàng.', icon: '🧺', type: 'market_sell', target: 500, rewardGold: 200, rewardGems: 10 },
  { id: 'm_fashion', chapter: 'Chương 5 · Phong Cách', title: 'Tín Đồ Thời Trang', desc: 'Mua 1 món thời trang mới.', icon: '👗', type: 'buy_cosmetic', target: 1, rewardGold: 150, rewardGems: 10 },
  { id: 'm_decor', chapter: 'Chương 5 · Phong Cách', title: 'Kiến Trúc Sư Nông Trại', desc: 'Đặt 1 đồ trang trí ra nông trại.', icon: '🏡', type: 'place_decor', target: 1, rewardGold: 200, rewardGems: 12 },
  { id: 'm_visit', chapter: 'Chương 6 · Du Ngoạn', title: 'Nhà Du Hành', desc: 'Ghé thăm đủ 4 khu vực công cộng.', icon: '✈️', type: 'visit_worlds', target: 4, rewardGold: 200, rewardGems: 12 },
  { id: 'm_cinema', chapter: 'Chương 6 · Du Ngoạn', title: 'Khán Giả Điện Ảnh', desc: 'Đổi kênh phim ở Rạp Chiếu Phim 3 lần.', icon: '🎬', type: 'cinema_channel', target: 3, rewardGold: 150, rewardGems: 10 },
  { id: 'm_fish', chapter: 'Chương 6 · Du Ngoạn', title: 'Ngư Dân Tập Sự', desc: 'Câu được 3 con cá ở Cầu Câu Cá (Bãi Biển).', icon: '🎣', type: 'fish', target: 3, rewardGold: 150, rewardGems: 10 },
  { id: 'm_plots', chapter: 'Chương 7 · Đại Điền Chủ', title: 'Đại Điền Chủ', desc: 'Mở khóa thêm 4 lô đất.', icon: '👑', type: 'buy_plot', target: 4, rewardGold: 600, rewardGems: 30 },
  { id: 'm_tycoon', chapter: 'Chương 7 · Đại Điền Chủ', title: 'Triệu Phú Nông Trại', desc: 'Bán hàng thu về tổng cộng 5.000 Vàng.', icon: '💰', type: 'earn_gold', target: 5000, rewardGold: 800, rewardGems: 40 },
];

// Three of these are drawn each day and replaced when you sleep
export const DAILY_POOL: QuestDef[] = [
  { id: 'd_carrot', title: 'Đơn Hàng Cà Rốt', desc: 'Thu hoạch 4 Cà Rốt.', icon: '🥕', type: 'harvest', crop: 'carrot', target: 4, rewardGold: 120, rewardGems: 4 },
  { id: 'd_wheat', title: 'Đơn Hàng Lúa Mì', desc: 'Thu hoạch 4 Lúa Mì.', icon: '🌾', type: 'harvest', crop: 'wheat', target: 4, rewardGold: 140, rewardGems: 4 },
  { id: 'd_tomato', title: 'Đơn Hàng Cà Chua', desc: 'Thu hoạch 3 Cà Chua.', icon: '🍅', type: 'harvest', crop: 'tomato', target: 3, rewardGold: 140, rewardGems: 5 },
  { id: 'd_water', title: 'Tưới Tiêu Chăm Chỉ', desc: 'Tưới nước 8 ô đất.', icon: '💧', type: 'water', target: 8, rewardGold: 90, rewardGems: 3 },
  { id: 'd_till', title: 'Xới Đất Mùa Mới', desc: 'Xới 6 ô đất trống.', icon: '⛏️', type: 'till', target: 6, rewardGold: 80, rewardGems: 3 },
  { id: 'd_plant', title: 'Gieo Hạt Đầu Ngày', desc: 'Gieo 6 hạt giống.', icon: '🌱', type: 'plant', target: 6, rewardGold: 90, rewardGems: 3 },
  { id: 'd_feed', title: 'Chăm Sóc Vật Nuôi', desc: 'Cho vật nuôi ăn 3 lần.', icon: '🐔', type: 'feed_animal', target: 3, rewardGold: 100, rewardGems: 4 },
  { id: 'd_collect', title: 'Sản Phẩm Tươi Ngon', desc: 'Thu 2 sản phẩm chăn nuôi.', icon: '🥛', type: 'collect_animal', target: 2, rewardGold: 110, rewardGems: 4 },
  { id: 'd_earn', title: 'Buôn Bán Phát Đạt', desc: 'Bán hàng thu về 250 Vàng.', icon: '🪙', type: 'earn_gold', target: 250, rewardGold: 120, rewardGems: 5 },
  { id: 'd_chat', title: 'Giao Lưu Cư Dân', desc: 'Gửi 2 tin nhắn hoặc thả cảm xúc.', icon: '💬', type: 'chat', target: 2, rewardGold: 70, rewardGems: 3 },
  { id: 'd_visit', title: 'Dạo Chơi Thành Phố', desc: 'Dịch chuyển đến 2 khu vực công cộng.', icon: '✈️', type: 'visit_world', target: 2, rewardGold: 90, rewardGems: 4 },
  { id: 'd_cinema', title: 'Suất Chiếu Trong Ngày', desc: 'Đổi kênh phim ở Rạp 1 lần.', icon: '🎬', type: 'cinema_channel', target: 1, rewardGold: 80, rewardGems: 3 },
  { id: 'd_eat', title: 'Bữa Ăn Năng Lượng', desc: 'Ăn Bánh Mì hoặc Bắp Rang Bơ 1 lần.', icon: '🥖', type: 'eat', target: 1, rewardGold: 60, rewardGems: 2 },
  { id: 'd_craft', title: 'Bếp Núc Bận Rộn', desc: 'Chế biến xong 2 mẻ hàng ở Xưởng.', icon: '🍳', type: 'craft', target: 2, rewardGold: 110, rewardGems: 4 },
  { id: 'd_market', title: 'Đi Chợ Phiên', desc: 'Bán ở Chợ Phiên thu về 300 Vàng.', icon: '🧺', type: 'market_sell', target: 300, rewardGold: 120, rewardGems: 5 },
  { id: 'd_fish', title: 'Mẻ Cá Trong Ngày', desc: 'Câu được 3 con cá ở Bãi Biển hoặc Hồ Sen.', icon: '🎣', type: 'fish', target: 3, rewardGold: 100, rewardGems: 4 },
  { id: 'd_order', title: 'Giao Hàng Tận Nơi', desc: 'Giao 1 đơn hàng ở Bảng Đơn Hàng (phím O).', icon: '📦', type: 'deliver_order', target: 1, rewardGold: 100, rewardGems: 4 },
];

export const DAILY_QUEST_COUNT = 3;

// Lễ Hội Bí Ngô: one-off quests shown (and claimable) only while the festival runs
export const EVENT_QUESTS: QuestDef[] = [
  { id: 'e_pumpkins', title: 'Mùa Bí Ngô', desc: 'Thu hoạch 5 Bí Ngô.', icon: '🎃', type: 'harvest', crop: 'pumpkin', target: 5, rewardGold: 0, rewardGems: 5, rewardCandy: 15 },
  { id: 'e_craft', title: 'Lò Nướng Đỏ Lửa', desc: 'Chế biến xong 3 mẻ hàng ở Xưởng.', icon: '🔥', type: 'craft', target: 3, rewardGold: 0, rewardGems: 5, rewardCandy: 15 },
  { id: 'e_night_fish', title: 'Câu Cá Đêm Hội', desc: 'Câu được 3 con cá vào ban đêm (đổi giờ bằng nút 🌤️).', icon: '🌙', type: 'night_fish', target: 3, rewardGold: 0, rewardGems: 5, rewardCandy: 20 },
  { id: 'e_feed', title: 'Bữa Tối Cho Đàn Thú', desc: 'Cho vật nuôi ăn 6 lần.', icon: '🐄', type: 'feed_animal', target: 6, rewardGold: 0, rewardGems: 5, rewardCandy: 15 },
  { id: 'e_shop', title: 'Cho Kẹo Hay Bị Ghẹo', desc: 'Đổi 1 món ở Tiệm Kẹo Ma Quái (Công Viên).', icon: '🍬', type: 'event_shop', target: 1, rewardGold: 100, rewardGems: 10, rewardCandy: 0 },
];

// Long-term goals with three tiers each (cumulative progress)
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'a_harvest',
    title: 'Bàn Tay Vàng',
    icon: '🧺',
    type: 'harvest',
    desc: 'Thu hoạch tổng cộng {n} nông sản.',
    tiers: [
      { target: 10, rewardGold: 100, rewardGems: 5 },
      { target: 50, rewardGold: 300, rewardGems: 15 },
      { target: 200, rewardGold: 800, rewardGems: 40 },
    ],
  },
  {
    id: 'a_gold',
    title: 'Triệu Phú Nông Thôn',
    icon: '💰',
    type: 'earn_gold',
    desc: 'Bán hàng thu về tổng cộng {n} Vàng.',
    tiers: [
      { target: 1000, rewardGold: 100, rewardGems: 8 },
      { target: 5000, rewardGold: 300, rewardGems: 20 },
      { target: 20000, rewardGold: 1000, rewardGems: 50 },
    ],
  },
  {
    id: 'a_plots',
    title: 'Địa Chủ Mở Cõi',
    icon: '🗺️',
    type: 'buy_plot',
    desc: 'Mở khóa {n} lô đất mới.',
    tiers: [
      { target: 2, rewardGold: 200, rewardGems: 10 },
      { target: 6, rewardGold: 500, rewardGems: 25 },
      { target: 12, rewardGold: 1200, rewardGems: 60 },
    ],
  },
  {
    id: 'a_ranch',
    title: 'Chủ Trại Chăn Nuôi',
    icon: '🐄',
    type: 'collect_animal',
    desc: 'Thu {n} sản phẩm chăn nuôi.',
    tiers: [
      { target: 5, rewardGold: 100, rewardGems: 5 },
      { target: 25, rewardGold: 300, rewardGems: 15 },
      { target: 100, rewardGold: 800, rewardGems: 40 },
    ],
  },
  {
    id: 'a_craft',
    title: 'Nghệ Nhân Làng Nghề',
    icon: '🏭',
    type: 'craft',
    desc: 'Chế biến xong {n} mẻ hàng.',
    tiers: [
      { target: 5, rewardGold: 100, rewardGems: 5 },
      { target: 25, rewardGold: 300, rewardGems: 15 },
      { target: 100, rewardGold: 800, rewardGems: 40 },
    ],
  },
  {
    id: 'a_fish',
    title: 'Vua Câu Cá',
    icon: '🎣',
    type: 'fish',
    desc: 'Câu được tổng cộng {n} con cá.',
    tiers: [
      { target: 10, rewardGold: 100, rewardGems: 5 },
      { target: 50, rewardGold: 300, rewardGems: 15 },
      { target: 200, rewardGold: 800, rewardGems: 40 },
    ],
  },
  {
    id: 'a_orders',
    title: 'Thương Lái Uy Tín',
    icon: '📦',
    type: 'deliver_order',
    desc: 'Giao {n} đơn hàng cho cư dân.',
    tiers: [
      { target: 5, rewardGold: 100, rewardGems: 5 },
      { target: 25, rewardGold: 300, rewardGems: 15 },
      { target: 100, rewardGold: 800, rewardGems: 40 },
    ],
  },
  {
    id: 'a_fashion',
    title: 'Biểu Tượng Thời Trang',
    icon: '👗',
    type: 'buy_cosmetic',
    desc: 'Sở hữu {n} món thời trang mua thêm.',
    tiers: [
      { target: 1, rewardGold: 80, rewardGems: 5 },
      { target: 5, rewardGold: 250, rewardGems: 15 },
      { target: 12, rewardGold: 600, rewardGems: 35 },
    ],
  },
  {
    id: 'a_decor',
    title: 'Nhà Thiết Kế Cảnh Quan',
    icon: '🏡',
    type: 'buy_decor',
    desc: 'Sở hữu {n} đồ trang trí nông trại.',
    tiers: [
      { target: 1, rewardGold: 100, rewardGems: 5 },
      { target: 3, rewardGold: 250, rewardGems: 15 },
      { target: 5, rewardGold: 500, rewardGems: 30 },
    ],
  },
  {
    id: 'a_days',
    title: 'Nông Dân Kiên Trì',
    icon: '📅',
    type: 'sleep',
    desc: 'Trải qua {n} ngày ở nông trại.',
    tiers: [
      { target: 3, rewardGold: 100, rewardGems: 5 },
      { target: 10, rewardGold: 300, rewardGems: 15 },
      { target: 30, rewardGold: 1000, rewardGems: 50 },
    ],
  },
  {
    id: 'a_social',
    title: 'Ngôi Sao Giao Lưu',
    icon: '💬',
    type: 'chat',
    desc: 'Gửi {n} tin nhắn hoặc cảm xúc.',
    tiers: [
      { target: 5, rewardGold: 60, rewardGems: 3 },
      { target: 25, rewardGold: 200, rewardGems: 10 },
      { target: 100, rewardGold: 500, rewardGems: 25 },
    ],
  },
];
