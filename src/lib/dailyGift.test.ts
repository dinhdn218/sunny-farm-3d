import { describe, expect, it } from 'vitest';
import { giftDay, localDateKey } from '@/lib/dailyGift';

describe('localDateKey', () => {
  it("writes the device's calendar date", () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('giftDay', () => {
  it('starts the streak at day 1', () => {
    expect(giftDay(null, 0, '2026-10-15')).toBe(1);
  });

  it('continues the streak from yesterday', () => {
    expect(giftDay('2026-10-14', 3, '2026-10-15')).toBe(4);
  });

  it('continues across the end of a month', () => {
    expect(giftDay('2026-10-31', 2, '2026-11-01')).toBe(3);
  });

  it('gives nothing more once today is claimed', () => {
    expect(giftDay('2026-10-15', 3, '2026-10-15')).toBeNull();
  });

  it('starts over after a missed day', () => {
    expect(giftDay('2026-10-13', 5, '2026-10-15')).toBe(1);
  });

  it('starts a new round after day 7', () => {
    expect(giftDay('2026-10-14', 7, '2026-10-15')).toBe(1);
  });
});
