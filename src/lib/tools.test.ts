import { describe, expect, it } from 'vitest';
import { ToolId } from '@/types/game';
import { CROP_LIST } from '@/config/crops';
import { areaTiles, nextSeedTool, waterCapacity } from '@/lib/tools';

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

describe('nextSeedTool', () => {
  it('takes out the seeds used last when another tool is in hand', () => {
    expect(nextSeedTool('hoe', 'tomato')).toBe('seed_tomato');
  });

  it('goes through every crop in turn and comes back round', () => {
    let tool: ToolId = 'seed_carrot';
    const seen: ToolId[] = [];
    CROP_LIST.forEach(() => {
      tool = nextSeedTool(tool, 'carrot');
      seen.push(tool);
    });
    expect(new Set(seen).size).toBe(CROP_LIST.length);
    expect(tool).toBe('seed_carrot');
  });
});
