import { afterEach, describe, expect, it } from 'vitest';
import { seasonOf } from '@/lib/seasons';
import {
  CALENDAR_START,
  calendarDate,
  dayLabel,
  dayStartMs,
  formatDuration,
  gameDayAt,
  msUntilNextDay,
  now,
  resetClock,
  skipClock,
  syncServerTime,
  todayKey,
} from './clock';

// Saturday 17/10/2026, 10:00 in Vietnam (03:00 UTC)
const SAT_MORNING = Date.UTC(2026, 9, 17, 3, 0);

afterEach(() => resetClock());

describe('the game day', () => {
  it('turns over at midnight in Vietnam', () => {
    const midnight = Date.UTC(2026, 9, 17, 17, 0);
    expect(gameDayAt(midnight) - gameDayAt(midnight - 1000)).toBe(1);
    expect(dayStartMs(gameDayAt(midnight))).toBe(midnight);
  });

  it('counts from Monday 12/01/2026 as day 1', () => {
    expect(CALENDAR_START).toBe('2026-01-12');
    expect(gameDayAt(Date.UTC(2026, 0, 12, 5))).toBe(1);
    expect(gameDayAt(SAT_MORNING)).toBe(279);
  });

  it('goes round the seasons a week at a time, spring from Monday 19/10/2026', () => {
    const monday = gameDayAt(Date.UTC(2026, 9, 19, 3));
    expect(seasonOf(monday)).toBe('spring');
    expect(seasonOf(monday - 1)).toBe('winter');
    expect(seasonOf(monday + 7)).toBe('summer');
  });

  it('says how long until the next day', () => {
    expect(msUntilNextDay(SAT_MORNING)).toBe(14 * 3_600_000);
  });

  it('names the date in Vietnam', () => {
    expect(todayKey(SAT_MORNING)).toBe('2026-10-17');
    expect(todayKey(Date.UTC(2026, 9, 17, 18))).toBe('2026-10-18');
    expect(dayLabel(gameDayAt(SAT_MORNING))).toBe('Thứ Bảy 17/10');
    expect(dayLabel(1)).toBe('Thứ Hai 12/01');
  });

  it('gives that date as a local Date for helpers that read local date fields', () => {
    const d = calendarDate(Date.UTC(2026, 9, 17, 18));
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 18]);
  });
});

describe('formatDuration', () => {
  it('rounds up to whole minutes, in hours and minutes', () => {
    expect(formatDuration(30_000)).toBe('dưới 1 phút');
    expect(formatDuration(45 * 60_000)).toBe('45 phút');
    expect(formatDuration(60 * 60_000)).toBe('1 giờ');
    expect(formatDuration((2 * 60 + 14) * 60_000 + 1)).toBe('2 giờ 15 phút');
  });
});

describe('server time', () => {
  const reply = (body: unknown, ok = true) => async () => ({ ok, json: async () => body }) as Response;

  it('follows the server once it has answered', async () => {
    const server = Date.now() + 3_600_000;
    expect(await syncServerTime(reply({ now: server }))).toBe(true);
    expect(Math.abs(now() - server)).toBeLessThan(1000);
  });

  it('keeps the device time when the server is out of reach or answers nonsense', async () => {
    expect(
      await syncServerTime(async () => {
        throw new Error('offline');
      })
    ).toBe(false);
    expect(await syncServerTime(reply({ now: 'soon' }))).toBe(false);
    expect(await syncServerTime(reply({ now: 1 }, false))).toBe(false);
    expect(Math.abs(now() - Date.now())).toBeLessThan(1000);
  });

  it('can be wound forward for testing', () => {
    skipClock(3_600_000);
    expect(Math.abs(now() - Date.now() - 3_600_000)).toBeLessThan(1000);
  });
});
