'use client';

import { Html } from '@react-three/drei';
import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';
import { Fountain, Tree } from '../environment/Props';

const SAKURA_TREES: [number, number, number][] = [
  [-8, -6, 1.25],
  [8, -6, 1.25],
  [-9, 2, 1.15],
  [9, 2, 1.15],
  [-6, -9, 1.1],
  [6, -9, 1.1],
  [-7, 7, 1.2],
  [7, 7, 1.2],
];

const BENCHES: [number, number, number][] = [
  [-4.5, 0, Math.PI / 2],
  [4.5, 0, -Math.PI / 2],
  [0, -4.5, 0],
];

const CANDY_JARS: [number, string][] = [
  [-0.9, '#f472b6'],
  [-0.3, '#a855f7'],
  [0.3, '#22c55e'],
];

// Lễ Hội Bí Ngô: candy-for-prizes stall, only up while the festival runs
function CandyShopStall({ onOpen }: { onOpen: () => void }) {
  const stall = interactable('🍬 Tiệm Kẹo Ma Quái', onOpen, 'Click để đổi kẹo lấy quà Lễ Hội Bí Ngô');

  return (
    <group position={[5.4, 0, 4.4]}>
      <mesh castShadow position={[0, 0.5, 0]} {...stall}>
        <boxGeometry args={[2.8, 1.0, 1.0]} />
        <meshLambertMaterial color="#4c1d95" />
      </mesh>
      <mesh position={[0, 0.55, 0.51]}>
        <boxGeometry args={[2.6, 0.16, 0.02]} />
        <meshLambertMaterial color="#f97316" />
      </mesh>
      {[-1.3, 1.3].flatMap((x) =>
        [-0.45, 0.45].map((z) => (
          <mesh key={`${x}${z}`} castShadow position={[x, 1.2, z]}>
            <cylinderGeometry args={[0.07, 0.07, 2.4, 6]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
        ))
      )}
      {[-1.25, -0.75, -0.25, 0.25, 0.75, 1.25].map((x, i) => (
        <mesh key={x} castShadow position={[x, 2.45, 0.1]} rotation={[-0.15, 0, 0]} {...stall}>
          <boxGeometry args={[0.5, 0.08, 1.5]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#f97316' : '#111827'} />
        </mesh>
      ))}
      {CANDY_JARS.map(([x, color]) => (
        <group key={x} position={[x, 1.0, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.4, 10]} />
            <meshLambertMaterial color="#e0f2fe" transparent opacity={0.55} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </group>
      ))}
      <group position={[0.95, 1.0, 0]} scale={0.38}>
        <mesh position={[0, 0.36, 0]} scale={[1, 0.82, 1]}>
          <sphereGeometry args={[0.42, 12, 10]} />
          <meshLambertMaterial color="#f97316" />
        </mesh>
      </group>
      <Html position={[0, 3.05, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-purple-700 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          🍬 Tiệm Kẹo Ma Quái
        </div>
      </Html>
    </group>
  );
}

export function ParkWorld() {
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const gazebo = interactable('Đài Nhiệm Vụ Trung Tâm (Nhận Thưởng)', () =>
    setActiveModal('quests')
  );
  const festival = isEventActive(localDateKey(new Date()));

  return (
    <group>
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[6.5, 6.5, 0.08, 24]} />
        <meshLambertMaterial color="#d6d3d1" />
      </mesh>

      <Fountain x={0} z={0} scale={1.45} />

      {SAKURA_TREES.map(([x, z, scale]) => (
        <Tree key={`${x}_${z}`} x={x} z={z} scale={scale} type="sakura" />
      ))}

      {BENCHES.map(([x, z, rot]) => (
        <group key={`${x}_${z}`} position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.12, 0.6]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
          <mesh position={[0, 0.72, -0.25]}>
            <boxGeometry args={[1.8, 0.5, 0.1]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
        </group>
      ))}

      {/* Picnic blanket & basket */}
      <group position={[-5.2, 0.05, 4.5]}>
        <mesh>
          <boxGeometry args={[2.6, 0.04, 2.6]} />
          <meshLambertMaterial color="#f43f5e" />
        </mesh>
        <mesh position={[0.4, 0.22, -0.3]}>
          <boxGeometry args={[0.55, 0.4, 0.4]} />
          <meshLambertMaterial color="#d97706" />
        </mesh>
      </group>

      {/* Quest gazebo */}
      <group position={[0, 0, -8.5]}>
        <mesh position={[0, 0.15, 0]} {...gazebo}>
          <cylinderGeometry args={[2.8, 3.0, 0.3, 8]} />
          <meshLambertMaterial color="#fef3c7" />
        </mesh>
        <mesh position={[0, 3.2, 0]} {...gazebo}>
          <coneGeometry args={[3.2, 1.6, 8]} />
          <meshLambertMaterial color="#db2777" />
        </mesh>
      </group>

      {festival && <CandyShopStall onOpen={() => setActiveModal('candyShop')} />}
    </group>
  );
}
