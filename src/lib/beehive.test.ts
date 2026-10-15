import { describe, expect, it } from 'vitest';
import { BuildPiece } from '@/types/game';
import { hiveHoneyToday } from '@/lib/beehive';

const HIVE = { decor_beehive: { x: 10, z: -6, rotY: 0 } };
const OWNED = ['decor_beehive'];
const bed = (x: number, z: number): BuildPiece => ({ kind: 'flowerbed', x, z, rotY: 0 });

describe('hiveHoneyToday', () => {
  it('makes nothing without a hive standing on the farm', () => {
    expect(hiveHoneyToday({}, OWNED, [])).toBe(0);
    expect(hiveHoneyToday(HIVE, [], [])).toBe(0);
  });

  it('makes a jar a day on its own', () => {
    expect(hiveHoneyToday(HIVE, OWNED, [])).toBe(1);
  });

  it('makes a jar more for every two flowerbeds nearby, up to three a day', () => {
    const beds = [bed(11, -6), bed(9, -6), bed(10, -5), bed(10, -7), bed(12, -6), bed(8, -6)];
    expect(hiveHoneyToday(HIVE, OWNED, beds.slice(0, 1))).toBe(1);
    expect(hiveHoneyToday(HIVE, OWNED, beds.slice(0, 2))).toBe(2);
    expect(hiveHoneyToday(HIVE, OWNED, beds.slice(0, 4))).toBe(3);
    expect(hiveHoneyToday(HIVE, OWNED, beds)).toBe(3);
  });

  it('only counts flowerbeds the bees can reach', () => {
    expect(hiveHoneyToday(HIVE, OWNED, [bed(0, 0), bed(1, 0), bed(18, -6), bed(10, 3)])).toBe(1);
  });

  it('only counts flowerbeds, not other building pieces', () => {
    const fences: BuildPiece[] = [
      { kind: 'fence', x: 11, z: -6, rotY: 0 },
      { kind: 'path', x: 9, z: -6, rotY: 0 },
    ];
    expect(hiveHoneyToday(HIVE, OWNED, fences)).toBe(1);
  });
});
