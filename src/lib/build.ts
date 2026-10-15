import { BuildPiece } from '@/types/game';
import { TILE_SIZE } from '@/config/farm';

// Building pieces sit on a grid of field-tile-sized cells lined up with the field, so they still
// line up after new land (whole plots of tiles) is inserted
export const BUILD_CELL = TILE_SIZE;

// Room a piece takes up around its cell's centre when checking for buildings and decor
export const BUILD_PIECE_RADIUS = 0.5;

// Centre of the cell that contains `v` (tile centres sit at half-cells)
export const snapToCell = (v: number) => (Math.floor(v / BUILD_CELL) + 0.5) * BUILD_CELL;

export const pieceAt = (pieces: BuildPiece[], x: number, z: number) =>
  pieces.find((p) => Math.abs(p.x - x) < BUILD_CELL / 2 && Math.abs(p.z - z) < BUILD_CELL / 2);
