import { describe, expect, it } from 'vitest';
import { ItemId } from '@/types/game';
import { COLLECTION_SETS, discoveriesFrom, setProgress } from '@/lib/collection';

const setOf = (id: string) => COLLECTION_SETS.find((s) => s.id === id)!;

describe('the collection sets', () => {
  it('put every item that can be found in exactly one set, leaving out junk', () => {
    const all = COLLECTION_SETS.flatMap((s) => s.items);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain('mango');
    expect(all).toContain('honey');
    expect(all).toContain('moonfish');
    expect(all).toContain('pearl');
    expect(all).not.toContain('old_boot');
  });
});

describe('setProgress', () => {
  it('counts what has been found and says when the set is complete', () => {
    const beach = setOf('beach');
    expect(setProgress(beach, ['shell', 'carrot'])).toEqual({ found: 1, total: 4, complete: false });
    expect(setProgress(beach, ['shell', 'starfish', 'coral', 'pearl'])).toEqual({ found: 4, total: 4, complete: true });
  });
});

describe('discoveriesFrom', () => {
  it('counts what an older save holds: the bag, the shipping bin and the fish caught', () => {
    const found = discoveriesFrom({
      items: { carrot: 2, egg: 0 },
      shippingBin: { cheese: 1 },
      fishLog: { koi: { caught: 1, best: 40 } },
    });
    expect([...found].sort()).toEqual(['carrot', 'cheese', 'koi'] as ItemId[]);
  });
});
