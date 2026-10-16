import { describe, expect, it } from 'vitest';
import { ItemId } from '@/types/game';
import { RESIDENTS } from '@/config/npcs';
import { REACTION_POINTS, giftReaction, hearts } from '@/lib/friendship';

describe('hearts', () => {
  it('fills a heart at 10, 25, 45, 70 and 100 friendship', () => {
    expect([0, 9, 10, 24, 25, 44, 45, 69, 70, 99, 100].map(hearts)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });
});

describe('giftReaction', () => {
  const linh = RESIDENTS.linh_chi;
  const all = [...linh.loves, ...linh.likes, ...linh.hates];
  const other = (['carrot', 'wheat', 'egg', 'shell', 'anchovy'] as ItemId[]).find((id) => !all.includes(id))!;

  it("goes by the resident's taste", () => {
    expect(giftReaction(linh, linh.loves[0])).toBe('love');
    expect(giftReaction(linh, linh.likes[0])).toBe('like');
    expect(giftReaction(linh, linh.hates[0])).toBe('hate');
    expect(giftReaction(linh, other)).toBe('neutral');
  });

  it('is worth more the more they like it', () => {
    expect(REACTION_POINTS.love).toBeGreaterThan(REACTION_POINTS.like);
    expect(REACTION_POINTS.like).toBeGreaterThan(REACTION_POINTS.neutral);
    expect(REACTION_POINTS.neutral).toBeGreaterThan(0);
    expect(REACTION_POINTS.hate).toBeLessThan(0);
  });
});
