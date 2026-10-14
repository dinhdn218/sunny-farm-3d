'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { BASE_ISLAND_RADIUS, islandShape } from '@/lib/farmLayout';

// Shared floating island: zone-coloured ground, rocky cliff and the surrounding sea.
// On the farm the island stretches into an ellipse as land plots are bought.
export function BaseIsland() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const ownedPlots = useGameStore((s) => s.ownedPlots);
  const shape = useMemo(
    () => islandShape(currentWorld, ownedPlots),
    [currentWorld, ownedPlots]
  );
  const scale: [number, number, number] = [
    shape.rx / BASE_ISLAND_RADIUS,
    1,
    shape.rz / BASE_ISLAND_RADIUS,
  ];

  return (
    <group>
      <mesh receiveShadow position={[shape.cx, -1.2, shape.cz]} scale={scale}>
        <cylinderGeometry args={[BASE_ISLAND_RADIUS, 16.0, 2.4, 28]} />
        <meshLambertMaterial color={WORLDS[currentWorld].groundColor} />
      </mesh>
      <mesh position={[shape.cx, -3.9, shape.cz]} scale={scale}>
        <cylinderGeometry args={[15.8, 11.5, 3.4, 22]} />
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
