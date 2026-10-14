'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Tree } from '../environment/Props';

const UMBRELLAS: [number, number, string][] = [
  [-6.5, 2.5, '#ef4444'],
  [-2.5, 3.2, '#3b82f6'],
  [2.5, 2.5, '#ec4899'],
  [-5.5, -2.5, '#10b981'],
];

const PALMS: [number, number, number][] = [
  [-8, 5, 1.2],
  [8, -4, 1.25],
  [-3, -8, 1.1],
  [4, -8, 1.15],
];

export function BeachWorld() {
  const yachtRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (yachtRef.current) {
      yachtRef.current.position.y =
        -0.8 + Math.sin(performance.now() * 0.002 * 2.2) * 0.18;
    }
  });

  return (
    <group>
      {/* Wooden pier */}
      <mesh position={[5.5, 0.2, 8.5]}>
        <boxGeometry args={[3.2, 0.25, 10.0]} />
        <meshLambertMaterial color="#92400e" />
      </mesh>

      {/* Yacht bobbing by the pier */}
      <group ref={yachtRef} position={[9.8, -0.8, 11.5]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[2.6, 1.2, 5.8]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 1.5, -0.3]}>
          <boxGeometry args={[2.0, 1.0, 2.8]} />
          <meshLambertMaterial color="#0284c7" />
        </mesh>
      </group>

      {UMBRELLAS.map(([x, z, color]) => (
        <group key={`${x}_${z}`} position={[x, 0, z]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.2, 6]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <coneGeometry args={[1.45, 0.65, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[0.7, 0.15, 0.2]}>
            <boxGeometry args={[0.85, 0.22, 1.6]} />
            <meshLambertMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* Lighthouse */}
      <group position={[-9.5, 0, -7.5]}>
        <mesh position={[0, 2.75, 0]}>
          <cylinderGeometry args={[1.1, 1.5, 5.5, 12]} />
          <meshLambertMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, 6.0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 1.1, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>

      {PALMS.map(([x, z, scale]) => (
        <Tree key={`${x}_${z}`} x={x} z={z} scale={scale} type="palm" />
      ))}
    </group>
  );
}
