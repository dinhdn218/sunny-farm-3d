import { CropId, ItemId, Letter, LetterGift } from '@/types/game';
import { CROP_LIST } from '@/config/crops';
import { ITEMS } from '@/config/items';
import { FestivalConfig } from '@/config/festivals';
import { seeded } from '@/lib/random';

export const MAILBOX_ID = 'decor_mailbox';
export const MAX_LETTERS = 30;
// Tokens that come with a festival's opening letter
export const FESTIVAL_LETTER_TOKENS = 10;

// Newest first; a letter already in the box is never delivered twice, and only the newest are kept
export function deliverLetters(mail: Letter[], letters: Letter[]): Letter[] {
  const fresh = letters.filter((l) => !mail.some((m) => m.id === l.id));
  return fresh.length ? [...fresh, ...mail].slice(0, MAX_LETTERS) : mail;
}

export const welcomeLetter = (): Letter => ({
  id: 'welcome',
  from: 'Trưởng Làng 👴',
  title: 'Chào mừng đến Nông Trại!',
  body:
    'Chào cháu! Cả làng mừng lắm khi có người về chăm mảnh đất này. Cứ xới đất, gieo hạt, tưới nước rồi đi ngủ là cây lớn. ' +
    'Cư dân hay đặt hàng ở Bảng Đơn Hàng (phím O), giao cho họ là có lời to. Ông gửi chút vốn để cháu mua hạt giống nhé!',
  day: 1,
  read: false,
  gift: { gold: 100 },
  claimed: false,
});

export const festivalLetter = (festival: FestivalConfig, day: number): Letter => ({
  id: `festival_${festival.id}`,
  from: 'Ban Tổ Chức Lễ Hội 🎪',
  title: `${festival.icon} ${festival.name} đã đến!`,
  body:
    `${festival.name} đã bắt đầu! Kiếm ${festival.token.icon} ${festival.token.name} bằng cách: ` +
    `${festival.earn.map((rule) => rule.label.toLowerCase()).join(', ')}, rồi ghé ${festival.shop.name} ở Công Viên đổi quà giới hạn. ` +
    `Tặng bạn ít ${festival.token.name} để mở hàng!`,
  day,
  read: false,
  gift: { festival: festival.id, tokens: FESTIVAL_LETTER_TOKENS },
  claimed: false,
});

const THANKS = [
  'Hàng giao đúng hẹn, tươi ngon quá trời! Gửi bạn chút quà nhỏ nè.',
  'Cả nhà mình khen nức nở luôn. Cảm ơn bạn nhiều lắm!',
  'Lần sau mình lại đặt tiếp nhé. Tặng bạn món quà cảm ơn!',
];

// A resident's thanks for an order, the morning after; fixed by the day
export function thankYouLetter(customer: string, day: number): Letter {
  const random = seeded(day * 2203 + 71);
  const roll = random();
  let gift: LetterGift;
  if (roll < 0.55) {
    gift = { gold: 30 + Math.floor(random() * 31) };
  } else if (roll < 0.85) {
    const crop: CropId = CROP_LIST[Math.floor(random() * CROP_LIST.length)].id;
    gift = { items: { [crop]: 2 + Math.floor(random() * 2) } };
  } else {
    gift = { gems: 1 + Math.floor(random() * 2) };
  }
  return {
    id: `thanks_${day}`,
    from: customer,
    title: 'Cảm ơn bạn đã giao hàng!',
    body: THANKS[Math.floor(random() * THANKS.length)],
    day,
    read: false,
    gift,
    claimed: false,
  };
}

// What a gift holds, for the letter and the toast
export function letterGiftLabel(gift: LetterGift, tokenIcon = '') {
  const parts: string[] = [];
  if (gift.gold) parts.push(`+${gift.gold}🪙`);
  if (gift.gems) parts.push(`+${gift.gems}💎`);
  Object.entries(gift.items ?? {}).forEach(([id, n]) => parts.push(`+${n} ${ITEMS[id as ItemId].icon}`));
  if (gift.tokens) parts.push(`+${gift.tokens}${tokenIcon}`);
  return parts.join(' ');
}
