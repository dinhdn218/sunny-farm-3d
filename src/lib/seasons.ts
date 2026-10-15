import { CropId, ItemId, SeasonId, Weather } from '@/types/game';
import { IN_SEASON_BONUS_PERCENT, SEASON_DAYS, SEASON_ORDER } from '@/config/seasons';
import { CROPS } from '@/config/crops';
import { ITEMS } from '@/config/items';

// Seasons follow the in-game day: 7 days each, spring first
export const seasonOf = (day: number): SeasonId =>
  SEASON_ORDER[Math.floor((Math.max(1, day) - 1) / SEASON_DAYS) % SEASON_ORDER.length];

export const dayInSeason = (day: number) => ((Math.max(1, day) - 1) % SEASON_DAYS) + 1;

// Well-mixed 0–1 value per day (mulberry32 step), so wet days don't fall into a visible rhythm
function dayRandom(day: number) {
  let t = (day * 31 + 7 + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// The day's weather, fixed per day (so tomorrow's forecast is known); a new game starts sunny
export function weatherOf(day: number): Weather {
  if (day <= 1) return 'sunny';
  const r = dayRandom(day);
  if (seasonOf(day) === 'winter') return r < 0.3 ? 'snow' : r < 0.55 ? 'cloudy' : 'sunny';
  return r < 0.06 ? 'storm' : r < 0.26 ? 'rain' : r < 0.48 ? 'cloudy' : 'sunny';
}

// Rain, storms and snow water the fields
export const isWet = (weather: Weather) => weather === 'rain' || weather === 'storm' || weather === 'snow';

const cropOf = (id: ItemId) => (id in CROPS ? CROPS[id as CropId] : null);

export const isInSeason = (id: ItemId, day: number) => cropOf(id)?.season === seasonOf(day);

// Full selling price on `day`: crops in their season fetch more
export function seasonalPrice(id: ItemId, day: number) {
  const base = ITEMS[id].sellPrice;
  return isInSeason(id, day) ? Math.round((base * (100 + IN_SEASON_BONUS_PERCENT)) / 100) : base;
}
