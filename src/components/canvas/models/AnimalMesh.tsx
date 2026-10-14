'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { FarmAnimal } from '@/types/game';
import { ANIMALS } from '@/config/animals';
import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { SafeGLTFModel } from './GLTFModel';

export function AnimalMesh({
  animal,
  offset = [0, 0],
}: {
  animal: FarmAnimal;
  // Shift of the ranch when the farm has been expanded
  offset?: [number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const interactAnimal = useGameStore((s) => s.interactAnimal);
  const useGlbModels = useGameStore((s) => s.useGlbModels);
  const cfg = ANIMALS[animal.species];

  const hint = animal.hasProduct
    ? `Click để thu hoạch ${cfg.productName}`
    : animal.fedToday
    ? 'Click để vuốt ve'
    : 'Click để cho ăn (-1 Thức ăn)';
  const handlers = interactable(
    `${cfg.icon} ${animal.name}`,
    () => interactAnimal(animal.id),
    hint
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const seed = animal.id.charCodeAt(animal.id.length - 1) || 1;
    const wanderX = animal.x + offset[0] + Math.sin(t * 0.5 + seed) * 1.1;
    const wanderZ = animal.z + offset[1] + Math.cos(t * 0.4 + seed) * 0.9;
    const hopY = Math.abs(Math.sin(t * 3.5 + seed)) * 0.08;

    groupRef.current.position.set(wanderX, hopY, wanderZ);
    groupRef.current.rotation.y = Math.atan2(
      Math.cos(t * 0.5 + seed),
      -Math.sin(t * 0.4 + seed)
    );
  });

  const proceduralAnimal = (
    <group>
      {animal.species === 'chicken' && (
        <group position={[0, 0.22, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.36, 0.34, 0.44]} />
            <meshLambertMaterial color="#fef3c7" />
          </mesh>
          <mesh castShadow position={[0, 0.24, 0.18]}>
            <boxGeometry args={[0.24, 0.24, 0.24]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.4, 0.18]}>
            <boxGeometry args={[0.08, 0.1, 0.16]} />
            <meshLambertMaterial color="#ef4444" />
          </mesh>
          <mesh position={[0, 0.22, 0.34]}>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshLambertMaterial color="#f59e0b" />
          </mesh>
        </group>
      )}

      {animal.species === 'sheep' && (
        <group position={[0, 0.38, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.68, 0.56, 0.86]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
          <mesh castShadow position={[0, 0.22, 0.48]}>
            <boxGeometry args={[0.38, 0.36, 0.38]} />
            <meshLambertMaterial color="#334155" />
          </mesh>
          <mesh castShadow position={[0, 0.44, 0.46]}>
            <boxGeometry args={[0.42, 0.14, 0.36]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
        </group>
      )}

      {animal.species === 'cow' && (
        <group position={[0, 0.48, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.82, 0.68, 1.15]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0.02, 0.12, 0.1]}>
            <boxGeometry args={[0.85, 0.32, 0.42]} />
            <meshLambertMaterial color="#0f172a" />
          </mesh>
          <mesh castShadow position={[0, 0.32, 0.65]}>
            <boxGeometry args={[0.5, 0.46, 0.46]} />
            <meshLambertMaterial color="#f1f5f9" />
          </mesh>
          <mesh position={[0, 0.2, 0.9]}>
            <boxGeometry args={[0.42, 0.22, 0.1]} />
            <meshLambertMaterial color="#fda4af" />
          </mesh>
        </group>
      )}
    </group>
  );

  return (
    <group ref={groupRef} position={[animal.x, 0, animal.z]} {...handlers}>
      {useGlbModels ? (
        <group>
          <SafeGLTFModel
            url={cfg.glbPath}
            scale={0.35}
            position={[0, 0, 0]}
            fallback={null}
          />
          {proceduralAnimal}
        </group>
      ) : (
        proceduralAnimal
      )}

      <Html position={[0, 1.45, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag flex w-max flex-col items-center">
          {animal.hasProduct ? (
            <div className="mb-1 animate-bounce rounded-full border border-white bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow">
              {cfg.productIcon} Thu hoạch!
            </div>
          ) : animal.fedToday ? (
            <div className="mb-0.5 text-sm">❤️</div>
          ) : (
            <div className="mb-1 rounded-full border border-white/30 bg-slate-900/85 px-2 py-0.5 text-[10px] font-black text-amber-200 shadow">
              🌾 Đói bụng
            </div>
          )}
          <div className="rounded-full border border-white/30 bg-slate-900/85 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
            {cfg.icon} {animal.name}
          </div>
        </div>
      </Html>
    </group>
  );
}
