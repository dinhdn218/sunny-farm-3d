'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MachineId, MachineJob } from '@/types/game';

type Vec3 = [number, number, number];
const ZERO: Vec3 = [0, 0, 0];

// Same look as DecorModel: see-through for the placement ghost, `glow` ignores lighting
function Mat({ color, ghost, glow = false }: { color: string; ghost?: boolean; glow?: boolean }) {
  const opacity = ghost ? 0.55 : 1;
  return glow ? (
    <meshBasicMaterial color={color} transparent={ghost} opacity={opacity} />
  ) : (
    <meshLambertMaterial color={color} transparent={ghost} opacity={opacity} />
  );
}

function Block({
  size,
  at,
  color,
  rot = ZERO,
  ghost,
}: {
  size: Vec3;
  at: Vec3;
  color: string;
  rot?: Vec3;
  ghost?: boolean;
}) {
  return (
    <mesh position={at} rotation={rot} castShadow={!ghost}>
      <boxGeometry args={size} />
      <Mat color={color} ghost={ghost} />
    </mesh>
  );
}

const isWorking = (job?: MachineJob | null) => !!job && Date.now() < job.readyAt;

// Puffs rising from a chimney or a pot while the machine is busy
function Smoke({ at, job, color = '#f1f5f9' }: { at: Vec3; job?: MachineJob | null; color?: string }) {
  const puffs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const active = isWorking(job);
    const now = performance.now();
    puffs.current.forEach((puff, i) => {
      if (!puff) return;
      puff.visible = active;
      if (!active) return;
      const t = (now * 0.0007 + i / 3) % 1;
      puff.position.set(at[0] + Math.sin(t * 6 + i) * 0.08, at[1] + t * 0.9, at[2]);
      puff.scale.setScalar(0.6 + t * 1.6);
      (puff.material as THREE.MeshLambertMaterial).opacity = 0.7 * (1 - t);
    });
  });

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            puffs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshLambertMaterial color={color} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// Firewood stacked beside the oven
const OVEN_LOGS: Vec3[] = [
  [0.85, 0.08, 0.2],
  [0.85, 0.08, 0.38],
  [0.85, 0.22, 0.29],
];

function Oven({ ghost, job }: { ghost?: boolean; job?: MachineJob | null }) {
  const mouthRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    if (!mouthRef.current) return;
    const glow = isWorking(job) ? 0.75 + Math.sin(performance.now() * 0.01) * 0.25 : 0;
    mouthRef.current.color.setRGB(0.11 + glow * 0.85, 0.1 + glow * 0.35, 0.09);
  });

  return (
    <group>
      <Block size={[1.5, 0.3, 1.3]} at={[0, 0.15, 0]} color="#78716c" ghost={ghost} />
      <mesh castShadow={!ghost} position={[0, 0.3, 0]} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[0.66, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color="#b45309" ghost={ghost} />
      </mesh>
      {/* Brick courses */}
      {[0.42, 0.62].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.6 - (y - 0.42) * 0.55, 0.025, 4, 18]} />
          <Mat color="#92400e" ghost={ghost} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0.58]}>
        <boxGeometry args={[0.46, 0.34, 0.12]} />
        <meshBasicMaterial ref={mouthRef} color="#1c1917" transparent={ghost} opacity={ghost ? 0.55 : 1} />
      </mesh>
      <mesh castShadow={!ghost} position={[0.3, 0.95, -0.25]}>
        <cylinderGeometry args={[0.1, 0.13, 0.6, 8]} />
        <Mat color="#57534e" ghost={ghost} />
      </mesh>
      {OVEN_LOGS.map((pos) => (
        <mesh key={pos.join()} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 6]} />
          <Mat color="#92400e" ghost={ghost} />
        </mesh>
      ))}
      {!ghost && <Smoke at={[0.3, 1.3, -0.25]} job={job} color="#cbd5e1" />}
    </group>
  );
}

function Kitchen({ ghost, job }: { ghost?: boolean; job?: MachineJob | null }) {
  return (
    <group>
      <Block size={[1.6, 0.8, 0.8]} at={[0, 0.4, 0]} color="#a16207" ghost={ghost} />
      {[-0.4, 0.4].map((x) => (
        <Block key={x} size={[0.62, 0.5, 0.02]} at={[x, 0.38, 0.41]} color="#854d0e" ghost={ghost} />
      ))}
      <Block size={[1.72, 0.08, 0.9]} at={[0, 0.84, 0]} color="#e7e5e4" ghost={ghost} />
      {/* Tiled splash-back */}
      <Block size={[1.72, 0.8, 0.08]} at={[0, 1.28, -0.42]} color="#fef3c7" ghost={ghost} />
      {[-0.43, 0, 0.43].map((x) => (
        <Block key={x} size={[0.02, 0.8, 0.09]} at={[x, 1.28, -0.42]} color="#fbbf24" ghost={ghost} />
      ))}
      {/* Soup pot and frying pan */}
      <mesh castShadow={!ghost} position={[-0.38, 1.03, 0]}>
        <cylinderGeometry args={[0.26, 0.22, 0.32, 12]} />
        <Mat color="#475569" ghost={ghost} />
      </mesh>
      <mesh position={[-0.38, 1.21, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.04, 12]} />
        <Mat color="#64748b" ghost={ghost} />
      </mesh>
      <mesh position={[0.35, 0.91, 0.02]}>
        <cylinderGeometry args={[0.22, 0.2, 0.06, 12]} />
        <Mat color="#1f2937" ghost={ghost} />
      </mesh>
      <Block size={[0.32, 0.04, 0.06]} at={[0.68, 0.93, 0.02]} color="#78350f" ghost={ghost} />
      {!ghost && <Smoke at={[-0.38, 1.3, 0]} job={job} />}
    </group>
  );
}

function CheesePress({ ghost, job }: { ghost?: boolean; job?: MachineJob | null }) {
  const screwRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (screwRef.current && isWorking(job)) screwRef.current.rotation.y += Math.min(delta, 0.1) * 2;
  });

  return (
    <group>
      <Block size={[1.0, 0.25, 0.8]} at={[0, 0.125, 0]} color="#92400e" ghost={ghost} />
      {[-0.4, 0.4].map((x) => (
        <Block key={x} size={[0.12, 1.4, 0.12]} at={[x, 0.95, 0]} color="#78350f" ghost={ghost} />
      ))}
      <Block size={[1.0, 0.16, 0.22]} at={[0, 1.65, 0]} color="#78350f" ghost={ghost} />
      <mesh position={[0, 0.42, 0]} castShadow={!ghost}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <Mat color="#facc15" ghost={ghost} />
      </mesh>
      <group ref={screwRef}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
          <Mat color="#a8a29e" ghost={ghost} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.08, 16]} />
          <Mat color="#78350f" ghost={ghost} />
        </mesh>
        <Block size={[0.6, 0.05, 0.05]} at={[0, 1.8, 0]} color="#57534e" ghost={ghost} />
      </group>
    </group>
  );
}

function Loom({ ghost, job }: { ghost?: boolean; job?: MachineJob | null }) {
  const shuttleRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (shuttleRef.current && isWorking(job)) {
      shuttleRef.current.position.x = Math.sin(performance.now() * 0.004) * 0.5;
    }
  });

  return (
    <group>
      {[-0.7, 0.7].map((x) => (
        <Block key={x} size={[0.1, 1.4, 0.8]} at={[x, 0.7, 0]} color="#92400e" ghost={ghost} />
      ))}
      {[
        [1.3, -0.2],
        [0.5, 0.25],
      ].map(([y, z]) => (
        <mesh key={y} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
          <Mat color="#78350f" ghost={ghost} />
        </mesh>
      ))}
      {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => (
        <Block key={x} size={[0.02, 0.85, 0.02]} at={[x, 0.9, 0.02]} rot={[0.5, 0, 0]} color="#fef3c7" ghost={ghost} />
      ))}
      <mesh position={[0, 0.48, 0.32]} rotation={[0, 0, Math.PI / 2]} castShadow={!ghost}>
        <cylinderGeometry args={[0.13, 0.13, 1.25, 10]} />
        <Mat color="#ec4899" ghost={ghost} />
      </mesh>
      <mesh ref={shuttleRef} position={[0, 0.88, 0.06]}>
        <boxGeometry args={[0.26, 0.06, 0.08]} />
        <Mat color="#b45309" ghost={ghost} />
      </mesh>
      <Block size={[0.8, 0.1, 0.35]} at={[0, 0.45, 0.85]} color="#a16207" ghost={ghost} />
    </group>
  );
}

// 3D model of a workshop machine; `job` drives its working animation
export function MachineModel({
  id,
  ghost,
  job,
}: {
  id: MachineId;
  ghost?: boolean;
  job?: MachineJob | null;
}) {
  switch (id) {
    case 'machine_oven':
      return <Oven ghost={ghost} job={job} />;
    case 'machine_kitchen':
      return <Kitchen ghost={ghost} job={job} />;
    case 'machine_cheese':
      return <CheesePress ghost={ghost} job={job} />;
    case 'machine_loom':
      return <Loom ghost={ghost} job={job} />;
  }
}
