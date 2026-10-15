import { CropId, FestivalId, QuestCategory, QuestItem, QuestType } from '@/types/game';
import {
  ACHIEVEMENTS,
  DAILY_POOL,
  DAILY_QUEST_COUNT,
  EVENT_QUESTS,
  MAIN_QUESTS,
  QuestDef,
} from '@/config/quests';

function fromDef(def: QuestDef, category: QuestCategory, id = def.id): QuestItem {
  return {
    id,
    category,
    title: def.title,
    desc: def.desc,
    icon: def.icon,
    type: def.type,
    target: def.target,
    progress: 0,
    claimed: false,
    rewardGold: def.rewardGold,
    rewardGems: def.rewardGems,
    festival: def.festival,
    rewardTokens: def.rewardTokens,
    crop: def.crop,
    chapter: def.chapter,
  };
}

// Same three dailies for a given day (seeded shuffle of the pool)
export function createDailyQuests(day: number): QuestItem[] {
  const pool = [...DAILY_POOL];
  let seed = (day * 7919) % 233280;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool
    .slice(0, DAILY_QUEST_COUNT)
    .map((def) => fromDef(def, 'daily', `${def.id}_day${day}`));
}

export function achievementQuest(id: string, tier: number, progress: number): QuestItem {
  const def = ACHIEVEMENTS.find((a) => a.id === id)!;
  const step = def.tiers[Math.min(tier, def.tiers.length - 1)];
  return {
    id,
    category: 'achievement',
    title: def.title,
    desc: def.desc.replace('{n}', step.target.toLocaleString('vi-VN')),
    icon: def.icon,
    type: def.type,
    target: step.target,
    progress,
    claimed: false,
    rewardGold: step.rewardGold,
    rewardGems: step.rewardGems,
    tier,
    tiers: def.tiers.length,
  };
}

export function createInitialQuests(
  day: number,
  achievementProgress: Record<string, number> = {}
): QuestItem[] {
  return [
    ...MAIN_QUESTS.map((def) => fromDef(def, 'main')),
    ...createDailyQuests(day),
    ...ACHIEVEMENTS.map((a) => achievementQuest(a.id, 0, achievementProgress[a.id] ?? 0)),
    ...EVENT_QUESTS.map((def) => fromDef(def, 'event')),
  ];
}

// Festival quests stay in the save but are only shown (and claimable) while their festival runs
export const visibleQuests = (quests: QuestItem[], festival: FestivalId | null) =>
  quests.filter((q) => q.category !== 'event' || q.festival === festival);

// Brings saved quests in line with the current game: story, festival quests and achievements follow
// the config (new ones added in order, texts refreshed) while progress, tiers and claims are kept
export function reconcileQuests(saved: QuestItem[], day: number): QuestItem[] {
  const savedById = new Map(saved.map((q) => [q.id, q]));
  const fromConfig = (defs: QuestDef[], category: QuestCategory) =>
    defs.map((def) => {
      const old = savedById.get(def.id);
      const quest = fromDef(def, category);
      return old ? { ...quest, progress: old.progress, claimed: old.claimed } : quest;
    });
  const mains = fromConfig(MAIN_QUESTS, 'main');
  const dailies = saved.filter((q) => q.category === 'daily');
  const achievements = ACHIEVEMENTS.map((def) => {
    const old = savedById.get(def.id);
    if (!old) return achievementQuest(def.id, 0, 0);
    return { ...achievementQuest(def.id, old.tier ?? 0, old.progress), claimed: old.claimed };
  });
  return [
    ...mains,
    ...(dailies.length > 0 ? dailies : createDailyQuests(day)),
    ...achievements,
    ...fromConfig(EVENT_QUESTS, 'event'),
  ];
}

export const activeMainQuest = (quests: QuestItem[]) =>
  quests.find((q) => q.category === 'main' && !q.claimed);

export const isClaimable = (q: QuestItem) => !q.claimed && q.progress >= q.target;

// Applies a gameplay event and collects the quests it completes into `completed`;
// a festival's quests only count while it runs (`festival`)
export function advanceQuests(
  quests: QuestItem[],
  type: QuestType,
  amount: number,
  crop: CropId | undefined,
  completed: QuestItem[],
  festival: FestivalId | null
) {
  const activeMainId = activeMainQuest(quests)?.id;
  return quests.map((q) => {
    if (q.type !== type || q.claimed) return q;
    if (q.category === 'main' && q.id !== activeMainId) return q;
    if (q.category === 'event' && q.festival !== festival) return q;
    if (q.crop && q.crop !== crop) return q;
    const capped = q.category !== 'achievement';
    if (capped && q.progress >= q.target) return q;
    const progress = capped ? Math.min(q.target, q.progress + amount) : q.progress + amount;
    if (q.progress < q.target && progress >= q.target) completed.push(q);
    return { ...q, progress };
  });
}

// State-based progress (e.g. zones visited so far) for the active story quest
export function syncQuestValue(
  quests: QuestItem[],
  type: QuestType,
  value: number,
  completed: QuestItem[]
) {
  const active = activeMainQuest(quests);
  if (!active || active.type !== type || active.progress >= value) return quests;
  const progress = Math.min(active.target, value);
  if (active.progress < active.target && progress >= active.target) completed.push(active);
  return quests.map((q) => (q.id === active.id ? { ...q, progress } : q));
}

// Claiming an achievement moves it on to its next tier, keeping the cumulative progress
export function afterClaim(quest: QuestItem): QuestItem {
  if (quest.category !== 'achievement') return { ...quest, claimed: true };
  const nextTier = (quest.tier ?? 0) + 1;
  if (nextTier >= (quest.tiers ?? 1)) return { ...quest, claimed: true };
  return achievementQuest(quest.id, nextTier, quest.progress);
}
