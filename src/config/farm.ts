export const GRID_SIZE = 8;
export const TILE_SIZE = 1.32;
export const GRID_OFFSET = ((GRID_SIZE - 1) * TILE_SIZE) / 2;

// Rows run along z and columns along x, centred on the island like the HTML version
export function tileToWorld(r: number, c: number) {
  return { x: c * TILE_SIZE - GRID_OFFSET, z: r * TILE_SIZE - GRID_OFFSET };
}

export function worldToTile(x: number, z: number) {
  const c = Math.round((x + GRID_OFFSET) / TILE_SIZE);
  const r = Math.round((z + GRID_OFFSET) / TILE_SIZE);
  if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
  return { r, c };
}
