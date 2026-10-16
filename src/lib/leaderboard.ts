import { WeeklyStats } from '@/types/game';
import { NPC_PRESETS } from '@/config/npcs';
import { levelInfo } from '@/lib/leveling';
import { seeded } from '@/lib/random';

export type BoardCategory = 'gold' | 'fish' | 'orders' | 'level';

export interface BoardEntry {
  id: string;
  name: string;
  score: number;
  you?: boolean;
}

export const BOARD_CATEGORIES: { id: BoardCategory; label: string; icon: string; unit: string }[] = [
  { id: 'gold', label: 'Vàng kiếm được', icon: '🪙', unit: 'Vàng' },
  { id: 'fish', label: 'Cá câu được', icon: '🎣', unit: 'con' },
  { id: 'orders', label: 'Đơn đã giao', icon: '📦', unit: 'đơn' },
  { id: 'level', label: 'Cấp độ', icon: '⭐', unit: '' },
];

// The ISO week a day falls in by the device's calendar, e.g. 2026-W42 (weeks start on Monday)
export function weekKey(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // The Thursday of the same week decides which year the week belongs to
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Days of the week still to play, today included
export const weekDaysLeft = (date: Date) => 7 - ((date.getDay() + 6) % 7);

export const emptyWeek = (week: string): WeeklyStats => ({ week, gold: 0, fish: 0, orders: 0 });

// The week's counters after a gameplay event: a new week starts from nothing
export function addWeekly(
  stats: WeeklyStats | undefined,
  week: string,
  add: Partial<Omit<WeeklyStats, 'week'>>
): WeeklyStats {
  const base = stats?.week === week ? stats : emptyWeek(week);
  return {
    week,
    gold: base.gold + (add.gold ?? 0),
    fish: base.fish + (add.fish ?? 0),
    orders: base.orders + (add.orders ?? 0),
  };
}

const highestFirst = (a: BoardEntry, b: BoardEntry) => b.score - a.score || a.name.localeCompare(b.name);

// Rows of the public `profiles` table (name, this week's counters, experience) as a ranking;
// rows with nothing to show for the category are left out
export function boardFromRows(rows: unknown[], category: BoardCategory, week: string): BoardEntry[] {
  return rows
    .map((raw) => {
      const row = raw as { id?: string; full_name?: string | null; weekly?: Partial<WeeklyStats> | null; xp?: number | null };
      if (!row.id) return null;
      const name = row.full_name || 'Nông Dân';
      if (category === 'level') {
        return typeof row.xp === 'number' ? { id: row.id, name, score: levelInfo(row.xp).level } : null;
      }
      const score = row.weekly?.week === week ? row.weekly[category] : undefined;
      return typeof score === 'number' && score > 0 ? { id: row.id, name, score } : null;
    })
    .filter((e): e is BoardEntry => e !== null)
    .sort(highestFirst);
}

// Steady levels for the residents; their weekly scores change from week to week
const RESIDENT_LEVELS = [8, 14, 11, 6, 9];
const WEEKLY_RANGE: Record<Exclude<BoardCategory, 'level'>, number> = { gold: 2600, fish: 24, orders: 14 };

// Without the cloud: the player against the island's residents
export function villageBoard(category: BoardCategory, week: string, you: { name: string; score: number }): BoardEntry[] {
  const [year, num] = week.split('-W').map(Number);
  const residents = NPC_PRESETS.map((npc, i) => {
    const random = seeded((year || 0) * 100 + (num || 0) + i * 7919);
    const score =
      category === 'level' ? RESIDENT_LEVELS[i % RESIDENT_LEVELS.length] : Math.round(random() * WEEKLY_RANGE[category]);
    return { id: npc.id, name: npc.name, score };
  });
  return [...residents, { id: 'you', name: you.name, score: you.score, you: true }].sort(highestFirst);
}
