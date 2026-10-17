# Thời gian thực — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cả game chạy theo một đồng hồ chung (ngày thật theo giờ Việt Nam, giờ lấy từ server): cây lớn theo giờ thật,
thể lực tự hồi, sang ngày tự động lúc 0 giờ, bỏ nút ngủ.

**Architecture:** `src/lib/clock.ts` là đồng hồ duy nhất (hàm thuần theo mốc ms + hỏi giờ `/api/time`). `src/lib/growth.ts`
(thuần) tính lứa cây từ mốc thời gian lưu trên ô (`growMs`, `midAt`, `readyAt`); `stage` vẫn lưu trong save và được cập nhật
bởi `tickClock()` mỗi 5 giây (hook `useGameClock` ở `src/lib/gameClock.ts`). `src/lib/dayCycle.ts` (thuần) thay phần "qua
đêm" của `nextDay` bằng `advanceDays(save, today, now)`; store gọi nó qua `startNewDay` khi `tickClock` thấy sang ngày. Thể
lực là `energy` + `energyAt` (`settleEnergy`/`spendEnergy` trong `src/lib/food.ts`). Save lên v6 (`fromV5`).

**Tech Stack:** Next.js 14 (App Router, route handler), React 18, @react-three/fiber 8, zustand 5 (persist), vitest 3;
Playwright-core + Chrome hệ thống để kiểm chứng.

**Spec:** `docs/superpowers/specs/2026-10-17-realtime-farming-design.md`

## Global Constraints

- 1 ngày trong game = 1 ngày thật, sang ngày lúc 0 giờ giờ Việt Nam (UTC+7). `CALENDAR_START = '2026-01-12'` (thứ Hai) là Ngày 1; mùa 7 ngày (`SEASON_DAYS`); tuần bắt đầu thứ Hai 19/10/2026 là Mùa Xuân.
- Giờ: `GET /api/time` → `{ now }`, `Cache-Control: no-store`; hỏi lại mỗi 5 phút, khi tab hiện lại, khi có mạng lại; bỏ câu trả lời nếu đi về > 5 giây; lần đầu chờ tối đa 3 giây; `tickClock()` mỗi 5 giây.
- Vắng nhiều ngày: tính bù tối đa 7 ngày (`MAX_CATCH_UP_DAYS`); thùng giao hàng chỉ bán một lần.
- Thời gian lớn (phút): Cà Rốt 60, Lúa Mì 90, Bắp 120, Cải Bắp 300, Dâu Tây 300 (thu lại 150), Cà Chua 360 (thu lại 180), Dưa Hấu 720, Bí Ngô 1440.
- Giá bán mới: Cải Bắp 115, Dưa Hấu 220, Bí Ngô 300; Bánh Bí Ngô 610, Đá Bào Dưa Hấu 325, Dưa Bắp Cải 340 (giữ tỉ lệ 1,4–1,65 lần nguyên liệu mà `workshop.test.ts` kiểm).
- Người mới: 5 cây đầu tiên chín sau 5 phút (`fastCropsLeft = 5`); save cũ có 0.
- Thể lực: cứ 3 phút hồi 1 điểm (`ENERGY_REGEN_MS`), tối đa `maxEnergyFor(buff, day)`.
- Tưới tự động: Bình Phun 8 ô xung quanh, Mèo Máy 6 ô mỗi sáng, hàng xóm 4 ô mỗi lượt tưới, mưa/giông/tuyết mọi ô.
- Không tự commit: chỉ commit (thẳng lên `main`) khi người dùng đồng ý ở Task 10; hỏi trước khi push.
- Không chạy `next build` trong repo (dev server :3000 dùng chung `.next`): build trong bản sao ở scratchpad.
- Đồ hoạ giữ nguyên; giọt nước 💧 là khối tĩnh cùng vật liệu Lambert với đất, được StaticMerge gộp vào lô đất (không thêm lần vẽ).
- Code theo phong cách repo: comment tiếng Anh ngắn kiểu "vì sao", nháy đơn; giữ CRLF khi sửa file có sẵn (dùng Edit, không dùng `sed -i`).
- `tsconfig` không đặt `target`: không spread/`for…of` trên `Map`/`Set` (dùng `forEach`, `Array.from`).
- Kiểm tra sau mỗi task: `npx vitest run` (toàn bộ) và `npx tsc --noEmit` đều sạch.

`SP` trong các lệnh dưới là `/c/Users/dinhd/AppData/Local/Temp/claude/d--projects-sunny-farm-3d/bd37dd9b-1e98-4421-86f2-1f9947213125/scratchpad`.

---

### Task 1: Đồng hồ chung (`clock`) và `/api/time`

**Files:**
- Create: `src/lib/clock.ts`
- Create: `src/app/api/time/route.ts`
- Test: `src/lib/clock.test.ts`, `src/app/api/time/route.test.ts`

**Interfaces:**
- Produces: `DAY_MS`, `VN_OFFSET_MS`, `CALENDAR_START`; `now(): number`;
  `syncServerTime(fetcher?: (input: string, init?: RequestInit) => Promise<Response>): Promise<boolean>`;
  `skipClock(ms: number): void`; `resetClock(): void`; `gameDayAt(ms: number): number`; `dayStartMs(day: number): number`;
  `msUntilNextDay(ms: number): number`; `todayKey(ms?: number): string`; `calendarDate(ms?: number): Date`;
  `dayLabel(day: number): string`; `formatDuration(ms: number): string`; route `GET()` → `{ now: number }`.

- [ ] **Step 1: Viết test (chưa có code)** — `src/lib/clock.test.ts`

```ts
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
```

`src/app/api/time/route.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('GET /api/time', () => {
  it("answers with the server's clock, never cached", async () => {
    const res = GET();
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as { now: number };
    expect(Math.abs(body.now - Date.now())).toBeLessThan(1000);
  });
});
```

- [ ] **Step 2: Chạy test, phải hỏng**

Run: `npx vitest run src/lib/clock.test.ts src/app/api/time/route.test.ts`
Expected: FAIL (không tìm thấy `./clock`, `./route`).

- [ ] **Step 3: Viết code** — `src/lib/clock.ts`

```ts
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
```

`src/app/api/time/route.ts`:

```ts
// The server's clock, so the game's day doesn't follow a device whose clock was changed (lib/clock)
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
```

- [ ] **Step 4: Chạy test, phải qua**

Run: `npx vitest run src/lib/clock.test.ts src/app/api/time/route.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: tất cả PASS, tsc không lỗi.

---

### Task 2: Một đồng hồ cho lễ hội, quà, vòng quay, bảng xếp hạng

**Files:**
- Modify (thay `localDateKey(new Date())` → `todayKey()`, bằng script): `src/app/page.tsx`, `src/components/canvas/GameCanvas.tsx`,
  `src/components/canvas/SimulatedPlayers.tsx`, `src/components/canvas/environment/Festivals.tsx`,
  `src/components/canvas/environment/WeatherEffects.tsx`, `src/components/canvas/worlds/CasinoWorld.tsx`,
  `src/components/canvas/worlds/ParkWorld.tsx`, `src/components/hud/QuestTracker.tsx`, `src/components/hud/TopBar.tsx`,
  `src/components/hud/ZonePanel.tsx`, `src/components/hud/modals/BauCuaModal.tsx`, `src/components/hud/modals/DailyGiftModal.tsx`,
  `src/components/hud/modals/FestivalShopModal.tsx`, `src/components/hud/modals/LuckyWheelModal.tsx`,
  `src/components/hud/modals/QuestModal.tsx`, `src/components/hud/modals/WardrobeModal.tsx`, `src/lib/music.ts`,
  `src/store/useGameStore.ts`, `src/store/activities.test.ts`
- Modify (tay): `src/store/useGameStore.ts` (2 chỗ `weekKey(new Date())`, comment `runningFestival`),
  `src/components/hud/modals/LeaderboardModal.tsx`, `src/lib/supabase.ts:154`, `src/store/neighbors.test.ts:46`
- Test: `src/store/activities.test.ts`

**Interfaces:**
- Consumes: `todayKey`, `calendarDate`, `skipClock`, `resetClock`, `DAY_MS` (Task 1).

- [ ] **Step 1: Viết test hỏng** — thêm vào cuối `describe('lucky wheel', …)` trong `src/store/activities.test.ts`
  (thêm `import { DAY_MS, resetClock, skipClock } from '@/lib/clock';` ở đầu file):

```ts
  it('follows the game clock, not the device date', () => {
    useGameStore.setState({ lastWheelDate: null });
    store().spinLuckyWheel();
    expect(store().spinLuckyWheel()).toBeNull();
    skipClock(DAY_MS);
    expect(store().spinLuckyWheel()).not.toBeNull();
    resetClock();
  });
```

- [ ] **Step 2: Chạy, phải hỏng**

Run: `npx vitest run src/store/activities.test.ts`
Expected: FAIL ở test mới (store còn dùng ngày của máy nên lần quay sau khi tua vẫn `null`).

- [ ] **Step 3: Đổi mọi `localDateKey(new Date())` bằng script** — tạo `$SP/today-key.mjs`:

```js
// Swaps the device's date for the game clock's: localDateKey(new Date()) -> todayKey() (lib/clock), fixing imports.
// Run from the repo root. Keeps each file's line endings.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync('git grep -l "localDateKey(new Date())" -- src', { encoding: 'utf8' }).trim().split(/\r?\n/);
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split('localDateKey(new Date())').join('todayKey()').split(eol);
  const at = lines.findIndex((l) => l.startsWith('import ') && l.includes("'@/lib/dailyGift'"));
  if (at < 0) throw new Error(`${file}: no import from @/lib/dailyGift`);
  let insertAfter = at;
  if (!lines.some((l, i) => i !== at && l.includes('localDateKey'))) {
    const names = lines[at]
      .slice(lines[at].indexOf('{') + 1, lines[at].indexOf('}'))
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'localDateKey');
    if (names.length) {
      lines[at] = lines[at].replace(/\{[^}]*\}/, `{ ${names.join(', ')} }`);
    } else {
      lines.splice(at, 1);
      insertAfter = at - 1;
    }
  }
  lines.splice(insertAfter + 1, 0, "import { todayKey } from '@/lib/clock';");
  writeFileSync(file, lines.join(eol));
  console.log('updated', file);
}
```

Run: `node $SP/today-key.mjs` (từ thư mục repo)
Expected: in ra 19 dòng `updated …`; `git grep -n "localDateKey(new Date())" -- src` không còn kết quả.

- [ ] **Step 4: Sửa tay các chỗ còn lại**

`src/store/useGameStore.ts`:
- Dòng import `import { todayKey } from '@/lib/clock';` (script vừa thêm) đổi thành `import { calendarDate, todayKey } from '@/lib/clock';`.
- Comment trên `runningFestival`: `// Festivals run by the device's calendar date` → `// Festivals run by the date in Vietnam (lib/clock)`.
- Hai chỗ `weekKey(new Date())` (trong `receiveNeighborVisits` và `incrementQuest`) → `weekKey(calendarDate())`.

`src/components/hud/modals/LeaderboardModal.tsx`: thêm `import { calendarDate } from '@/lib/clock';`, rồi

```ts
  const now = new Date();
  const week = weekKey(now);
```
→
```ts
  // The week by the date in Vietnam, as the store counts it
  const today = calendarDate();
  const week = weekKey(today);
```
và `weekDaysLeft(now)` → `weekDaysLeft(today)`.

`src/lib/supabase.ts:154`: `.eq('visit_date', vnDateKey(new Date()));` → `.eq('visit_date', todayKey());` (thêm
`import { todayKey } from '@/lib/clock';`; bỏ `vnDateKey` khỏi import nếu không còn dùng trong file).

`src/store/neighbors.test.ts`: `weekKey(new Date())` → `weekKey(calendarDate())`, thêm `import { calendarDate } from '@/lib/clock';`.

- [ ] **Step 5: Chạy toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS (kể cả test vòng quay mới), tsc sạch.

---

### Task 3: Thời gian lớn, giá mới và `growth`

**Files:**
- Modify: `src/types/game.ts` (`CropConfig`, `TileData`)
- Modify: `src/config/crops.ts`, `src/config/items.ts`
- Create: `src/lib/growth.ts`
- Test: `src/lib/growth.test.ts`; sửa `src/lib/orders.test.ts`

**Interfaces:**
- Consumes: `formatDuration` (Task 1).
- Produces: `CropConfig.growMinutes: number`, `CropConfig.regrowMinutes?: number`;
  `TileData.growMs?: number`, `TileData.midAt?: number | null`, `TileData.readyAt?: number | null`;
  `FAST_CROP_MS`, `FAST_CROPS_FOR_NEW_PLAYERS`; `growMsOf(crop)`, `regrowMsOf(crop)`, `cycleMs(tile)`, `needsWater(tile)`,
  `canWater(tile)`, `waterTile(tile, at)`, `plantTile(tile, crop, at, fast?)`, `harvestTile(tile)`, `stageAt(tile, now)`,
  `msLeft(tile, now): number | null`, `refreshStages(tiles, now): TileData[]`,
  `autoWater(tiles, at, wet): { tiles: TileData[]; watered: number }`, `cropStatus(tile, now): string`.

- [ ] **Step 1: Thêm kiểu** — `src/types/game.ts`

Trong `CropConfig`, ngay dưới `daysPerStage: number;` (giữ `daysPerStage` tới Task 4):

```ts
  // Minutes from watering to ripe, and for crops that grow back, from one picking to the next
  growMinutes: number;
  regrowMinutes?: number;
```

Trong `TileData`, ngay dưới `daysWatered: number;`:

```ts
  // How long the crop's current cycle takes once watered (ms), and when it reaches stage 2 and ripens
  // (ms since 1970); `readyAt` stays null until the crop is watered (lib/growth)
  growMs?: number;
  midAt?: number | null;
  readyAt?: number | null;
```

- [ ] **Step 2: Thời gian và giá** — `src/config/crops.ts`: thêm `growMinutes`/`regrowMinutes`, đổi giá và mô tả (bỏ số ngày):

| id | thêm | `sellPrice` | `description` |
|---|---|---|---|
| carrot | `growMinutes: 60,` | 40 | `'Lớn nhanh, dễ trồng.'` |
| wheat | `growMinutes: 90,` | 70 | `'Bông lúa vàng óng.'` |
| tomato | `growMinutes: 360, regrowMinutes: 180,` | 65 | `'Thu hoạch nhiều đợt không mất gốc!'` |
| pumpkin | `growMinutes: 1440,` | 210 → **300** | `'Quả khổng lồ bán giá cực cao.'` |
| strawberry | `growMinutes: 300, regrowMinutes: 150,` | 55 | `'Quả đỏ mọng, hái xong vẫn giữ gốc!'` |
| watermelon | `growMinutes: 720,` | 190 → **220** | `'Quả to mọng nước giải nhiệt.'` |
| corn | `growMinutes: 120,` | 80 | `'Bắp vàng hạt ngọt.'` |
| cabbage | `growMinutes: 300,` | 85 → **115** | `'Cải xanh cuốn chặt, giòn ngọt.'` |

`src/config/items.ts`: `pumpkin_pie` 480 → **610**, `watermelon_ice` 280 → **325**, `pickled_cabbage` 250 → **340**.

`src/lib/orders.test.ts`:
- `expect(orderReward({ pumpkin_pie: 2, milk: 2 })).toEqual({ rewardGold: 1920, rewardGems: 3 });` →
  `expect(orderReward({ pumpkin_pie: 2, milk: 2 })).toEqual({ rewardGold: 2310, rewardGems: 3 });`
  ((610×2 + 160×2) × 150% = 2310).
- Bảng giá trong test 'pays more than the shipping bin would…': `pumpkin: 300`, `watermelon: 220`, `cabbage: 115`.

- [ ] **Step 3: Viết test hỏng** — `src/lib/growth.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { TileData } from '@/types/game';
import { createEmptyGrid } from '@/lib/newGame';
import {
  FAST_CROP_MS,
  autoWater,
  canWater,
  cropStatus,
  harvestTile,
  msLeft,
  needsWater,
  plantTile,
  refreshStages,
  stageAt,
  waterTile,
} from './growth';

const HOUR = 3_600_000;
const T = Date.UTC(2026, 9, 20, 3); // 10:00 in Vietnam
const tilled = (over: Partial<TileData> = {}): TileData => ({ ...createEmptyGrid()[0], state: 'tilled', ...over });

describe('a crop on real time', () => {
  it('waits for water, then ripens after its time: carrots in an hour', () => {
    const sown = plantTile(tilled(), 'carrot', T);
    expect(needsWater(sown)).toBe(true);
    expect(stageAt(sown, T + 5 * HOUR)).toBe(1);
    const wet = waterTile(sown, T);
    expect(msLeft(wet, T)).toBe(HOUR);
    expect(stageAt(wet, T + HOUR / 2 - 1)).toBe(1);
    expect(stageAt(wet, T + HOUR / 2)).toBe(2);
    expect(stageAt(wet, T + HOUR)).toBe(3);
  });

  it('starts at once on soil watered before sowing', () => {
    const sown = plantTile(waterTile(tilled(), T), 'pumpkin', T + HOUR);
    expect(msLeft(sown, T + HOUR)).toBe(24 * HOUR);
  });

  it('grows back after picking, from stage 2, once watered again', () => {
    const tomato = waterTile(plantTile(tilled(), 'tomato', T), T);
    const picked = harvestTile({ ...tomato, stage: 3 });
    expect(picked).toMatchObject({ state: 'planted', crop: 'tomato', stage: 2, watered: false, readyAt: null });
    const again = waterTile(picked, T);
    expect(msLeft(again, T)).toBe(3 * HOUR);
    expect(stageAt(again, T + 3 * HOUR)).toBe(3);
  });

  it('leaves dry tilled soil after picking a crop that does not grow back', () => {
    const corn = { ...waterTile(plantTile(tilled(), 'corn', T), T), stage: 3, fertilized: true };
    expect(harvestTile(corn)).toMatchObject({ state: 'tilled', crop: null, stage: 0, watered: false, fertilized: false, readyAt: null });
  });

  it("ripens a new player's first crops in five minutes", () => {
    expect(msLeft(waterTile(plantTile(tilled(), 'pumpkin', T, true), T), T)).toBe(FAST_CROP_MS);
  });

  it('never goes back a stage, even if the clock does', () => {
    const [ripe] = refreshStages([waterTile(plantTile(tilled(), 'carrot', T), T)], T + 2 * HOUR);
    expect(ripe.stage).toBe(3);
    expect(stageAt(ripe, T)).toBe(3);
  });

  it('keeps the same array when no crop moved on', () => {
    const tiles = [waterTile(plantTile(tilled(), 'carrot', T), T)];
    expect(refreshStages(tiles, T + 60_000)).toBe(tiles);
  });

  it('starts a crop that was watered before real time came in', () => {
    const old: TileData = { ...tilled(), state: 'planted', crop: 'wheat', stage: 1, watered: true };
    const [started] = refreshStages([old], T);
    expect(msLeft(started, T)).toBe(1.5 * HOUR);
  });

  it('does not water what is growing, ripe or a sprinkler', () => {
    const growing = waterTile(plantTile(tilled(), 'carrot', T), T);
    expect(canWater(growing)).toBe(false);
    expect(canWater({ ...growing, stage: 3, watered: false })).toBe(false);
    expect(canWater(tilled({ sprinkler: true }))).toBe(false);
    expect(canWater(tilled())).toBe(true);
  });

  it('says what a crop needs', () => {
    const sown = plantTile(tilled(), 'carrot', T);
    expect(cropStatus(sown, T)).toBe('💧 Cần tưới để cây bắt đầu lớn');
    expect(cropStatus(waterTile(sown, T), T + 15 * 60_000)).toBe('⏳ Còn 45 phút');
    expect(cropStatus({ ...sown, stage: 3 }, T)).toBe('✨ ĐÃ CHÍN! Click để thu hoạch!');
  });
});

describe('watering by itself', () => {
  const field = () =>
    createEmptyGrid().map((t) =>
      t.id === '5-5'
        ? { ...t, sprinkler: true }
        : t.id === '5-6' || t.id === '9-9'
          ? { ...t, state: 'planted' as const, crop: 'carrot' as const, stage: 1 }
          : t
    );

  it('a sprinkler waters the dry crops around it', () => {
    const { tiles, watered } = autoWater(field(), T, false);
    expect(watered).toBe(1);
    expect(tiles.find((t) => t.id === '5-6')).toMatchObject({ watered: true, readyAt: T + HOUR });
    expect(tiles.find((t) => t.id === '9-9')?.watered).toBe(false);
  });

  it('rain waters every dry worked tile', () => {
    expect(autoWater(field(), T, true).watered).toBe(2);
  });

  it('leaves the field as it was when nothing needed water', () => {
    const tiles = createEmptyGrid();
    expect(autoWater(tiles, T, true).tiles).toBe(tiles);
  });
});
```

- [ ] **Step 4: Chạy, phải hỏng**

Run: `npx vitest run src/lib/growth.test.ts`
Expected: FAIL (không tìm thấy `./growth`).

- [ ] **Step 5: Viết code** — `src/lib/growth.ts`

```ts
import { CropId, TileData } from '@/types/game';
import { CROPS } from '@/config/crops';
import { formatDuration } from '@/lib/clock';

// A new player's first crops ripen this fast, so the first harvest comes in the first session
export const FAST_CROP_MS = 5 * 60_000;
export const FAST_CROPS_FOR_NEW_PLAYERS = 5;

const MINUTE = 60_000;

export const growMsOf = (crop: CropId) => CROPS[crop].growMinutes * MINUTE;
export const regrowMsOf = (crop: CropId) => (CROPS[crop].regrowMinutes ?? CROPS[crop].growMinutes / 2) * MINUTE;

// How long the tile's crop needs once watered; crops from before real time have no `growMs`
export function cycleMs(tile: TileData) {
  if (tile.growMs) return tile.growMs;
  if (!tile.crop) return 0;
  if (tile.stage < 2) return growMsOf(tile.crop);
  return CROPS[tile.crop].regrow ? regrowMsOf(tile.crop) : growMsOf(tile.crop) / 2;
}

// A crop waiting for water (the field shows a drop over it)
export const needsWater = (t: TileData) => t.state === 'planted' && !!t.crop && t.stage < 3 && !t.watered;

// Worked soil still dry: what the watering can, a sprinkler, the rain or a pet waters
export const canWater = (t: TileData) =>
  !t.sprinkler && t.state !== 'empty' && !t.watered && !(t.state === 'planted' && t.stage >= 3);

const startGrowing = (tile: TileData, at: number): TileData => {
  const ms = cycleMs(tile);
  return { ...tile, watered: true, growMs: ms, readyAt: at + ms, midAt: tile.stage < 2 ? at + ms / 2 : null };
};

// Water at `at`: the soil is wet, and a crop waiting for it starts growing
export function waterTile(tile: TileData, at: number): TileData {
  if (!canWater(tile)) return tile;
  return tile.state === 'planted' && tile.crop ? startGrowing(tile, at) : { ...tile, watered: true };
}

// Sow on tilled soil; on soil already wet the crop starts growing at once
export function plantTile(tile: TileData, crop: CropId, at: number, fast = false): TileData {
  const sown: TileData = {
    ...tile,
    state: 'planted',
    crop,
    stage: 1,
    growMs: fast ? FAST_CROP_MS : growMsOf(crop),
    readyAt: null,
    midAt: null,
  };
  return tile.watered ? startGrowing(sown, at) : sown;
}

// After picking: tilled soil again, or a plant that grows back once watered
export function harvestTile(tile: TileData): TileData {
  if (tile.crop && CROPS[tile.crop].regrow) {
    return { ...tile, stage: 2, watered: false, fertilized: false, growMs: regrowMsOf(tile.crop), readyAt: null, midAt: null };
  }
  return { ...tile, state: 'tilled', crop: null, stage: 0, watered: false, fertilized: false, growMs: undefined, readyAt: null, midAt: null };
}

// The stage reached by `now`, never lower than the one stored
export function stageAt(tile: TileData, now: number) {
  if (tile.state !== 'planted' || tile.readyAt == null) return tile.stage;
  if (now >= tile.readyAt) return 3;
  if (tile.midAt != null && now >= tile.midAt) return Math.max(tile.stage, 2);
  return tile.stage;
}

// Time left until ripe, or null while the crop waits for water
export const msLeft = (tile: TileData, now: number) => (tile.readyAt == null ? null : Math.max(0, tile.readyAt - now));

// Every crop at the stage it has reached by `now` (the same array when none moved on). A crop watered before real
// time came in (no `readyAt`) starts growing now.
export function refreshStages(tiles: TileData[], now: number): TileData[] {
  let changed = false;
  const next = tiles.map((t) => {
    let tile = t.state === 'planted' && t.crop && t.watered && t.stage < 3 && t.readyAt == null ? startGrowing(t, now) : t;
    const stage = stageAt(tile, now);
    if (stage !== tile.stage) tile = { ...tile, stage };
    if (tile !== t) changed = true;
    return tile;
  });
  return changed ? next : tiles;
}

const AROUND: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// Dry worked tiles that get watered at `at` without the can: every one on a wet day, otherwise the 8 around a sprinkler
export function autoWater(tiles: TileData[], at: number, wet: boolean) {
  const nearSprinkler = new Set<string>();
  tiles
    .filter((t) => t.sprinkler)
    .forEach((s) => AROUND.forEach(([dr, dc]) => nearSprinkler.add(`${s.r + dr}-${s.c + dc}`)));
  let watered = 0;
  const next = tiles.map((t) => {
    if (!canWater(t) || !(wet || nearSprinkler.has(t.id))) return t;
    watered++;
    return waterTile(t, at);
  });
  return { tiles: watered ? next : tiles, watered };
}

// What the field says about a crop: ripe, waiting for water, or the time it still needs
export function cropStatus(tile: TileData, now: number) {
  if (tile.stage >= 3) return '✨ ĐÃ CHÍN! Click để thu hoạch!';
  const left = msLeft(tile, now);
  return left === null ? '💧 Cần tưới để cây bắt đầu lớn' : `⏳ Còn ${formatDuration(left)}`;
}
```

- [ ] **Step 6: Chạy, phải qua**

Run: `npx vitest run src/lib/growth.test.ts src/lib/orders.test.ts`
Expected: PASS.

- [ ] **Step 7: Toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS, tsc sạch (store vẫn dùng `daysPerStage`, chưa đụng).

---

### Task 4: Ruộng theo giờ thật (store, tưới tự động, hàng xóm, đồng hồ 5 giây)

**Files:**
- Modify: `src/types/game.ts` (bỏ `TileData.daysWatered`, `CropConfig.daysPerStage`; thêm `SaveData.fastCropsLeft`, `NeighborVisit.at`)
- Modify: `src/config/crops.ts` (bỏ 8 dòng `daysPerStage`)
- Modify: `src/lib/newGame.ts`, `src/lib/saveData.ts` (`SAVE_FIELDS`)
- Modify: `src/lib/tools.ts` (bỏ `applySprinklers` + `NEIGHBOURS`), `src/lib/pets.ts`, `src/lib/neighbors.ts`, `src/lib/supabase.ts`
- Modify: `src/store/useGameStore.ts`
- Create: `src/lib/gameClock.ts`; Modify: `src/app/page.tsx`
- Test: `src/store/crops.test.ts`; sửa `src/lib/tools.test.ts`, `src/lib/pets.test.ts`, `src/lib/neighbors.test.ts`,
  `src/store/pets.test.ts`

**Interfaces:**
- Consumes: Task 1 (`now`, `formatDuration`, `syncServerTime`, `skipClock`), Task 3 (cả `growth`).
- Produces: `SaveData.fastCropsLeft: number`; `NeighborVisit.at?: number`; `roboCatWater(tiles, at)`;
  `waterForNeighbors(tiles, count, at)`; store `tickClock(): void`; hook `useGameClock()`; `TICK_MS = 5000`.

- [ ] **Step 1: Viết test hỏng** — thêm vào cuối `src/store/crops.test.ts` (sửa dòng import đầu file thành
  `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';` và thêm import):

```ts
import { dayStartMs, gameDayAt } from '@/lib/clock';
import { isWet, weatherOf } from '@/lib/seasons';

const HOUR = 3_600_000;
// 10:00 in Vietnam on the first dry day from Monday 20/10/2026, so the rain waters nothing by itself
const DRY_DAY = (() => {
  for (let d = gameDayAt(Date.UTC(2026, 9, 20, 3)); ; d++) if (!isWet(weatherOf(d))) return d;
})();
const T = dayStartMs(DRY_DAY) + 10 * HOUR;
const tile66 = () => store().tiles.find((t) => t.id === '6-6')!;
const setTile66 = (patch: Partial<ReturnType<typeof tile66>>) =>
  useGameStore.setState({ tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, ...patch } : t)) });

describe('crops on real time', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T);
    useGameStore.setState({ day: DRY_DAY, fastCropsLeft: 0, energy: 100, water: 10 });
  });
  afterEach(() => vi.useRealTimers());

  it('a sown and watered carrot is ripe an hour later', () => {
    setTile66({ state: 'tilled', watered: false, crop: null, stage: 0 });
    useGameStore.setState({ activeTool: 'seed_carrot', seeds: { ...store().seeds, carrot: 1 } });
    store().interactTile(6, 6);
    expect(tile66()).toMatchObject({ state: 'planted', watered: false, readyAt: null });
    useGameStore.setState({ activeTool: 'water' });
    store().interactTile(6, 6);
    expect(tile66()).toMatchObject({ watered: true, readyAt: T + HOUR });
    vi.setSystemTime(T + HOUR - 1000);
    store().tickClock();
    expect(tile66().stage).toBe(2);
    vi.setSystemTime(T + HOUR);
    store().tickClock();
    expect(tile66().stage).toBe(3);
  });

  it("a new player's first crops ripen in five minutes", () => {
    setTile66({ state: 'tilled', watered: true, crop: null, stage: 0 });
    useGameStore.setState({ fastCropsLeft: 5, activeTool: 'seed_pumpkin', seeds: { ...store().seeds, pumpkin: 1 } });
    store().interactTile(6, 6);
    expect(store().fastCropsLeft).toBe(4);
    expect(tile66().readyAt).toBe(T + 5 * 60_000);
  });

  it('a crop next to a sprinkler is watered as soon as it is sown', () => {
    useGameStore.setState({
      tiles: store().tiles.map((t) =>
        t.id === '6-5' ? { ...t, sprinkler: true } : t.id === '6-6' ? { ...t, state: 'tilled' as const, watered: false } : t
      ),
      activeTool: 'seed_corn',
      seeds: { ...store().seeds, corn: 1 },
    });
    store().interactTile(6, 6);
    expect(tile66()).toMatchObject({ watered: true, readyAt: T + 2 * HOUR });
  });

  it('a picked tomato waits for water before growing back', () => {
    setTile66({ state: 'planted', crop: 'tomato', stage: 3, watered: true });
    useGameStore.setState({ activeTool: 'basket', items: {} });
    store().interactTile(6, 6);
    expect(store().items).toEqual({ tomato: 1 });
    expect(tile66()).toMatchObject({ stage: 2, watered: false, readyAt: null });
  });

  it('the watering can skips crops that are already growing', () => {
    setTile66({ state: 'planted', crop: 'carrot', stage: 1, watered: true, readyAt: T + HOUR, midAt: T + HOUR / 2 });
    useGameStore.setState({ activeTool: 'water', water: 5 });
    store().interactTile(6, 6);
    expect(store().water).toBe(5);
  });
});
```

Run: `npx vitest run src/store/crops.test.ts`
Expected: FAIL (`fastCropsLeft`, `tickClock` chưa có; tưới chưa đặt `readyAt`).

- [ ] **Step 2: Kiểu** — `src/types/game.ts`
- `TileData`: xoá dòng `daysWatered: number;`.
- `CropConfig`: xoá dòng `daysPerStage: number;`.
- `SaveData`, ngay dưới `fertilizer: number;`:

```ts
  // Crops a new player can still grow in five minutes (lib/growth)
  fastCropsLeft: number;
```
- `NeighborVisit`, thêm cuối:

```ts
  // When the neighbour came by (ms), so their watering counts from then
  at?: number;
```

`src/config/crops.ts`: xoá 8 dòng `daysPerStage: …,`.
`src/lib/saveData.ts`: trong `SAVE_FIELDS` thêm `fastCropsLeft: true,` ngay dưới `fertilizer: true,`.

- [ ] **Step 3: Save mới** — `src/lib/newGame.ts`
- Thêm import: `import { now as clockNow } from '@/lib/clock';` và `import { FAST_CROPS_FOR_NEW_PLAYERS, waterTile } from '@/lib/growth';`
- Trong `createEmptyGrid`, xoá dòng `daysWatered: 0,`.
- Thay `createInitialGrid`:

```ts
// The starter field; the watered tomato bush grows back from the moment the game begins
const createInitialGrid = (at: number): TileData[] =>
  createEmptyGrid().map((t) => {
    const tile = { ...t, ...STARTER_TILES[t.id] };
    return tile.state === 'planted' && tile.watered && tile.stage < 3 ? waterTile({ ...tile, watered: false }, at) : tile;
  });
```
- Trong `createNewGameSave`: `tiles: createInitialGrid(),` → `tiles: createInitialGrid(clockNow()),`; thêm
  `fastCropsLeft: FAST_CROPS_FOR_NEW_PLAYERS,` ngay dưới `fertilizer: 0,`.

- [ ] **Step 4: Bình Phun, Mèo Máy, hàng xóm dùng `growth`**

`src/lib/tools.ts`: xoá `const NEIGHBOURS …` và cả hàm `applySprinklers` (cùng comment phía trên); bỏ `TileData` khỏi import
nếu không còn dùng. `src/lib/tools.test.ts`: xoá `describe('applySprinklers', …)`, bỏ `applySprinklers` khỏi import, xoá
`daysWatered: 0,` trong fixture `tile`.

`src/lib/pets.ts`: thêm `import { canWater, waterTile } from '@/lib/growth';`, thay `roboCatWater`:

```ts
// Robo Cat waters a few dry tiles each morning (from `at`): growing crops first, then bare tilled soil
export function roboCatWater(tiles: TileData[], at: number) {
  const growing = tiles.filter((t) => canWater(t) && t.state === 'planted');
  const soil = tiles.filter((t) => canWater(t) && t.state === 'tilled');
  const chosen = new Set([...growing, ...soil].slice(0, ROBO_CAT_TILES).map((t) => t.id));
  return {
    tiles: chosen.size ? tiles.map((t) => (chosen.has(t.id) ? waterTile(t, at) : t)) : tiles,
    watered: chosen.size,
  };
}
```
`src/lib/pets.test.ts`: xoá `daysWatered: 0,` trong fixture; ba chỗ `roboCatWater(tiles)` → `roboCatWater(tiles, 0)`.

`src/lib/neighbors.ts`: thêm `import { canWater, waterTile } from '@/lib/growth';`; trong `visitsFromRows` đọc thêm
`created_at`:

```ts
    .map((raw) => raw as { id?: unknown; visitor_id?: unknown; visitor_name?: unknown; kind?: unknown; created_at?: unknown })
```
và phần `.map((row) => ({ … }))` cuối thay bằng:

```ts
    .map((row) => {
      const at = typeof row.created_at === 'string' ? Date.parse(row.created_at) : NaN;
      return {
        id: row.id as number,
        visitorId: row.visitor_id as string,
        visitorName: (row.visitor_name as string).slice(0, VISITOR_NAME_MAX) || 'Nông Dân',
        kind: row.kind as VisitKind,
        ...(Number.isFinite(at) ? { at } : {}),
      };
    })
```
Thay `waterForNeighbors`:

```ts
// Neighbours' watering at `at`: up to `count` growing crops that are still dry start growing
export function waterForNeighbors(tiles: TileData[], count: number, at: number) {
  let left = count;
  const next = tiles.map((t) => {
    if (left <= 0 || t.state !== 'planted' || !canWater(t)) return t;
    left--;
    return waterTile(t, at);
  });
  return { tiles: left === count ? tiles : next, watered: count - left };
}
```
`src/lib/neighbors.test.ts`: ba chỗ `waterForNeighbors(field(), N)` thêm đối số thứ ba `0`; thêm test:

```ts
  it('reads when each visit was made', () => {
    const rows = [{ id: 4, visitor_id: 'u1', visitor_name: 'Minh', kind: 'water', created_at: '2026-10-17T03:00:00Z' }];
    expect(visitsFromRows(rows)[0].at).toBe(Date.UTC(2026, 9, 17, 3));
  });
```
`src/lib/supabase.ts` (`fetchFarmVisits`): `.select('id, visitor_id, visitor_name, kind')` → `.select('id, visitor_id, visitor_name, kind, created_at')`.

- [ ] **Step 5: Store** — `src/store/useGameStore.ts`

Import: dòng `import { calendarDate, todayKey } from '@/lib/clock';` → `import { calendarDate, formatDuration, now as clockNow, todayKey } from '@/lib/clock';`;
thêm `import { autoWater, canWater, harvestTile, msLeft, plantTile, refreshStages, waterTile } from '@/lib/growth';`;
bỏ `applySprinklers,` khỏi import `@/lib/tools`.

Trong `interface GameState`, ngay dưới `interactFront: () => void;` thêm:

```ts
  // Every few seconds (lib/gameClock): crops move on to the stage the clock has reached
  tickClock: () => void;
```

`interactTile`:
- Ngay sau dòng `const { x: tx, z: tz } = tileToWorld(r, c);` thêm `const now = clockNow();`.
- Chữ trong toast Bình Phun: `'💦 Bình Phun tưới 8 ô xung quanh mỗi sáng • dùng Giỏ (phím 3) để cất'` →
  `'💦 Bình Phun tự tưới 8 ô xung quanh • dùng Giỏ (phím 3) để cất'`.
- Nhánh thu hoạch: thay từ `const updatedTiles = tiles.map((t) => {` tới hết `set({ tiles: updatedTiles, items: addItems(items, { [cropKey]: count }) });` bằng:

```ts
            // A plant that grows back is watered again at once next to a sprinkler or in the rain
            const picked = tiles.map((t) => (t.r === r && t.c === c ? harvestTile(t) : t));
            set({
              tiles: autoWater(picked, now, isWet(weatherOf(state.day))).tiles,
              items: addItems(items, { [cropKey]: count }),
            });
```
- Nhánh tưới: `reach((t) => t.state !== 'empty' && !t.watered)` → `reach(canWater)`;
  `tiles: tiles.map((t) => (ids.has(t.id) ? { ...t, watered: true } : t)),` → `tiles: tiles.map((t) => (ids.has(t.id) ? waterTile(t, now) : t)),`.
- Nhánh gieo: thay từ `soundFX.plant();` (ngay sau kiểm tra hết hạt) tới hết `set({ … });` trước `get().incrementQuest('plant', 1, cropKey);` bằng:

```ts
            // A new player's first crops ripen in minutes; next to a sprinkler or in the rain a crop is watered at once
            const fast = state.fastCropsLeft > 0;
            const sown = tiles.map((t) => (t.r === r && t.c === c ? plantTile(t, cropKey, now, fast) : t));
            soundFX.plant();
            set({
              energy: Math.max(0, energy - 2),
              seeds: { ...seeds, [cropKey]: seeds[cropKey] - 1 },
              tiles: autoWater(sown, now, isWet(weatherOf(state.day))).tiles,
              fastCropsLeft: fast ? state.fastCropsLeft - 1 : state.fastCropsLeft,
            });
            if (fast) get().showToast('🌱 Cây của người mới: chín sau 5 phút!', 'text-lime-300', [tx, 0.6, tz]);
```
- Nhánh Giỏ vào cây chưa chín: thay toast `'⏳ Cây chưa chín! Tưới nước rồi Qua Ngày.'` bằng:

```ts
              const left = msLeft(targetTile, now);
              get().showToast(
                left === null ? '💧 Cây chưa được tưới!' : `⏳ Còn ${formatDuration(left)} nữa mới chín`,
                'text-amber-300',
                [tx, 0.4, tz]
              );
```

`placeSprinkler`: thay `set({ tiles: tiles.map(…), sprinklers: sprinklers - 1, placingSprinkler: false });` bằng:

```ts
          // The dry soil around it is watered straight away
          const placed = tiles.map((t) =>
            t.id === tile.id ? { ...t, sprinkler: true, state: 'empty' as const, watered: false } : t
          );
          set({
            tiles: autoWater(placed, clockNow(), false).tiles,
            sprinklers: sprinklers - 1,
            placingSprinkler: false,
          });
```

`receiveNeighborVisits`: thay từ `const waterings = …` tới hết `set({ … });` bằng:

```ts
          const now = clockNow();
          // Each watering counts from when the neighbour came by, so the crops grew while the farm was left
          let field = tiles;
          let watered = 0;
          fresh
            .filter((v) => v.kind === 'water')
            .forEach((v) => {
              const watering = waterForNeighbors(field, NEIGHBOR_WATER_TILES, Math.min(v.at ?? now, now));
              field = watering.tiles;
              watered += watering.watered;
            });
          const likes = fresh.filter((v) => v.kind === 'like').length;
          set({
            tiles: refreshStages(field, now),
            mail: deliverLetters(mail, [visitLetter(fresh, day, watered)]),
            neighborVisitsSeen: Math.max(...fresh.map((v) => v.id)),
            weekly: likes ? addWeekly(weekly, weekKey(calendarDate()), { likes }) : weekly,
          });
```

`nextDay` (còn tạm tới Task 7): thay từ `let cropsGrownCount = 0;` tới hết dòng
`const cat = cosmetics.pet === 'robo_cat' ? roboCatWater(morningTiles) : null;` bằng:

```ts
          // Crops grow on the clock now: the night only brings the sprinklers', the rain's and Robo Cat's watering
          const at = clockNow();
          const weather = weatherOf(day + 1);
          const sprinkled = autoWater(tiles, at, false);
          const rained = autoWater(sprinkled.tiles, at, isWet(weather));
          const cat = cosmetics.pet === 'robo_cat' ? roboCatWater(rained.tiles, at) : null;
          const morningTiles = refreshStages(cat ? cat.tiles : rained.tiles, at);
          const cropsGrownCount = 0;
          const readyCount = morningTiles.filter((t) => t.state === 'planted' && t.stage >= 3).length;
          const sprinklerWatered = sprinkled.watered;
          const rainWatered = rained.watered;

          // The pet you walk with lends a hand overnight
```
và trong `set({ … })` của `nextDay`: `tiles: cat ? cat.tiles : morningTiles,` → `tiles: morningTiles,`.

Thêm action ngay sau `interactFront`:

```ts
        tickClock: () => {
          const tiles = refreshStages(get().tiles, clockNow());
          if (tiles !== get().tiles) set({ tiles });
        },
```

- [ ] **Step 6: Hook đồng hồ** — tạo `src/lib/gameClock.ts`

```ts
'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { skipClock, syncServerTime } from '@/lib/clock';

// How often the farm looks at the clock, asks the server again, and how long it waits for the first answer
export const TICK_MS = 5000;
const RESYNC_MS = 5 * 60_000;
const FIRST_ANSWER_MS = 3000;

// Keeps the farm on the clock (the store's tickClock), once the server has told the time or did not answer in time
export function useGameClock() {
  useEffect(() => {
    let started = false;
    let live = true;
    let ticker: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      if (started) useGameStore.getState().tickClock();
    };
    const resync = () => void syncServerTime().then(tick);
    void Promise.race([syncServerTime(), new Promise((resolve) => setTimeout(resolve, FIRST_ANSWER_MS))]).then(() => {
      if (!live) return;
      started = true;
      tick();
      ticker = setInterval(tick, TICK_MS);
    });
    const again = setInterval(resync, RESYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', resync);
    // Development builds can wind the clock forward from the console: sunnyClock.skip(3600000)
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { sunnyClock?: { skip: (ms: number) => void } }).sunnyClock = {
        skip: (ms) => {
          skipClock(ms);
          tick();
        },
      };
    }
    return () => {
      live = false;
      clearInterval(ticker);
      clearInterval(again);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', resync);
    };
  }, []);
}
```

`src/app/page.tsx`: thêm `import { useGameClock } from '@/lib/gameClock';` và gọi `useGameClock();` ngay dưới
`useBackgroundMusic();`.

- [ ] **Step 7: Sửa fixture test store** — `src/store/pets.test.ts` (`dryField`): xoá `, daysWatered: 0`.

- [ ] **Step 8: Chạy, phải qua**

Run: `npx vitest run src/store/crops.test.ts src/lib/pets.test.ts src/lib/neighbors.test.ts src/lib/tools.test.ts src/store/neighbors.test.ts src/store/pets.test.ts src/store/weather.test.ts src/store/tools.test.ts`
Expected: PASS.

- [ ] **Step 9: Toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS, tsc sạch (không còn chỗ nào đọc `daysWatered`/`daysPerStage`; `git grep -n "daysWatered\|daysPerStage" -- src` chỉ còn trong `src/lib/saveData.test.ts` (dữ liệu v0 thô)).

---

### Task 5: Ruộng theo giờ thật (giao diện)

**Files:**
- Modify: `src/components/canvas/worlds/FarmWorld.tsx` (`tileTooltip`, giọt nước trong `FarmTile`)
- Modify: `src/components/hud/modals/SeedShopModal.tsx` (thời gian lớn; chữ Bình Phun)
- Modify: `src/components/canvas/FarmDiorama.tsx` (cây của nông trại đang thăm, mùa theo ngày của người xem)

**Interfaces:**
- Consumes: `cropStatus`, `needsWater`, `growMsOf`, `regrowMsOf`, `refreshStages` (Task 3); `now`, `formatDuration` (Task 1).

- [ ] **Step 1: Nhãn ô ruộng** — `FarmWorld.tsx`
- Import: thêm `import { now as clockNow } from '@/lib/clock';` và `import { cropStatus, needsWater } from '@/lib/growth';`.
- Trong `tileTooltip`: mô tả Bình Phun `'Tưới 8 ô xung quanh mỗi sáng • dùng Giỏ (3) để cất'` →
  `'Tự tưới 8 ô xung quanh khi đất khô • dùng Giỏ (3) để cất'`; phần cuối (cây) thay bằng:

```ts
  const crop = CROPS[tile.crop];
  return {
    title: `${crop.icon} ${crop.name}`,
    desc: `${cropStatus(tile, clockNow())}${tile.fertilized ? ' • 🪴 Đã bón phân' : ''}`,
  };
```

- [ ] **Step 2: Giọt nước** — trong `FarmTile`, ngay sau khối `{tile.state === 'planted' && tile.crop && ( … CropMesh … )}`:

```tsx
      {/* A crop waiting for water: still meshes in the soil's material, so the plot's merge draws them for free */}
      {needsWater(tile) && (
        <group position={[0, 1.0, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.09, 0.16, 8]} />
            <meshLambertMaterial color="#38bdf8" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshLambertMaterial color="#38bdf8" />
          </mesh>
        </group>
      )}
```

- [ ] **Step 3: Cửa hàng hạt** — `SeedShopModal.tsx`
- Import: `import { formatDuration } from '@/lib/clock';`, `import { growMsOf, regrowMsOf } from '@/lib/growth';`.
- Ngay dưới `<p className="text-xs text-amber-800">{crop.description}</p>`:

```tsx
                  <p className="text-xs font-bold text-emerald-800">
                    ⏱ Chín sau {formatDuration(growMsOf(crop.id))}
                    {crop.regrow ? ` • thu lại sau ${formatDuration(regrowMsOf(crop.id))}` : ''}
                  </p>
```
- Dòng 134 (Bình Phun): `mỗi sáng tự tưới 8 ô xung quanh` → `tự tưới 8 ô xung quanh khi đất khô`.

- [ ] **Step 4: Nông trại đang thăm** — `FarmDiorama.tsx`
- Import: `import { useGameStore } from '@/store/useGameStore';`, `import { now as clockNow } from '@/lib/clock';`,
  `import { refreshStages } from '@/lib/growth';`.
- Trong `Farm`, ngay đầu thân hàm:

```ts
  // Their crops as they stand now, in today's season (their save may be hours old)
  const day = useGameStore((s) => s.day);
  const tiles = useMemo(() => refreshStages(farm.tiles, clockNow()), [farm.tiles]);
```
- `SEASON_LOOK[seasonOf(farm.day)]` → `SEASON_LOOK[seasonOf(day)]`; `farm.tiles.map(` → `tiles.map(`;
  `seasonOf(farm.day) === 'winter'` → `seasonOf(day) === 'winter'`; `daysUntilGrown(p, farm.day)` → `daysUntilGrown(p, day)`.

- [ ] **Step 5: Test cho chữ trạng thái**

`cropStatus` đã có test ở Task 3. Chạy: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS, tsc sạch. (Phần hiển thị được kiểm trên trình duyệt ở Task 10.)

---

### Task 6: Thể lực tự hồi

**Files:**
- Modify: `src/lib/food.ts`; Test: `src/lib/food.test.ts`
- Modify: `src/types/game.ts` (`SaveData.energyAt`), `src/lib/saveData.ts` (`SAVE_FIELDS`), `src/lib/newGame.ts`
- Modify: `src/store/useGameStore.ts`
- Modify: `src/lib/gameClock.ts` (`useNow`), `src/components/hud/TopBar.tsx`
- Test: `src/store/energy.test.ts` (mới)

**Interfaces:**
- Consumes: `now` (Task 1), `tickClock` (Task 4).
- Produces: `ENERGY_REGEN_MS`; `interface EnergyState { energy: number; energyAt: number }`;
  `settleEnergy(state, max, now): EnergyState`; `spendEnergy(state, amount, max, now): EnergyState`;
  `nextEnergyIn(state, max, now): number | null`; `SaveData.energyAt: number`; `useNow(intervalMs: number | null): number`.

- [ ] **Step 1: Viết test hỏng** — thêm vào `src/lib/food.test.ts` (import thêm `ENERGY_REGEN_MS, nextEnergyIn, settleEnergy, spendEnergy` từ `@/lib/food`):

```ts
describe('stamina on real time', () => {
  const T = 1_000_000_000;
  const MIN = 60_000;

  it('comes back a point every three minutes, keeping the time towards the next', () => {
    expect(ENERGY_REGEN_MS).toBe(3 * MIN);
    expect(settleEnergy({ energy: 50, energyAt: T }, 100, T + 7 * MIN)).toEqual({ energy: 52, energyAt: T + 6 * MIN });
  });

  it('stops at the most there is', () => {
    expect(settleEnergy({ energy: 99, energyAt: T }, 100, T + 60 * MIN)).toEqual({ energy: 100, energyAt: T + 60 * MIN });
  });

  it('starts counting from the moment it is spent from full', () => {
    expect(spendEnergy({ energy: 100, energyAt: T }, 4, 100, T + 60 * MIN)).toEqual({ energy: 96, energyAt: T + 60 * MIN });
    expect(nextEnergyIn({ energy: 96, energyAt: T }, 100, T + MIN)).toBe(2 * MIN);
  });

  it('needs no countdown when full', () => {
    expect(nextEnergyIn({ energy: 100, energyAt: T }, 100, T)).toBeNull();
  });

  it('gives a save without a time stamp one', () => {
    expect(settleEnergy({ energy: 10, energyAt: 0 }, 100, T)).toEqual({ energy: 10, energyAt: T });
  });
});
```

`src/store/energy.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { gameDayAt } from '@/lib/clock';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const T = Date.UTC(2026, 9, 20, 3); // 10:00 in Vietnam
const MIN = 60_000;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T);
  useGameStore.setState({ day: gameDayAt(T), energy: 50, energyAt: T, buff: null });
});
afterEach(() => vi.useRealTimers());

describe('stamina on the clock', () => {
  it('comes back while the game runs', () => {
    vi.setSystemTime(T + 30 * MIN);
    store().tickClock();
    expect(store().energy).toBe(60);
  });

  it('counts what came back before it is spent', () => {
    useGameStore.setState({ energy: 1, currentWorld: 'beach' });
    vi.setSystemTime(T + 9 * MIN);
    store().startFishing();
    expect(store().fishing).not.toBeNull();
    expect(store().energy).toBe(0);
  });

  it('counts what came back before eating', () => {
    useGameStore.setState({ energy: 90, breadCount: 1 });
    vi.setSystemTime(T + 30 * MIN);
    store().eatBread();
    expect(store().energy).toBe(100);
    expect(store().breadCount).toBe(1);
  });
});
```

Run: `npx vitest run src/lib/food.test.ts src/store/energy.test.ts`
Expected: FAIL (hàm và `energyAt` chưa có).

- [ ] **Step 2: Hàm thể lực** — `src/lib/food.ts`
- Comment trên `BASE_MAX_ENERGY` → `// The most stamina there is without a hearty meal`; comment trên `activeBuff` →
  `// The buff working today: the last dish eaten wears off when the day ends`.
- Thêm cuối file:

```ts
// Stamina comes back one point every three minutes, also while the game is closed
export const ENERGY_REGEN_MS = 3 * 60_000;

export interface EnergyState {
  energy: number;
  energyAt: number;
}

// Stamina at `now`: the points that came back since `energyAt`, up to `max`, keeping the time towards the next one
export function settleEnergy(state: EnergyState, max: number, now: number): EnergyState {
  if (!state.energyAt) return { energy: state.energy, energyAt: now };
  if (state.energy >= max) return state;
  const points = Math.floor(Math.max(0, now - state.energyAt) / ENERGY_REGEN_MS);
  if (points <= 0) return state;
  const energy = Math.min(max, state.energy + points);
  return { energy, energyAt: energy >= max ? now : state.energyAt + points * ENERGY_REGEN_MS };
}

// Spending at `now`; spent from full, the count towards the next point starts now
export function spendEnergy(state: EnergyState, amount: number, max: number, now: number): EnergyState {
  const settled = settleEnergy(state, max, now);
  return { energy: Math.max(0, settled.energy - amount), energyAt: settled.energy >= max ? now : settled.energyAt };
}

// Time until the next point comes back, or null when full
export function nextEnergyIn(state: EnergyState, max: number, now: number): number | null {
  const settled = settleEnergy(state, max, now);
  if (settled.energy >= max) return null;
  return ENERGY_REGEN_MS - (Math.max(0, now - settled.energyAt) % ENERGY_REGEN_MS);
}
```

- [ ] **Step 3: Save** — `src/types/game.ts` (`SaveData`, ngay dưới `energy: number;`):

```ts
  // When stamina was last counted (ms): it comes back by itself from then (lib/food)
  energyAt: number;
```
`src/lib/saveData.ts`: `energyAt: true,` ngay dưới `energy: true,`. `src/lib/newGame.ts`: trong `createNewGameSave` đặt
`const at = clockNow();` ở đầu hàm, dùng `tiles: createInitialGrid(at),` và thêm `energyAt: at,` ngay dưới `energy: 98,`.

- [ ] **Step 4: Store** — `src/store/useGameStore.ts`
- Import từ `@/lib/food`: thêm `settleEnergy, spendEnergy`.
- Trong closure của store (ngay trên `const announceCompleted`), thêm:

```ts
      // Stamina as it stands now: the points that came back go into the save
      const energyNow = () => {
        const s = get();
        const settled = settleEnergy(s, maxEnergyFor(s.buff, s.day), clockNow());
        if (settled.energy !== s.energy || settled.energyAt !== s.energyAt) set(settled);
        return settled.energy;
      };
      // Stamina after spending `amount`, to set together with what the action changes
      const paid = (amount: number) => {
        const s = get();
        return spendEnergy(s, amount, maxEnergyFor(s.buff, s.day), clockNow());
      };
```
- `eatPopcornOrSnack`, `eatBread`, `eatFood`: bỏ `energy` khỏi phần destructure `get()` và thêm `const energy = energyNow();`
  ngay sau dòng destructure.
- `interactTile`: bỏ `energy` khỏi destructure đầu hàm, thêm `const energy = energyNow();` ngay sau nó. Ba chỗ trừ thể lực:
  cuốc `energy: energy - worked.length * perTile,` → `...paid(worked.length * perTile),`; tưới (giống hệt) →
  `...paid(worked.length * perTile),`; gieo `energy: Math.max(0, energy - 2),` → `...paid(2),`.
- Toast hết thể lực trong `interactTile`: `'⚡ Hết thể lực! Hãy ăn Bánh Mì hoặc đi ngủ!'` →
  `'⚡ Hết thể lực! Ăn Bánh Mì hoặc chờ hồi (3 phút 1 điểm)'`.
- `startFishing`: bỏ `energy` khỏi destructure, thêm `const energy = energyNow();`; `energy: energy - FISHING_ENERGY,` → `...paid(FISHING_ENERGY),`.
- `startBugCatch`: bỏ `energy` khỏi destructure, thêm `const energy = energyNow();`.
- `swingNet`: bỏ `energy` khỏi destructure; `energy: Math.max(0, energy - BUG_NET_ENERGY),` → `...paid(BUG_NET_ENERGY),`.
- `tickClock`: thêm `energyNow();` làm dòng đầu.
- Comment của `eatFood` trong `interface GameState`: `its buff until bedtime` → `its buff until the day ends`.

- [ ] **Step 5: Thanh thể lực** — thêm vào `src/lib/gameClock.ts` (import thêm `useState` từ `react`, `now as clockNow` từ `@/lib/clock`):

```ts
// The clock's time, refreshed every `intervalMs` (not refreshed while null)
export function useNow(intervalMs: number | null) {
  const [time, setTime] = useState(clockNow);
  useEffect(() => {
    if (intervalMs === null) return;
    setTime(clockNow());
    const id = setInterval(() => setTime(clockNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return time;
}
```

`src/components/hud/TopBar.tsx`:
- Import: `import { activeBuff, maxEnergyFor, nextEnergyIn, settleEnergy } from '@/lib/food';`,
  `import { formatAmount, formatCountdown } from '@/lib/format';`, `import { useNow } from '@/lib/gameClock';`.
- `Meter`: thêm prop `hint?: string`; `title={`${name}: ${value}/${max}`}` →
  `title={`${name}: ${value}/${max}${hint ? ` • ${hint}` : ''}`}`; ngay trước thẻ đóng `</div>` ngoài cùng của `Meter`:

```tsx
      {hint && <div className="hidden text-right text-[9px] font-bold leading-none text-emerald-800 sm:block">{hint}</div>}
```
- `Farmer`: thay `const energy = useGameStore((s) => s.energy);` bằng:

```ts
  const storedEnergy = useGameStore((s) => s.energy);
  const energyAt = useGameStore((s) => s.energyAt);
```
  và ngay dưới dòng `const maxEnergy = …`:

```ts
  // Counted every second while it comes back (the store catches up within a few seconds)
  const now = useNow(storedEnergy < maxEnergy ? 1000 : null);
  const energy = settleEnergy({ energy: storedEnergy, energyAt }, maxEnergy, now).energy;
  const nextIn = nextEnergyIn({ energy: storedEnergy, energyAt }, maxEnergy, now);
```
  Meter thể lực: thêm `hint={nextIn === null ? undefined : `+1 sau ${formatCountdown(nextIn)}`}`.

- [ ] **Step 6: Chạy, phải qua**

Run: `npx vitest run src/lib/food.test.ts src/store/energy.test.ts src/store/food.test.ts src/store/economy.test.ts src/store/fishing.test.ts src/store/bugs.test.ts`
Expected: PASS.

- [ ] **Step 7: Toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS, tsc sạch.

---

### Task 7: Sang ngày theo giờ thật (bỏ nút ngủ)

**Files:**
- Create: `src/lib/dayCycle.ts`; Test: `src/lib/dayCycle.test.ts`
- Modify: `src/store/useGameStore.ts` (`startNewDay`, `tickClock`, `closeDaySummary`, `showDayCountdown`, bỏ `nextDay`)
- Modify: `src/lib/newGame.ts`, `src/lib/mail.ts`, `src/lib/saveData.ts` (`isFreshSave`)
- Modify: `src/app/page.tsx`, `src/components/hud/TopBar.tsx`, `src/components/canvas/worlds/FarmWorld.tsx`,
  `src/components/hud/modals/DaySummaryModal.tsx`
- Test: thay `store().nextDay()` trong `src/store/{beehive,economy,food,mail,orders,pets,tools,trees,weather}.test.ts`;
  thêm `src/store/newDay.test.ts`; sửa `src/lib/saveData.test.ts` (`isFreshSave`)

**Interfaces:**
- Consumes: Task 1 (`dayStartMs`, `todayKey`, `gameDayAt`, `msUntilNextDay`, `dayLabel`, `formatDuration`, `now`),
  Task 3 (`autoWater`, `refreshStages`), Task 4 (`roboCatWater(tiles, at)`), Task 6 (`energyAt`).
- Produces: `MAX_CATCH_UP_DAYS = 7`; `interface DaySummaryData { day; daysPassed; soldItems; totalGoldEarned; readyCount;
  animalProductsReady; weather; forecast; rainWatered; petNote; newOrders; honeyMade; newLetters; fruitRipened }`;
  `advanceDays(save: SaveData, today: number, now: number): { save: SaveData; summary: DaySummaryData } | null`;
  store `startNewDay(today: number, opening?: boolean)`, `closeDaySummary()`, `showDayCountdown()`, `clockStarted: boolean`;
  `welcomeLetter(day = 1)`.

- [ ] **Step 1: Viết test hỏng** — `src/lib/dayCycle.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { SaveData } from '@/types/game';
import { createNewGameSave } from '@/lib/newGame';
import { dayStartMs } from '@/lib/clock';
import { isWet, weatherOf } from '@/lib/seasons';
import { MAX_CATCH_UP_DAYS, advanceDays } from './dayCycle';

const HOUR = 3_600_000;
// The first day from 300 whose weather passes `test` (days 300+ fall in November 2026, between festivals)
const dayWhere = (test: (day: number) => boolean) => {
  for (let d = 300; ; d++) if (test(d)) return d;
};
// A new farm on `day`, walking no pet, with an empty shipping bin
const farm = (day: number, pet = 'none_pet'): SaveData => {
  const save = createNewGameSave();
  return { ...save, day, shippingBin: {}, cosmetics: { ...save.cosmetics, pet } };
};

describe('a new day', () => {
  it('does nothing while the day is the same', () => {
    expect(advanceDays(farm(300), 300, dayStartMs(300) + HOUR)).toBeNull();
  });

  it('sells the shipping bin once, at the price of the day the goods went in', () => {
    // Day 10 is summer: carrots fetch their plain price
    const result = advanceDays({ ...farm(10), gold: 0, shippingBin: { carrot: 3 } }, 13, dayStartMs(13) + HOUR)!;
    expect(result.save.gold).toBe(120);
    expect(result.save.shippingBin).toEqual({});
    expect(result.summary).toMatchObject({ day: 13, daysPassed: 3, totalGoldEarned: 120 });
  });

  it(`makes up for at most ${MAX_CATCH_UP_DAYS} days away`, () => {
    const { summary } = advanceDays(farm(100, 'shiba_inu'), 130, dayStartMs(130) + HOUR)!;
    expect(summary.daysPassed).toBe(30);
    expect(summary.petNote?.split(' • ')).toHaveLength(MAX_CATCH_UP_DAYS);
  });

  it('waters dry crops from midnight on a wet day, so they grow from then', () => {
    const wetDay = dayWhere((d) => isWet(weatherOf(d)));
    const save = farm(wetDay - 1);
    const tiles = save.tiles.map((t) =>
      t.id === '6-6' ? { ...t, state: 'planted' as const, crop: 'carrot' as const, stage: 1, watered: false } : t
    );
    const result = advanceDays({ ...save, tiles }, wetDay, dayStartMs(wetDay) + 30 * 60_000)!;
    expect(result.save.tiles.find((t) => t.id === '6-6')).toMatchObject({
      watered: true,
      readyAt: dayStartMs(wetDay) + HOUR,
      stage: 2,
    });
    expect(result.summary.rainWatered).toBeGreaterThan(0);
  });

  it('leaves dry soil to the watering can on a dry day', () => {
    const dryDay = dayWhere((d) => !isWet(weatherOf(d)));
    const { save, summary } = advanceDays(farm(dryDay - 1), dryDay, dayStartMs(dryDay) + HOUR)!;
    expect(save.tiles.find((t) => t.id === '8-8')?.watered).toBe(false);
    expect(summary.rainWatered).toBe(0);
  });

  it("brings Robo Cat's watering from midnight", () => {
    const dryDay = dayWhere((d) => !isWet(weatherOf(d)));
    const { save, summary } = advanceDays(farm(dryDay - 1, 'robo_cat'), dryDay, dayStartMs(dryDay) + HOUR)!;
    expect(save.tiles.find((t) => t.id === '8-8')?.watered).toBe(true);
    expect(summary.petNote).toContain('Mèo Máy');
  });

  it("wears off the day's dish and brings stamina back within the plain most", () => {
    const save = { ...farm(300), energy: 120, buff: { id: 'stamina' as const, food: 'cheese' as const, day: 300 } };
    expect(advanceDays(save, 301, dayStartMs(301) + HOUR)!.save).toMatchObject({ energy: 100, buff: null });
  });

  it('leaves the workshop on its own time', () => {
    const job = { recipeId: 'bread' as const, readyAt: dayStartMs(301) + 5 * HOUR };
    const save = { ...farm(300), machines: { machine_oven: { job } } };
    expect(advanceDays(save, 301, dayStartMs(301) + HOUR)!.save.machines).toEqual({ machine_oven: { job } });
  });

  it('leaves the quests to the store', () => {
    const save = farm(300);
    expect(advanceDays(save, 301, dayStartMs(301) + HOUR)!.save.quests).toBe(save.quests);
  });
});
```

`src/store/newDay.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { dayStartMs, gameDayAt } from '@/lib/clock';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const HOUR = 3_600_000;
// 23:59:50 on Thursday 05/11/2026 in Vietnam (no festival runs)
const DAY = gameDayAt(Date.UTC(2026, 10, 5, 3));
const LATE = dayStartMs(DAY + 1) - 10_000;

beforeEach(() => {
  useGameStore.setState(initialState, true);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(LATE);
  useGameStore.setState({ day: DAY, clockStarted: true, activeModal: null, lastGiftDate: '2026-11-05', loginStreak: 1 });
});
afterEach(() => vi.useRealTimers());

describe('the day turns over on the clock', () => {
  it('at midnight while playing: the morning report opens when nothing else is open', () => {
    vi.setSystemTime(LATE + 20_000);
    store().tickClock();
    expect(store().day).toBe(DAY + 1);
    expect(store().activeModal).toBe('summary');
    expect(store().lastDaySummary).toMatchObject({ day: DAY + 1, daysPassed: 1 });
  });

  it('at midnight while fishing: only a note, the cast goes on', () => {
    useGameStore.setState({ fishing: { spot: 'beach_jetty', stage: 'waiting', catchId: 'tuna', until: LATE } as never });
    vi.setSystemTime(LATE + 20_000);
    store().tickClock();
    expect(store().day).toBe(DAY + 1);
    expect(store().activeModal).toBeNull();
    expect(store().fishing).not.toBeNull();
  });

  it('on opening the game days later: the morning report, then the day’s gift', () => {
    useGameStore.setState({ clockStarted: false, timePhaseIndex: 2 });
    vi.setSystemTime(dayStartMs(DAY + 3) + 9 * HOUR);
    store().tickClock();
    expect(store().lastDaySummary).toMatchObject({ day: DAY + 3, daysPassed: 3 });
    expect(store().activeModal).toBe('summary');
    expect(store().timePhaseIndex).toBe(0);
    store().closeDaySummary();
    expect(store().activeModal).toBe('dailyGift');
  });

  it('on opening the game the same day: just the gift, if there is one', () => {
    useGameStore.setState({ clockStarted: false, lastGiftDate: null });
    store().tickClock();
    expect(store().day).toBe(DAY);
    expect(store().activeModal).toBe('dailyGift');
  });

  it("counts the day's visit and gives new daily quests", () => {
    const visits = store().quests.find((q) => q.id === 'a_days')?.progress ?? 0;
    store().startNewDay(DAY + 1);
    expect(store().quests.find((q) => q.id === 'a_days')?.progress).toBe(visits + 1);
    expect(store().quests.filter((q) => q.category === 'daily').every((q) => q.id.endsWith(`_day${DAY + 1}`))).toBe(true);
    expect(store().dailyDay).toBe(DAY + 1);
  });
});
```

(`fishing` dùng `as never` vì chỉ cần khác null; nếu kiểu `FishingSession` có trường khác, giữ `as never`.)

Run: `npx vitest run src/lib/dayCycle.test.ts src/store/newDay.test.ts`
Expected: FAIL (`./dayCycle`, `clockStarted`, `startNewDay`, `closeDaySummary` chưa có).

- [ ] **Step 2: `dayCycle`** — tạo `src/lib/dayCycle.ts`

```ts
import { ItemId, Letter, SaveData, Weather } from '@/types/game';
import { ITEMS } from '@/config/items';
import { BASE_MAX_ENERGY } from '@/lib/food';
import { dayStartMs, todayKey } from '@/lib/clock';
import { autoWater, refreshStages } from '@/lib/growth';
import { isWet, seasonalPrice, weatherOf } from '@/lib/seasons';
import { petMorningGift, roboCatWater, shibaFind, shibaFindLabel } from '@/lib/pets';
import { ripenTrees } from '@/lib/trees';
import { HIVE_CAPACITY, hiveHoneyToday } from '@/lib/beehive';
import { MAILBOX_ID, deliverLetters, festivalLetter, thankYouLetter } from '@/lib/mail';
import { activeFestival } from '@/lib/festivals';
import { refillOrders } from '@/lib/orders';
import { addItems } from '@/lib/inventory';

// Days made up for when the farm was left alone longer
export const MAX_CATCH_UP_DAYS = 7;

// The morning report
export interface DaySummaryData {
  // The new day, and how many days went by since the farm was last played
  day: number;
  daysPassed: number;
  soldItems: { label: string; icon: string; count: number; gold: number }[];
  totalGoldEarned: number;
  // Crops ripe and waiting to be picked
  readyCount: number;
  animalProductsReady: number;
  // Today's weather (rain, storms and snow water the fields) and tomorrow's forecast
  weather: Weather;
  forecast: Weather;
  rainWatered: number;
  // What the pet you walk with did
  petNote: string | null;
  newOrders: number;
  honeyMade: number;
  newLetters: number;
  fruitRipened: number;
}

// The night(s) from the day the farm was last played to the morning of `today`. Quests are left to the store, which
// counts the day's events before the daily quests roll over.
export function advanceDays(
  save: SaveData,
  today: number,
  now: number
): { save: SaveData; summary: DaySummaryData } | null {
  if (today <= save.day) return null;
  const first = Math.max(save.day + 1, today - MAX_CATCH_UP_DAYS + 1);

  // The shipping bin sells once, at the prices of the day the goods went in
  const soldItems = (Object.entries(save.shippingBin) as [ItemId, number][])
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      label: ITEMS[id].name,
      icon: ITEMS[id].icon,
      count,
      gold: count * seasonalPrice(id, save.day),
    }));
  const totalGoldEarned = soldItems.reduce((sum, item) => sum + item.gold, 0);

  // Animals fed on the day played have their product in the morning
  let animalProductsReady = 0;
  const animals = save.animals.map((a) => {
    const ready = a.fedToday || a.hasProduct;
    if (ready) animalProductsReady++;
    return { ...a, hasProduct: ready, fedToday: false };
  });

  let { tiles, gold, gems, breadCount, seeds, items, animalFeed, buildPieces, beehiveHoney } = save;
  gold += totalGoldEarned;
  let rainWatered = 0;
  let fruitRipened = 0;
  const notes: string[] = [];
  const letters: Letter[] = [];
  const pet = save.cosmetics.pet;
  for (let day = first; day <= today; day++) {
    const midnight = dayStartMs(day);
    // Sprinklers, and on a wet day the rain, water the dry soil from midnight
    const wet = isWet(weatherOf(day));
    const watering = autoWater(tiles, midnight, wet);
    tiles = watering.tiles;
    if (wet) rainWatered += watering.watered;
    // The pet you walk with lends a hand
    if (pet === 'robo_cat') {
      const cat = roboCatWater(tiles, midnight);
      tiles = cat.tiles;
      if (cat.watered) notes.push(`🤖 Mèo Máy đã tưới giúp ${cat.watered} ô ruộng`);
    }
    if (pet === 'shiba_inu') {
      const find = shibaFind(day);
      if (find.kind === 'gold') gold += find.amount;
      if (find.kind === 'gems') gems += find.amount;
      if (find.kind === 'bread') breadCount += 1;
      if (find.kind === 'seeds') seeds = { ...seeds, [find.crop]: (seeds[find.crop] ?? 0) + find.count };
      notes.push(shibaFindLabel(find));
    }
    const gift = petMorningGift(pet, day);
    if (gift) {
      gold += gift.gold ?? 0;
      breadCount += gift.bread ?? 0;
      animalFeed += gift.feed ?? 0;
      if (gift.items) items = addItems(items, gift.items);
      notes.push(gift.label);
    }
    // The fruit trees bear and the bees fill the hive
    const trees = ripenTrees(buildPieces, day);
    buildPieces = trees.pieces;
    fruitRipened += trees.ripened;
    beehiveHoney = Math.min(
      HIVE_CAPACITY,
      beehiveHoney + hiveHoneyToday(save.decorPlacements, save.ownedCosmetics, buildPieces)
    );
    // The festival running that day sends its letter (each only once)
    const festival = activeFestival(todayKey(midnight));
    if (festival) letters.push(festivalLetter(festival, day));
  }
  // Thanks for the orders delivered on the day played, to a farm with a mailbox
  const hasMailbox = !!save.decorPlacements[MAILBOX_ID] && save.ownedCosmetics.includes(MAILBOX_ID);
  if (save.pendingThanks && hasMailbox) letters.push(thankYouLetter(save.pendingThanks, first));
  const mail = deliverLetters(save.mail, letters);
  tiles = refreshStages(tiles, now);
  // The day's dish wears off: stamina above the plain most comes down to it
  const energy = Math.min(save.energy, BASE_MAX_ENERGY);

  const next: SaveData = {
    ...save,
    day: today,
    energy,
    energyAt: energy < save.energy ? now : save.energyAt,
    buff: null,
    gold,
    gems,
    breadCount,
    seeds,
    items,
    animalFeed,
    tiles,
    animals,
    shippingBin: {},
    buildPieces,
    beehiveHoney,
    mail,
    pendingThanks: null,
  };
  // Residents post new orders in the board's empty slots
  const orders = refillOrders(next);
  return {
    save: { ...next, orders },
    summary: {
      day: today,
      daysPassed: today - save.day,
      soldItems,
      totalGoldEarned,
      readyCount: tiles.filter((t) => t.state === 'planted' && t.stage >= 3).length,
      animalProductsReady,
      weather: weatherOf(today),
      forecast: weatherOf(today + 1),
      rainWatered,
      petNote: notes.length ? notes.join(' • ') : null,
      newOrders: orders.length - save.orders.length,
      honeyMade: beehiveHoney - save.beehiveHoney,
      newLetters: mail.filter((l) => !save.mail.includes(l)).length,
      fruitRipened,
    },
  };
}
```

- [ ] **Step 3: Store** — `src/store/useGameStore.ts`
- Import: thêm `import { DaySummaryData, advanceDays } from '@/lib/dayCycle';`; dòng import clock thêm `gameDayAt, msUntilNextDay`.
- Xoá `interface DaySummaryData { … }` ở đầu file (dùng bản của `dayCycle`).
- `interface GameState`: xoá `nextDay: () => void;`; thêm (cạnh `tickClock`):

```ts
  // The clock has ticked since the game opened (not saved): the first turnover counts as opening the game
  clockStarted: boolean;
  // Turns the farm over to the morning of `today` (lib/dayCycle); `opening` when it happens as the game opens
  startNewDay: (today: number, opening?: boolean) => void;
  // Closing the morning report brings today's gift if it is waiting
  closeDaySummary: () => void;
  // The farmhouse tells when the next day begins
  showDayCountdown: () => void;
```
- Trạng thái đầu: thêm `clockStarted: false,` ngay dưới `lastDaySummary: null,`.
- Xoá toàn bộ action `nextDay: () => { … }` (từ `nextDay: () => {` tới hết `get().syncToCloud();\n        },` ngay trước
  `buyOrEquipCosmetic`). Bỏ các import không còn dùng sau khi xoá (tsc không báo, nên kiểm bằng
  `git grep -n "<tên>" -- src/store/useGameStore.ts`): `HIVE_CAPACITY`, `hiveHoneyToday`, `ripenTrees`, `petMorningGift`,
  `roboCatWater`, `shibaFind`, `shibaFindLabel`, `festivalLetter`, `thankYouLetter`, `seasonalPrice`, `BASE_MAX_ENERGY`,
  `refillOrders` — chỉ bỏ cái nào không còn chỗ dùng.
- Thay `tickClock` bằng:

```ts
        tickClock: () => {
          const now = clockNow();
          const opening = !get().clockStarted;
          if (opening) set({ clockStarted: true });
          const today = gameDayAt(now);
          if (today > get().day) get().startNewDay(today, opening);
          energyNow();
          const tiles = refreshStages(get().tiles, now);
          if (tiles !== get().tiles) set({ tiles });
          // Opening the game: today's gift comes after the morning report
          const s = get();
          if (opening && !s.activeModal && giftDay(s.lastGiftDate, s.loginStreak, todayKey()) !== null) {
            set({ activeModal: 'dailyGift' });
          }
        },

        startNewDay: (today, opening = false) => {
          energyNow();
          const before = get();
          const result = advanceDays(pickSaveData(before), today, clockNow());
          if (!result) return;
          set(result.save);
          // The night's sales and the day's visit count before the daily quests roll over
          get().incrementQuest('earn_gold', result.summary.totalGoldEarned);
          get().incrementQuest('sleep', 1);
          // The morning report waits while a window is open or the player is busy; nothing is cut short
          const busy = !!(
            before.activeModal ||
            before.fishing ||
            before.bugCatch ||
            before.buildMode ||
            before.placingDecor ||
            before.placingSprinkler
          );
          set((s) => ({
            quests: [...s.quests.filter((q) => q.category !== 'daily'), ...createDailyQuests(today)],
            dailyDay: today,
            lastDaySummary: result.summary,
            ...(opening ? { timePhaseIndex: 0 } : {}),
            ...(busy ? {} : { activeModal: 'summary' as const }),
          }));
          soundFX.questClaim();
          if (!opening) get().showToast('🌅 Ngày mới!', 'text-amber-300');
          get().syncToCloud();
        },

        closeDaySummary: () =>
          set((s) => ({
            activeModal: giftDay(s.lastGiftDate, s.loginStreak, todayKey()) !== null ? 'dailyGift' : null,
          })),

        showDayCountdown: () => {
          const { playerPos } = get();
          get().showToast(
            `🏠 Ngày mới bắt đầu lúc 0 giờ (còn ${formatDuration(msUntilNextDay(clockNow()))})`,
            'text-amber-300',
            [playerPos.x, 1.6, playerPos.z]
          );
        },
```

- [ ] **Step 4: Save mới, thư chào mừng, save "còn mới"**

`src/lib/mail.ts`: `export const welcomeLetter = (): Letter => ({` → `export const welcomeLetter = (day = 1): Letter => ({`;
`day: 1,` (trong thư này) → `day,`; câu `'… Cứ xới đất, gieo hạt, tưới nước rồi đi ngủ là cây lớn. ' +` →
`'… Cứ xới đất, gieo hạt, tưới nước rồi chờ cây lớn, chạm vào cây là biết còn bao lâu nữa chín. ' +`.

`src/lib/newGame.ts`: import `gameDayAt` cùng `now as clockNow`; trong `createNewGameSave` thêm `const day = gameDayAt(at);`
ngay dưới `const at = clockNow();`, và đổi `day: 1,` → `day,`, `quests: createInitialQuests(1),` →
`quests: createInitialQuests(day),`, `dailyDay: 1,` → `dailyDay: day,`, `mail: [welcomeLetter()],` → `mail: [welcomeLetter(day)],`.

`src/lib/saveData.ts`:

```ts
// A new game nobody has played yet: nothing to lose by replacing it with a cloud save (every day played counts
// towards an achievement, so a save that went through a day is not fresh)
export function isFreshSave(save: Pick<SaveData, 'quests'>) {
  return save.quests.every((q) => !q.claimed && q.progress === 0);
}
```
`src/lib/saveData.test.ts`, test 'is not fresh once a day has passed' →

```ts
  it('is not fresh once a day has been played', () => {
    const save = createNewGameSave();
    const quests = save.quests.map((q) => (q.id === 'a_days' ? { ...q, progress: 1 } : q));
    expect(isFreshSave({ ...save, quests })).toBe(false);
  });
```

- [ ] **Step 5: Giao diện**

`src/app/page.tsx`: xoá khối mở quà lúc mount (comment `// Greet the player with today's gift …`, `const s = …` và
`if (…) s.setActiveModal('dailyGift');`), giữ `setMounted(true);`; bỏ import `giftDay`/`todayKey` nếu không còn dùng.

`src/components/hud/TopBar.tsx` (`WhereWhen`): xoá `const nextDay = useGameStore((s) => s.nextDay);` và nút 🛌; khối nút
còn lại:

```tsx
      <button
        onClick={cycleTimeOfDay}
        title="Đổi giờ: Sáng → Trưa → Hoàng Hôn → Đêm"
        aria-label="Đổi giờ trong ngày"
        className="game-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-indigo-900 bg-indigo-500 text-sm hover:bg-indigo-400"
      >
        🌤️
      </button>
```
(thay cả `<div className="flex shrink-0 flex-col gap-1">…</div>`). Dòng ngày: `Ngày {day} • {TIME_PHASES[timePhaseIndex].label}` →
`{dayLabel(day)} • {TIME_PHASES[timePhaseIndex].label}`; thêm `dayLabel` vào import `@/lib/clock` (thêm dòng import nếu
chưa có). Comment trên `WhereWhen`: `next to the buttons that move time on` → `next to the time-of-day button`.

`src/components/canvas/worlds/FarmWorld.tsx`: `const nextDay = useGameStore((s) => s.nextDay);` →
`const showDayCountdown = useGameStore((s) => s.showDayCountdown);`;

```ts
  const house = interactable(
    'Nhà Nông Trại (Ngủ qua ngày)',
    goTo(houseX, houseZ, REACH.house, nextDay)
  );
```
→
```ts
  const house = interactable('Nhà Nông Trại', goTo(houseX, houseZ, REACH.house, showDayCountdown));
```

`src/components/hud/modals/DaySummaryModal.tsx`:
- Import thêm `import { dayLabel } from '@/lib/clock';`.
- `const setActiveModal = …; const close = () => setActiveModal(null);` → `const close = useGameStore((s) => s.closeDaySummary);`.
- `const today = summary.day + 1;` → `const today = summary.day;`.
- Tiêu đề: `{season.icon} Ngày {today} - {season.name}` → `{season.icon} {dayLabel(today)} - {season.name}`.
- Dòng `Bạn đã nghỉ ngơi khỏe khoắn và hồi phục 100% Thể lực.` →
  `{summary.daysPassed > 1 ? `Bạn vắng ${summary.daysPassed} ngày, nông trại vẫn chạy đều nè!` : 'Chào buổi sáng! Đây là những gì đã diễn ra đêm qua.'}`.
- Xoá ba khối: `🌱 Cây lớn thêm đêm qua`, `💦 Bình phun đã tưới sẵn` (`summary.sprinklerWatered`), `🏭 Mẻ chế biến đã xong`
  (`summary.batchesReady`).

- [ ] **Step 6: Đổi test đang gọi `nextDay`**

Trong `src/store/{beehive,economy,food,mail,orders,pets,tools,trees,weather}.test.ts`: thêm ngay dưới
`const store = () => useGameStore.getState();`:

```ts
// The farm turned over to the next morning, as the clock does at midnight
const nextDay = () => store().startNewDay(store().day + 1);
```
rồi đổi mọi `store().nextDay();` → `nextDay();`. Riêng:
- `economy.test.ts`, test 'finishes every batch overnight' → đổi thành:

```ts
  it('leaves a batch on its own time over a new day', () => {
    withPlacedOven();
    useGameStore.setState({ items: { pumpkin: 1, egg: 1, wheat: 1 } });
    store().startRecipe('pumpkin_pie');
    const readyAt = store().machines.machine_oven?.job?.readyAt;
    nextDay();
    expect(store().machines.machine_oven?.job?.readyAt).toBe(readyAt);
  });
```
- `food.test.ts` (test có `energy: 120` + `nextDay`): giữ nguyên kỳ vọng `energy` = 100 (Task 7 kéo về mức thường).
- `mail.test.ts`: trong `beforeEach`, sau `vi.setSystemTime(new Date(2026, 11, 5, 10, 0));` thêm
  `useGameStore.setState({ day: gameDayAt(Date.now()) });` (import `gameDayAt` từ `@/lib/clock`); test 'brings a festival's
  letter…': sau `vi.setSystemTime(new Date(2026, 11, 20, 10, 0));` thêm `useGameStore.setState({ day: gameDayAt(Date.now()) - 1 });`
  (ngày trong game giờ là ngày thật, nên lá thư theo ngày của buổi sáng).

- [ ] **Step 7: Chạy, phải qua**

Run: `npx vitest run src/lib/dayCycle.test.ts src/store/newDay.test.ts src/store src/lib/saveData.test.ts`
Expected: PASS.

- [ ] **Step 8: Toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`; `git grep -n "nextDay" -- src` chỉ còn hàm `nextDay` cục bộ trong các test.
Expected: PASS, tsc sạch.

---

### Task 8: Nhiệm vụ và chữ

**Files:**
- Modify: `src/config/quests.ts`; Test: `src/lib/quests.test.ts`
- Modify: `src/components/hud/modals/InventoryModal.tsx`, `src/components/hud/modals/QuestModal.tsx`,
  `src/components/hud/TopBar.tsx` (`BuffBadge`), `src/components/hud/modals/MailModal.tsx`,
  `src/components/hud/modals/CloudConflictModal.tsx`, `src/components/hud/modals/VisitModal.tsx`, `src/store/useGameStore.ts`
  (toast tải Cloud)

**Interfaces:**
- Consumes: `dayLabel` (Task 1), `activeMainQuest`, `reconcileQuests`, `createInitialQuests` (`@/lib/quests`), `levelInfo`.

- [ ] **Step 1: Viết test hỏng** — thêm vào `src/lib/quests.test.ts` (import `activeMainQuest`, `createInitialQuests`,
  `reconcileQuests` nếu chưa có):

```ts
describe('the story without sleeping', () => {
  it('goes from watering straight to the first harvest', () => {
    const ids = createInitialQuests(1).filter((q) => q.category === 'main').map((q) => q.id);
    expect(ids[ids.indexOf('m_water') + 1]).toBe('m_harvest');
  });

  it('moves a save that stopped at "Giấc Ngủ Ngon" on to the first harvest', () => {
    const saved = createInitialQuests(1).map((q) =>
      ['m_till', 'm_plant', 'm_water'].includes(q.id) ? { ...q, claimed: true } : q
    );
    const withSleep = [...saved, { ...saved[0], id: 'm_sleep', title: 'Giấc Ngủ Ngon', type: 'sleep' as const, claimed: false }];
    expect(activeMainQuest(reconcileQuests(withSleep, 1))?.id).toBe('m_harvest');
  });

  it('counts days visited, not nights slept', () => {
    expect(createInitialQuests(1).find((q) => q.id === 'a_days')?.desc).toBe('Ghé nông trại vào 3 ngày khác nhau.');
  });
});
```

Run: `npx vitest run src/lib/quests.test.ts`
Expected: FAIL (còn `m_sleep`, mô tả cũ).

- [ ] **Step 2: Nhiệm vụ** — `src/config/quests.ts`: xoá dòng `{ id: 'm_sleep', … },`; mô tả `m_harvest` →
`'Thu hoạch 5 nông sản chín (5 cây đầu tiên chỉ mất 5 phút).'`; mô tả `a_days` → `'Ghé nông trại vào {n} ngày khác nhau.'`.

- [ ] **Step 3: Chữ**
- `InventoryModal.tsx`: comment ví dụ `… đến khi ngủ"` → `… đến hết ngày"`; trong `foodLabel` `đến khi ngủ` → `đến hết ngày`;
  subtitle → `"Gửi Rương để bán đủ giá lúc 0 giờ, hoặc Bán Ngay lấy tiền liền với 70% giá"`; `đến khi ngủ. Ăn món khác…` →
  `đến hết ngày. Ăn món khác…`; `Đủ giá khi Qua Ngày` → `Đủ giá lúc 0 giờ`; `Dự kiến thu về khi Qua Ngày:` →
  `Dự kiến thu về lúc 0 giờ:`.
- `QuestModal.tsx`: `🔄 Nhiệm vụ hằng ngày của Ngày {day}: đổi mới mỗi khi bạn Qua Ngày.` →
  `🔄 Nhiệm vụ hằng ngày hôm nay ({dayLabel(day)}): đổi mới lúc 0 giờ.` (import `dayLabel` từ `@/lib/clock`).
- `TopBar.tsx` (`BuffBadge`): `${effect.effect} đến khi đi ngủ` → `${effect.effect} đến hết ngày`.
- `MailModal.tsx`: hai chỗ `Ngày {letter.day}` / `Ngày {open.day}` → `{dayLabel(letter.day)}` / `{dayLabel(open.day)}`
  (import `dayLabel`).
- `CloudConflictModal.tsx`: prop `day: number` của `FarmCard` → `level: number`; `<div>📅 Ngày {day}</div>` →
  `<div>⭐ Cấp {level}</div>`; phía dùng: `const day = useGameStore((s) => s.day);` →
  `const level = useGameStore((s) => levelInfo(s.xp).level);`, `day={day}` → `level={level}`,
  `day={cloudFarm.day}` → `level={levelInfo(cloudFarm.xp).level}` (import `levelInfo` từ `@/lib/leveling`).
- `VisitModal.tsx`: `Cấp {entry.level} • Ngày {entry.day}` → `Cấp {entry.level}`; xoá thẻ
  `<span className="rounded-full bg-amber-200 px-2 py-0.5">📅 Ngày {farm.day}</span>`.
- `useGameStore.ts` (`applyCloudSave`): `` `☁️ Đã tải nông trại từ Cloud (Ngày ${save.day})` `` → `'☁️ Đã tải nông trại từ Cloud!'`.
- Kiểm: `git grep -n "Qua Ngày\|đi ngủ\|khi ngủ\|mỗi sáng tự tưới\|Ngày {" -- src` chỉ còn chữ về đồ ngủ trong cosmetics
  (nếu còn chỗ khác, sửa theo cùng nghĩa).

- [ ] **Step 4: Chạy, phải qua**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS, tsc sạch.

---

### Task 9: Chuyển save v5 → v6

**Files:**
- Modify: `src/lib/saveData.ts`; Test: `src/lib/saveData.test.ts`

**Interfaces:**
- Consumes: `now`, `gameDayAt` (Task 1); `cycleMs`, `waterTile` (Task 3).
- Produces: `SAVE_VERSION = 6`; `migrateSave(raw, version, at = now())`.

- [ ] **Step 1: Viết test hỏng** — thêm vào `src/lib/saveData.test.ts` (import `gameDayAt` từ `@/lib/clock`,
  `StoredSave` từ `@/lib/saveData`):

```ts
describe('migrateSave from version 5', () => {
  const T = Date.UTC(2026, 9, 20, 3);
  const HOUR = 3_600_000;
  const v5 = () => {
    const save = createNewGameSave();
    return {
      ...save,
      day: 12,
      tiles: save.tiles.map((t) =>
        t.id === '6-6'
          ? { ...t, state: 'planted', crop: 'carrot', stage: 1, watered: true, daysWatered: 0 }
          : t.id === '6-7'
            ? { ...t, state: 'planted', crop: 'pumpkin', stage: 2, watered: false, daysWatered: 1 }
            : t.id === '6-8'
              ? { ...t, state: 'planted', crop: 'tomato', stage: 3, watered: true, daysWatered: 0 }
              : t
      ),
      buildPieces: [{ kind: 'orange_tree', x: 1, z: 1, rotY: 0, planted: 10, fruit: 0 }],
      mail: [{ ...save.mail[0], day: 11 }],
      buff: { id: 'swift', food: 'carrot_juice', day: 12 },
      energyAt: undefined,
      fastCropsLeft: undefined,
    };
  };
  const tileOf = (save: StoredSave, id: string) => save.tiles?.find((t) => t.id === id);

  it('starts the watered crops on the clock and leaves the dry ones waiting', () => {
    const save = migrateSave(v5(), 5, T);
    expect(tileOf(save, '6-6')).toMatchObject({ watered: true, readyAt: T + HOUR, midAt: T + HOUR / 2 });
    expect(tileOf(save, '6-7')).toMatchObject({ watered: false, growMs: 12 * HOUR, readyAt: null });
    expect(tileOf(save, '6-8')).toMatchObject({ stage: 3 });
    expect(tileOf(save, '6-6')).not.toHaveProperty('daysWatered');
  });

  it('opens on yesterday, so the first tick brings a morning report; trees and letters keep their age', () => {
    const save = migrateSave(v5(), 5, T);
    expect(save.day).toBe(gameDayAt(T) - 1);
    expect(save.buildPieces?.[0].planted).toBe(gameDayAt(T) - 3);
    expect(save.mail?.[0].day).toBe(gameDayAt(T) - 2);
  });

  it('counts stamina from now, gives no five-minute crops and forgets the dish', () => {
    expect(migrateSave(v5(), 5, T)).toMatchObject({ energyAt: T, fastCropsLeft: 0, buff: null });
  });
});
```
Sửa test 'fills fields missing from an older cloud save…': `expect(save.day).toBe(7);` →
`expect(save.day).toBe(gameDayAt(Date.now()) - 1);`.

Run: `npx vitest run src/lib/saveData.test.ts`
Expected: FAIL.

- [ ] **Step 2: Viết code** — `src/lib/saveData.ts`
- Import: `TileData` (từ `@/types/game`), `import { gameDayAt, now as clockNow } from '@/lib/clock';`,
  `import { cycleMs, waterTile } from '@/lib/growth';`.
- `export const SAVE_VERSION = 5;` → `export const SAVE_VERSION = 6;`.
- Ngay dưới `fromV4`:

```ts
// v5 saves ran on days slept through: crops grow on the clock now, stamina comes back by itself and the day is the
// date in Vietnam. The save opens as if a night just went by (so on a morning report); fruit trees and letters keep
// their age.
function fromV5(saved: StoredSave, at: number): StoredSave {
  const day = gameDayAt(at) - 1;
  const shift = day - (saved.day ?? 1);
  // Only what the save holds is converted: anything it lacks is filled in as in a new game (saveFromCloud)
  return {
    ...saved,
    day,
    ...(saved.tiles && {
      tiles: saved.tiles.map((t) => {
        const { daysWatered: _daysWatered, ...tile } = t as TileData & { daysWatered?: number };
        if (tile.state !== 'planted' || !tile.crop || tile.stage >= 3) return tile;
        const waiting: TileData = { ...tile, watered: false, growMs: cycleMs(tile), readyAt: null, midAt: null };
        return tile.watered ? waterTile(waiting, at) : waiting;
      }),
    }),
    energyAt: at,
    fastCropsLeft: 0,
    buff: null,
    ...(saved.buildPieces && {
      buildPieces: saved.buildPieces.map((p) => (p.planted === undefined ? p : { ...p, planted: p.planted + shift })),
    }),
    ...(saved.mail && { mail: saved.mail.map((letter) => ({ ...letter, day: letter.day + shift })) }),
  };
}
```
- `migrateSave`: chữ ký → `export function migrateSave(raw: Record<string, unknown>, version: number, at = clockNow()): StoredSave {`;
  thêm `if (version < 6) save = fromV5(save, at);` ngay dưới dòng `if (version < 5) …`.

- [ ] **Step 3: Chạy, phải qua**

Run: `npx vitest run src/lib/saveData.test.ts src/store/persistence.test.ts`
Expected: PASS.

- [ ] **Step 4: Toàn bộ test + kiểu**

Run: `npx vitest run` rồi `npx tsc --noEmit`
Expected: PASS, tsc sạch.

---

### Task 10: Kiểm chứng trên trình duyệt, build, hiệu năng, commit

**Files:**
- Modify (scratchpad): `$SP/perf/sync.sh` (lộ `__clock` cho script), Create: `$SP/perf/realtime.mjs`

- [ ] **Step 1: Harness đồng hồ (chỉ bản sao scratchpad)** — thêm cuối `$SP/perf/sync.sh`:

```bash
# Expose the game clock (scratch copy only) so the harness can wind time forward in a production build
CL=$APP/src/lib/clock.ts
if [ -f $CL ]; then
  printf "\n// PERF HARNESS ONLY (scratch copy)\nif (typeof window !== 'undefined') (window as unknown as { __clock: unknown }).__clock = { skip: skipClock, now };\n" >> $CL
  grep -c "__clock" $CL
fi
```

- [ ] **Step 2: Build hai bản trong scratchpad (không build trong repo)**

```bash
bash $SP/perf/sync.sh /d/projects/sunny-farm-3d $SP/app
rm -rf $SP/base-src/src && git -C /d/projects/sunny-farm-3d archive HEAD src | tar -x -C $SP/base-src
bash $SP/perf/sync.sh $SP/base-src $SP/app-base
(cd $SP/app && node node_modules/next/dist/bin/next build)
(cd $SP/app-base && node node_modules/next/dist/bin/next build)
```
Expected: cả hai build xong không lỗi. Rồi chạy nền hai server (chỉ dừng tiến trình cũ trên 3123/3124 nếu dòng lệnh của nó
chứa `scratchpad`):
`cd $SP/app && exec node node_modules/next/dist/bin/next start -p 3123` và
`cd $SP/app-base && exec node node_modules/next/dist/bin/next start -p 3124`.

- [ ] **Step 3: Script kiểm chứng** — tạo `$SP/perf/realtime.mjs`

```js
// Real-time farming in the production build (scratch copy with the harness): crops, stamina, midnight, old saves
// usage: node realtime.mjs [url=http://localhost:3123]
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:3123';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--window-position=2560,0', '--window-size=1600,1000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
};
const ready = (page) =>
  page.waitForFunction(() => window.__game && window.__r3f && window.__clock && document.querySelector('canvas'), null, { timeout: 60000 });
const tick = (page) => page.waitForTimeout(5600);
const errors = [];

const context = await browser.newContext({ viewport: null });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'load' });
await ready(page);
await tick(page);

const start = await page.evaluate(() => {
  const s = window.__game.getState();
  return { modal: s.activeModal, fast: s.fastCropsLeft, energyAt: s.energyAt > 0 };
});
check('a new game opens on today without a morning report', start.modal !== 'summary' && start.fast === 5 && start.energyAt, JSON.stringify(start));

const skew = await page.evaluate(async () => (await (await fetch('/api/time', { cache: 'no-store' })).json()).now - Date.now());
check('/api/time answers with the server time', Math.abs(skew) < 5000, `${skew} ms`);

// Sow the starter field's tilled tile: it waits for water and shows a drop (unless today is wet)
await page.evaluate(() => {
  const g = window.__game;
  g.setState({ activeModal: null });
  g.getState().setActiveTool('seed_carrot');
  g.getState().interactTile(8, 8);
});
const sown = await page.evaluate(() => {
  const tile = window.__game.getState().tiles.find((t) => t.id === '8-8');
  let drops = 0;
  window.__r3f().scene.traverse((o) => {
    if (o.geometry?.type === 'ConeGeometry' && o.geometry.parameters.radius === 0.09) drops++;
  });
  return { watered: tile.watered, state: tile.state, drops };
});
check(
  'a sown tile waits for water with a drop over it (or the rain watered it)',
  sown.state === 'planted' && (sown.watered ? sown.drops === 0 : sown.drops === 1),
  JSON.stringify(sown)
);

await page.evaluate(() => {
  const s = window.__game.getState();
  s.setActiveTool('water');
  s.interactTile(8, 8);
});
const wet = await page.evaluate(() => {
  const tile = window.__game.getState().tiles.find((t) => t.id === '8-8');
  return { watered: tile.watered, left: tile.readyAt - window.__clock.now() };
});
check("a new player's crop ripens in five minutes", wet.watered && wet.left > 4.5 * 60_000 && wet.left <= 5 * 60_000, JSON.stringify(wet));

await page.evaluate(() => window.__clock.skip(5 * 60_000 + 1000));
await tick(page);
const ripe = await page.evaluate(() => window.__game.getState().tiles.find((t) => t.id === '8-8').stage);
check('five minutes later it is ripe', ripe === 3, `stage ${ripe}`);

// Stamina comes back by itself
await page.evaluate(() => window.__game.setState({ energy: 50, energyAt: window.__clock.now() }));
await page.evaluate(() => window.__clock.skip(9 * 60_000));
await tick(page);
const energy = await page.evaluate(() => window.__game.getState().energy);
check('stamina comes back a point every three minutes', energy === 53, `${energy}`);

// The farmhouse tells when the new day begins
await page.evaluate(() => window.__game.getState().showDayCountdown());
const label = await page.evaluate(() => window.__game.getState().floatingLabels.map((l) => l.text).join(' | '));
check('the farmhouse tells when the new day begins', label.includes('Ngày mới bắt đầu lúc 0 giờ'), label);

// Midnight while playing: the day turns over and the report opens; closing it brings the day's gift
const before = await page.evaluate(() => window.__game.getState().day);
await page.evaluate(() => {
  window.__game.setState({ activeModal: null });
  const now = window.__clock.now();
  window.__clock.skip(86_400_000 - ((now + 7 * 3_600_000) % 86_400_000) + 1000);
});
await tick(page);
const midnight = await page.evaluate(() => {
  const s = window.__game.getState();
  return { day: s.day, modal: s.activeModal, summary: s.lastDaySummary };
});
check(
  'midnight turns the day over and opens the morning report',
  midnight.day === before + 1 && midnight.modal === 'summary' && midnight.summary?.daysPassed === 1,
  JSON.stringify({ day: midnight.day, modal: midnight.modal, passed: midnight.summary?.daysPassed })
);
await page.screenshot({ path: 'results/rt-summary.png' });
await page.evaluate(() => window.__game.getState().closeDaySummary());
const gift = await page.evaluate(() => window.__game.getState().activeModal);
check("closing the report brings the new day's gift", gift === 'dailyGift', String(gift));

// Opening the game after two days away
await page.evaluate(() => {
  const g = window.__game;
  g.setState({ activeModal: null, clockStarted: false, day: g.getState().day - 2, timePhaseIndex: 2 });
});
await tick(page);
const away = await page.evaluate(() => {
  const s = window.__game.getState();
  return { modal: s.activeModal, passed: s.lastDaySummary?.daysPassed, phase: s.timePhaseIndex };
});
check('opening after two days away shows a two-day report in the morning light', away.modal === 'summary' && away.passed === 2 && away.phase === 0, JSON.stringify(away));
await page.evaluate(() => window.__game.setState({ activeModal: null }));
await page.screenshot({ path: 'results/rt-topbar.png', clip: { x: 0, y: 0, width: 1600, height: 140 } });

// An old (v5) save from before real time
const old = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('sunny-farm-3d-v3'));
  const st = raw.state;
  st.tiles = st.tiles.map((t) => {
    const { growMs, midAt, readyAt, ...rest } = t;
    return t.id === '6-6'
      ? { ...rest, state: 'planted', crop: 'pumpkin', stage: 1, watered: true, daysWatered: 0 }
      : { ...rest, daysWatered: 0 };
  });
  st.day = 12;
  delete st.energyAt;
  delete st.fastCropsLeft;
  return { state: st, version: 5 };
});
const context2 = await browser.newContext({ viewport: null });
await context2.addInitScript((save) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('sunny-farm-3d-v3', JSON.stringify(save));
    sessionStorage.setItem('seeded', '1');
  }
}, old);
const page2 = await context2.newPage();
page2.on('pageerror', (e) => errors.push(String(e)));
await page2.goto(url, { waitUntil: 'load' });
await ready(page2);
await tick(page2);
const migrated = await page2.evaluate(() => {
  const s = window.__game.getState();
  const tile = s.tiles.find((t) => t.id === '6-6');
  return { modal: s.activeModal, left: tile.readyAt - window.__clock.now(), daysWatered: 'daysWatered' in tile, fast: s.fastCropsLeft };
});
check(
  'an old save is converted and opens on a morning report',
  migrated.modal === 'summary' && migrated.left > 23 * 3_600_000 && !migrated.daysWatered && migrated.fast === 0,
  JSON.stringify(migrated)
);

check('no page errors', errors.length === 0, errors.join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
```

Run: `cd $SP/perf && node realtime.mjs`
Expected: `11/11 passed`. Xem `results/rt-summary.png`, `results/rt-topbar.png`: thanh trên cùng không còn 🛌, dòng ngày
dạng "Thứ … dd/mm"; bảng tổng kết có tiêu đề ngày, dòng "Chào buổi sáng!" hoặc "Bạn vắng 2 ngày".

- [ ] **Step 4: Hiệu năng và hình ảnh**

Bản mới tính ngày theo giờ thật (mùa, thời tiết, tuyết có thể khác bản HEAD đang ở Ngày 1), nên ghim cùng một ngày ở cả
hai bản trước khi đo. Trong `$SP/perf/ab.mjs`, hàm `measureOnce`: đối số của `page.evaluate` đầu tiên
`[world, save === 'heavy']` → `[world, save === 'heavy', +(flags.day ?? 400)]`; tham số `([w, heavy]) =>` →
`([w, heavy, day]) =>`; ngay sau `s.setActiveModal(null);` thêm `g.setState({ day });` (Ngày 400 ở sau hôm nay nên bản mới
không sang ngày giữa chừng).

Run: `cd $SP/perf && node ab.mjs --rounds=2 --cases=farm:idle:new,farm:walk:new,farm:walk:heavy,farm:hover:heavy`
Expected: `calls` của bản mới (3123) bằng bản HEAD (3124) ở mọi trường hợp (giọt nước được gộp, không thêm lần vẽ);
fps/p99 chênh trong mức nhiễu giữa các vòng.

Run: `cd $SP/perf && node pixeldiff.mjs farm heavy rt`
Expected: ảnh khi đã gộp và khi tách gần như trùng (chỉ vài điểm ảnh ở cạnh như các lần trước), tức giọt nước gộp đúng.

- [ ] **Step 5: Báo cáo và hỏi commit**

Tổng kết cho người dùng: số test (vitest), kết quả `realtime.mjs`, bảng `ab.mjs`, ảnh chụp. Hỏi có commit thẳng lên `main`
không (theo lựa chọn lần trước). Nếu đồng ý: `git add` các file đã đổi + spec + plan, commit một lần với message
`Cây lớn theo giờ thật, thể lực tự hồi, sang ngày lúc 0 giờ` (kèm dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
không push nếu người dùng chưa bảo.
