import { beforeEach, describe, expect, it } from 'vitest';
import { TileData } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { isWet, seasonOf, weatherOf } from '@/lib/seasons';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
// The farm turned over to the next morning, as the clock does at midnight
const nextDay = () => store().startNewDay(store().day + 1);
const tileAt = (id: string) => store().tiles.find((t) => t.id === id) as TileData;

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

// The day before the first day in 2..60 whose weather passes `test`
const dayBefore = (test: (day: number) => boolean) => {
  for (let day = 2; day <= 60; day++) if (test(day)) return day - 1;
  throw new Error('no such day');
};

// Tile 6-6 freshly tilled and dry
const tilledDry66 = () =>
  useGameStore.setState({
    tiles: store().tiles.map((t) => (t.id === '6-6' ? { ...t, state: 'tilled' as const, watered: false } : t)),
  });

describe('morning weather', () => {
  it('rain waters every worked tile', () => {
    tilledDry66();
    useGameStore.setState({ day: dayBefore((d) => weatherOf(d) === 'rain') });
    nextDay();
    expect(tileAt('6-6').watered).toBe(true);
  });

  it('snow waters the fields in winter too', () => {
    tilledDry66();
    useGameStore.setState({ day: dayBefore((d) => weatherOf(d) === 'snow') });
    nextDay();
    expect(tileAt('6-6').watered).toBe(true);
  });

  it('a dry morning leaves the fields to the watering can', () => {
    tilledDry66();
    useGameStore.setState({ day: dayBefore((d) => !isWet(weatherOf(d))) });
    nextDay();
    expect(tileAt('6-6').watered).toBe(false);
  });

  it("reports today's weather and tomorrow's forecast", () => {
    const day = dayBefore((d) => weatherOf(d) === 'rain');
    useGameStore.setState({ day });
    nextDay();
    expect(store().lastDaySummary).toMatchObject({
      weather: 'rain',
      forecast: weatherOf(day + 2),
    });
  });
});

describe('seasonal prices', () => {
  it('pays 20% more overnight for crops sold in their season', () => {
    // Day 1 is spring, the carrot's season
    useGameStore.setState({ day: 1, gold: 0, shippingBin: { carrot: 3 } });
    expect(seasonOf(1)).toBe('spring');
    nextDay();
    expect(store().gold).toBe(3 * 48);
  });
});
