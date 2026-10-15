import { describe, expect, it } from 'vitest';
import { BuildPiece } from '@/types/game';
import { STARTER_PLOTS, TILE_SIZE, tileToWorld } from '@/config/farm';
import { BUILD_CELL, pieceAt, snapToCell } from '@/lib/build';
import { FARM_SITES, canPlaceBuildPiece, canPlaceDecor } from '@/lib/farmLayout';

// A patch of grass west of the starting field, clear of the barn, trees and signs
const FREE: [number, number] = [snapToCell(-7.3), snapToCell(0.7)];
const piece = (x: number, z: number, kind: BuildPiece['kind'] = 'fence'): BuildPiece => ({ kind, x, z, rotY: 0 });

describe('build grid', () => {
  it('uses cells the size of a field tile, lined up with the tiles', () => {
    expect(BUILD_CELL).toBe(TILE_SIZE);
    const tile = tileToWorld(3, 5);
    expect(snapToCell(tile.x)).toBeCloseTo(tile.x);
    expect(snapToCell(tile.z + TILE_SIZE * 0.4)).toBeCloseTo(tile.z);
    expect(snapToCell(tile.z + TILE_SIZE * 0.6)).toBeCloseTo(tile.z + TILE_SIZE);
  });

  it('finds the piece standing in a cell', () => {
    const fence = piece(...FREE);
    expect(pieceAt([fence], FREE[0] + 0.3, FREE[1] - 0.3)).toBe(fence);
    expect(pieceAt([fence], FREE[0] + BUILD_CELL, FREE[1])).toBeUndefined();
  });
});

describe('canPlaceBuildPiece', () => {
  it('accepts free grass on the island', () => {
    expect(canPlaceBuildPiece(...FREE, STARTER_PLOTS, {}, [])).toBe(true);
  });

  it('keeps off the field and the buildings', () => {
    expect(canPlaceBuildPiece(snapToCell(0), snapToCell(0), STARTER_PLOTS, {}, [])).toBe(false);
    const [hx, hz] = FARM_SITES.house;
    expect(canPlaceBuildPiece(snapToCell(hx), snapToCell(hz), STARTER_PLOTS, {}, [])).toBe(false);
  });

  it('keeps clear of placed decorations and machines', () => {
    const decor = { decor_scarecrow: { x: FREE[0], z: FREE[1] + 0.5, rotY: 0 } };
    expect(canPlaceBuildPiece(...FREE, STARTER_PLOTS, decor, [])).toBe(false);
  });

  it('allows one piece per cell', () => {
    expect(canPlaceBuildPiece(...FREE, STARTER_PLOTS, {}, [piece(...FREE, 'path')])).toBe(false);
    expect(canPlaceBuildPiece(FREE[0], FREE[1] - BUILD_CELL, STARTER_PLOTS, {}, [piece(...FREE)])).toBe(true);
  });

  it('stays off the sea', () => {
    expect(canPlaceBuildPiece(snapToCell(-17.5), snapToCell(0), STARTER_PLOTS, {}, [])).toBe(false);
  });
});

describe('canPlaceDecor', () => {
  // Open grass east of the field, between the well and the trees
  const EAST: [number, number] = [snapToCell(8.6), snapToCell(4.6)];

  it('no longer lets decorations sit on top of built pieces', () => {
    expect(canPlaceDecor('decor_scarecrow', ...EAST, STARTER_PLOTS, {})).toBe(true);
    expect(canPlaceDecor('decor_scarecrow', ...EAST, STARTER_PLOTS, {}, [piece(...EAST)])).toBe(false);
  });
});
