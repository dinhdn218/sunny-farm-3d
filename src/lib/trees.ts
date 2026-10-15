import { BuildPiece } from '@/types/game';
import { BUILD_PIECES } from '@/config/build';

// Fruit a tree holds before it stops bearing more
export const TREE_MAX_FRUIT = 3;

// Days until a fruit tree has grown (0 once it bears), or null for other pieces
export function daysUntilGrown(piece: BuildPiece, day: number) {
  const fruit = BUILD_PIECES[piece.kind].fruit;
  if (!fruit) return null;
  return Math.max(0, (piece.planted ?? day) + fruit.growDays - day);
}

// The morning of `day`: every grown tree bears another fruit, up to what it holds
export function ripenTrees(pieces: BuildPiece[], day: number) {
  let ripened = 0;
  const next = pieces.map((p) => {
    if (daysUntilGrown(p, day) !== 0 || (p.fruit ?? 0) >= TREE_MAX_FRUIT) return p;
    ripened++;
    return { ...p, fruit: (p.fruit ?? 0) + 1 };
  });
  return { pieces: ripened ? next : pieces, ripened };
}
