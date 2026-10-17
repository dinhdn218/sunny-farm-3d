'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { now as clockNow, skipClock, syncServerTime } from '@/lib/clock';

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
