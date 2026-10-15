import { describe, expect, it } from 'vitest';
import { WalkGoal } from '@/types/game';
import { inReach, walkStep } from '@/lib/walk';

const goal = (x: number, z: number, reach = 1): WalkGoal => ({ x, z, reach, act: () => {} });

describe('walkStep', () => {
  it('walks straight toward the goal, one step at a time', () => {
    expect(walkStep(0, 0, goal(10, 0), 0.5)).toEqual({ x: 0.5, z: 0, arrived: false });
  });

  it('stops within reach instead of walking into it, and says so', () => {
    expect(walkStep(0, 0, goal(0, 3), 5)).toEqual({ x: 0, z: 2, arrived: true });
  });

  it('stays put when already close enough', () => {
    expect(walkStep(0.4, 0, goal(1, 0), 0.5)).toEqual({ x: 0.4, z: 0, arrived: true });
  });
});

describe('inReach', () => {
  it('measures centre to centre', () => {
    expect(inReach(0, 0, goal(3, 4, 5))).toBe(true);
    expect(inReach(0, 0, goal(3, 4, 4.9))).toBe(false);
  });
});
