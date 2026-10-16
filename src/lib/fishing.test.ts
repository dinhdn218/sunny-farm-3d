import { describe, expect, it } from 'vitest';
import { SeasonId, TimePhaseId } from '@/types/game';
import { CATCHES, CATCH_LIST } from '@/config/fish';
import { SEASON_ORDER } from '@/config/seasons';
import { TIME_PHASES } from '@/config/time';
import { REEL_START, bitesNow, reelStep, rollCatch, rollSize, zoneWidth } from '@/lib/fishing';

// Deterministic stand-in for Math.random
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// Every cast over the whole range of the dice
const castsAt = (phase: TimePhaseId, waters: 'sea' | 'pond', season: SeasonId) =>
  new Set(Array.from({ length: 1000 }, (_, i) => rollCatch(phase, waters, season, () => i / 1000)));

describe('rollCatch', () => {
  it('only brings up what bites at this time of day', () => {
    for (let r = 0; r < 1; r += 0.01) {
      const id = rollCatch('morning', 'sea', 'spring', () => r);
      const phases = CATCHES[id].phases;
      expect(phases.length === 0 || phases.includes('morning')).toBe(true);
    }
  });

  it('can bring up the night-only legendary fish at night but never in the morning', () => {
    expect(castsAt('night', 'sea', 'autumn').has('moonfish')).toBe(true);
    expect(castsAt('morning', 'sea', 'autumn').has('moonfish')).toBe(false);
  });

  it('keeps sea fish in the sea and pond fish in the pond', () => {
    for (let r = 0; r < 1; r += 0.01) {
      expect(CATCHES[rollCatch('night', 'pond', 'spring', () => r)].waters).toContain('pond');
      expect(CATCHES[rollCatch('night', 'sea', 'spring', () => r)].waters).toContain('sea');
    }
    const pond = castsAt('night', 'pond', 'spring');
    expect(pond.has('dragon_carp')).toBe(true);
    expect(pond.has('moonfish')).toBe(false);
  });

  it('brings up common fish far more often than rare ones', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const id = rollCatch('noon', 'sea', 'spring', () => i / 1000);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts.anchovy).toBeGreaterThan(counts.tuna * 3);
  });

  it('only brings up what bites this season: each legend in its own', () => {
    SEASON_ORDER.forEach((season) =>
      (['sea', 'pond'] as const).forEach((waters) =>
        castsAt('night', waters, season).forEach((id) => expect(CATCHES[id].seasons, id).toContain(season))
      )
    );
    expect(SEASON_ORDER.filter((season) => castsAt('night', 'pond', season).has('dragon_carp'))).toEqual(['spring']);
    expect(SEASON_ORDER.filter((season) => castsAt('night', 'sea', season).has('moonfish'))).toEqual(['autumn']);
  });

  it('always has a fish biting, whatever the waters, time and season', () => {
    SEASON_ORDER.forEach((season) =>
      TIME_PHASES.forEach(({ id: phase }) =>
        (['sea', 'pond'] as const).forEach((waters) => {
          const fish = CATCH_LIST.filter(
            (c) => bitesNow(c, phase, waters, season) && c.rarity !== 'junk' && c.rarity !== 'treasure'
          );
          expect(fish.length, `${season} ${phase} ${waters}`).toBeGreaterThan(0);
        })
      )
    );
  });
});

describe('rollSize', () => {
  it('measures a fish within the size range of its kind', () => {
    const [min, max] = CATCHES.mackerel.size ?? [0, 0];
    expect(rollSize('mackerel', () => 0)).toBe(min);
    expect(rollSize('mackerel', () => 0.9999)).toBe(max);
  });
});

describe('reelStep', () => {
  const calm = () => 0.5;

  it('raises the catch zone while the player holds and lets it fall back when released', () => {
    let s = { ...REEL_START, barPos: 0.3, barVel: 0 };
    for (let i = 0; i < 20; i++) s = reelStep(s, 0.016, true, 3, calm);
    const raised = s.barPos;
    expect(raised).toBeGreaterThan(0.3);

    for (let i = 0; i < 40; i++) s = reelStep(s, 0.016, false, 3, calm);
    expect(s.barPos).toBeLessThan(raised);
  });

  it('keeps the catch zone on the track', () => {
    let s = { ...REEL_START };
    for (let i = 0; i < 400; i++) s = reelStep(s, 0.016, true, 3, calm);
    expect(s.barPos + zoneWidth(3)).toBeLessThanOrEqual(1);
    for (let i = 0; i < 400; i++) s = reelStep(s, 0.016, false, 3, calm);
    expect(s.barPos).toBeGreaterThanOrEqual(0);
  });

  it('fills the meter while the fish stays in the zone', () => {
    const s = { ...REEL_START, fishPos: 0.4, fishTarget: 0.4, barPos: 0.3, barVel: 0, progress: 0.5 };
    expect(reelStep(s, 0.1, false, 3, calm).progress).toBeGreaterThan(0.5);
  });

  it('drains the meter while the fish is outside the zone', () => {
    const s = { ...REEL_START, fishPos: 0.9, fishTarget: 0.9, barPos: 0, barVel: 0, progress: 0.5 };
    expect(reelStep(s, 0.1, false, 3, calm).progress).toBeLessThan(0.5);
  });

  it('gives harder fish a narrower zone', () => {
    expect(zoneWidth(8)).toBeLessThan(zoneWidth(2));
  });

  it('can be widened (the bat helps at night)', () => {
    expect(zoneWidth(3, 1.25)).toBeCloseTo(zoneWidth(3) * 1.25);
    // The fish sits just past the end of the normal zone, but inside the wider one
    const s = { ...REEL_START, barPos: 0.2, barVel: 0, fishPos: 0.2 + zoneWidth(3) + 0.02, fishTarget: 0.2 + zoneWidth(3) + 0.02 };
    expect(reelStep(s, 0.1, false, 3, calm).progress).toBeLessThan(s.progress);
    expect(reelStep(s, 0.1, false, 3, calm, 1.25).progress).toBeGreaterThan(s.progress);
  });

  it('makes the fish swim off to new spots', () => {
    let s = { ...REEL_START, fishPos: 0.5, fishTarget: 0.5 };
    const random = sequence(0.1, 0.9, 0.05, 0.95);
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      s = reelStep(s, 0.016, false, 5, random);
      seen.add(Math.round(s.fishPos * 10));
    }
    expect(seen.size).toBeGreaterThan(3);
  });
});
