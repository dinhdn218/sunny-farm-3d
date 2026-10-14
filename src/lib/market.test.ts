import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_LIST } from '@/config/items';
import { marketDay, marketPrice } from '@/lib/market';

describe('marketDay', () => {
  it('keeps the same prices all day', () => {
    expect(marketDay(7)).toEqual(marketDay(7));
  });

  it('changes prices from one day to the next', () => {
    expect(marketDay(7).multipliers).not.toEqual(marketDay(8).multipliers);
  });

  it('has one sought-after item, one glutted item and modest swings for the rest', () => {
    for (let day = 1; day <= 60; day++) {
      const { multipliers, hot, glut } = marketDay(day);
      expect(hot).not.toBe(glut);
      expect(multipliers[hot]).toBeGreaterThanOrEqual(1.4);
      expect(multipliers[hot]).toBeLessThanOrEqual(1.6);
      expect(multipliers[glut]).toBeGreaterThanOrEqual(0.6);
      expect(multipliers[glut]).toBeLessThanOrEqual(0.7);
      ITEM_LIST.filter((i) => i.id !== hot && i.id !== glut).forEach((i) => {
        expect(multipliers[i.id]).toBeGreaterThanOrEqual(0.8);
        expect(multipliers[i.id]).toBeLessThanOrEqual(1.2);
      });
    }
  });

  it('does not always want the same item', () => {
    const hotItems = new Set(Array.from({ length: 30 }, (_, i) => marketDay(i + 1).hot));
    expect(hotItems.size).toBeGreaterThan(3);
  });
});

describe('marketPrice', () => {
  it('pays far more for the sought-after item and far less for the glutted one', () => {
    const { hot, glut } = marketDay(5);
    expect(marketPrice(hot, 5)).toBeGreaterThanOrEqual(Math.round(ITEMS[hot].sellPrice * 1.4));
    expect(marketPrice(glut, 5)).toBeLessThanOrEqual(Math.round(ITEMS[glut].sellPrice * 0.7));
  });

  it('pays whole gold coins', () => {
    ITEM_LIST.forEach((i) => expect(Number.isInteger(marketPrice(i.id, 3))).toBe(true));
  });
});
