import { CropId, QuestType } from '@/types/game';
import { FESTIVAL_LIST, FestivalConfig } from '@/config/festivals';

const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

// The festival running on `today` (YYYY-MM-DD by the device's calendar, see lib/dailyGift), if any
export const activeFestival = (today: string) =>
  FESTIVAL_LIST.find((f) => today >= f.start && today <= f.end) ?? null;

// Days of the festival still to play, today included
export const festivalDaysLeft = (festival: FestivalConfig, today: string) =>
  Math.max(0, dayNumber(festival.end) - dayNumber(today) + 1);

// The next festival to begin after today
export const nextFestival = (today: string) =>
  FESTIVAL_LIST.filter((f) => f.start > today).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;

// Tokens the festival hands out for a gameplay event
export const festivalTokensFor = (
  festival: FestivalConfig,
  type: QuestType,
  amount: number,
  crop?: CropId
) =>
  festival.earn
    .filter((rule) => rule.type === type && (!rule.crop || rule.crop === crop))
    .reduce((sum, rule) => sum + rule.tokens * amount, 0);
