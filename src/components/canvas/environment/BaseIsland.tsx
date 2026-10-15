'use client';

import { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { SEASON_LOOK } from '@/config/seasons';
import { BASE_ISLAND_RADIUS, WALK_MARGIN, clampToIsland, islandShape } from '@/lib/farmLayout';
import { seasonOf } from '@/lib/seasons';

// Shared floating island: zone-coloured ground, rocky cliff and the surrounding sea.
// On the farm the island stretches into an ellipse as land plots are bought.
export function BaseIsland() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const ownedPlots = useGameStore((s) => s.ownedPlots);
  const look = useGameStore((s) => SEASON_LOOK[seasonOf(s.day)]);
  // The grassy zones change with the seasons; sand and paving don't
  const ground =
    currentWorld === 'farm'
      ? look.farmGround
      : currentWorld === 'park'
      ? look.parkGround
      : WORLDS[currentWorld].groundColor;
  const shape = useMemo(
    () => islandShape(currentWorld, ownedPlots),
    [currentWorld, ownedPlots]
  );
  const scale: [number, number, number] = [
    shape.rx / BASE_ISLAND_RADIUS,
    1,
    shape.rz / BASE_ISLAND_RADIUS,
  ];

  // Clicking open ground walks the player there; clicking the cliff or the sea, as far as the shore
  const walkHere = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const store = useGameStore.getState();
    if (e.delta > 8 || store.placingDecor || store.fishing) return;
    const [x, z] = clampToIsland(e.point.x, e.point.z, shape, WALK_MARGIN);
    store.walkTo({ x, z, reach: 0.15, act: () => {} });
  };

  return (
    <group onClick={walkHere}>
      <mesh receiveShadow position={[shape.cx, -1.2, shape.cz]} scale={scale}>
        <cylinderGeometry args={[BASE_ISLAND_RADIUS, 16.0, 2.4, 40]} />
        <meshLambertMaterial color={ground} />
      </mesh>
      <mesh position={[shape.cx, -3.9, shape.cz]} scale={scale}>
        <cylinderGeometry args={[15.8, 11.5, 3.4, 32]} />
        <meshLambertMaterial color="#78716c" />
      </mesh>
      <mesh position={[0, -1.85, 0]}>
        <cylinderGeometry args={[55, 55, 0.5, 32]} />
        <meshLambertMaterial color="#0ea5e9" transparent opacity={0.82} />
      </mesh>

      {/* The HTML version leaves its front-indicator ring parked at the island centre */}
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.52, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          side={THREE.DoubleSide}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}
