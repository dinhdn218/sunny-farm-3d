import { describe, expect, it } from 'vitest';
import { addItems, countItems, hasItems, instantSellPrice, missingItems, takeItems } from '@/lib/inventory';

describe('addItems', () => {
  it('adds to what is already in the bag without changing the original', () => {
    const bag = { carrot: 2 };
    expect(addItems(bag, { carrot: 1, egg: 2 })).toEqual({ carrot: 3, egg: 2 });
    expect(bag).toEqual({ carrot: 2 });
  });
});

describe('takeItems', () => {
  it('removes the items and drops entries that run out', () => {
    expect(takeItems({ carrot: 3, egg: 1 }, { carrot: 3 })).toEqual({ egg: 1 });
  });

  it('takes nothing when the bag is short', () => {
    expect(takeItems({ carrot: 2 }, { carrot: 3 })).toBeNull();
  });
});

describe('missingItems', () => {
  it('lists only what the bag is short of', () => {
    expect(missingItems({ egg: 1, wheat: 5 }, { pumpkin: 1, egg: 1, wheat: 1 })).toEqual({ pumpkin: 1 });
  });
});

describe('hasItems', () => {
  it('is true when the bag holds at least that much of everything', () => {
    expect(hasItems({ carrot: 4, egg: 1 }, { carrot: 3, egg: 1 })).toBe(true);
  });

  it('is false when the bag is short of anything', () => {
    expect(hasItems({ carrot: 4 }, { carrot: 3, egg: 1 })).toBe(false);
  });
});

describe('countItems', () => {
  it('counts every unit in the bag', () => {
    expect(countItems({ carrot: 2, egg: 3 })).toBe(5);
  });
});

describe('instantSellPrice', () => {
  it('pays 70% of the usual price, rounded to whole coins', () => {
    expect(instantSellPrice('carrot')).toBe(28);
    expect(instantSellPrice('tomato')).toBe(46);
  });

  it('rounds a half coin up even where 0.7 is inexact in floating point', () => {
    // 45 × 0.7 evaluates to 31.499999999999996
    expect(instantSellPrice('egg')).toBe(32);
  });
});
