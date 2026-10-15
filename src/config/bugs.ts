import { BugId, SeasonId, TimePhaseId } from '@/types/game';

export interface BugConfig {
  id: BugId;
  name: string;
  icon: string;
  // Times of day it is about (empty: any time) and the seasons it comes out in
  phases: TimePhaseId[];
  seasons: SeasonId[];
  // Relative chance among the bugs about at that time
  weight: number;
  // Harder bugs leave a narrower zone for the net and dodge faster
  difficulty: number;
  sellPrice: number;
  // The little light marking it in the grass
  color: string;
  // Crawls in the grass instead of flying about
  ground?: boolean;
}

const ALL_YEAR: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

// What flutters and crawls round the Park, by time of day and season
export const BUGS: Record<BugId, BugConfig> = {
  butterfly: { id: 'butterfly', name: 'Bướm Vàng', icon: '🦋', phases: ['morning', 'noon'], seasons: ['spring', 'summer', 'autumn'], weight: 30, difficulty: 1, sellPrice: 25, color: '#facc15' },
  ladybug: { id: 'ladybug', name: 'Bọ Rùa', icon: '🐞', phases: ['morning', 'noon'], seasons: ['spring', 'summer'], weight: 25, difficulty: 2, sellPrice: 30, color: '#ef4444' },
  caterpillar: { id: 'caterpillar', name: 'Sâu Xanh', icon: '🐛', phases: ['morning', 'noon', 'sunset'], seasons: ['spring', 'summer', 'autumn'], weight: 20, difficulty: 1, sellPrice: 20, color: '#84cc16', ground: true },
  ant: { id: 'ant', name: 'Kiến Vàng', icon: '🐜', phases: [], seasons: ALL_YEAR, weight: 22, difficulty: 1, sellPrice: 15, color: '#b45309', ground: true },
  cricket: { id: 'cricket', name: 'Dế Mèn', icon: '🦗', phases: ['sunset', 'night'], seasons: ['summer', 'autumn'], weight: 18, difficulty: 3, sellPrice: 50, color: '#65a30d', ground: true },
  firefly: { id: 'firefly', name: 'Đom Đóm', icon: '✨', phases: ['night'], seasons: ['spring', 'summer'], weight: 15, difficulty: 4, sellPrice: 70, color: '#fde047' },
  beetle: { id: 'beetle', name: 'Bọ Hung Sừng', icon: '🪲', phases: ['sunset', 'night'], seasons: ['summer'], weight: 6, difficulty: 6, sellPrice: 160, color: '#1e3a8a' },
  spider: { id: 'spider', name: 'Nhện Vàng', icon: '🕷️', phases: ['sunset', 'night'], seasons: ['autumn', 'winter'], weight: 10, difficulty: 3, sellPrice: 45, color: '#a16207', ground: true },
};

export const BUG_LIST: BugConfig[] = Object.values(BUGS);

// A swing of the net
export const BUG_NET_ENERGY = 2;
