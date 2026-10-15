import { SeasonId, Weather } from '@/types/game';

export const SEASON_DAYS = 7;

export const SEASONS: Record<SeasonId, { name: string; icon: string }> = {
  spring: { name: 'Mùa Xuân', icon: '🌸' },
  summer: { name: 'Mùa Hạ', icon: '☀️' },
  autumn: { name: 'Mùa Thu', icon: '🍂' },
  winter: { name: 'Mùa Đông', icon: '❄️' },
};

export const SEASON_ORDER: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

export const WEATHERS: Record<Weather, { name: string; icon: string }> = {
  sunny: { name: 'Nắng đẹp', icon: '☀️' },
  cloudy: { name: 'Nhiều mây', icon: '⛅' },
  rain: { name: 'Mưa', icon: '🌧️' },
  storm: { name: 'Giông bão', icon: '⛈️' },
  snow: { name: 'Tuyết rơi', icon: '🌨️' },
};

// In-season crops fetch this much more at the shipping bin and the market (whole percent)
export const IN_SEASON_BONUS_PERCENT = 20;

// How the grassy zones look through the year
export const SEASON_LOOK: Record<
  SeasonId,
  {
    farmGround: string;
    parkGround: string;
    grass: string;
    wildGrass: string;
    pasture: string;
    oak: string;
    pine: string;
    sakura: string;
  }
> = {
  spring: { farmGround: '#65a30d', parkGround: '#4d7c0f', grass: '#84cc16', wildGrass: '#4d7c0f', pasture: '#4ade80', oak: '#4d7c0f', pine: '#15803d', sakura: '#f472b6' },
  summer: { farmGround: '#4d7c0f', parkGround: '#3f6212', grass: '#65a30d', wildGrass: '#3f6212', pasture: '#22c55e', oak: '#3f6212', pine: '#166534', sakura: '#4ade80' },
  autumn: { farmGround: '#7d5e1c', parkGround: '#6f4e18', grass: '#a07a26', wildGrass: '#7a5a1c', pasture: '#b08a2e', oak: '#ea580c', pine: '#15803d', sakura: '#f97316' },
  winter: { farmGround: '#e2e8f0', parkGround: '#cbd5e1', grass: '#f1f5f9', wildGrass: '#cbd5e1', pasture: '#f1f5f9', oak: '#f8fafc', pine: '#e2e8f0', sakura: '#f1f5f9' },
};
