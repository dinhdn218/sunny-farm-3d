import { ItemId, Letter } from '@/types/game';
import { NPC_PRESETS, NpcPreset } from '@/config/npcs';

// Friendship runs from 0 to 100; these fill the five hearts
export const HEART_POINTS = [10, 25, 45, 70, 100];
export const MAX_FRIENDSHIP = 100;
// A chat (once a day) and delivering one of their orders
export const TALK_POINTS = 2;
export const ORDER_POINTS = 3;

export type GiftReaction = 'love' | 'like' | 'neutral' | 'hate';
export const REACTION_POINTS: Record<GiftReaction, number> = { love: 10, like: 5, neutral: 2, hate: -5 };

export const hearts = (points: number) => HEART_POINTS.filter((p) => points >= p).length;

export const addFriendship = (points: number, delta: number) =>
  Math.max(0, Math.min(MAX_FRIENDSHIP, points + delta));

export function giftReaction(resident: NpcPreset, item: ItemId): GiftReaction {
  if (resident.loves.includes(item)) return 'love';
  if (resident.likes.includes(item)) return 'like';
  if (resident.hates.includes(item)) return 'hate';
  return 'neutral';
}

export const residentByName = (name: string) => NPC_PRESETS.find((p) => p.name === name);

const HEART_NOTES = [
  'Cảm ơn bạn đã hay ghé nói chuyện với mình. Gửi bạn chút quà nhỏ nhé!',
  'Dạo này mình với bạn thân hơn nhiều rồi đó. Quà này mình chọn riêng cho bạn.',
  'Có bạn ở hòn đảo này, ngày nào cũng vui. Nhận quà của mình nha!',
  'Mình kể với cả xóm về bạn rồi đó. Cảm ơn vì đã luôn ở bên!',
  'Bạn là người bạn thân nhất của mình. Món quà này là tấm lòng của mình đó! 💖',
];

// The letter a resident sends when friendship fills a new heart
export const heartLetter = (resident: NpcPreset, heart: number, day: number): Letter => ({
  id: `friend_${resident.id}_${heart}`,
  from: resident.name,
  title: `${'💖'.repeat(heart)} Bạn thân ${heart} tim`,
  body: HEART_NOTES[heart - 1],
  day,
  read: false,
  gift: { gold: 50 * heart, gems: heart === 5 ? 20 : heart },
  claimed: false,
});
