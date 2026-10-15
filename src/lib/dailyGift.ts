import { CropId } from '@/types/game';
import { CROPS } from '@/config/crops';

export interface DailyGift {
  gold?: number;
  gems?: number;
  bread?: number;
  feed?: number;
  seeds?: Partial<Record<CropId, number>>;
}

// One gift per real calendar day; the streak runs 1–7 and then starts a new round
export const DAILY_GIFTS: DailyGift[] = [
  { gold: 50 },
  { bread: 3 },
  { gold: 100 },
  { feed: 10 },
  { gems: 5 },
  { gold: 150, seeds: { pumpkin: 2 } },
  { gems: 20 },
];

// "+150🪙 +2 Hạt Bí Ngô"
export function giftLabel(gift: DailyGift) {
  const parts: string[] = [];
  if (gift.gold) parts.push(`+${gift.gold}🪙`);
  if (gift.gems) parts.push(`+${gift.gems}💎`);
  if (gift.bread) parts.push(`+${gift.bread} 🥖 Bánh Mì`);
  if (gift.feed) parts.push(`+${gift.feed} 🌾 Thức Ăn`);
  (Object.entries(gift.seeds ?? {}) as [CropId, number][]).forEach(([crop, n]) =>
    parts.push(`+${n} Hạt ${CROPS[crop].name}`)
  );
  return parts.join(' ');
}

const pad = (n: number) => String(n).padStart(2, '0');

// The device's calendar date as YYYY-MM-DD
export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const dayBefore = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
};

// Which day of the streak today's gift is (1–7), or null once today's gift is claimed
export function giftDay(lastDate: string | null, streak: number, today: string): number | null {
  if (lastDate === today) return null;
  if (lastDate === dayBefore(today)) return (streak % DAILY_GIFTS.length) + 1;
  return 1;
}
