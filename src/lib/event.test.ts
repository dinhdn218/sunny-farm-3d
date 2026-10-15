import { describe, expect, it } from 'vitest';
import { eventDaysLeft, isEventActive } from '@/lib/event';

describe('isEventActive', () => {
  it('runs from 15 October through 2 November', () => {
    expect(isEventActive('2026-10-14')).toBe(false);
    expect(isEventActive('2026-10-15')).toBe(true);
    expect(isEventActive('2026-10-31')).toBe(true);
    expect(isEventActive('2026-11-02')).toBe(true);
    expect(isEventActive('2026-11-03')).toBe(false);
  });
});

describe('eventDaysLeft', () => {
  it('counts the days still to play, today included', () => {
    expect(eventDaysLeft('2026-10-31')).toBe(3);
    expect(eventDaysLeft('2026-11-02')).toBe(1);
  });
});
