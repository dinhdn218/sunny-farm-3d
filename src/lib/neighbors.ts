import { Letter, NeighborVisit, TileData, VisitKind } from '@/types/game';
import { canWater, waterTile } from '@/lib/growth';

// A watering from a neighbour reaches this many dry tiles on the farm
export const NEIGHBOR_WATER_TILES = 4;
// Gold sent with the letter for each visit, and the most one letter carries
export const VISIT_GOLD = 10;
export const MAX_VISIT_GOLD = 200;
// Friendship for liking a resident's farm, once a day
export const FARM_LIKE_POINTS = 2;
// Longest name a visitor leaves behind (the table checks it too, see supabase/schema.sql)
export const VISITOR_NAME_MAX = 40;

const KINDS: VisitKind[] = ['like', 'water'];

// Rows of the cloud's farm_visits table, oldest first; anything malformed is left out
export function visitsFromRows(rows: unknown[]): NeighborVisit[] {
  return rows
    .map((raw) => raw as { id?: unknown; visitor_id?: unknown; visitor_name?: unknown; kind?: unknown; created_at?: unknown })
    .filter(
      (row) =>
        typeof row.id === 'number' &&
        typeof row.visitor_id === 'string' &&
        typeof row.visitor_name === 'string' &&
        KINDS.includes(row.kind as VisitKind)
    )
    .map((row) => {
      const at = typeof row.created_at === 'string' ? Date.parse(row.created_at) : NaN;
      return {
        id: row.id as number,
        visitorId: row.visitor_id as string,
        visitorName: (row.visitor_name as string).slice(0, VISITOR_NAME_MAX) || 'Nông Dân',
        kind: row.kind as VisitKind,
        ...(Number.isFinite(at) ? { at } : {}),
      };
    })
    .sort((a, b) => a.id - b.id);
}

// The date in Vietnam, which is how the table stamps a visit (one like and one watering per farm a day)
export const vnDateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);

// Neighbours' watering at `at`: up to `count` growing crops that are still dry start growing
export function waterForNeighbors(tiles: TileData[], count: number, at: number) {
  let left = count;
  const next = tiles.map((t) => {
    if (left <= 0 || t.state !== 'planted' || !canWater(t)) return t;
    left--;
    return waterTile(t, at);
  });
  return { tiles: left === count ? tiles : next, watered: count - left };
}

// "Lan, Minh và 3 người khác"
function names(visits: NeighborVisit[]) {
  const unique = Array.from(new Set(visits.map((v) => v.visitorName)));
  return unique.length > 3 ? `${unique.slice(0, 3).join(', ')} và ${unique.length - 3} người khác` : unique.join(', ');
}

// One letter for the visits that came in since the last: who watered, who liked, and a little gold for each
export function visitLetter(visits: NeighborVisit[], day: number, watered: number): Letter {
  const waters = visits.filter((v) => v.kind === 'water');
  const likes = visits.filter((v) => v.kind === 'like');
  const lines = [
    waters.length &&
      `💧 ${names(waters)} đã ghé tưới giúp ${watered ? `${watered} ô đất đang khô` : 'ruộng nhà bạn (lúc đó ruộng đã đủ nước)'}.`,
    likes.length && `❤️ ${names(likes)} đã thả tim cho nông trại của bạn.`,
  ].filter(Boolean);
  return {
    id: `visits_${Math.max(...visits.map((v) => v.id))}`,
    from: 'Hàng Xóm 🏡',
    title: visits.length > 1 ? `${visits.length} lượt hàng xóm ghé thăm!` : 'Có hàng xóm ghé thăm!',
    body: `${lines.join(' ')} Họ gửi kèm chút quà làm quen nè!`,
    day,
    read: false,
    gift: { gold: Math.min(MAX_VISIT_GOLD, VISIT_GOLD * visits.length) },
    claimed: false,
  };
}
