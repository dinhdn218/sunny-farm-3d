import { describe, expect, it } from 'vitest';
import { BuildPiece } from '@/types/game';
import { ripenTrees } from '@/lib/trees';

// Mango trees take 6 days to grow
const mango = (planted: number, fruit = 0): BuildPiece => ({ kind: 'mango_tree', x: 1, z: 1, rotY: 0, planted, fruit });
const fence: BuildPiece = { kind: 'fence', x: 3, z: 1, rotY: 0 };

describe('ripenTrees', () => {
  it('bears nothing while the tree is still young', () => {
    expect(ripenTrees([mango(1)], 6).pieces[0].fruit).toBe(0);
  });

  it('adds a fruit every morning once the tree has grown', () => {
    const day7 = ripenTrees([mango(1)], 7);
    expect(day7.pieces[0].fruit).toBe(1);
    expect(day7.ripened).toBe(1);
    expect(ripenTrees(day7.pieces, 8).pieces[0].fruit).toBe(2);
  });

  it('holds at most three fruit', () => {
    const full = ripenTrees([mango(1, 3)], 20);
    expect(full.pieces[0].fruit).toBe(3);
    expect(full.ripened).toBe(0);
  });

  it('leaves the other building pieces alone', () => {
    expect(ripenTrees([fence, mango(1)], 9).pieces[0]).toBe(fence);
  });
});
