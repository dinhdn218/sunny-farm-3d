'use client';

import { useGameStore } from '@/store/useGameStore';
import { BuildPiece } from '@/types/game';
import { SEASON_LOOK } from '@/config/seasons';
import { TIME_PHASES } from '@/config/time';
import { BUILD_PIECES } from '@/config/build';
import { seasonOf } from '@/lib/seasons';
import { interactable } from '@/lib/interact';
import { daysUntilGrown } from '@/lib/trees';
import { STAND_GAP } from '@/lib/walk';
import { BuildPieceModel } from './models/BuildPieceModel';
import { StaticMerge } from './StaticMerge';

// Clicking a fruit tree (outside build mode) walks over and picks its fruit
function treeHandlers(piece: BuildPiece) {
  const cfg = BUILD_PIECES[piece.kind];
  return interactable(
    `${cfg.icon} ${cfg.name}`,
    () =>
      useGameStore.getState().walkTo({
        x: piece.x,
        z: piece.z,
        reach: 0.7 + STAND_GAP,
        act: () => useGameStore.getState().pickFruit(piece.x, piece.z),
      }),
    'Click để hái trái'
  );
}

// Fences, paths, lamps, flower beds, bushes and fruit trees the player has laid out on the farm (merged into a few
// draw calls: a long fence is hundreds of boxes)
export function BuildPieces() {
  const pieces = useGameStore((s) => s.buildPieces);
  const day = useGameStore((s) => s.day);
  const building = useGameStore((s) => !!s.buildMode);
  const season = useGameStore((s) => seasonOf(s.day));
  const night = useGameStore((s) => TIME_PHASES[s.timePhaseIndex].id === 'night');

  return (
    <StaticMerge>
      {pieces.map((p) => {
        const growing = daysUntilGrown(p, day);
        return (
          <group
            key={`${p.x}_${p.z}`}
            position={[p.x, 0, p.z]}
            rotation={[0, p.rotY, 0]}
            {...(growing !== null && !building ? treeHandlers(p) : {})}
          >
            <BuildPieceModel
              kind={p.kind}
              leaves={SEASON_LOOK[season].oak}
              winter={season === 'winter'}
              night={night}
              grown={growing === 0}
              fruit={p.fruit ?? 0}
            />
          </group>
        );
      })}
    </StaticMerge>
  );
}
