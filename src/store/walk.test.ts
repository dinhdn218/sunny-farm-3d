import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { FARM_SITES } from '@/lib/farmLayout';
import { PLOT_SIZE } from '@/config/farm';
import { REACH } from '@/lib/walk';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();
const [WELL_X, WELL_Z] = FARM_SITES.well;

// The player's position is changed in place, so every test stands on its own copy
const standAt = (x: number, z: number) =>
  useGameStore.setState({ playerPos: { x, z, rotY: 0, actionTime: 0 } });

beforeEach(() => {
  useGameStore.setState(initialState, true);
  // The farm spawn point, facing south
  standAt(0, 6.2);
});

describe('walking to what was clicked', () => {
  it('heads for something out of reach without using it yet', () => {
    const act = vi.fn();
    store().walkTo({ x: 6, z: 6.2, reach: 1, act });
    expect(store().walkGoal).toMatchObject({ x: 6, z: 6.2, reach: 1 });
    expect(act).not.toHaveBeenCalled();
  });

  it('uses something within reach straight away', () => {
    const act = vi.fn();
    store().walkTo({ x: 0.8, z: 6.2, reach: 1, act });
    expect(act).toHaveBeenCalledOnce();
    expect(store().walkGoal).toBeNull();
  });

  it('turns toward it and does the job on arrival', () => {
    const act = vi.fn();
    store().walkTo({ x: 6, z: 6.2, reach: 1, act });
    store().reachGoal();
    expect(act).toHaveBeenCalledOnce();
    expect(store().walkGoal).toBeNull();
    expect(store().playerPos.rotY).toBeCloseTo(Math.PI / 2);
  });

  it('can be called off', () => {
    const act = vi.fn();
    store().walkTo({ x: 6, z: 6.2, reach: 1, act });
    store().cancelWalk();
    store().reachGoal();
    expect(store().walkGoal).toBeNull();
    expect(act).not.toHaveBeenCalled();
  });

  it('is called off by travelling to another zone or taking photos', () => {
    store().walkTo({ x: 6, z: 6.2, reach: 1, act: vi.fn() });
    store().setWorld('park');
    expect(store().walkGoal).toBeNull();

    store().walkTo({ x: 6, z: 6.2, reach: 1, act: vi.fn() });
    store().togglePhotoMode();
    expect(store().walkGoal).toBeNull();
  });

  it('is called off when new land shifts the farm', () => {
    useGameStore.setState({ gold: 1000 });
    store().walkTo({ x: 6, z: 6.2, reach: 1, act: vi.fn() });
    store().buyPlot('3-1');
    expect(store().ownedPlots).toContain('3-1');
    expect(store().walkGoal).toBeNull();
  });
});

describe('drawing water', () => {
  it('walks to the well before the can is filled', () => {
    useGameStore.setState({ water: 0 });
    store().fetchWater();
    expect(store().water).toBe(0);
    expect(store().walkGoal).toMatchObject({ x: WELL_X, z: WELL_Z, reach: REACH.well });

    store().reachGoal();
    expect(store().water).toBe(10);
  });

  it('fills the can at once when already at the well', () => {
    standAt(WELL_X - 1.5, WELL_Z);
    useGameStore.setState({ water: 0 });
    store().fetchWater();
    expect(store().water).toBe(10);
    expect(store().walkGoal).toBeNull();
  });

  it('finds the well where land bought on the east side has moved it', () => {
    useGameStore.setState({ ownedPlots: [...store().ownedPlots, '3-1'] });
    store().fetchWater();
    expect(store().walkGoal?.x).toBeCloseTo(WELL_X + PLOT_SIZE);
  });

  it('fills the can with Space/E next to the well, and not elsewhere', () => {
    useGameStore.setState({ water: 0 });
    store().interactFront();
    expect(store().water).toBe(0);

    standAt(WELL_X - 1.5, WELL_Z);
    store().interactFront();
    expect(store().water).toBe(10);
  });
});
