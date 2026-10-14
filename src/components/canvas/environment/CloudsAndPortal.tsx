'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { interactable } from '@/lib/interact';

const CLOUD_PUFFS: [number, number, number, number][] = [
  [0, 0, 0, 1.1],
  [0.9, -0.1, 0.2, 0.85],
  [-0.9, -0.15, -0.1, 0.8],
];

function Clouds() {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const clouds = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        x: (Math.random() - 0.5) * 38,
        y: 10.5 + Math.random() * 3.5,
        z: (Math.random() - 0.5) * 30,
        scale: 0.75 + Math.random() * 0.5,
        speed: 0.35 + Math.random() * 0.35,
      })),
    []
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clouds.forEach((cloud, i) => {
      const group = groupRefs.current[i];
      if (!group) return;
      group.position.x += cloud.speed * dt;
      if (group.position.x > 25) group.position.x = -25;
    });
  });

  return (
    <group>
      {clouds.map((cloud, i) => (
        <group
          key={i}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          position={[cloud.x, cloud.y, cloud.z]}
          scale={cloud.scale}
        >
          {CLOUD_PUFFS.map(([px, py, pz, r], j) => (
            <mesh key={j} position={[px, py, pz]}>
              <dodecahedronGeometry args={[r, 1]} />
              <meshLambertMaterial color="#ffffff" transparent opacity={0.88} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Portal() {
  const ringRef = useRef<THREE.Mesh>(null);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const [px, pz] = WORLDS[currentWorld].portalPos;
  const handlers = interactable('Cổng Dịch Chuyển Thế Giới (Mở Bản Đồ)', () =>
    setActiveModal('map')
  );

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += 2.0 * Math.min(delta, 0.1);
  });

  return (
    <group position={[px, 0, pz]}>
      <mesh position={[0, 0.1, 0]} {...handlers}>
        <cylinderGeometry args={[1.4, 1.6, 0.2, 16]} />
        <meshLambertMaterial color="#475569" />
      </mesh>
      <mesh ref={ringRef} position={[0, 1.45, 0]} {...handlers}>
        <torusGeometry args={[1.15, 0.12, 10, 24]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

// Drifting low-poly clouds plus the teleport ring at the south edge of every zone
export function CloudsAndPortal() {
  return (
    <group>
      <Clouds />
      <Portal />
    </group>
  );
}
