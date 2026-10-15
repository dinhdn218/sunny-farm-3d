'use client';

import { useGameStore } from '@/store/useGameStore';
import { SEASON_LOOK } from '@/config/seasons';
import { TIME_PHASES } from '@/config/time';
import { seasonOf } from '@/lib/seasons';
import { BuildPieceModel } from './models/BuildPieceModel';

// Fences, paths, lamps, flower beds and bushes the player has laid out on the farm
export function BuildPieces() {
  const pieces = useGameStore((s) => s.buildPieces);
  const season = useGameStore((s) => seasonOf(s.day));
  const night = useGameStore((s) => TIME_PHASES[s.timePhaseIndex].id === 'night');

  return (
    <group>
      {pieces.map((p) => (
        <group key={`${p.x}_${p.z}`} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
          <BuildPieceModel kind={p.kind} leaves={SEASON_LOOK[season].oak} winter={season === 'winter'} night={night} />
        </group>
      ))}
    </group>
  );
}
