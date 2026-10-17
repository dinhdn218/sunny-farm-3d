import { describe, expect, it } from 'vitest';
import { QuestItem } from '@/types/game';
import { MAIN_QUESTS } from '@/config/quests';
import {
  achievementQuest,
  activeMainQuest,
  advanceQuests,
  createInitialQuests,
  reconcileQuests,
  visibleQuests,
} from '@/lib/quests';

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

describe('visibleQuests', () => {
  const quests = createInitialQuests(1);

  it("shows the running festival's quests", () => {
    expect(visibleQuests(quests, 'halloween').some((q) => q.id === 'e_pumpkins')).toBe(true);
  });

  it('hides festival quests while no festival runs', () => {
    expect(visibleQuests(quests, null).some((q) => q.category === 'event')).toBe(false);
  });
});

describe('visibleQuests while another festival runs', () => {
  it("shows that festival's quests and hides the others'", () => {
    const shown = visibleQuests(createInitialQuests(1), 'christmas').map((q) => q.id);
    expect(shown).toContain('x_orders');
    expect(shown).not.toContain('e_pumpkins');
  });
});

describe('advanceQuests', () => {
  const progressOf = (festival: 'halloween' | 'christmas' | null) => {
    const quests = advanceQuests(createInitialQuests(1), 'feed_animal', 1, undefined, [], festival);
    return quests.find((q) => q.id === 'x_feed')?.progress;
  };

  it("counts a festival's quests only while that festival runs", () => {
    expect(progressOf('christmas')).toBe(1);
    expect(progressOf('halloween')).toBe(0);
    expect(progressOf(null)).toBe(0);
  });
});

describe('visibleQuests at Tết', () => {
  it("shows Tết's quests", () => {
    expect(visibleQuests(createInitialQuests(1), 'tet').map((q) => q.id)).toContain('t_orders');
  });
});

describe('the story without sleeping', () => {
  it('goes from watering straight to the first harvest', () => {
    const ids = createInitialQuests(1).filter((q) => q.category === 'main').map((q) => q.id);
    expect(ids[ids.indexOf('m_water') + 1]).toBe('m_harvest');
  });

  it('moves a save that stopped at "Giấc Ngủ Ngon" on to the first harvest', () => {
    const saved = createInitialQuests(1).map((q) =>
      ['m_till', 'm_plant', 'm_water'].includes(q.id) ? { ...q, claimed: true } : q
    );
    const withSleep = [...saved, { ...saved[0], id: 'm_sleep', title: 'Giấc Ngủ Ngon', type: 'sleep' as const, claimed: false }];
    expect(activeMainQuest(reconcileQuests(withSleep, 1))?.id).toBe('m_harvest');
  });

  it('counts days visited, not nights slept', () => {
    expect(createInitialQuests(1).find((q) => q.id === 'a_days')?.desc).toBe('Ghé nông trại vào 3 ngày khác nhau.');
  });
});
