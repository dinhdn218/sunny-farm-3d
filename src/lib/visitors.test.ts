import { describe, expect, it } from 'vitest';
import { WorldId } from '@/types/game';
import { COSMETICS } from '@/config/cosmetics';
import { VISITORS_PER_WORLD, VISITOR_PHRASES } from '@/config/visitors';
import { WORLDS } from '@/config/worlds';
import { visitorsFor } from '@/lib/visitors';

const WORLD_IDS = Object.keys(WORLDS) as WorldId[];

describe('visitorsFor', () => {
  it('brings ten visitors with names of their own to every zone', () => {
    WORLD_IDS.forEach((world) => {
      const crowd = visitorsFor(world, '2026-10-16');
      expect(crowd, world).toHaveLength(VISITORS_PER_WORLD);
      expect(new Set(crowd.map((v) => v.name)).size, world).toBe(VISITORS_PER_WORLD);
      expect(new Set(crowd.map((v) => v.id)).size, world).toBe(VISITORS_PER_WORLD);
    });
  });

  it('keeps the same crowd all day, and brings another the next day and in other zones', () => {
    const names = (world: WorldId, date: string) => visitorsFor(world, date).map((v) => v.name);
    expect(visitorsFor('park', '2026-10-16')).toEqual(visitorsFor('park', '2026-10-16'));
    expect(names('park', '2026-10-17')).not.toEqual(names('park', '2026-10-16'));
    expect(names('beach', '2026-10-16')).not.toEqual(names('park', '2026-10-16'));
  });

  it('dresses them from the shops, never in festival pieces', () => {
    const festival = new Set(COSMETICS.filter((c) => c.festival).map((c) => c.id));
    const known = new Set(COSMETICS.map((c) => c.id));
    ['2026-10-16', '2026-12-24', '2027-02-06'].forEach((date) =>
      WORLD_IDS.forEach((world) =>
        visitorsFor(world, date).forEach(({ cosmetics }) =>
          Object.values(cosmetics).forEach((id) => {
            expect(known.has(id), id).toBe(true);
            expect(festival.has(id), id).toBe(false);
          })
        )
      )
    );
  });

  it('has something for them to say in every zone', () => {
    WORLD_IDS.forEach((world) => expect(VISITOR_PHRASES[world].length, world).toBeGreaterThan(0));
  });
});
