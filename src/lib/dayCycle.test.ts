import { describe, expect, it } from 'vitest';
import { SaveData } from '@/types/game';
import { createNewGameSave } from '@/lib/newGame';
import { dayStartMs } from '@/lib/clock';
import { isWet, weatherOf } from '@/lib/seasons';
import { MAX_CATCH_UP_DAYS, advanceDays } from './dayCycle';

const HOUR = 3_600_000;
// The first day from 300 whose weather passes `test` (days 300+ fall in November 2026, between festivals)
const dayWhere = (test: (day: number) => boolean) => {
  for (let d = 300; ; d++) if (test(d)) return d;
};
// A new farm on `day`, walking no pet, with an empty shipping bin
const farm = (day: number, pet = 'none_pet'): SaveData => {
  const save = createNewGameSave();
  return { ...save, day, shippingBin: {}, cosmetics: { ...save.cosmetics, pet } };
};

describe('a new day', () => {
  it('does nothing while the day is the same', () => {
    expect(advanceDays(farm(300), 300, dayStartMs(300) + HOUR)).toBeNull();
  });

  it('sells the shipping bin once, at the price of the day the goods went in', () => {
    // Day 10 is summer: carrots fetch their plain price
    const result = advanceDays({ ...farm(10), gold: 0, shippingBin: { carrot: 3 } }, 13, dayStartMs(13) + HOUR)!;
    expect(result.save.gold).toBe(120);
    expect(result.save.shippingBin).toEqual({});
    expect(result.summary).toMatchObject({ day: 13, daysPassed: 3, totalGoldEarned: 120 });
  });

  it(`makes up for at most ${MAX_CATCH_UP_DAYS} days away`, () => {
    const { summary } = advanceDays(farm(100, 'shiba_inu'), 130, dayStartMs(130) + HOUR)!;
    expect(summary.daysPassed).toBe(30);
    expect(summary.petNote?.split(' • ')).toHaveLength(MAX_CATCH_UP_DAYS);
  });

  it('waters dry crops from midnight on a wet day, so they grow from then', () => {
    const wetDay = dayWhere((d) => isWet(weatherOf(d)));
    const save = farm(wetDay - 1);
    const tiles = save.tiles.map((t) =>
      t.id === '6-6' ? { ...t, state: 'planted' as const, crop: 'carrot' as const, stage: 1, watered: false } : t
    );
    const result = advanceDays({ ...save, tiles }, wetDay, dayStartMs(wetDay) + 30 * 60_000)!;
    expect(result.save.tiles.find((t) => t.id === '6-6')).toMatchObject({
      watered: true,
      readyAt: dayStartMs(wetDay) + HOUR,
      stage: 2,
    });
    expect(result.summary.rainWatered).toBeGreaterThan(0);
  });

  it('leaves dry soil to the watering can on a dry day', () => {
    const dryDay = dayWhere((d) => !isWet(weatherOf(d)));
    const { save, summary } = advanceDays(farm(dryDay - 1), dryDay, dayStartMs(dryDay) + HOUR)!;
    expect(save.tiles.find((t) => t.id === '8-8')?.watered).toBe(false);
    expect(summary.rainWatered).toBe(0);
  });

  it("brings Robo Cat's watering from midnight", () => {
    const dryDay = dayWhere((d) => !isWet(weatherOf(d)));
    const { save, summary } = advanceDays(farm(dryDay - 1, 'robo_cat'), dryDay, dayStartMs(dryDay) + HOUR)!;
    expect(save.tiles.find((t) => t.id === '8-8')?.watered).toBe(true);
    expect(summary.petNote).toContain('Mèo Máy');
  });

  it("wears off the day's dish and brings stamina back within the plain most", () => {
    const save = { ...farm(300), energy: 120, buff: { id: 'stamina' as const, food: 'cheese' as const, day: 300 } };
    expect(advanceDays(save, 301, dayStartMs(301) + HOUR)!.save).toMatchObject({ energy: 100, buff: null });
  });

  it('leaves the workshop on its own time', () => {
    const job = { recipeId: 'bread' as const, readyAt: dayStartMs(301) + 5 * HOUR };
    const save = { ...farm(300), machines: { machine_oven: { job } } };
    expect(advanceDays(save, 301, dayStartMs(301) + HOUR)!.save.machines).toEqual({ machine_oven: { job } });
  });

  it('leaves the quests to the store', () => {
    const save = farm(300);
    expect(advanceDays(save, 301, dayStartMs(301) + HOUR)!.save.quests).toBe(save.quests);
  });
});
