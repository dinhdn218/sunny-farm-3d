import { describe, expect, it } from 'vitest';
import { dayInSeason, isWet, seasonOf, seasonalPrice, weatherOf } from '@/lib/seasons';

describe('seasonOf', () => {
  it('runs 7 days per season: spring, summer, autumn, winter, then spring again', () => {
    expect([1, 7, 8, 15, 22, 28, 29].map(seasonOf)).toEqual([
      'spring',
      'spring',
      'summer',
      'autumn',
      'winter',
      'winter',
      'spring',
    ]);
  });
});

describe('dayInSeason', () => {
  it('counts the days of the current season from 1 to 7', () => {
    expect([1, 7, 8, 14].map(dayInSeason)).toEqual([1, 7, 1, 7]);
  });
});

describe('weatherOf', () => {
  const days = Array.from({ length: 400 }, (_, i) => i + 1);

  it('is the same every time for a given day', () => {
    expect(days.map(weatherOf)).toEqual(days.map(weatherOf));
  });

  it('starts a new game on a sunny day', () => {
    expect(weatherOf(1)).toBe('sunny');
  });

  it('snows instead of raining in winter, and never snows in the other seasons', () => {
    days.forEach((day) => {
      const weather = weatherOf(day);
      if (seasonOf(day) === 'winter') expect(['rain', 'storm']).not.toContain(weather);
      else expect(weather).not.toBe('snow');
    });
  });

  it('brings a wet day roughly one day in four', () => {
    const wet = days.filter((day) => isWet(weatherOf(day))).length;
    expect(wet).toBeGreaterThan(400 * 0.15);
    expect(wet).toBeLessThan(400 * 0.4);
  });
});

describe('seasonalPrice', () => {
  it('pays 20% more for a crop in its season', () => {
    // Carrots belong to spring (days 1–7)
    expect(seasonalPrice('carrot', 3)).toBe(48);
    expect(seasonalPrice('carrot', 10)).toBe(40);
  });

  it('leaves everything that is not a crop at its usual price', () => {
    expect(seasonalPrice('milk', 3)).toBe(160);
  });
});
