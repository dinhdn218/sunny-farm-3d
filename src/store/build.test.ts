import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { BUILD_PIECES } from '@/config/build';
import { BUILD_CELL, snapToCell } from '@/lib/build';
import { pickSaveData } from '@/lib/saveData';
import { farmBands, stretchPoint } from '@/lib/farmLayout';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

// Free grass west of the starting field (see lib/build.test)
const FREE: [number, number] = [snapToCell(-7.3), snapToCell(0.7)];

beforeEach(() => {
  useGameStore.setState({ ...initialState, decorPlacements: {} }, true);
});

const building = (kind: Parameters<ReturnType<typeof store>['startBuilding']>[0], stock = 5) => {
  useGameStore.setState({ buildStock: { ...store().buildStock, fence: stock, path: stock } });
  store().startBuilding(kind);
};

describe('buying building pieces', () => {
  it('adds them to the stock for their price', () => {
    useGameStore.setState({ gold: 500, buildStock: {} });
    store().buyBuildPieces('fence', 10);
    expect(store().buildStock.fence).toBe(10);
    expect(store().gold).toBe(500 - BUILD_PIECES.fence.price * 10);
  });

  it('needs enough gold', () => {
    useGameStore.setState({ gold: BUILD_PIECES.lamp.price - 1, buildStock: {} });
    store().buyBuildPieces('lamp', 1);
    expect(store().buildStock.lamp ?? 0).toBe(0);
    expect(store().gold).toBe(BUILD_PIECES.lamp.price - 1);
  });
});

describe('build mode', () => {
  it('only opens on your own farm, and closes any open window', () => {
    useGameStore.setState({ currentWorld: 'park' });
    store().startBuilding('fence');
    expect(store().buildMode).toBeNull();

    useGameStore.setState({ currentWorld: 'farm', activeModal: 'wardrobe' });
    store().startBuilding('fence');
    expect(store().buildMode).toEqual({ kind: 'fence', rotY: 0 });
    expect(store().activeModal).toBeNull();
  });

  it('turns the piece a quarter at a time', () => {
    building('fence');
    store().rotateBuildPiece();
    expect(store().buildMode?.rotY).toBeCloseTo(Math.PI / 2);
  });

  it('places a piece from the stock in the cell under the cursor', () => {
    building('fence', 3);
    store().buildAt(FREE[0] + 0.2, FREE[1] - 0.2);
    expect(store().buildPieces).toEqual([{ kind: 'fence', x: FREE[0], z: FREE[1], rotY: 0 }]);
    expect(store().buildStock.fence).toBe(2);
    // Still building: the next piece can go straight down
    expect(store().buildMode?.kind).toBe('fence');
  });

  it('needs a piece in stock', () => {
    building('fence', 0);
    store().buildAt(...FREE);
    expect(store().buildPieces).toEqual([]);
  });

  it('refuses blocked cells and a second piece in the same cell', () => {
    building('fence', 5);
    store().buildAt(0, 0);
    store().buildAt(...FREE);
    store().buildAt(...FREE);
    expect(store().buildPieces).toHaveLength(1);
    expect(store().buildStock.fence).toBe(4);
  });

  it('erases a piece back into the stock', () => {
    building('path', 2);
    store().buildAt(...FREE);
    store().startBuilding('erase');
    store().buildAt(FREE[0] - 0.3, FREE[1] + 0.3);
    expect(store().buildPieces).toEqual([]);
    expect(store().buildStock.path).toBe(2);
  });

  it('ends when photo mode starts or the player leaves the farm', () => {
    building('fence');
    store().togglePhotoMode();
    expect(store().buildMode).toBeNull();

    store().togglePhotoMode();
    building('fence');
    store().setWorld('park');
    expect(store().buildMode).toBeNull();
  });
});

describe('built pieces', () => {
  it('are part of the saved farm', () => {
    building('fence');
    store().buildAt(...FREE);
    const save = pickSaveData(store());
    expect(save.buildPieces).toHaveLength(1);
    expect(save.buildStock.fence).toBe(4);
  });

  it('slide outward with the buildings when land is added', () => {
    building('fence');
    store().buildAt(...FREE);
    const before = farmBands(store().ownedPlots);
    useGameStore.setState({ gold: 1_000_000, buildMode: null });

    store().buyPlot('0-1');

    const after = farmBands(store().ownedPlots);
    const added = { west: after.west - before.west, east: 0, north: 0, south: 0 };
    const [x, z] = stretchPoint(FREE[0], FREE[1], added);
    expect(store().buildPieces[0]).toMatchObject({ x, z });
    // Still on the grid
    expect(snapToCell(x)).toBeCloseTo(x);
    expect(Math.abs(x - FREE[0])).toBeCloseTo(BUILD_CELL * 4);
  });
});
