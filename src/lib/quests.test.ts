import { describe, expect, it } from 'vitest';
import { QuestItem } from '@/types/game';
import { MAIN_QUESTS } from '@/config/quests';
import { achievementQuest, createInitialQuests, reconcileQuests } from '@/lib/quests';

const byId = (quests: QuestItem[], id: string) => quests.find((q) => q.id === id);

describe('reconcileQuests', () => {
  it('keeps progress and claimed rewards', () => {
    const saved = createInitialQuests(1).map((q) =>
      q.id === 'm_till' ? { ...q, progress: 5, claimed: true } : q.id === 'm_plant' ? { ...q, progress: 2 } : q
    );
    const quests = reconcileQuests(saved, 1);
    expect(byId(quests, 'm_till')).toMatchObject({ progress: 5, claimed: true });
    expect(byId(quests, 'm_plant')).toMatchObject({ progress: 2, claimed: false });
  });

  it('adds story quests an older save lacks, in story order', () => {
    const saved = createInitialQuests(1).filter((q) => q.id !== 'm_machine' && q.id !== 'm_craft');
    const mainIds = reconcileQuests(saved, 1)
      .filter((q) => q.category === 'main')
      .map((q) => q.id);
    expect(mainIds).toEqual(MAIN_QUESTS.map((q) => q.id));
  });

  it('takes quest texts from the current version of the game', () => {
    const saved = createInitialQuests(1).map((q) =>
      q.id === 'm_fashion' ? { ...q, title: 'Tên cũ', chapter: 'Chương cũ' } : q
    );
    const def = MAIN_QUESTS.find((q) => q.id === 'm_fashion');
    expect(byId(reconcileQuests(saved, 1), 'm_fashion')).toMatchObject({
      title: def?.title,
      chapter: def?.chapter,
    });
  });

  it("keeps today's daily quests", () => {
    const saved = createInitialQuests(4).map((q) =>
      q.category === 'daily' ? { ...q, progress: 1 } : q
    );
    const dailies = (quests: QuestItem[]) => quests.filter((q) => q.category === 'daily');
    expect(dailies(reconcileQuests(saved, 4))).toEqual(dailies(saved));
  });

  it('adds new achievements and keeps the tier reached on existing ones', () => {
    const saved = createInitialQuests(1)
      .filter((q) => q.id !== 'a_craft')
      .map((q) => (q.id === 'a_harvest' ? achievementQuest('a_harvest', 1, 30) : q));
    const quests = reconcileQuests(saved, 1);
    expect(byId(quests, 'a_harvest')).toMatchObject({ tier: 1, progress: 30, target: 50 });
    expect(byId(quests, 'a_craft')).toMatchObject({ tier: 0, progress: 0, claimed: false });
  });

  it('keeps the progress of event quests and adds the ones a save lacks', () => {
    const saved = createInitialQuests(1)
      .filter((q) => q.id !== 'e_shop')
      .map((q) => (q.id === 'e_pumpkins' ? { ...q, progress: 4 } : q));
    const quests = reconcileQuests(saved, 1);
    expect(byId(quests, 'e_pumpkins')).toMatchObject({ category: 'event', progress: 4 });
    expect(byId(quests, 'e_shop')).toMatchObject({ category: 'event', progress: 0 });
  });

  it('keeps an achievement finished at its last tier finished', () => {
    const done = { ...achievementQuest('a_days', 2, 30), claimed: true };
    const saved = createInitialQuests(1).map((q) => (q.id === 'a_days' ? done : q));
    expect(byId(reconcileQuests(saved, 1), 'a_days')).toMatchObject({ tier: 2, claimed: true });
  });
});
