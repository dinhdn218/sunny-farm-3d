import { QuestItem, QuestType } from '@/types/game';

export const MAX_LEVEL = 50;

// XP per unit of each gameplay event (the events that also drive quests); chatting earns none
const XP_PER: Partial<Record<QuestType, number>> = {
  till: 1,
  plant: 1,
  water: 1,
  harvest: 3,
  feed_animal: 2,
  collect_animal: 3,
  craft: 5,
  fish: 4,
  card_game: 3,
  card_win: 5,
  forage: 2,
  deliver_order: 10,
  catch_bug: 3,
  give_gift: 3,
  sleep: 5,
  visit_world: 2,
  cinema_channel: 1,
  buy_cosmetic: 5,
  buy_decor: 5,
  place_decor: 5,
  buy_animal: 10,
  buy_machine: 20,
  buy_plot: 50,
};

export function xpFor(type: QuestType, amount: number) {
  if (type === 'earn_gold') return Math.floor(amount / 25);
  return (XP_PER[type] ?? 0) * amount;
}

// XP to climb from `level` to the next: 100, 150, 200, …
const xpToNext = (level: number) => 50 * (level + 1);

export function levelInfo(xp: number) {
  let level = 1;
  let into = xp;
  while (level < MAX_LEVEL && into >= xpToNext(level)) {
    into -= xpToNext(level);
    level++;
  }
  if (level === MAX_LEVEL) return { level, into: 0, need: 0 };
  return { level, into, need: xpToNext(level) };
}

const TITLES: [number, string][] = [
  [35, 'Huyền Thoại Nông Trại'],
  [20, 'Đại Điền Chủ'],
  [10, 'Chủ Trang Trại'],
  [5, 'Nông Dân Chăm Chỉ'],
  [1, 'Nông Dân Tập Sự'],
];

export const levelTitle = (level: number) =>
  (TITLES.find(([min]) => level >= min) ?? TITLES[TITLES.length - 1])[1];

// Reward for reaching `level`
export const levelReward = (level: number) => ({
  gold: 50 * level,
  gems: level % 5 === 0 ? 10 : 2,
});

// Saves from before levels existed: achievement counters are cumulative, so they show what was done
export const estimateXp = (quests: QuestItem[]) =>
  quests
    .filter((q) => q.category === 'achievement')
    .reduce((sum, q) => sum + xpFor(q.type, q.progress), 0);
