import { CropId, FestivalId, QuestType } from '@/types/game';
import { ThemeId } from '@/config/music';

// A gameplay event that hands out the festival's tokens while it runs (see incrementQuest)
export interface TokenRule {
  type: QuestType;
  // Harvests: only this crop counts
  crop?: CropId;
  tokens: number;
  // How the festival shop explains it
  label: string;
}

// Adding a festival is content: an entry here, its quests (config/quests), its items
// (config/cosmetics, with `festival`) and its decorations (canvas/environment/Festivals)
export interface FestivalConfig {
  id: FestivalId;
  name: string;
  icon: string;
  // First and last day, by the device's calendar (YYYY-MM-DD)
  start: string;
  end: string;
  // What it pays in, and the stall in the Park where that is spent
  token: { name: string; icon: string };
  shop: { name: string; icon: string };
  earn: TokenRule[];
  // Its nights: the sky (unless it keeps the usual one) and the tune
  nightSky?: { sky: string; fog: string };
  nightTheme: ThemeId;
  // The stall: counter, awning stripes and the goods on show
  stall: { counter: string; trim: string; stripes: [string, string]; goods: string[] };
  // Tailwind classes for its buttons, purse chip, banners and shop cards
  ui: {
    button: string;
    chip: string;
    panel: string;
    text: string;
    tile: string;
    selected: string;
    preview: string;
    tag: string;
  };
}

export const FESTIVALS: Record<FestivalId, FestivalConfig> = {
  halloween: {
    id: 'halloween',
    name: 'Lễ Hội Bí Ngô',
    icon: '🎃',
    start: '2026-10-15',
    end: '2026-11-02',
    token: { name: 'Kẹo', icon: '🍬' },
    shop: { name: 'Tiệm Kẹo Ma Quái', icon: '🍬' },
    earn: [
      { type: 'harvest', crop: 'pumpkin', tokens: 3, label: '🎃 Thu hoạch Bí Ngô' },
      { type: 'night_fish', tokens: 2, label: '🌙 Câu được cá ban đêm' },
    ],
    nightSky: { sky: '#1e1036', fog: '#2e1065' },
    nightTheme: 'spooky',
    stall: { counter: '#4c1d95', trim: '#f97316', stripes: ['#f97316', '#111827'], goods: ['#f472b6', '#a855f7', '#22c55e'] },
    ui: {
      button: 'bg-purple-600 hover:bg-purple-500',
      chip: 'bg-purple-900 text-amber-300',
      panel: 'border-purple-500/40 bg-purple-50 text-purple-900',
      text: 'text-purple-800',
      tile: 'border-purple-700 bg-purple-200',
      selected: 'border-purple-500 bg-purple-50',
      preview: 'border-purple-700/40 from-purple-300 to-amber-100',
      tag: 'bg-purple-700',
    },
  },
};

export const FESTIVAL_LIST: FestivalConfig[] = Object.values(FESTIVALS);
