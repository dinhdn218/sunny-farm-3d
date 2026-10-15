import { describe, expect, it } from 'vitest';
import { TileData } from '@/types/game';
import { applySprinklers, areaTiles, waterCapacity } from '@/lib/tools';

const tile = (r: number, c: number, patch: Partial<TileData> = {}): TileData => ({
  id: `${r}-${c}`,
  r,
  c,
  state: 'empty',
  watered: false,
  crop: null,
  stage: 0,
  daysWatered: 0,
  ...patch,
});

describe('areaTiles', () => {
  it('works one tile with a basic tool', () => {
    expect(areaTiles(6, 6, 0)).toEqual([[6, 6]]);
  });

  it('adds the left and right neighbours with a copper tool, clicked tile first', () => {
    expect(areaTiles(6, 6, 1)).toEqual([
      [6, 6],
      [6, 5],
      [6, 7],
    ]);
  });

  it('covers the 3×3 square with a gold tool', () => {
    const area = areaTiles(6, 6, 2);
    expect(area).toHaveLength(9);
    expect(area[0]).toEqual([6, 6]);
    expect(area).toContainEqual([5, 5]);
    expect(area).toContainEqual([7, 7]);
  });

  it('stays inside the field at its edge', () => {
    expect(areaTiles(0, 0, 2)).toHaveLength(4);
  });
});

describe('waterCapacity', () => {
  it('grows with the watering can', () => {
    expect([0, 1, 2].map(waterCapacity)).toEqual([10, 20, 40]);
  });
});

describe('applySprinklers', () => {
  it('waters the worked tiles around each sprinkler', () => {
    const tiles = [
      tile(5, 5, { sprinkler: true }),
      tile(4, 4, { state: 'planted', crop: 'carrot', stage: 1 }),
      tile(6, 5, { state: 'tilled' }),
      tile(5, 6),
      tile(5, 7, { state: 'tilled' }),
    ];
    const watered = applySprinklers(tiles)
      .filter((t) => t.watered)
      .map((t) => t.id);
    expect(watered).toEqual(['4-4', '6-5']);
  });
});
