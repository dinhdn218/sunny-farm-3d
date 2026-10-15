import { WalkGoal } from '@/types/game';

// Units per second, walking with the keys or to something that was clicked
export const WALK_SPEED = 6.0;

// Room between something solid and the player using it
export const STAND_GAP = 0.55;

// How close the player stands to use each thing on the farm, centre to centre: its size plus the gap
export const REACH = {
  // At the tile's edge, facing it (Space/E then works the same tile)
  tile: 1.0,
  well: 1.2 + STAND_GAP,
  house: 2.0 + STAND_GAP,
  shippingBin: 0.8 + STAND_GAP,
  seedShop: 1.4 + STAND_GAP,
  barn: 1.8 + STAND_GAP,
  animal: 0.55 + STAND_GAP,
};

export function inReach(x: number, z: number, goal: WalkGoal) {
  return Math.hypot(goal.x - x, goal.z - z) <= goal.reach;
}

// One frame of walking straight toward a goal, at most `maxStep` far: where the player
// ends up and whether that is close enough to do the job
export function walkStep(x: number, z: number, goal: WalkGoal, maxStep: number) {
  const dx = goal.x - x;
  const dz = goal.z - z;
  const dist = Math.hypot(dx, dz);
  const left = dist - goal.reach;
  if (left <= 0) return { x, z, arrived: true };
  const step = Math.min(maxStep, left);
  return { x: x + (dx / dist) * step, z: z + (dz / dist) * step, arrived: step >= left };
}
