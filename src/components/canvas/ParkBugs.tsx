'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { BugId } from '@/types/game';
import { TIME_PHASES } from '@/config/time';
import { BUGS } from '@/config/bugs';
import { BUG_SPOTS, bugsInPark } from '@/lib/bugs';
import { interactable } from '@/lib/interact';

// One bug fluttering over (or crawling through) its patch of grass; a click walks over and gets the net out
function FlyingBug({ spot, bug }: { spot: number; bug: BugId }) {
  const ref = useRef<THREE.Group>(null);
  const [x, z] = BUG_SPOTS[spot];
  const cfg = BUGS[bug];
  const handlers = interactable(
    `${cfg.icon} ${cfg.name}`,
    () =>
      useGameStore.getState().walkTo({
        x,
        z,
        reach: 1.6,
        act: () => useGameStore.getState().startBugCatch(spot),
      }),
    'Click để lại gần và vung vợt bắt'
  );

  useFrame(() => {
    const t = performance.now() * 0.001 + spot * 1.7;
    // Flyers flutter about at head height, crawlers wander slowly through the grass
    const roam = cfg.ground ? 0.25 : 0.5;
    const y = cfg.ground ? 0.15 : 1.1 + Math.sin(t * 2.3) * 0.2;
    ref.current?.position.set(x + Math.sin(t * 0.9) * roam, y, z + Math.cos(t * 0.7) * roam);
  });

  return (
    <group ref={ref}>
      {/* A roomy invisible target, easier to click than the bug itself */}
      <mesh {...handlers}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshBasicMaterial color={cfg.color} />
      </mesh>
      <Html center position={[0, 0.35, 0]} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="select-none text-2xl drop-shadow">{cfg.icon}</div>
      </Html>
    </group>
  );
}

// The bugs out in the Park at this time of day, less the ones already netted or scared off
export function ParkBugs() {
  const day = useGameStore((s) => s.day);
  const phase = useGameStore((s) => TIME_PHASES[s.timePhaseIndex].id);
  const bugDay = useGameStore((s) => s.bugDay);
  const bugsTaken = useGameStore((s) => s.bugsTaken);
  const taken = bugDay === day ? bugsTaken : [];

  return (
    <group>
      {bugsInPark(day, phase)
        .filter((b) => !taken.includes(`${phase}:${b.spot}`))
        .map((b) => (
          <FlyingBug key={`${phase}_${b.spot}`} spot={b.spot} bug={b.bug} />
        ))}
    </group>
  );
}
