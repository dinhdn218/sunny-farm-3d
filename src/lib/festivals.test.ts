import { describe, expect, it } from 'vitest';
import { FESTIVALS } from '@/config/festivals';
import { activeFestival, festivalDaysLeft, festivalTokensFor, nextFestival } from '@/lib/festivals';

describe('activeFestival', () => {
  it('runs Lễ Hội Bí Ngô from 15 October through 2 November', () => {
    expect(activeFestival('2026-10-14')).toBeNull();
    expect(activeFestival('2026-10-15')?.id).toBe('halloween');
    expect(activeFestival('2026-10-31')?.id).toBe('halloween');
    expect(activeFestival('2026-11-02')?.id).toBe('halloween');
    expect(activeFestival('2026-11-03')?.id).not.toBe('halloween');
  });

  it('runs Giáng Sinh from 15 December through New Year’s Day', () => {
    expect(activeFestival('2026-12-14')).toBeNull();
    expect(activeFestival('2026-12-15')?.id).toBe('christmas');
    expect(activeFestival('2026-12-25')?.id).toBe('christmas');
    expect(activeFestival('2027-01-01')?.id).toBe('christmas');
    expect(activeFestival('2027-01-02')?.id).not.toBe('christmas');
  });
});

describe('festivalDaysLeft', () => {
  it('counts the days still to play, today included', () => {
    expect(festivalDaysLeft(FESTIVALS.halloween, '2026-10-31')).toBe(3);
    expect(festivalDaysLeft(FESTIVALS.halloween, '2026-11-02')).toBe(1);
  });
});

describe('nextFestival', () => {
  it('is the festival that starts soonest after today', () => {
    expect(nextFestival('2026-10-01')?.id).toBe('halloween');
    expect(nextFestival('2026-11-10')?.id).toBe('christmas');
  });

  it('is nothing once every festival is over', () => {
    expect(nextFestival('2035-01-01')).toBeNull();
  });
});

describe('festivalTokensFor', () => {
  it('pays candy for pumpkins and fish caught at night during Lễ Hội Bí Ngô', () => {
    const halloween = FESTIVALS.halloween;
    expect(festivalTokensFor(halloween, 'harvest', 2, 'pumpkin')).toBe(6);
    expect(festivalTokensFor(halloween, 'night_fish', 1)).toBe(2);
  });

  it('pays nothing for anything else', () => {
    const halloween = FESTIVALS.halloween;
    expect(festivalTokensFor(halloween, 'harvest', 1, 'carrot')).toBe(0);
    expect(festivalTokensFor(halloween, 'fish', 1)).toBe(0);
  });
});

describe('festivalTokensFor at Giáng Sinh', () => {
  it('pays gingerbread for wheat, workshop batches and delivered orders', () => {
    const christmas = FESTIVALS.christmas;
    expect(festivalTokensFor(christmas, 'harvest', 1, 'wheat')).toBe(2);
    expect(festivalTokensFor(christmas, 'craft', 2)).toBe(6);
    expect(festivalTokensFor(christmas, 'deliver_order', 1)).toBe(5);
    expect(festivalTokensFor(christmas, 'harvest', 1, 'pumpkin')).toBe(0);
  });
});
