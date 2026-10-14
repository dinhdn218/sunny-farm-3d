'use client';

import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';

// Shared floating island: zone-coloured ground, rocky cliff and the surrounding sea
export function BaseIsland() {
  const currentWorld = useGameStore((s) => s.currentWorld);

  return (
    <group>
      <mesh receiveShadow position={[0, -1.2, 0]}>
        <cylinderGeometry args={[18.5, 16.0, 2.4, 28]} />
        <meshLambertMaterial color={WORLDS[currentWorld].groundColor} />
      </mesh>
      <mesh position={[0, -3.9, 0]}>
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
