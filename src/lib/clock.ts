// One clock for everyone: the server's time, and the day and date as they are in Vietnam
export const DAY_MS = 86_400_000;
// Vietnam is UTC+7 all year
export const VN_OFFSET_MS = 7 * 3_600_000;
// Day 1 of the game's calendar, a Monday: its week is spring, as is every fourth week after it
// (the week of Monday 19/10/2026 is 40 weeks later)
export const CALENDAR_START = '2026-01-12';
// An answer slower than this says little about the time
const MAX_ROUND_TRIP_MS = 5000;

const [startYear, startMonth, startDate] = CALENDAR_START.split('-').map(Number);
const START_INDEX = Date.UTC(startYear, startMonth - 1, startDate) / DAY_MS;

let serverOffset = 0;
let skipped = 0;

// Now by the server's clock (the device's until the server has answered)
export const now = () => Date.now() + serverOffset + skipped;

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

// Asks the game's server for the time; the last good answer stays in use
export async function syncServerTime(fetcher: Fetcher = (input, init) => fetch(input, init)): Promise<boolean> {
  try {
    const sent = Date.now();
    const res = await fetcher('/api/time', { cache: 'no-store' });
    const back = Date.now();
    if (!res.ok || back - sent > MAX_ROUND_TRIP_MS) return false;
    const body = (await res.json()) as { now?: unknown };
    if (typeof body.now !== 'number' || !Number.isFinite(body.now)) return false;
    serverOffset = body.now - (sent + back) / 2;
    return true;
  } catch {
    return false;
  }
}

// Winds the clock forward (development and tests only)
export function skipClock(ms: number) {
  skipped += ms;
}

export function resetClock() {
  serverOffset = 0;
  skipped = 0;
}

const vnDayIndex = (ms: number) => Math.floor((ms + VN_OFFSET_MS) / DAY_MS);

export const gameDayAt = (ms: number) => vnDayIndex(ms) - START_INDEX + 1;

// Midnight in Vietnam as the day begins
export const dayStartMs = (day: number) => (START_INDEX + day - 1) * DAY_MS - VN_OFFSET_MS;

export const msUntilNextDay = (ms: number) => dayStartMs(gameDayAt(ms) + 1) - ms;

// The date in Vietnam, e.g. 2026-10-17
export const todayKey = (ms: number = now()) => new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);

// The same date as a Date at local midnight, for helpers that read local date fields (the leaderboard's week)
export function calendarDate(ms: number = now()) {
  const [year, month, date] = todayKey(ms).split('-').map(Number);
  return new Date(year, month - 1, date);
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad = (n: number) => String(n).padStart(2, '0');

// "Thứ Bảy 17/10"
export function dayLabel(day: number) {
  const date = new Date(dayStartMs(day) + VN_OFFSET_MS);
  return `${WEEKDAYS[date.getUTCDay()]} ${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`;
}

// "2 giờ 15 phút", "45 phút", "dưới 1 phút" (rounded up to the minute)
export function formatDuration(ms: number) {
  if (ms < 60_000) return 'dưới 1 phút';
  const minutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} phút`;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}
