'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { STAND_GAP } from '@/lib/walk';

// Pulsing ring around whatever the player is walking over to use
export function WalkMarker() {
  const goal = useGameStore((s) => s.walkGoal);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const current = useGameStore.getState().walkGoal;
    if (!groupRef.current || !current) return;
    // Moves along with a wandering animal
    groupRef.current.position.set(current.x, 0.24, current.z);
    groupRef.current.scale.setScalar(0.92 + Math.sin(performance.now() * 0.009) * 0.08);
  });

  if (!goal) return null;
  // Hugs the thing itself: its reach less the room the player stands in
  const radius = Math.max(0.5, goal.reach - STAND_GAP + 0.2);

  return (
    <group ref={groupRef} position={[goal.x, 0.24, goal.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.09, radius, 40]} />
        <meshBasicMaterial
          color="#fef9c3"
          transparent
          opacity={0.85}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
