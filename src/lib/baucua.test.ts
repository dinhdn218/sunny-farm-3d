import { describe, expect, it } from 'vitest';
import { BauCuaFace } from '@/types/game';
import { BAU_CUA_FACES } from '@/config/baucua';
import { bauCuaPayout, betProblem, rollBauCua, totalBet } from '@/lib/baucua';

const FACES = BAU_CUA_FACES.map((f) => f.id);

describe('rollBauCua', () => {
  it('throws three dice, each on one of the six faces', () => {
    expect(rollBauCua(() => 0)).toEqual(['nai', 'nai', 'nai']);
    expect(rollBauCua(() => 0.999)).toEqual(['tom', 'tom', 'tom']);
    const values = [0.2, 0.5, 0.75];
    let i = 0;
    expect(rollBauCua(() => values[i++])).toEqual(['bau', 'ca', 'cua']);
  });
});

describe('bauCuaPayout', () => {
  it('pays back the stake and as much again for every die showing the face', () => {
    expect(bauCuaPayout({ cua: 10 }, ['nai', 'ga', 'tom'])).toBe(0);
    expect(bauCuaPayout({ cua: 10 }, ['cua', 'ga', 'tom'])).toBe(20);
    expect(bauCuaPayout({ cua: 10 }, ['cua', 'cua', 'tom'])).toBe(30);
    expect(bauCuaPayout({ cua: 10 }, ['cua', 'cua', 'cua'])).toBe(40);
  });

  it('settles every square on the mat', () => {
    // Nai lost, Cá once, Tôm twice
    expect(bauCuaPayout({ nai: 50, ca: 10, tom: 20 }, ['ca', 'tom', 'tom'])).toBe(20 + 60);
  });

  it('leaves the house about 8% of what is staked', () => {
    const all: BauCuaFace[][] = FACES.flatMap((a) => FACES.flatMap((b) => FACES.map((c) => [a, b, c])));
    expect(all).toHaveLength(216);
    const back = all.reduce((sum, dice) => sum + bauCuaPayout({ ga: 1 }, dice), 0) / all.length;
    // 199 out of every 216 staked comes back
    expect(back).toBeCloseTo(199 / 216);
  });
});

describe('betProblem', () => {
  it('lets a round go ahead with something on the mat, no more than 500 and no more than the purse', () => {
    expect(betProblem({ nai: 100, bau: 50 }, 1000)).toBeNull();
    expect(totalBet({ nai: 100, bau: 50 })).toBe(150);
    expect(betProblem({}, 1000)).not.toBeNull();
    expect(betProblem({ nai: 300, ga: 210 }, 1000)).not.toBeNull();
    expect(betProblem({ nai: 100 }, 90)).not.toBeNull();
  });

  it('turns away made-up squares and odd amounts', () => {
    expect(betProblem({ rong: 10 } as never, 1000)).not.toBeNull();
    expect(betProblem({ nai: -10, ga: 20 }, 1000)).not.toBeNull();
    expect(betProblem({ nai: 2.5 }, 1000)).not.toBeNull();
  });
});
