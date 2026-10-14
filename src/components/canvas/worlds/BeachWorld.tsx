'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { BOBBER_POS, FISHING_SPOT } from '@/config/fish';
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

// The fishing jetty runs from the beach out to the north cliff edge
const JETTY_START_Z = -9.1;
const JETTY_END_Z = -18.3;
const JETTY_POSTS = [-10, -12, -14, -16, -18];

function FishingJetty() {
  const startFishing = useGameStore((s) => s.startFishing);
  const handlers = interactable('🎣 Cầu Câu Cá', startFishing, 'Click để quăng cần câu (-4⚡)');
  const length = JETTY_START_Z - JETTY_END_Z;

  return (
    <group position={[FISHING_SPOT.x, 0, 0]}>
      <mesh receiveShadow position={[0, 0.06, (JETTY_START_Z + JETTY_END_Z) / 2]} {...handlers}>
        <boxGeometry args={[1.8, 0.12, length]} />
        <meshLambertMaterial color="#b45309" />
      </mesh>
      {Array.from({ length: Math.floor(length / 0.6) }, (_, i) => (
        <mesh key={i} position={[0, 0.125, JETTY_START_Z - 0.3 - i * 0.6]}>
          <boxGeometry args={[1.8, 0.01, 0.04]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
      ))}
      {JETTY_POSTS.flatMap((z) =>
        [-0.85, 0.85].map((x) => (
          <mesh key={`${x}${z}`} castShadow position={[x, -0.75, z]}>
            <cylinderGeometry args={[0.09, 0.09, 1.9, 6]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
        ))
      )}

      {/* Signboard by the casting spot */}
      <group position={[1.15, 0, FISHING_SPOT.z + 0.6]}>
        <mesh castShadow position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 1.1, 6]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
        <mesh castShadow position={[0, 1.05, 0]} {...handlers}>
          <boxGeometry args={[0.9, 0.5, 0.08]} />
          <meshLambertMaterial color="#0284c7" />
        </mesh>
        <Html position={[0, 1.65, 0]} zIndexRange={[15, 0]}>
          <div className="player-tag w-max rounded-full border border-white bg-sky-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
            🎣 Câu Cá
          </div>
        </Html>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, FISHING_SPOT.z]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Float and line while a cast is out; the float dips when a fish bites
function FishingTackle() {
  const casting = useGameStore((s) => !!s.fishing && s.fishing.stage !== 'result');
  const floatRef = useRef<THREE.Group>(null);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return geometry;
  }, []);

  useFrame(() => {
    const { fishing, playerPos } = useGameStore.getState();
    if (!fishing || !floatRef.current) return;
    const t = performance.now();
    const pulled = fishing.stage === 'bite' || fishing.stage === 'reeling';
    const y = BOBBER_POS[1] + (pulled ? -0.12 + Math.sin(t * 0.03) * 0.07 : Math.sin(t * 0.003) * 0.05);
    floatRef.current.position.set(BOBBER_POS[0], y, BOBBER_POS[2]);

    // From the rod tip in the player's right hand to the float
    const { x, z, rotY } = playerPos;
    const position = line.attributes.position as THREE.BufferAttribute;
    position.setXYZ(
      0,
      x + Math.sin(rotY) * 1.2 + Math.cos(rotY) * 0.39,
      1.95,
      z + Math.cos(rotY) * 1.2 - Math.sin(rotY) * 0.39
    );
    position.setXYZ(1, BOBBER_POS[0], y + 0.12, BOBBER_POS[2]);
    position.needsUpdate = true;
  });

  if (!casting) return null;
  return (
    <group>
      <group ref={floatRef} position={BOBBER_POS}>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshLambertMaterial color="#f8fafc" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[0.2, 0.27, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <lineSegments geometry={line} frustumCulled={false}>
        <lineBasicMaterial color="#f8fafc" />
      </lineSegments>
    </group>
  );
}

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

      <FishingJetty />
      <FishingTackle />
    </group>
  );
}
