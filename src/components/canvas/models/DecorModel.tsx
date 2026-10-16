'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isMachineId } from '@/config/machines';
import { useGameStore } from '@/store/useGameStore';
import { MachineModel } from './MachineModel';
import { ANIMATED } from '../StaticMerge';

type Vec3 = [number, number, number];
const ZERO: Vec3 = [0, 0, 0];

// Material that turns see-through for the placement ghost; `glow` ignores lighting
export function Mat({ color, ghost, glow = false }: { color: string; ghost?: boolean; glow?: boolean }) {
  const opacity = ghost ? 0.55 : 1;
  return glow ? (
    <meshBasicMaterial color={color} transparent={ghost} opacity={opacity} />
  ) : (
    <meshLambertMaterial color={color} transparent={ghost} opacity={opacity} />
  );
}

export function Block({
  size,
  at,
  color,
  rot = ZERO,
  ghost,
  shadow = false,
}: {
  size: Vec3;
  at: Vec3;
  color: string;
  rot?: Vec3;
  ghost?: boolean;
  shadow?: boolean;
}) {
  return (
    <mesh position={at} rotation={rot} castShadow={shadow && !ghost}>
      <boxGeometry args={size} />
      <Mat color={color} ghost={ghost} />
    </mesh>
  );
}

function Scarecrow({ ghost }: { ghost?: boolean }) {
  return (
    <group>
      <mesh castShadow={!ghost} position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 1.9, 6]} />
        <Mat color="#78350f" ghost={ghost} />
      </mesh>
      <Block size={[1.45, 0.1, 0.1]} at={[0, 1.28, 0]} color="#92400e" ghost={ghost} />
      {/* Plaid shirt with sleeves along the crossbar and straw hands */}
      <Block size={[0.55, 0.6, 0.32]} at={[0, 1.05, 0]} color="#dc2626" ghost={ghost} shadow />
      {[-0.12, 0.12].map((x) => (
        <Block key={x} size={[0.04, 0.6, 0.01]} at={[x, 1.05, 0.165]} color="#7f1d1d" ghost={ghost} />
      ))}
      <Block size={[0.55, 0.04, 0.01]} at={[0, 1.1, 0.165]} color="#7f1d1d" ghost={ghost} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block size={[0.42, 0.16, 0.16]} at={[s * 0.48, 1.28, 0]} color="#dc2626" ghost={ghost} />
          <mesh position={[s * 0.76, 1.28, 0]} rotation={[0, 0, (-s * Math.PI) / 2]}>
            <coneGeometry args={[0.08, 0.2, 5]} />
            <Mat color="#facc15" ghost={ghost} />
          </mesh>
        </group>
      ))}
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.66, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.09, 0.26, 5]} />
          <Mat color="#facc15" ghost={ghost} />
        </mesh>
      ))}
      {/* Pumpkin head with a carved face and a straw hat */}
      <mesh castShadow={!ghost} position={[0, 1.62, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <Mat color="#f97316" ghost={ghost} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <Block key={x} size={[0.07, 0.07, 0.03]} at={[x, 1.66, 0.26]} rot={[0, 0, Math.PI / 4]} color="#1e293b" ghost={ghost} />
      ))}
      <Block size={[0.18, 0.04, 0.03]} at={[0, 1.54, 0.27]} color="#1e293b" ghost={ghost} />
      <mesh position={[0, 1.84, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 12]} />
        <Mat color="#facc15" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.94, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.18, 10]} />
        <Mat color="#eab308" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.88, 0]}>
        <cylinderGeometry args={[0.225, 0.225, 0.04, 10]} />
        <Mat color="#dc2626" ghost={ghost} />
      </mesh>
    </group>
  );
}

function Windmill({ ghost }: { ghost?: boolean }) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (bladesRef.current) bladesRef.current.rotation.z += 1.5 * Math.min(delta, 0.1);
  });

  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.5, 1.55, 0.5, 8]} />
        <Mat color="#a8a29e" ghost={ghost} />
      </mesh>
      <mesh castShadow={!ghost} position={[0, 2.35, 0]}>
        <cylinderGeometry args={[1.0, 1.42, 3.7, 8]} />
        <Mat color="#f5f5f4" ghost={ghost} />
      </mesh>
      <Block size={[0.55, 0.95, 0.1]} at={[0, 0.98, 1.34]} rot={[-0.11, 0, 0]} color="#78350f" ghost={ghost} />
      <Block size={[0.45, 0.45, 0.08]} at={[0, 2.7, 1.13]} rot={[-0.11, 0, 0]} color="#0ea5e9" ghost={ghost} />
      <Block size={[0.06, 0.45, 0.1]} at={[0, 2.7, 1.15]} rot={[-0.11, 0, 0]} color="#78350f" ghost={ghost} />
      <Block size={[0.45, 0.06, 0.1]} at={[0, 2.7, 1.15]} rot={[-0.11, 0, 0]} color="#78350f" ghost={ghost} />
      <mesh castShadow={!ghost} position={[0, 4.85, 0]}>
        <coneGeometry args={[1.25, 1.3, 8]} />
        <Mat color="#b91c1c" ghost={ghost} />
      </mesh>
      <group ref={bladesRef} userData={ANIMATED} position={[0, 3.7, 1.15]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.3, 8]} />
          <Mat color="#78350f" ghost={ghost} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <Block size={[0.12, 2.6, 0.06]} at={[0, 1.3, 0.05]} color="#78350f" ghost={ghost} />
            <Block size={[0.46, 1.9, 0.03]} at={[0.28, 1.5, 0.05]} color="#fef3c7" ghost={ghost} />
            {[0.9, 1.5, 2.1].map((y) => (
              <Block key={y} size={[0.46, 0.04, 0.04]} at={[0.28, y, 0.07]} color="#a16207" ghost={ghost} />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

function Fountain({ ghost }: { ghost?: boolean }) {
  const topDropsRef = useRef<THREE.Group>(null);
  const lowDropsRef = useRef<THREE.Group>(null);
  const jetRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;
    if (jetRef.current) jetRef.current.rotation.y += 3.5 * Math.min(delta, 0.1);
    // Water arcs from the top bowl into the middle bowl, then from there into the pool
    topDropsRef.current?.children.forEach((drop, i, all) => {
      const phase = (t * 0.9 + i / all.length) % 1;
      const angle = (i / all.length) * Math.PI * 2;
      const r = 0.3 + phase * 0.6;
      drop.position.set(Math.cos(angle) * r, 2.3 + phase * 0.5 - phase * phase * 1.25, Math.sin(angle) * r);
    });
    lowDropsRef.current?.children.forEach((drop, i, all) => {
      const phase = (t * 0.8 + i / all.length) % 1;
      const angle = (i / all.length) * Math.PI * 2 + 0.3;
      const r = 0.95 + phase * 0.9;
      drop.position.set(Math.cos(angle) * r, 1.5 + phase * 0.3 - phase * phase * 1.3, Math.sin(angle) * r);
    });
  });

  return (
    <group scale={0.9}>
      <mesh position={[0, 0.275, 0]}>
        <cylinderGeometry args={[2.2, 2.4, 0.55, 16]} />
        <Mat color="#e2e8f0" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.5, 16]} />
        <Mat color="#38bdf8" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.3, 0.45, 1.1, 12]} />
        <Mat color="#e2e8f0" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[1.0, 0.45, 0.3, 16]} />
        <Mat color="#e2e8f0" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.56, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 0.1, 16]} />
        <Mat color="#7dd3fc" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.6, 10]} />
        <Mat color="#e2e8f0" ghost={ghost} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <cylinderGeometry args={[0.42, 0.18, 0.18, 12]} />
        <Mat color="#e2e8f0" ghost={ghost} />
      </mesh>
      <mesh ref={jetRef} userData={ANIMATED} position={[0, 2.55, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <Mat color="#bae6fd" ghost={ghost} glow />
      </mesh>
      <group ref={topDropsRef} userData={ANIMATED}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <Mat color="#e0f2fe" ghost={ghost} glow />
          </mesh>
        ))}
      </group>
      <group ref={lowDropsRef} userData={ANIMATED}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <Mat color="#e0f2fe" ghost={ghost} glow />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const GROVE_TREES: Vec3[] = [
  [0, 0, 1.1],
  [1.7, 1.1, 0.95],
  [-1.4, 1.3, 1.0],
];

function SakuraGrove({ ghost }: { ghost?: boolean }) {
  const petalsRef = useRef<THREE.Group>(null);
  // Fixed scatter of fallen petals and a few drifting ones
  const fallen = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = i * 2.39996;
        const r = 0.6 + ((i * 37) % 10) * 0.2;
        return { x: Math.cos(a) * r + 0.1, z: Math.sin(a) * r + 0.7, rot: a };
      }),
    []
  );

  useFrame(() => {
    const t = performance.now() * 0.001;
    petalsRef.current?.children.forEach((petal, i) => {
      const phase = (t * 0.18 + i * 0.27) % 1;
      petal.position.set(
        Math.sin(t * 0.9 + i) * 1.2 + (i % 3) - 1,
        3.2 - phase * 3.1,
        Math.cos(t * 0.7 + i * 2) * 1.0 + 0.6
      );
      petal.rotation.set(t * 2 + i, t * 1.5, 0);
    });
  });

  return (
    <group>
      {GROVE_TREES.map(([x, z, scale]) => (
        <group key={`${x}${z}`} position={[x, 0, z]} scale={scale}>
          <mesh castShadow={!ghost} position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.2, 0.32, 1.5, 7]} />
            <Mat color="#5c4033" ghost={ghost} />
          </mesh>
          <mesh castShadow={!ghost} position={[0, 2.1, 0]}>
            <dodecahedronGeometry args={[1.2, 0]} />
            <Mat color="#f472b6" ghost={ghost} />
          </mesh>
          <mesh position={[0.7, 2.3, 0.3]}>
            <dodecahedronGeometry args={[0.8, 0]} />
            <Mat color="#f9a8d4" ghost={ghost} />
          </mesh>
          <mesh position={[-0.6, 2.5, -0.2]}>
            <dodecahedronGeometry args={[0.75, 0]} />
            <Mat color="#fbcfe8" ghost={ghost} />
          </mesh>
        </group>
      ))}
      {fallen.map((p, i) => (
        <Block key={i} size={[0.14, 0.01, 0.09]} at={[p.x, 0.02, p.z]} rot={[0, p.rot, 0]} color="#f9a8d4" ghost={ghost} />
      ))}
      <group ref={petalsRef} userData={ANIMATED}>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i}>
            <planeGeometry args={[0.12, 0.08]} />
            <meshLambertMaterial color="#fbcfe8" side={THREE.DoubleSide} transparent={ghost} opacity={ghost ? 0.55 : 1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function GoldStatue({ ghost }: { ghost?: boolean }) {
  const starRef = useRef<THREE.Mesh>(null);
  const sparklesRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const t = performance.now() * 0.001;
    if (starRef.current) starRef.current.rotation.y += 2.5 * Math.min(delta, 0.1);
    sparklesRef.current?.children.forEach((s, i) => {
      const a = t * 1.4 + (i * Math.PI * 2) / 3;
      s.position.set(Math.cos(a) * 0.75, 1.6 + Math.sin(t * 3 + i) * 0.25, Math.sin(a) * 0.75);
    });
  });

  return (
    <group>
      <Block size={[1.5, 0.3, 1.5]} at={[0, 0.15, 0]} color="#64748b" ghost={ghost} shadow />
      <Block size={[1.15, 0.5, 1.15]} at={[0, 0.55, 0]} color="#475569" ghost={ghost} shadow />
      <Block size={[0.6, 0.22, 0.02]} at={[0, 0.55, 0.585]} color="#facc15" ghost={ghost} />
      <mesh position={[0, 0.87, 0]}>
        <cylinderGeometry args={[0.32, 0.38, 0.14, 12]} />
        <Mat color="#eab308" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.09, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.3, 8]} />
        <Mat color="#facc15" ghost={ghost} />
      </mesh>
      <mesh castShadow={!ghost} position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.5, 0.22, 0.65, 16]} />
        <Mat color="#facc15" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.87, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 6, 20]} />
        <Mat color="#fde047" ghost={ghost} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.5, 1.55, 0]} rotation={[0, 0, (s * -Math.PI) / 2]}>
          <torusGeometry args={[0.2, 0.05, 6, 12, Math.PI]} />
          <Mat color="#facc15" ghost={ghost} />
        </mesh>
      ))}
      <mesh ref={starRef} userData={ANIMATED} position={[0, 2.35, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <Mat color="#fef08a" ghost={ghost} glow />
      </mesh>
      <group ref={sparklesRef} userData={ANIMATED}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <octahedronGeometry args={[0.07, 0]} />
            <Mat color="#fffbeb" ghost={ghost} glow />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Lễ Hội Bí Ngô: carved pumpkin lit from inside
function JackLantern({ ghost }: { ghost?: boolean }) {
  return (
    <group>
      {[-0.16, 0, 0.16].map((x, i) => (
        <mesh key={x} castShadow={!ghost} position={[x, 0.36, 0]} scale={[i === 1 ? 1 : 0.85, 0.82, 1]}>
          <sphereGeometry args={[0.42, 14, 12]} />
          <Mat color={i === 1 ? '#f97316' : '#ea580c'} ghost={ghost} />
        </mesh>
      ))}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.46, 0.37]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.12, 0.12, 0.05]} />
          <Mat color="#fde047" ghost={ghost} glow />
        </mesh>
      ))}
      <mesh position={[0, 0.36, 0.4]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.07, 0.07, 0.04]} />
        <Mat color="#fde047" ghost={ghost} glow />
      </mesh>
      <mesh position={[0, 0.22, 0.37]}>
        <boxGeometry args={[0.36, 0.08, 0.05]} />
        <Mat color="#fde047" ghost={ghost} glow />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.16, 6]} />
        <Mat color="#4d7c0f" ghost={ghost} />
      </mesh>
      <Block size={[0.2, 0.03, 0.1]} at={[0.1, 0.74, 0]} rot={[0, 0, -0.4]} color="#65a30d" ghost={ghost} />
    </group>
  );
}

// Lễ Hội Bí Ngô: witch's cauldron bubbling over a small fire
function Cauldron({ ghost }: { ghost?: boolean }) {
  const bubbleRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const now = performance.now();
    bubbleRefs.current.forEach((bubble, i) => {
      if (!bubble) return;
      const t = (now * 0.0006 + i / 4) % 1;
      bubble.position.set(Math.sin(i * 2.1) * 0.18, 0.78 + t * 0.6, Math.cos(i * 2.1) * 0.18);
      bubble.scale.setScalar(1 - t);
    });
  });

  return (
    <group>
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, (i * Math.PI) / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.8, 6]} />
          <Mat color="#78350f" ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <Mat color="#f97316" ghost={ghost} glow />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.3, 0.2, Math.cos(a) * 0.3]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 5]} />
            <Mat color="#1f2937" ghost={ghost} />
          </mesh>
        );
      })}
      <mesh castShadow={!ghost} position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.42, 16, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65]} />
        <Mat color="#1f2937" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.76, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.37, 0.05, 8, 20]} />
        <Mat color="#374151" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.04, 16]} />
        <Mat color="#4ade80" ghost={ghost} glow />
      </mesh>
      {!ghost &&
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            userData={ANIMATED}
            ref={(el) => {
              bubbleRefs.current[i] = el;
            }}
          >
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshBasicMaterial color="#86efac" />
          </mesh>
        ))}
    </group>
  );
}

// Country mailbox on a post, its red flag up
// The red flag stands up while a letter waits unread
function Mailbox({ ghost }: { ghost?: boolean }) {
  const hasMail = useGameStore((s) => s.mail.some((l) => !l.read));
  return (
    <group>
      <Block size={[0.12, 1.0, 0.12]} at={[0, 0.5, 0]} color="#92400e" ghost={ghost} shadow />
      <Block size={[0.36, 0.26, 0.52]} at={[0, 1.13, 0]} color="#2563eb" ghost={ghost} shadow />
      <mesh position={[0, 1.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.52, 14, 1, false, Math.PI / 2, Math.PI]} />
        <Mat color="#2563eb" ghost={ghost} />
      </mesh>
      <Block size={[0.18, 0.025, 0.01]} at={[0, 1.18, 0.265]} color="#1e293b" ghost={ghost} />
      <group position={[0.2, 1.14, 0.08]} rotation={[hasMail ? 0 : Math.PI / 2, 0, 0]} userData={ANIMATED}>
        <Block size={[0.035, 0.32, 0.03]} at={[0, 0.16, 0]} color="#dc2626" ghost={ghost} />
        <Block size={[0.14, 0.09, 0.02]} at={[0.06, 0.27, 0]} color="#dc2626" ghost={ghost} />
      </group>
    </group>
  );
}

const BEE_COUNT = 4;

// Beehive boxes on a stand, with bees buzzing round it
function Beehive({ ghost }: { ghost?: boolean }) {
  const beesRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() * 0.001;
    beesRef.current?.children.forEach((bee, i) => {
      const a = t * (1.6 + i * 0.3) + i * 1.7;
      const r = 0.55 + (i % 2) * 0.15;
      bee.position.set(Math.cos(a) * r, 0.9 + Math.sin(t * 3 + i) * 0.18, Math.sin(a) * r);
      bee.rotation.y = -a - Math.PI / 2;
    });
  });

  return (
    <group>
      {[-0.22, 0.22].flatMap((x) =>
        [-0.22, 0.22].map((z) => (
          <Block key={`${x}${z}`} size={[0.06, 0.3, 0.06]} at={[x, 0.15, z]} color="#78350f" ghost={ghost} />
        ))
      )}
      <Block size={[0.56, 0.06, 0.56]} at={[0, 0.32, 0]} color="#78350f" ghost={ghost} />
      <Block size={[0.48, 0.24, 0.48]} at={[0, 0.48, 0]} color="#facc15" ghost={ghost} shadow />
      <Block size={[0.5, 0.03, 0.5]} at={[0, 0.61, 0]} color="#ca8a04" ghost={ghost} />
      <Block size={[0.48, 0.24, 0.48]} at={[0, 0.74, 0]} color="#fde047" ghost={ghost} shadow />
      <Block size={[0.5, 0.03, 0.5]} at={[0, 0.87, 0]} color="#ca8a04" ghost={ghost} />
      <mesh castShadow={!ghost} position={[0, 0.99, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.42, 0.22, 4]} />
        <Mat color="#b45309" ghost={ghost} />
      </mesh>
      <Block size={[0.16, 0.05, 0.02]} at={[0, 0.4, 0.245]} color="#1c1917" ghost={ghost} />
      {!ghost && (
        <group ref={beesRef} userData={ANIMATED}>
          {Array.from({ length: BEE_COUNT }, (_, i) => (
            <group key={i}>
              <mesh scale={[1.3, 1, 1]}>
                <sphereGeometry args={[0.045, 8, 6]} />
                <meshLambertMaterial color="#facc15" />
              </mesh>
              <mesh>
                <boxGeometry args={[0.02, 0.07, 0.07]} />
                <meshLambertMaterial color="#1c1917" />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.03, 0.01, 0.1]} />
                <meshLambertMaterial color="#f8fafc" transparent opacity={0.7} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

// A-frame swing, its seat rocking to and fro
function Swing({ ghost }: { ghost?: boolean }) {
  const seatRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (seatRef.current) seatRef.current.rotation.x = Math.sin(performance.now() * 0.0018) * 0.35;
  });

  return (
    <group>
      {[-0.95, 0.95].flatMap((x) =>
        [-1, 1].map((side) => (
          <Block
            key={`${x}${side}`}
            size={[0.1, 1.95, 0.1]}
            at={[x, 0.95, side * 0.31]}
            rot={[-side * 0.32, 0, 0]}
            color="#92400e"
            ghost={ghost}
            shadow
          />
        ))
      )}
      <Block size={[2.1, 0.1, 0.1]} at={[0, 1.86, 0]} color="#78350f" ghost={ghost} shadow />
      <group ref={seatRef} userData={ANIMATED} position={[0, 1.82, 0]}>
        {[-0.3, 0.3].map((x) => (
          <mesh key={x} position={[x, -0.62, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1.24, 4]} />
            <Mat color="#d6d3d1" ghost={ghost} />
          </mesh>
        ))}
        <Block size={[0.75, 0.06, 0.3]} at={[0, -1.25, 0]} color="#dc2626" ghost={ghost} shadow />
      </group>
    </group>
  );
}

const LANTERN_COLORS = ['#dc2626', '#facc15', '#ec4899', '#f97316', '#a855f7'];

// A line of Hội An silk lanterns between two posts, glowing and swaying gently
function HoiAnLanterns({ ghost }: { ghost?: boolean }) {
  const lanternsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() * 0.0015;
    lanternsRef.current?.children.forEach((lantern, i) => {
      lantern.rotation.z = Math.sin(t + i * 1.3) * 0.08;
    });
  });

  return (
    <group>
      {[-1.05, 1.05].map((x) => (
        <group key={x}>
          <Block size={[0.12, 2.2, 0.12]} at={[x, 1.1, 0]} color="#78350f" ghost={ghost} shadow />
          <Block size={[0.2, 0.08, 0.2]} at={[x, 2.22, 0]} color="#451a03" ghost={ghost} />
        </group>
      ))}
      <Block size={[2.2, 0.05, 0.05]} at={[0, 2.1, 0]} color="#451a03" ghost={ghost} />
      <group ref={lanternsRef} userData={ANIMATED}>
        {LANTERN_COLORS.map((color, i) => (
          <group key={color} position={[-0.8 + i * 0.4, 2.07, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.16, 4]} />
              <Mat color="#451a03" ghost={ghost} />
            </mesh>
            <mesh position={[0, -0.24, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 0.05, 10]} />
              <Mat color="#ca8a04" ghost={ghost} />
            </mesh>
            <mesh position={[0, -0.45, 0]} scale={[1, 1.3, 1]}>
              <sphereGeometry args={[0.16, 14, 12]} />
              <Mat color={color} ghost={ghost} glow />
            </mesh>
            <mesh position={[0, -0.66, 0]}>
              <cylinderGeometry args={[0.09, 0.07, 0.05, 10]} />
              <Mat color="#ca8a04" ghost={ghost} />
            </mesh>
            <mesh position={[0, -0.77, 0]}>
              <cylinderGeometry args={[0.02, 0.004, 0.16, 4]} />
              <Mat color={color} ghost={ghost} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

const ROSE_COLORS = ['#e11d48', '#16a34a', '#f472b6', '#fbcfe8'];
// Roses and leaves climbing both posts and over the arch
const ARCH_BLOOMS: { at: Vec3; color: string }[] = [
  ...[0.35, 0.65, 0.95, 1.25, 1.52].flatMap((y, i) =>
    [-1, 1].map((side) => ({
      at: [side * 0.85, y, i % 2 ? 0.08 : -0.08] as Vec3,
      color: ROSE_COLORS[(i + (side > 0 ? 1 : 0)) % ROSE_COLORS.length],
    }))
  ),
  ...Array.from({ length: 11 }, (_, i) => {
    const a = (i / 10) * Math.PI;
    return {
      at: [Math.cos(a) * 0.85, 1.6 + Math.sin(a) * 0.85, i % 2 ? 0.07 : -0.07] as Vec3,
      color: ROSE_COLORS[i % ROSE_COLORS.length],
    };
  }),
];

function FlowerArch({ ghost }: { ghost?: boolean }) {
  return (
    <group>
      {[-0.85, 0.85].map((x) => (
        <group key={x}>
          <Block size={[0.12, 1.6, 0.12]} at={[x, 0.8, 0]} color="#f8fafc" ghost={ghost} shadow />
          <Block size={[0.4, 0.22, 0.4]} at={[x, 0.11, 0]} color="#15803d" ghost={ghost} />
        </group>
      ))}
      <mesh castShadow={!ghost} position={[0, 1.6, 0]}>
        <torusGeometry args={[0.85, 0.06, 8, 24, Math.PI]} />
        <Mat color="#f8fafc" ghost={ghost} />
      </mesh>
      {ARCH_BLOOMS.map(({ at, color }) => (
        <mesh key={at.join()} position={at}>
          <dodecahedronGeometry args={[0.1, 0]} />
          <Mat color={color} ghost={ghost} />
        </mesh>
      ))}
    </group>
  );
}

const KOI = ['#f97316', '#f8fafc', '#ef4444'];
const POND_STONES = Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2);

// Round pond with a stone rim, lily pads and koi swimming in circles
function KoiPond({ ghost }: { ghost?: boolean }) {
  const fishRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() * 0.0006;
    fishRef.current?.children.forEach((fish, i) => {
      const a = t * (1 + i * 0.25) + (i * Math.PI * 2) / 3;
      const r = 0.45 + i * 0.25;
      fish.position.set(Math.cos(a) * r, 0.11, Math.sin(a) * r);
      fish.rotation.y = -a - Math.PI / 2;
    });
  });

  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.06, 32]} />
        <Mat color="#0e7490" ghost={ghost} />
      </mesh>
      {POND_STONES.map((a, i) => (
        <mesh key={a} position={[Math.cos(a) * 1.55, 0.1, Math.sin(a) * 1.55]} rotation={[a, a * 2, 0]}>
          <dodecahedronGeometry args={[0.2, 0]} />
          <Mat color={i % 2 ? '#a8a29e' : '#78716c'} ghost={ghost} />
        </mesh>
      ))}
      {[
        [0.7, -0.5],
        [-0.6, 0.6],
        [-0.3, -0.8],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.09, z]}>
          <mesh>
            <cylinderGeometry args={[0.24, 0.24, 0.02, 12]} />
            <Mat color="#16a34a" ghost={ghost} />
          </mesh>
          {i === 0 && (
            <mesh position={[0.05, 0.1, 0]}>
              <coneGeometry args={[0.1, 0.16, 6]} />
              <Mat color="#f9a8d4" ghost={ghost} />
            </mesh>
          )}
        </group>
      ))}
      {!ghost && (
        <group ref={fishRef} userData={ANIMATED}>
          {KOI.map((color) => (
            <group key={color}>
              <mesh scale={[1.6, 0.6, 0.75]}>
                <sphereGeometry args={[0.12, 10, 8]} />
                <meshLambertMaterial color={color} />
              </mesh>
              <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.08, 0.14, 6]} />
                <meshLambertMaterial color={color === '#f8fafc' ? '#f97316' : color} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

const ENVELOPE_GORES = 12;
const RAINBOW = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];

// Rainbow-striped hot-air balloon tethered over its wicker basket, bobbing in the breeze
function HotAirBalloon({ ghost }: { ghost?: boolean }) {
  const floatRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (floatRef.current) floatRef.current.position.y = Math.sin(performance.now() * 0.0012) * 0.12;
  });

  return (
    <group>
      <Block size={[0.12, 0.3, 0.12]} at={[0.85, 0.15, 0.85]} color="#78350f" ghost={ghost} />
      <group ref={floatRef} userData={ANIMATED}>
        <Block size={[0.8, 0.55, 0.8]} at={[0, 0.85, 0]} color="#a16207" ghost={ghost} shadow />
        <Block size={[0.86, 0.08, 0.86]} at={[0, 1.13, 0]} color="#78350f" ghost={ghost} />
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.45, 1.6, sz * 0.45]} rotation={[sz * 0.19, 0, -sx * 0.19]}>
              <cylinderGeometry args={[0.012, 0.012, 0.95, 4]} />
              <Mat color="#78350f" ghost={ghost} />
            </mesh>
          ))
        )}
        <mesh position={[0, 1.45, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.14, 8]} />
          <Mat color="#475569" ghost={ghost} />
        </mesh>
        <mesh position={[0, 1.62, 0]}>
          <coneGeometry args={[0.08, 0.22, 8]} />
          <Mat color="#fb923c" ghost={ghost} glow />
        </mesh>
        <mesh position={[0, 2.05, 0]}>
          <cylinderGeometry args={[0.42, 0.62, 0.3, 16, 1, true]} />
          <Mat color="#7c2d12" ghost={ghost} />
        </mesh>
        {Array.from({ length: ENVELOPE_GORES }, (_, i) => (
          <mesh key={i} castShadow={!ghost && i === 0} position={[0, 3.2, 0]} scale={[1, 1.15, 1]}>
            <sphereGeometry
              args={[1.3, 4, 18, (i / ENVELOPE_GORES) * Math.PI * 2, (Math.PI * 2) / ENVELOPE_GORES]}
            />
            <Mat color={RAINBOW[i % RAINBOW.length]} ghost={ghost} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// 3D model of a farm decoration or workshop machine (also used translucent as the placement ghost and in shop previews)
const BAUBLE_COLORS = ['#ef4444', '#facc15', '#38bdf8', '#f472b6'];
// Baubles just outside each tier of the tree: height, distance from the trunk, how many, turn
const BAUBLES: { at: Vec3; color: string }[] = [
  { y: 0.45, r: 0.72, n: 6, turn: 0 },
  { y: 1.05, r: 0.54, n: 5, turn: 0.4 },
  { y: 1.6, r: 0.36, n: 4, turn: 0.2 },
].flatMap(({ y, r, n, turn }, tier) =>
  Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return { at: [Math.cos(a) * r, y, Math.sin(a) * r] as Vec3, color: BAUBLE_COLORS[(i + tier) % BAUBLE_COLORS.length] };
  })
);

// Giáng Sinh: three-tier fir hung with baubles, a turning gold star on top and presents underneath
function XmasTree({ ghost }: { ghost?: boolean }) {
  const starRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (starRef.current) starRef.current.rotation.y = performance.now() * 0.0015;
  });

  return (
    <group>
      <Block size={[0.22, 0.4, 0.22]} at={[0, 0.2, 0]} color="#78350f" ghost={ghost} />
      {[
        [0.85, 0.9, 0.75],
        [0.66, 0.8, 1.3],
        [0.45, 0.7, 1.8],
      ].map(([r, h, y]) => (
        <mesh key={y} castShadow={!ghost} position={[0, y, 0]}>
          <coneGeometry args={[r, h, 12]} />
          <Mat color="#15803d" ghost={ghost} />
        </mesh>
      ))}
      {BAUBLES.map(({ at, color }) => (
        <mesh key={`${at[0]}_${at[1]}`} position={at}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <Mat color={color} ghost={ghost} glow />
        </mesh>
      ))}
      <mesh ref={starRef} userData={ANIMATED} position={[0, 2.27, 0]}>
        <octahedronGeometry args={[0.17, 0]} />
        <Mat color="#fde047" ghost={ghost} glow />
      </mesh>
      <Block size={[0.32, 0.26, 0.32]} at={[0.55, 0.13, 0.42]} color="#dc2626" ghost={ghost} shadow />
      <Block size={[0.06, 0.27, 0.33]} at={[0.55, 0.13, 0.42]} color="#facc15" ghost={ghost} />
      <Block size={[0.26, 0.2, 0.26]} at={[-0.52, 0.1, 0.46]} color="#2563eb" ghost={ghost} shadow />
      <Block size={[0.27, 0.21, 0.05]} at={[-0.52, 0.1, 0.46]} color="#f8fafc" ghost={ghost} />
    </group>
  );
}

// Giáng Sinh: three snowballs with a carrot nose, coal eyes, a red scarf and a black top hat
function Snowman({ ghost }: { ghost?: boolean }) {
  return (
    <group>
      {[
        [0.42, 0.38],
        [0.3, 0.95],
        [0.22, 1.38],
      ].map(([r, y]) => (
        <mesh key={y} castShadow={!ghost} position={[0, y, 0]}>
          <sphereGeometry args={[r, 16, 12]} />
          <Mat color="#f8fafc" ghost={ghost} />
        </mesh>
      ))}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 1.44, 0.19]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <Mat color="#111827" ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[0, 1.38, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.035, 0.18, 8]} />
        <Mat color="#f97316" ghost={ghost} />
      </mesh>
      {[1.03, 0.9].map((y) => (
        <mesh key={y} position={[0, y, 0.29]}>
          <sphereGeometry args={[0.035, 6, 6]} />
          <Mat color="#111827" ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.05, 8, 18]} />
        <Mat color="#dc2626" ghost={ghost} />
      </mesh>
      <Block size={[0.09, 0.28, 0.04]} at={[0.12, 1.06, 0.2]} rot={[0, 0, 0.2]} color="#dc2626" ghost={ghost} />
      {[-1, 1].map((side) => (
        <Block
          key={side}
          size={[0.6, 0.035, 0.035]}
          at={[side * 0.48, 1.06, 0]}
          rot={[0, 0, side * 0.5]}
          color="#78350f"
          ghost={ghost}
        />
      ))}
      <mesh position={[0, 1.57, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.03, 16]} />
        <Mat color="#111827" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.28, 16]} />
        <Mat color="#111827" ghost={ghost} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.153, 0.153, 0.05, 16]} />
        <Mat color="#dc2626" ghost={ghost} />
      </mesh>
    </group>
  );
}

// Blossoms over a dome-shaped crown, spread round by the golden angle
const MAI_BLOSSOMS: Vec3[] = Array.from({ length: 46 }, (_, i) => {
  const polar = Math.acos(1 - ((i + 0.5) / 46) * 1.3);
  const az = i * 2.39996;
  return [Math.sin(polar) * Math.cos(az) * 0.6, 1.15 + Math.cos(polar) * 0.48, Math.sin(polar) * Math.sin(az) * 0.6];
});

// Tết: a potted mai tree in full yellow bloom, hung with red lucky-money envelopes
function MaiTree({ ghost }: { ghost?: boolean }) {
  return (
    <group>
      <mesh castShadow={!ghost} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.36, 0.28, 0.4, 14]} />
        <Mat color="#1e40af" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.04, 14]} />
        <Mat color="#facc15" ghost={ghost} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.02, 14]} />
        <Mat color="#422006" ghost={ghost} />
      </mesh>
      <Block size={[0.1, 0.62, 0.1]} at={[0.03, 0.7, 0]} rot={[0, 0, -0.1]} color="#57534e" ghost={ghost} />
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} position={[0.05, 1.0, 0]} rotation={[0, (i / 5) * Math.PI * 2 + 0.3, 0]}>
          <group rotation={[0, 0, -0.85]}>
            <Block size={[0.05, 0.55, 0.05]} at={[0, 0.27, 0]} color="#57534e" ghost={ghost} />
          </group>
        </group>
      ))}
      {MAI_BLOSSOMS.map((at, i) => (
        <mesh key={i} position={at}>
          <octahedronGeometry args={[0.065, 0]} />
          <Mat color={i % 3 === 0 ? '#fde047' : '#facc15'} ghost={ghost} />
        </mesh>
      ))}
      {[0.5, 2.1, 3.6, 5.2].map((a) => (
        <group key={a} position={[Math.cos(a) * 0.5, 1.02, Math.sin(a) * 0.5]} rotation={[0, -a, 0]}>
          <Block size={[0.09, 0.13, 0.02]} at={[0, 0, 0]} color="#dc2626" ghost={ghost} />
          <Block size={[0.04, 0.04, 0.025]} at={[0, 0.01, 0]} color="#facc15" ghost={ghost} />
        </group>
      ))}
    </group>
  );
}

// Tết: a low bamboo table set with square bánh chưng tied with bamboo strips
const CAKES: Vec3[] = [
  [-0.15, 0.45, -0.13],
  [0.15, 0.45, -0.13],
  [-0.15, 0.45, 0.13],
  [0.15, 0.45, 0.13],
  [0, 0.57, 0],
];

function BanhChung({ ghost }: { ghost?: boolean }) {
  return (
    <group>
      <Block size={[0.9, 0.06, 0.6]} at={[0, 0.36, 0]} color="#a16207" ghost={ghost} shadow />
      {[-0.38, 0.38].flatMap((x) =>
        [-0.24, 0.24].map((z) => (
          <Block key={`${x}${z}`} size={[0.06, 0.33, 0.06]} at={[x, 0.165, z]} color="#854d0e" ghost={ghost} />
        ))
      )}
      {CAKES.map((at) => (
        <group key={`${at[0]}${at[1]}${at[2]}`} position={at}>
          <Block size={[0.24, 0.12, 0.24]} at={[0, 0, 0]} color="#166534" ghost={ghost} shadow />
          <Block size={[0.25, 0.125, 0.03]} at={[0, 0, 0]} color="#d9f99d" ghost={ghost} />
          <Block size={[0.03, 0.125, 0.25]} at={[0, 0, 0]} color="#d9f99d" ghost={ghost} />
        </group>
      ))}
      <Block size={[0.12, 0.01, 0.08]} at={[0.36, 0.395, 0.2]} rot={[0, 0.4, 0]} color="#dc2626" ghost={ghost} />
    </group>
  );
}

export function DecorModel({ id, ghost }: { id: string; ghost?: boolean }) {
  if (isMachineId(id)) return <MachineModel id={id} ghost={ghost} />;
  switch (id) {
    case 'decor_scarecrow':
      return <Scarecrow ghost={ghost} />;
    case 'decor_windmill':
      return <Windmill ghost={ghost} />;
    case 'decor_fountain':
      return <Fountain ghost={ghost} />;
    case 'decor_sakura_grove':
      return <SakuraGrove ghost={ghost} />;
    case 'decor_gold_statue':
      return <GoldStatue ghost={ghost} />;
    case 'decor_jack_lantern':
      return <JackLantern ghost={ghost} />;
    case 'decor_cauldron':
      return <Cauldron ghost={ghost} />;
    case 'decor_mailbox':
      return <Mailbox ghost={ghost} />;
    case 'decor_beehive':
      return <Beehive ghost={ghost} />;
    case 'decor_swing':
      return <Swing ghost={ghost} />;
    case 'decor_hoian_lanterns':
      return <HoiAnLanterns ghost={ghost} />;
    case 'decor_flower_arch':
      return <FlowerArch ghost={ghost} />;
    case 'decor_koi_pond':
      return <KoiPond ghost={ghost} />;
    case 'decor_hot_air_balloon':
      return <HotAirBalloon ghost={ghost} />;
    case 'decor_xmas_tree':
      return <XmasTree ghost={ghost} />;
    case 'decor_snowman':
      return <Snowman ghost={ghost} />;
    case 'decor_mai_tree':
      return <MaiTree ghost={ghost} />;
    case 'decor_banh_chung':
      return <BanhChung ghost={ghost} />;
    default:
      return null;
  }
}
