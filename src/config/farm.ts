// The farm field is a 4×4 grid of land plots (lô đất), each 4×4 tiles.
// The centre 2×2 plots (the original 8×8 field) are owned from the start; the rest are bought with gold.
export const PLOT_TILES = 4;
export const PLOTS_PER_SIDE = 4;
export const GRID_SIZE = PLOT_TILES * PLOTS_PER_SIDE;
export const TILE_SIZE = 1.32;
export const GRID_OFFSET = ((GRID_SIZE - 1) * TILE_SIZE) / 2;
export const PLOT_SIZE = PLOT_TILES * TILE_SIZE;
export const FIELD_BORDER = 0.45;

export const STARTER_PLOTS = ['1-1', '2-1', '1-2', '2-2'];

// Plot keys are `${px}-${pz}`: px grows east (+x), pz grows south (+z)
export const plotKey = (px: number, pz: number) => `${px}-${pz}`;

export function parsePlotKey(key: string) {
  const [px, pz] = key.split('-').map(Number);
  return { px, pz };
}

export function plotOfTile(r: number, c: number) {
  return plotKey(Math.floor(c / PLOT_TILES), Math.floor(r / PLOT_TILES));
}

export function plotCenter(px: number, pz: number) {
  const mid = (PLOTS_PER_SIDE - 1) / 2;
  return { x: (px - mid) * PLOT_SIZE, z: (pz - mid) * PLOT_SIZE };
}

// Every plot bought makes the next one 200 gold dearer
export function plotPrice(ownedCount: number) {
  return 300 + (ownedCount - STARTER_PLOTS.length) * 200;
}

// A plot can be bought once it shares an edge with land you already own
export function isPlotPurchasable(key: string, ownedPlots: string[]) {
  if (ownedPlots.includes(key)) return false;
  const { px, pz } = parsePlotKey(key);
  if (px < 0 || pz < 0 || px >= PLOTS_PER_SIDE || pz >= PLOTS_PER_SIDE) return false;
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dz]) => ownedPlots.includes(plotKey(px + dx, pz + dz)));
}

// Rows run along z and columns along x, centred on the island
export function tileToWorld(r: number, c: number) {
  return { x: c * TILE_SIZE - GRID_OFFSET, z: r * TILE_SIZE - GRID_OFFSET };
}

export function worldToTile(x: number, z: number) {
  const c = Math.round((x + GRID_OFFSET) / TILE_SIZE);
  const r = Math.round((z + GRID_OFFSET) / TILE_SIZE);
  if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return null;
  return { r, c };
}
