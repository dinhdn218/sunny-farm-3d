import { CatchConfig, CatchId, SeasonId, TimePhaseId } from '@/types/game';
import { CATCHES, CATCH_LIST } from '@/config/fish';

// Whether it bites in these waters at this time of day, in this season
export const bitesNow = (c: CatchConfig, phase: TimePhaseId, waters: 'sea' | 'pond', season: SeasonId) =>
  c.waters.includes(waters) && (c.phases.length === 0 || c.phases.includes(phase)) && c.seasons.includes(season);

// Picks what is on the line, weighted among what bites in these waters at this time of day and season
export function rollCatch(
  phase: TimePhaseId,
  waters: 'sea' | 'pond',
  season: SeasonId,
  random: () => number = Math.random
): CatchId {
  const pool = CATCH_LIST.filter((c) => bitesNow(c, phase, waters, season));
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  let r = random() * total;
  for (const c of pool) {
    r -= c.weight;
    if (r < 0) return c.id;
  }
  return pool[pool.length - 1].id;
}

// Length in whole cm within the range of its kind
export function rollSize(id: CatchId, random: () => number = Math.random) {
  const [min, max] = CATCHES[id].size ?? [0, 0];
  return min + Math.floor(random() * (max - min + 1));
}

// Reeling minigame on a 0–1 track: keep the fish inside the catch zone to fill the meter.
// Holding pushes the zone right, letting go lets it drift back left.
export interface ReelState {
  fishPos: number;
  fishTarget: number;
  barPos: number;
  barVel: number;
  // Caught at 1, escaped at 0
  progress: number;
}

export const REEL_START: ReelState = {
  fishPos: 0.5,
  fishTarget: 0.5,
  barPos: 0.35,
  barVel: 0,
  progress: 0.3,
};

// `scale` widens it (the bat pet at night)
export const zoneWidth = (difficulty: number, scale = 1) => Math.max(0.16, 0.34 - difficulty * 0.02) * scale;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function reelStep(
  s: ReelState,
  dt: number,
  holding: boolean,
  difficulty: number,
  random: () => number = Math.random,
  zoneScale = 1
): ReelState {
  const width = zoneWidth(difficulty, zoneScale);

  const accel = holding ? 2.4 : -2.0;
  // Turning around brakes twice as hard, so the zone answers the button quickly
  const braking = s.barVel !== 0 && Math.sign(accel) !== Math.sign(s.barVel) ? 2 : 1;
  let barVel = clamp(s.barVel + accel * braking * dt, -1.2, 1.2);
  let barPos = s.barPos + barVel * dt;
  if (barPos <= 0 || barPos >= 1 - width) {
    barPos = clamp(barPos, 0, 1 - width);
    barVel = 0;
  }

  // The fish darts to new spots, faster and more often the harder it is
  let fishTarget = s.fishTarget;
  if (Math.abs(s.fishTarget - s.fishPos) < 0.01 || random() < (0.4 + difficulty * 0.12) * dt) {
    fishTarget = 0.05 + random() * 0.9;
  }
  const speed = 0.2 + difficulty * 0.06;
  const gap = fishTarget - s.fishPos;
  const fishPos = s.fishPos + Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);

  const inside = fishPos >= barPos && fishPos <= barPos + width;
  const rate = inside ? 0.32 : -(0.16 + difficulty * 0.015);
  return { fishPos, fishTarget, barPos, barVel, progress: clamp(s.progress + rate * dt, 0, 1) };
}
