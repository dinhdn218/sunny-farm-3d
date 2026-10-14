'use client';

import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
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

export function ParkWorld() {
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const gazebo = interactable('Đài Nhiệm Vụ Trung Tâm (Nhận Thưởng)', () =>
    setActiveModal('quests')
  );

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
    </group>
  );
}
