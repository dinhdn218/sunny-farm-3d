'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CropId } from '@/types/game';

const CARROT_SPOTS: [number, number][] = [
  [-0.25, -0.24],
  [0.25, -0.24],
  [-0.24, 0.25],
  [0.25, 0.25],
];
const SEED_SPOTS: [number, number][] = [
  [-0.25, -0.25],
  [0.25, -0.25],
  [-0.25, 0.25],
  [0.25, 0.25],
];
const BUSH_SPOTS: [number, number][] = [
  [-0.22, -0.22],
  [0.22, -0.22],
  [0, 0.18],
];
const TOMATO_FRUITS: [number, number, number][] = [
  [0.32, 0.45, 0.15],
  [-0.3, 0.52, 0.18],
  [0, 0.75, 0.2],
];

// Crop visuals from the HTML version: seeds when freshly planted, a bush while growing, then the ripe crop with a sparkle
export function CropMesh({
  crop,
  stage,
  seed,
}: {
  crop: CropId;
  stage: number;
  seed: number;
}) {
  const starRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (starRef.current) {
      starRef.current.rotation.y += Math.min(delta, 0.1) * 2.8;
      starRef.current.position.y =
        1.12 + Math.sin(performance.now() * 0.005 + seed) * 0.1;
    }
  });

  if (stage <= 1) {
    return (
      <group>
        {SEED_SPOTS.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.03, z]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshLambertMaterial color="#fef08a" />
          </mesh>
        ))}
      </group>
    );
  }

  if (stage === 2) {
    return (
      <group>
        {BUSH_SPOTS.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.22, z]}>
            <dodecahedronGeometry args={[0.24, 0]} />
            <meshLambertMaterial color="#16a34a" />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group>
      {crop === 'carrot' &&
        CARROT_SPOTS.map(([x, z]) => (
          <group key={`${x}${z}`}>
            <mesh position={[x, 0.14, z]}>
              <cylinderGeometry args={[0.14, 0.04, 0.32, 7]} />
              <meshLambertMaterial color="#ff6b1a" />
            </mesh>
            <mesh position={[x, 0.38, z]}>
              <coneGeometry args={[0.18, 0.35, 6]} />
              <meshLambertMaterial color="#22c55e" />
            </mesh>
          </group>
        ))}

      {crop === 'wheat' &&
        [-1, 0, 1].flatMap((i) =>
          [-1, 0, 1].map((j) => (
            <mesh key={`${i}${j}`} position={[i * 0.26, 0.36, j * 0.26]}>
              <boxGeometry args={[0.1, 0.72, 0.1]} />
              <meshLambertMaterial color="#facc15" />
            </mesh>
          ))
        )}

      {crop === 'tomato' && (
        <group>
          <mesh position={[0, 0.48, 0]}>
            <dodecahedronGeometry args={[0.42, 0]} />
            <meshLambertMaterial color="#15803d" />
          </mesh>
          {TOMATO_FRUITS.map((pos) => (
            <mesh key={pos.join()} position={pos}>
              <sphereGeometry args={[0.13, 8, 8]} />
              <meshLambertMaterial color="#ef4444" />
            </mesh>
          ))}
        </group>
      )}

      {crop === 'pumpkin' && (
        <mesh position={[0, 0.32, 0]} scale={[1.1, 0.82, 1.1]}>
          <sphereGeometry args={[0.42, 10, 10]} />
          <meshLambertMaterial color="#f97316" />
        </mesh>
      )}

      <mesh ref={starRef} position={[0, 1.15, 0]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
    </group>
  );
}
