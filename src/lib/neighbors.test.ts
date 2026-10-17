import { describe, expect, it } from 'vitest';
import { NeighborVisit, TileData } from '@/types/game';
import { createEmptyGrid } from '@/lib/newGame';
import { MAX_VISIT_GOLD, visitLetter, visitsFromRows, vnDateKey, waterForNeighbors } from '@/lib/neighbors';

const visit = (id: number, kind: NeighborVisit['kind'], visitorName = `Người ${id}`): NeighborVisit => ({
  id,
  visitorId: `u${id}`,
  visitorName,
  kind,
});

describe('visitsFromRows', () => {
  it('reads the rows oldest first and leaves out anything malformed', () => {
    const rows = [
      { id: 7, visitor_id: 'u2', visitor_name: 'Lan', kind: 'like' },
      { id: 3, visitor_id: 'u1', visitor_name: 'Minh', kind: 'water' },
      { id: 9, visitor_id: 'u3', visitor_name: 'Hacker', kind: 'steal' },
      { id: '10', visitor_id: 'u4', visitor_name: 'Nam', kind: 'like' },
      { id: 11, visitor_id: 'u5', visitor_name: '', kind: 'like' },
    ];
    expect(visitsFromRows(rows)).toEqual([
      { id: 3, visitorId: 'u1', visitorName: 'Minh', kind: 'water' },
      { id: 7, visitorId: 'u2', visitorName: 'Lan', kind: 'like' },
      { id: 11, visitorId: 'u5', visitorName: 'Nông Dân', kind: 'like' },
    ]);
  });

  it('reads when each visit was made', () => {
    const rows = [{ id: 4, visitor_id: 'u1', visitor_name: 'Minh', kind: 'water', created_at: '2026-10-17T03:00:00Z' }];
    expect(visitsFromRows(rows)[0].at).toBe(Date.UTC(2026, 9, 17, 3));
  });
});

describe('vnDateKey', () => {
  it('goes by the date in Vietnam, as the table does', () => {
    // 18:00 UTC is already 01:00 the next morning in Vietnam
    expect(vnDateKey(new Date('2027-02-05T18:00:00Z'))).toBe('2027-02-06');
    expect(vnDateKey(new Date('2027-02-05T16:59:00Z'))).toBe('2027-02-05');
  });
});

describe('waterForNeighbors', () => {
  const field = (): TileData[] =>
    createEmptyGrid().map((t, i) => {
      if (i >= 8) return t;
      // Dry and growing, except: one already watered, one ripe, one under a sprinkler
      return {
        ...t,
        state: 'planted',
        crop: 'carrot',
        stage: i === 1 ? 3 : 1,
        watered: i === 0,
        sprinkler: i === 2,
      };
    });

  it('waters dry growing tiles, up to the count', () => {
    const { tiles, watered } = waterForNeighbors(field(), 4, 0);
    expect(watered).toBe(4);
    expect(tiles.slice(0, 8).map((t) => t.watered)).toEqual([true, false, false, true, true, true, true, false]);
  });

  it('waters what there is, and leaves a field with nothing dry as it was', () => {
    expect(waterForNeighbors(field(), 20, 0).watered).toBe(5);
    const wet = field().map((t) => ({ ...t, watered: true }));
    expect(waterForNeighbors(wet, 4, 0).tiles).toBe(wet);
  });
});

describe('visitLetter', () => {
  it('says who watered and who liked, with gold for every visit', () => {
    const letter = visitLetter([visit(4, 'water', 'Lan'), visit(5, 'like', 'Minh'), visit(6, 'like', 'Lan')], 12, 4);
    expect(letter.id).toBe('visits_6');
    expect(letter.day).toBe(12);
    expect(letter.body).toContain('💧 Lan đã ghé tưới giúp 4 ô đất đang khô');
    expect(letter.body).toContain('❤️ Minh, Lan đã thả tim');
    expect(letter.gift).toEqual({ gold: 30 });
  });

  it('caps the gold however many come by', () => {
    const crowd = Array.from({ length: 40 }, (_, i) => visit(i + 1, 'like'));
    expect(visitLetter(crowd, 3, 0).gift).toEqual({ gold: MAX_VISIT_GOLD });
    expect(visitLetter(crowd, 3, 0).body).toContain('và 37 người khác');
  });
});
