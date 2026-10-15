import { describe, expect, it } from 'vitest';
import { Letter } from '@/types/game';
import { FESTIVALS } from '@/config/festivals';
import { deliverLetters, festivalLetter, thankYouLetter } from '@/lib/mail';

const letter = (id: string): Letter => ({ id, from: 'A', title: 'T', body: '', day: 1, read: false });

describe('deliverLetters', () => {
  it('puts new letters on top', () => {
    expect(deliverLetters([letter('old')], [letter('new')]).map((l) => l.id)).toEqual(['new', 'old']);
  });

  it('never delivers the same letter twice', () => {
    const box = [letter('festival_tet')];
    expect(deliverLetters(box, [letter('festival_tet')])).toEqual(box);
  });

  it('keeps only the 30 newest letters', () => {
    const box = Array.from({ length: 30 }, (_, i) => letter(`l${i}`));
    const after = deliverLetters(box, [letter('new')]);
    expect(after).toHaveLength(30);
    expect(after[0].id).toBe('new');
    expect(after.map((l) => l.id)).not.toContain('l29');
  });
});

describe('festivalLetter', () => {
  it("comes with 10 of the festival's tokens", () => {
    expect(festivalLetter(FESTIVALS.christmas, 4).gift).toEqual({ festival: 'christmas', tokens: 10 });
  });
});

describe('thankYouLetter', () => {
  const gifts = Array.from({ length: 80 }, (_, i) => thankYouLetter('Linh Chi 🌸', i + 1).gift!);

  it('is the same letter whenever the day is replayed', () => {
    expect(thankYouLetter('Linh Chi 🌸', 7)).toEqual(thankYouLetter('Linh Chi 🌸', 7));
  });

  it('comes from the resident who placed the order', () => {
    expect(thankYouLetter('Minh Quân ⚡', 3).from).toBe('Minh Quân ⚡');
  });

  it('holds 30–60 gold, 2–3 of one crop or 1–2 diamonds', () => {
    gifts.forEach((gift) => {
      const kinds = [gift.gold, gift.items, gift.gems].filter((g) => g !== undefined);
      expect(kinds).toHaveLength(1);
      if (gift.gold !== undefined) {
        expect(gift.gold).toBeGreaterThanOrEqual(30);
        expect(gift.gold).toBeLessThanOrEqual(60);
      }
      if (gift.gems !== undefined) expect([1, 2]).toContain(gift.gems);
      if (gift.items) {
        const entries = Object.entries(gift.items);
        expect(entries).toHaveLength(1);
        expect(['carrot', 'wheat', 'tomato', 'pumpkin']).toContain(entries[0][0]);
        expect([2, 3]).toContain(entries[0][1]);
      }
    });
    expect(gifts.some((g) => g.gold !== undefined)).toBe(true);
    expect(gifts.some((g) => g.items !== undefined)).toBe(true);
    expect(gifts.some((g) => g.gems !== undefined)).toBe(true);
  });
});
