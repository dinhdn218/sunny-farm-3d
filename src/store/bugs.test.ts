import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { bugsInPark } from '@/lib/bugs';

const initialState = useGameStore.getState();
const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initialState, true);
});

// Day 3, morning, in the Park
const DAY = 3;
const first = () => bugsInPark(DAY, 'morning')[0];
const inPark = () =>
  useGameStore.setState({ currentWorld: 'park', day: DAY, timePhaseIndex: 0, energy: 50, items: {} });

describe('catching bugs', () => {
  it('puts the bug in the bag when the net lands in the zone, for 2 energy', () => {
    inPark();
    store().startBugCatch(first().spot);
    store().swingNet(store().bugCatch!.zone);
    expect(store().items).toEqual({ [first().bug]: 1 });
    expect(store().energy).toBe(48);
    expect(store().bugCatch).toMatchObject({ stage: 'result', caught: true });
  });

  it('lets the bug fly away on a miss', () => {
    inPark();
    store().startBugCatch(first().spot);
    const zone = store().bugCatch!.zone;
    store().swingNet(zone > 0.5 ? 0 : 1);
    expect(store().items).toEqual({});
    expect(store().bugCatch).toMatchObject({ stage: 'result', caught: false });
  });

  it('empties the spot until the next time of day either way', () => {
    inPark();
    store().startBugCatch(first().spot);
    store().swingNet(store().bugCatch!.zone);
    store().endBugCatch();
    store().startBugCatch(first().spot);
    expect(store().bugCatch).toBeNull();
  });

  it('only happens in the Park, on a spot with a bug, with the energy to swing', () => {
    useGameStore.setState({ currentWorld: 'farm', day: DAY, timePhaseIndex: 0, energy: 50 });
    store().startBugCatch(first().spot);
    expect(store().bugCatch).toBeNull();

    inPark();
    const empty = [0, 1, 2, 3, 4, 5, 6, 7].find((s) => !bugsInPark(DAY, 'morning').some((b) => b.spot === s))!;
    store().startBugCatch(empty);
    expect(store().bugCatch).toBeNull();

    useGameStore.setState({ energy: 1 });
    store().startBugCatch(first().spot);
    expect(store().bugCatch).toBeNull();
  });
});
