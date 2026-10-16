'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { TreeType } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import { SEASON_LOOK } from '@/config/seasons';
import { seasonOf } from '@/lib/seasons';
import { ANIMATED } from '../StaticMerge';

// Leaves follow the season (palms on the beach stay green)
export function Tree({
  x,
  z,
  scale,
  type,
}: {
  x: number;
  z: number;
  scale: number;
  type: TreeType;
}) {
  const look = useGameStore((s) => SEASON_LOOK[seasonOf(s.day)]);

  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.22, 0.34, 1.4, 7]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>

      {type === 'pine' &&
        [0, 1, 2].map((i) => (
          <mesh key={i} castShadow position={[0, 1.5 + i * 0.75, 0]}>
            <coneGeometry args={[1.15 - i * 0.25, 1.35, 7]} />
            <meshLambertMaterial color={look.pine} />
          </mesh>
        ))}

      {type === 'oak' && (
        <mesh castShadow position={[0, 1.95, 0]}>
          <dodecahedronGeometry args={[1.15, 0]} />
          <meshLambertMaterial color={look.oak} />
        </mesh>
      )}

      {type === 'sakura' && (
        <mesh castShadow position={[0, 2.0, 0]}>
          <dodecahedronGeometry args={[1.3, 0]} />
          <meshLambertMaterial color={look.sakura} />
        </mesh>
      )}

      {type === 'palm' &&
        [0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[0, 1.5, 0]}
            rotation={[0, (i * Math.PI * 2) / 5, -0.35]}
          >
            <boxGeometry args={[1.4, 0.08, 0.35]} />
            <meshLambertMaterial color="#65a30d" />
          </mesh>
        ))}
    </group>
  );
}

export function Fountain({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  const jetRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (jetRef.current) jetRef.current.rotation.y += 3.5 * Math.min(delta, 0.1);
  });

  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.275, 0]}>
        <cylinderGeometry args={[2.2, 2.4, 0.55, 16]} />
        <meshLambertMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.48, 16]} />
        <meshLambertMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.35, 0.5, 1.6, 12]} />
        <meshLambertMaterial color="#e2e8f0" />
      </mesh>
      <mesh ref={jetRef} position={[0, 1.9, 0]} userData={ANIMATED}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshBasicMaterial color="#bae6fd" />
      </mesh>
    </group>
  );
}
