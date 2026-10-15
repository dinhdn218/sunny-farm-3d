'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isMachineId } from '@/config/machines';
import { MachineModel } from './MachineModel';

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
      <group ref={bladesRef} position={[0, 3.7, 1.15]}>
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
      <mesh ref={jetRef} position={[0, 2.55, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <Mat color="#bae6fd" ghost={ghost} glow />
      </mesh>
      <group ref={topDropsRef}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <Mat color="#e0f2fe" ghost={ghost} glow />
          </mesh>
        ))}
      </group>
      <group ref={lowDropsRef}>
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
      <group ref={petalsRef}>
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
      <mesh ref={starRef} position={[0, 2.35, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <Mat color="#fef08a" ghost={ghost} glow />
      </mesh>
      <group ref={sparklesRef}>
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

// 3D model of a farm decoration or workshop machine (also used translucent as the placement ghost and in shop previews)
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
    default:
      return null;
  }
}
