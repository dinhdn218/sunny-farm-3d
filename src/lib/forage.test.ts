import { describe, expect, it } from 'vitest';
import { beachFinds } from '@/lib/forage';
import { BEACH_FINDS_PER_DAY, FORAGE_ITEMS } from '@/config/forage';
import { WHEEL_PRIZES, rollWheel } from '@/config/luckyWheel';
import { CLAW_PRIZES, stockClaw } from '@/config/claw';

describe('beach finds', () => {
  it('puts the same finds in the same spots all day', () => {
    expect(beachFinds(12)).toEqual(beachFinds(12));
  });

  it('fills a different handful of spots each day', () => {
    const finds = beachFinds(3);
    expect(finds).toHaveLength(BEACH_FINDS_PER_DAY);
    expect(new Set(finds.map((f) => f.spot)).size).toBe(BEACH_FINDS_PER_DAY);
    const days = Array.from({ length: 10 }, (_, d) => beachFinds(d + 1).map((f) => f.spot).join(','));
    expect(new Set(days).size).toBeGreaterThan(5);
  });

  it('turns up shells far more often than pearls', () => {
    const counts: Record<string, number> = {};
    for (let day = 1; day <= 400; day++) beachFinds(day).forEach((f) => (counts[f.item] = (counts[f.item] ?? 0) + 1));
    expect(counts.shell).toBeGreaterThan(counts.pearl * 3);
    expect(Object.keys(counts).every((id) => id in FORAGE_ITEMS)).toBe(true);
  });
});

describe('lucky wheel and claw machine', () => {
  it('lands on every slice, the jackpot rarely', () => {
    const counts = new Array(WHEEL_PRIZES.length).fill(0);
    for (let i = 0; i < 1000; i++) counts[rollWheel(() => i / 1000)]++;
    expect(counts.every((n) => n > 0)).toBe(true);
    expect(counts[7]).toBeLessThan(counts[0] / 4);
  });

  it('stocks the machine with five known toys', () => {
    const toys = stockClaw(() => 0.42);
    expect(toys).toHaveLength(5);
    expect(toys.every((i) => CLAW_PRIZES[i])).toBe(true);
  });
});
