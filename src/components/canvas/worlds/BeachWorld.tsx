'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SNACK_PRICE, useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { FISHING_ENERGY, FISHING_SPOTS } from '@/config/fish';
import { BEACH_SPOTS, FORAGE_ITEMS } from '@/config/forage';
import { SNACKS, ZONE_SPOTS } from '@/config/zones';
import { beachFinds } from '@/lib/forage';
import { ForageId } from '@/types/game';
import { Tree } from '../environment/Props';

const SPOT = FISHING_SPOTS.beach;

const UMBRELLAS: [number, number, string][] = [
  [-8, 1, '#ef4444'],
  [-3.5, 3.5, '#3b82f6'],
  [3, 1.5, '#ec4899'],
  [-7.5, -8, '#10b981'],
  [8, -3, '#f59e0b'],
  [14, 1, '#8b5cf6'],
];

const PALMS: [number, number, number][] = [
  [-13, 15, 1.2],
  [12, -7, 1.25],
  [-4, -19, 1.1],
  [10, -18, 1.15],
  [-20, -6, 1.2],
  [19, -9, 1.1],
  [-16, 4, 1.05],
  [16, 13, 1.2],
];

// The jetty runs from the north beach out over the cliff into the sea
const JETTY_START_Z = -17.5;
const JETTY_END_Z = -27.8;
const JETTY_POSTS = [-19, -21.5, -24, -26.5];

function FishingJetty() {
  const goFishing = useGameStore((s) => s.goFishing);
  const handlers = interactable('🎣 Cầu Câu Cá Biển', goFishing, `Click để ra cuối cầu và quăng cần (-${FISHING_ENERGY}⚡)`);
  const length = JETTY_START_Z - JETTY_END_Z;

  return (
    <group position={[SPOT.x, 0, 0]}>
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
      <group position={[1.15, 0, SPOT.z + 0.6]}>
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
            🎣 Câu Cá Biển
          </div>
        </Html>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, SPOT.z]}>
        <ringGeometry args={[0.45, 0.55, 24]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CoconutStand() {
  const walkTo = useGameStore((s) => s.walkTo);
  const eat = useGameStore((s) => s.eatPopcornOrSnack);
  const snackFree = useGameStore((s) => s.lastFreeSnackDay !== s.day);
  const { x, z, reach } = ZONE_SPOTS.beachCoconut;
  const snack = SNACKS.coconut;
  const handlers = interactable(
    `${snack.icon} Quầy Nước Dừa (+${snack.energy}⚡)`,
    () => walkTo({ x, z, reach, act: () => eat(snack.label, snack.energy) }),
    snackFree ? 'Phần đầu tiên hôm nay miễn phí!' : `${SNACK_PRICE} Vàng một trái`
  );

  return (
    <group position={[x, 0, z]} {...handlers}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[2.4, 1.1, 1.1]} />
        <meshLambertMaterial color="#a16207" />
      </mesh>
      {[-1.1, 1.1].map((dx) => (
        <mesh key={dx} castShadow position={[dx, 1.4, -0.4]}>
          <cylinderGeometry args={[0.07, 0.07, 2.8, 6]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
      ))}
      <mesh castShadow position={[0, 2.85, -0.1]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.0, 0.9, 4]} />
        <meshLambertMaterial color="#d9a441" />
      </mesh>
      {[-0.7, -0.2, 0.35, 0.8].map((dx, i) => (
        <mesh key={dx} position={[dx, 1.25, 0.1 * (i % 2)]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <meshLambertMaterial color="#4d7c0f" />
        </mesh>
      ))}
      <Html position={[0, 3.6, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-lime-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          🥥 Nước Dừa
        </div>
      </Html>
    </group>
  );
}

// One of today's finds lying on the sand, with a little sparkle over it
function BeachFind({ spot, item }: { spot: number; item: ForageId }) {
  const sparkleRef = useRef<THREE.Mesh>(null);
  const walkTo = useGameStore((s) => s.walkTo);
  const collect = useGameStore((s) => s.collectBeachFind);
  const [x, z] = BEACH_SPOTS[spot];
  const cfg = FORAGE_ITEMS[item];
  const handlers = interactable(
    `${cfg.icon} ${cfg.name}`,
    () => walkTo({ x, z, reach: 0.9, act: () => collect(spot) }),
    `Click để nhặt • bán ${cfg.sellPrice}🪙`
  );

  useFrame(() => {
    const sparkle = sparkleRef.current;
    if (!sparkle) return;
    const t = performance.now() * 0.003 + spot;
    sparkle.position.y = 0.55 + Math.sin(t) * 0.08;
    sparkle.rotation.y = t;
    sparkle.scale.setScalar(0.8 + Math.abs(Math.sin(t * 1.3)) * 0.4);
  });

  return (
    <group position={[x, 0, z]} {...handlers}>
      {item === 'shell' && (
        <mesh position={[0, 0.07, 0]} scale={[1, 0.45, 0.8]}>
          <sphereGeometry args={[0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#fecdd3" />
        </mesh>
      )}
      {item === 'starfish' &&
        [0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 0.05, 0]} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
            <boxGeometry args={[0.08, 0.05, 0.46]} />
            <meshLambertMaterial color="#f97316" />
          </mesh>
        ))}
      {item === 'coral' &&
        [-0.1, 0.05, 0.14].map((dx, i) => (
          <mesh key={dx} position={[dx, 0.18 + i * 0.03, dx * 0.6]} rotation={[0, 0, (i - 1) * 0.4]}>
            <cylinderGeometry args={[0.03, 0.05, 0.36, 5]} />
            <meshLambertMaterial color="#f472b6" />
          </mesh>
        ))}
      {item === 'pearl' && (
        <group>
          <mesh position={[0, 0.06, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color="#a8a29e" />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        </group>
      )}
      <mesh ref={sparkleRef} position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.09, 0]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
    </group>
  );
}

const NOTHING_TAKEN: number[] = [];

function BeachFinds() {
  const day = useGameStore((s) => s.day);
  const beachDay = useGameStore((s) => s.beachDay);
  const beachTaken = useGameStore((s) => s.beachTaken);
  const taken = beachDay === day ? beachTaken : NOTHING_TAKEN;
  return (
    <group>
      {beachFinds(day)
        .filter((f) => !taken.includes(f.spot))
        .map((f) => (
          <BeachFind key={`${day}_${f.spot}`} spot={f.spot} item={f.item} />
        ))}
    </group>
  );
}

function VolleyballCourt() {
  return (
    <group position={[9, 0, -11]}>
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[7, 0.02, 4]} />
        <meshLambertMaterial color="#fcd34d" />
      </mesh>
      {[-3.5, 3.5].map((x) => (
        <mesh key={`l${x}`} position={[x, 0.04, 0]}>
          <boxGeometry args={[0.06, 0.02, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-2, 2].map((z) => (
        <mesh key={z} castShadow position={[0, 1.1, z]}>
          <cylinderGeometry args={[0.05, 0.05, 2.2, 6]} />
          <meshLambertMaterial color="#e5e7eb" />
        </mesh>
      ))}
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[0.03, 0.7, 4]} />
        <meshLambertMaterial color="#f8fafc" transparent opacity={0.7} />
      </mesh>
      <mesh castShadow position={[-1.6, 0.2, 0.8]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshLambertMaterial color="#fde047" />
      </mesh>
    </group>
  );
}

function Sandcastle() {
  return (
    <group position={[-3, 0, -12]}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.8, 0.95, 0.6, 8]} />
        <meshLambertMaterial color="#e5c07b" />
      </mesh>
      {[-0.55, 0.55].flatMap((x) =>
        [-0.55, 0.55].map((z) => (
          <group key={`${x}${z}`} position={[x, 0.6, z]}>
            <mesh castShadow position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.2, 0.22, 0.5, 8]} />
              <meshLambertMaterial color="#e5c07b" />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <coneGeometry args={[0.24, 0.3, 8]} />
              <meshLambertMaterial color="#d4a65a" />
            </mesh>
          </group>
        ))
      )}
      <mesh castShadow position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.3, 0.34, 0.8, 8]} />
        <meshLambertMaterial color="#e5c07b" />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <coneGeometry args={[0.36, 0.5, 8]} />
        <meshLambertMaterial color="#d4a65a" />
      </mesh>
      <mesh position={[0, 2.1, 0.05]}>
        <boxGeometry args={[0.24, 0.16, 0.02]} />
        <meshLambertMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

export function BeachWorld() {
  const yachtRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (yachtRef.current) {
      yachtRef.current.position.y = -0.8 + Math.sin(performance.now() * 0.002 * 2.2) * 0.18;
    }
  });

  return (
    <group>
      {/* Wet sand along the waterline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[24.8, 27.9, 64]} />
        <meshLambertMaterial color="#eab308" />
      </mesh>

      {/* Pier and yacht on the east shore */}
      <mesh castShadow receiveShadow position={[22.5, 0.2, 9]}>
        <boxGeometry args={[11, 0.25, 3.0]} />
        <meshLambertMaterial color="#92400e" />
      </mesh>
      {[18, 21, 24, 27].map((x) => (
        <mesh key={x} position={[x, -0.8, 10.3]}>
          <cylinderGeometry args={[0.12, 0.12, 2, 6]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
      ))}
      <group ref={yachtRef} position={[29.5, -0.8, 13]}>
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

      {/* Lighthouse on the north-west point */}
      <group position={[-17, 0, -16]}>
        <mesh castShadow position={[0, 2.75, 0]}>
          <cylinderGeometry args={[1.1, 1.5, 5.5, 12]} />
          <meshLambertMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry args={[1.32, 1.4, 0.8, 12]} />
          <meshLambertMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 6.0, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 1.1, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[0, 6.85, 0]}>
          <coneGeometry args={[1.1, 0.7, 12]} />
          <meshLambertMaterial color="#7f1d1d" />
        </mesh>
      </group>

      {PALMS.map(([x, z, scale]) => (
        <Tree key={`${x}_${z}`} x={x} z={z} scale={scale} type="palm" />
      ))}

      <VolleyballCourt />
      <Sandcastle />
      <CoconutStand />
      <BeachFinds />
      <FishingJetty />
    </group>
  );
}
