import { BauCuaBets, BauCuaFace } from '@/types/game';
import { BAU_CUA_FACES, BAU_CUA_MAX_BET } from '@/config/baucua';

const FACE_IDS = BAU_CUA_FACES.map((f) => f.id);

// Three dice, each landing on one of the six faces
export const rollBauCua = (random: () => number = Math.random): BauCuaFace[] =>
  [0, 1, 2].map(() => FACE_IDS[Math.min(5, Math.floor(random() * 6))]);

export const totalBet = (bets: BauCuaBets) =>
  Object.values(bets).reduce((sum: number, n) => sum + (n ?? 0), 0);

// What the table pays back: on every face that came up, the stake and as much again for each die showing it.
// The rest is lost, which leaves the house about 8% of what is staked.
export const bauCuaPayout = (bets: BauCuaBets, dice: BauCuaFace[]) =>
  (Object.entries(bets) as [BauCuaFace, number][]).reduce((sum, [face, bet]) => {
    const hits = dice.filter((d) => d === face).length;
    return sum + (hits ? bet * (hits + 1) : 0);
  }, 0);

// Why these bets can't be played, or null if they can
export function betProblem(bets: BauCuaBets, gold: number): string | null {
  const entries = Object.entries(bets) as [string, number][];
  if (entries.some(([face, n]) => !FACE_IDS.includes(face as BauCuaFace) || !Number.isInteger(n) || n < 0)) {
    return 'Cược không hợp lệ';
  }
  const total = totalBet(bets);
  if (total <= 0) return 'Hãy đặt cược vào ít nhất một ô';
  if (total > BAU_CUA_MAX_BET) return `Mỗi ván cược tối đa ${BAU_CUA_MAX_BET} Vàng`;
  if (total > gold) return 'Không đủ Vàng để cược';
  return null;
}
