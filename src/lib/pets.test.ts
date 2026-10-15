import { describe, expect, it } from 'vitest';
import { TileData } from '@/types/game';
import { CROPS } from '@/config/crops';
import { ROBO_CAT_TILES, reelZoneScale, roboCatWater, shibaFind } from '@/lib/pets';

const days = Array.from({ length: 400 }, (_, i) => i + 2);

const tile = (id: string, over: Partial<TileData> = {}): TileData => ({
  id,
  r: 0,
  c: 0,
  state: 'planted',
  watered: false,
  crop: 'carrot',
  stage: 1,
  daysWatered: 0,
  ...over,
});

describe('shibaFind', () => {
  it('is fixed for each day, so reloading never changes the gift', () => {
    expect(days.map(shibaFind)).toEqual(days.map(shibaFind));
  });

  it('digs up seeds, gold, bread and now and then gems', () => {
    const kinds = new Set(days.map((d) => shibaFind(d).kind));
    expect(Array.from(kinds).sort()).toEqual(['bread', 'gems', 'gold', 'seeds']);
  });

  it('finds gems only rarely', () => {
    const gems = days.filter((d) => shibaFind(d).kind === 'gems').length;
    expect(gems / days.length).toBeLessThan(0.15);
  });

  it('brings small amounts: 15–40 gold, 1–2 seeds of a real crop, 1–2 gems', () => {
    days.forEach((d) => {
      const find = shibaFind(d);
      if (find.kind === 'gold') expect(find.amount).toBeGreaterThanOrEqual(15);
      if (find.kind === 'gold') expect(find.amount).toBeLessThanOrEqual(40);
      if (find.kind === 'seeds') {
        expect(CROPS[find.crop]).toBeDefined();
        expect([1, 2]).toContain(find.count);
      }
      if (find.kind === 'gems') expect([1, 2]).toContain(find.amount);
    });
  });
});

describe('roboCatWater', () => {
  it(`waters at most ${ROBO_CAT_TILES} dry tiles`, () => {
    const tiles = Array.from({ length: 10 }, (_, i) => tile(`t${i}`));
    const { tiles: after, watered } = roboCatWater(tiles);
    expect(watered).toBe(ROBO_CAT_TILES);
    expect(after.filter((t) => t.watered)).toHaveLength(ROBO_CAT_TILES);
  });

  it('waters growing crops before bare tilled soil', () => {
    const tiles = [
      ...Array.from({ length: 4 }, (_, i) => tile(`soil${i}`, { state: 'tilled', crop: null, stage: 0 })),
      ...Array.from({ length: 5 }, (_, i) => tile(`crop${i}`)),
    ];
    const { tiles: after } = roboCatWater(tiles);
    expect(after.filter((t) => t.watered && t.state === 'planted')).toHaveLength(5);
    expect(after.filter((t) => t.watered && t.state === 'tilled')).toHaveLength(1);
  });

  it('skips untouched grass, sprinklers, ripe crops and tiles already wet', () => {
    const tiles = [
      tile('grass', { state: 'empty', crop: null, stage: 0 }),
      tile('sprinkler', { state: 'tilled', crop: null, stage: 0, sprinkler: true }),
      tile('ripe', { stage: 3 }),
      tile('wet', { watered: true }),
    ];
    const { tiles: after, watered } = roboCatWater(tiles);
    expect(watered).toBe(0);
    expect(after).toEqual(tiles);
  });
});

describe('reelZoneScale', () => {
  it('widens the catch zone by a quarter when the bat is out at night', () => {
    expect(reelZoneScale('bat_pet', 'night')).toBe(1.25);
  });

  it('leaves it alone by day or with another pet', () => {
    expect(reelZoneScale('bat_pet', 'noon')).toBe(1);
    expect(reelZoneScale('shiba_inu', 'night')).toBe(1);
  });
});
