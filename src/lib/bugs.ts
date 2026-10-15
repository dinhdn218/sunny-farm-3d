import { BugId, TimePhaseId } from '@/types/game';
import { BUG_LIST, BugConfig } from '@/config/bugs';
import { seasonOf } from '@/lib/seasons';
import { seeded } from '@/lib/random';

// Patches of grass round the Park where bugs flutter: by the flower beds, the pond and the lawns
export const BUG_SPOTS: [number, number][] = [
  [-4.2, 11],
  [4.2, 11.5],
  [-11.5, 2.5],
  [-10.5, -8.5],
  [6.5, -9],
  [-6, -10.5],
  [11, 9],
  [-12, 11],
];

// Bugs about at once
export const BUGS_OUT = 4;

const PHASE_INDEX: Record<TimePhaseId, number> = { morning: 0, noon: 1, sunset: 2, night: 3 };

function pick(pool: BugConfig[], random: () => number): BugId {
  let r = random() * pool.reduce((sum, b) => sum + b.weight, 0);
  for (const b of pool) {
    r -= b.weight;
    if (r < 0) return b.id;
  }
  return pool[pool.length - 1].id;
}

// Which bugs are out, and where, at this time of the day: fixed so a reload changes nothing
export function bugsInPark(day: number, phase: TimePhaseId) {
  const season = seasonOf(day);
  const pool = BUG_LIST.filter(
    (b) => (b.phases.length === 0 || b.phases.includes(phase)) && b.seasons.includes(season)
  );
  const random = seeded(day * 7907 + PHASE_INDEX[phase] * 131 + 5);
  const spots = BUG_SPOTS.map((_, i) => i);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots.slice(0, BUGS_OUT).map((spot) => ({ spot, bug: pick(pool, random) }));
}

// The green zone on the net's 0–1 bar
export const netZoneWidth = (difficulty: number) => Math.max(0.08, 0.3 - difficulty * 0.025);

export const netCaught = (marker: number, zone: number, width: number) =>
  Math.abs(marker - zone) <= width / 2 + 1e-9;

// The marker sweeps the bar back and forth, faster for harder bugs
export function netMarker(seconds: number, difficulty: number) {
  const t = seconds * (0.8 + difficulty * 0.12);
  return 1 - Math.abs((t % 2) - 1);
}
