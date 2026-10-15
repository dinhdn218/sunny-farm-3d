import { describe, expect, it } from 'vitest';
import { BUGS } from '@/config/bugs';
import { BUG_SPOTS, bugsInPark, netCaught, netZoneWidth } from '@/lib/bugs';
import { seasonOf } from '@/lib/seasons';

describe('bugsInPark', () => {
  it('puts four bugs on different spots of the Park', () => {
    const bugs = bugsInPark(3, 'morning');
    expect(bugs).toHaveLength(4);
    expect(new Set(bugs.map((b) => b.spot)).size).toBe(4);
    bugs.forEach((b) => expect(b.spot).toBeLessThan(BUG_SPOTS.length));
  });

  it('is the same for the same day and time, whenever it is looked at', () => {
    expect(bugsInPark(9, 'night')).toEqual(bugsInPark(9, 'night'));
  });

  it('only brings out bugs that are about at that time of day and season', () => {
    for (let day = 1; day <= 28; day++) {
      (['morning', 'noon', 'sunset', 'night'] as const).forEach((phase) =>
        bugsInPark(day, phase).forEach(({ bug }) => {
          const cfg = BUGS[bug];
          expect(cfg.phases.length === 0 || cfg.phases.includes(phase)).toBe(true);
          expect(cfg.seasons).toContain(seasonOf(day));
        })
      );
    }
  });
});

describe('the net', () => {
  it('catches when the swing lands inside the zone, edges included', () => {
    expect(netCaught(0.5, 0.5, 0.2)).toBe(true);
    expect(netCaught(0.6, 0.5, 0.2)).toBe(true);
    expect(netCaught(0.61, 0.5, 0.2)).toBe(false);
    expect(netCaught(0.3, 0.5, 0.2)).toBe(false);
  });

  it('has a narrower zone for harder bugs, but never a sliver', () => {
    expect(netZoneWidth(6)).toBeLessThan(netZoneWidth(1));
    expect(netZoneWidth(50)).toBeGreaterThanOrEqual(0.08);
  });
});
