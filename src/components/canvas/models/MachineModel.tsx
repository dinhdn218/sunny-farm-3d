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

const STAND_LEGS: [number, number][] = [
  [-0.56, -0.28],
  [-0.56, 0.28],
  [0.56, -0.28],
  [0.56, 0.28],
];

// Glasses of the blender's drinks lined up on its stand: colour and spot on the counter
const STAND_GLASSES: { color: string; at: Vec3 }[] = [
  { color: '#facc15', at: [0.05, 0.86, 0.18] },
  { color: '#fb923c', at: [0.25, 0.86, 0.18] },
  { color: '#f43f5e', at: [0.45, 0.86, 0.18] },
];

// Mango, orange and watermelon in the fruit bowl
const STAND_FRUIT: { color: string; at: Vec3; r: number }[] = [
  { color: '#f59e0b', at: [0.36, 0.92, -0.14], r: 0.07 },
  { color: '#f97316', at: [0.48, 0.92, -0.12], r: 0.065 },
  { color: '#16a34a', at: [0.44, 0.94, -0.25], r: 0.08 },
];

function Blender({ ghost, job }: { ghost?: boolean; job?: MachineJob | null }) {
  const jarRef = useRef<THREE.Group>(null);
  const swirlRef = useRef<THREE.Group>(null);

  // The jar shudders and the drink churns while a batch is blending
  useFrame((_, delta) => {
    const working = isWorking(job);
    const now = performance.now();
    if (jarRef.current) {
      jarRef.current.position.x = working ? Math.sin(now * 0.09) * 0.01 : 0;
      jarRef.current.position.z = working ? Math.cos(now * 0.07) * 0.01 : 0;
    }
    if (swirlRef.current) {
      if (working) swirlRef.current.rotation.y += Math.min(delta, 0.1) * 18;
      swirlRef.current.scale.y = working ? 1 + Math.sin(now * 0.02) * 0.12 : 1;
    }
  });

  return (
    <group>
      {/* Wooden stand with a striped skirt */}
      <Block size={[1.3, 0.08, 0.75]} at={[0, 0.74, 0]} color="#d97706" ghost={ghost} />
      {STAND_LEGS.map(([x, z]) => (
        <Block key={`${x},${z}`} size={[0.08, 0.7, 0.08]} at={[x, 0.35, z]} color="#92400e" ghost={ghost} />
      ))}
      <Block size={[1.26, 0.36, 0.03]} at={[0, 0.52, 0.36]} color="#fef3c7" ghost={ghost} />
      {[-0.42, 0, 0.42].map((x) => (
        <Block key={x} size={[0.2, 0.36, 0.035]} at={[x, 0.52, 0.36]} color="#f97316" ghost={ghost} />
      ))}

      {/* The blender: motor base, glass jar with the drink inside, lid */}
      <group ref={jarRef} position={[-0.25, 0, 0]}>
        <mesh castShadow={!ghost} position={[0, 0.89, 0]}>
          <cylinderGeometry args={[0.17, 0.2, 0.22, 12]} />
          <Mat color="#e11d48" ghost={ghost} />
        </mesh>
        <mesh position={[0, 0.88, 0.19]}>
          <boxGeometry args={[0.08, 0.05, 0.03]} />
          <Mat color="#fde047" ghost={ghost} glow />
        </mesh>
        <group ref={swirlRef} position={[0, 1.13, 0]}>
          <mesh>
            <cylinderGeometry args={[0.135, 0.12, 0.26, 12]} />
            <Mat color="#fb923c" ghost={ghost} />
          </mesh>
          <Block size={[0.27, 0.2, 0.03]} at={[0, 0.02, 0]} color="#fde68a" ghost={ghost} />
        </group>
        <mesh position={[0, 1.23, 0]}>
          <cylinderGeometry args={[0.17, 0.14, 0.46, 12]} />
          <meshLambertMaterial color="#e0f2fe" transparent opacity={ghost ? 0.3 : 0.45} depthWrite={false} />
        </mesh>
        <mesh position={[0, 1.48, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 12]} />
          <Mat color="#1f2937" ghost={ghost} />
        </mesh>
      </group>

      {/* Drinks ready to serve, each with a straw */}
      {STAND_GLASSES.map(({ color, at }) => (
        <group key={color} position={at}>
          <mesh castShadow={!ghost}>
            <cylinderGeometry args={[0.065, 0.055, 0.16, 10]} />
            <Mat color={color} ghost={ghost} />
          </mesh>
          <mesh position={[0.02, 0.12, 0]} rotation={[0, 0, -0.25]}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 5]} />
            <Mat color="#f8fafc" ghost={ghost} />
          </mesh>
        </group>
      ))}

      {/* Fruit bowl */}
      <mesh position={[0.42, 0.83, -0.18]}>
        <cylinderGeometry args={[0.18, 0.12, 0.1, 12]} />
        <Mat color="#a16207" ghost={ghost} />
      </mesh>
      {STAND_FRUIT.map(({ color, at, r }) => (
        <mesh key={color} position={at}>
          <sphereGeometry args={[r, 10, 8]} />
          <Mat color={color} ghost={ghost} />
        </mesh>
      ))}
    </group>
  );
}

// Small jars beside the big one: where they stand, their size and glaze, and how they are closed
const SIDE_JARS: { at: Vec3; r: number; color: string; cover: 'cloth' | 'lid' }[] = [
  { at: [0.48, 0, 0.22], r: 0.24, color: '#92400e', cover: 'cloth' },
  { at: [0.42, 0, -0.3], r: 0.2, color: '#b45309', cover: 'lid' },
];

function Crock({ ghost, job }: { ghost?: boolean; job?: MachineJob | null }) {
  const lidRef = useRef<THREE.Group>(null);

  // The big jar's lid rattles while a batch ferments
  useFrame(() => {
    if (!lidRef.current) return;
    const working = isWorking(job);
    const t = performance.now() * 0.006;
    lidRef.current.rotation.z = working ? Math.sin(t) * 0.06 : 0;
    lidRef.current.position.y = working ? 1.15 + Math.max(0, Math.sin(t * 2)) * 0.03 : 1.15;
  });

  return (
    <group>
      {/* Bamboo mat */}
      <Block size={[1.5, 0.06, 1.1]} at={[0, 0.03, 0]} color="#ca8a04" ghost={ghost} />
      {[-0.45, -0.15, 0.15, 0.45].map((z) => (
        <Block key={z} size={[1.5, 0.065, 0.025]} at={[0, 0.035, z]} color="#a16207" ghost={ghost} />
      ))}

      {/* The big glazed chum */}
      <group position={[-0.25, 0, 0]}>
        <mesh castShadow={!ghost} position={[0, 0.56, 0]} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[0.45, 16, 12]} />
          <Mat color="#7c2d12" ghost={ghost} />
        </mesh>
        <mesh position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.37, 0.03, 6, 20]} />
          <Mat color="#d97706" ghost={ghost} />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <cylinderGeometry args={[0.22, 0.29, 0.14, 14]} />
          <Mat color="#7c2d12" ghost={ghost} />
        </mesh>
        <mesh position={[0, 1.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.23, 0.035, 6, 18]} />
          <Mat color="#9a3412" ghost={ghost} />
        </mesh>
        <group ref={lidRef} position={[0, 1.15, 0]}>
          <mesh castShadow={!ghost}>
            <cylinderGeometry args={[0.08, 0.27, 0.12, 14]} />
            <Mat color="#78350f" ghost={ghost} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <Mat color="#a16207" ghost={ghost} />
          </mesh>
        </group>
        {!ghost && <Smoke at={[0, 1.3, 0]} job={job} color="#fef9c3" />}
      </group>

      {SIDE_JARS.map(({ at, r, color, cover }) => (
        <group key={color} position={at}>
          <mesh castShadow={!ghost} position={[0, r * 1.15, 0]} scale={[1, 1.1, 1]}>
            <sphereGeometry args={[r, 12, 10]} />
            <Mat color={color} ghost={ghost} />
          </mesh>
          <mesh position={[0, r * 2.2, 0]}>
            <cylinderGeometry args={[r * 0.5, r * 0.62, r * 0.35, 12]} />
            <Mat color={color} ghost={ghost} />
          </mesh>
          {cover === 'cloth' ? (
            <>
              <mesh position={[0, r * 2.38, 0]}>
                <sphereGeometry args={[r * 0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Mat color="#fef3c7" ghost={ghost} />
              </mesh>
              <mesh position={[0, r * 2.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[r * 0.55, 0.018, 5, 14]} />
                <Mat color="#dc2626" ghost={ghost} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, r * 2.42, 0]}>
              <cylinderGeometry args={[r * 0.3, r * 0.6, r * 0.22, 12]} />
              <Mat color="#78350f" ghost={ghost} />
            </mesh>
          )}
        </group>
      ))}
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
    case 'machine_blender':
      return <Blender ghost={ghost} job={job} />;
    case 'machine_crock':
      return <Crock ghost={ghost} job={job} />;
  }
}
