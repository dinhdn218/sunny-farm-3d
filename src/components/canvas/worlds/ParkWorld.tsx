'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '../Html';
import * as THREE from 'three';
import { SNACK_PRICE, useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { activeFestival } from '@/lib/festivals';
import { FestivalConfig } from '@/config/festivals';
import { ParkBugs } from '../ParkBugs';
import { localDateKey } from '@/lib/dailyGift';
import { FISHING_ENERGY, FISHING_SPOTS } from '@/config/fish';
import { SNACKS, ZONE_SPOTS } from '@/config/zones';
import { Fountain, Tree } from '../environment/Props';
import { ANIMATED, StaticMerge } from '../StaticMerge';

const SAKURA_TREES: [number, number, number][] = [
  [-8, -6, 1.25],
  [8, -6, 1.25],
  [-9, 3, 1.15],
  [9, 3, 1.15],
  [-6, -15, 1.1],
  [6, -15, 1.1],
  [-8, 13, 1.2],
  [9, 13, 1.2],
  [16, 6, 1.1],
  [-4, 18, 1.0],
];

const OTHER_TREES: { x: number; z: number; scale: number; type: 'oak' | 'pine' }[] = [
  { x: -19, z: 8, scale: 1.2, type: 'oak' },
  { x: -14, z: 15, scale: 1.1, type: 'pine' },
  { x: 19, z: -9, scale: 1.25, type: 'oak' },
  { x: 14, z: -16, scale: 1.1, type: 'pine' },
  { x: -10, z: -19, scale: 1.15, type: 'oak' },
  { x: 2, z: -21, scale: 1.2, type: 'pine' },
  { x: 21, z: 2, scale: 1.0, type: 'pine' },
  { x: -21, z: -12, scale: 1.1, type: 'pine' },
];

const BENCHES: [number, number, number][] = [
  [-4.6, 0, Math.PI / 2],
  [4.6, 0, -Math.PI / 2],
  [0, -4.6, 0],
  [-3.3, 3.3, (3 * Math.PI) / 4],
  [-9.6, -2.2, Math.PI / 2],
];

const FLOWER_BEDS: [number, number, string][] = [
  [-2.6, 9, '#f472b6'],
  [2.6, 9, '#facc15'],
  [-2.6, 13.5, '#a78bfa'],
  [2.6, 13.5, '#fb7185'],
  [-2.6, -8.2, '#f472b6'],
  [2.6, -8.2, '#38bdf8'],
];

const POND = { x: -15.6, z: -4, r: 4.6 };
const LOTUS: [number, number][] = [
  [-17.6, -5.6],
  [-14.2, -6.6],
  [-18.2, -2.4],
  [-13.6, -1.6],
  [-16.4, -1.2],
];

// The festival's stall: its tokens traded for festival items, only up while it runs
function FestivalStall({ festival, onOpen }: { festival: FestivalConfig; onOpen: () => void }) {
  const { shop, token, stall: look } = festival;
  const stall = interactable(
    `${shop.icon} ${shop.name}`,
    onOpen,
    `Click để đổi ${token.name} lấy quà ${festival.name}`
  );

  return (
    <group position={[-7, 0, 8]}>
      <mesh castShadow position={[0, 0.5, 0]} {...stall}>
        <boxGeometry args={[2.8, 1.0, 1.0]} />
        <meshLambertMaterial color={look.counter} />
      </mesh>
      <mesh position={[0, 0.55, 0.51]}>
        <boxGeometry args={[2.6, 0.16, 0.02]} />
        <meshLambertMaterial color={look.trim} />
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
          <meshLambertMaterial color={look.stripes[i % 2]} />
        </mesh>
      ))}
      {look.goods.map((color, i) => (
        <group key={color} position={[-0.9 + i * 0.6, 1.0, 0]}>
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
      <Html position={[0, 3.05, 0]} zIndexRange={[15, 0]}>
        <div
          className={`player-tag w-max rounded-full border border-white px-2.5 py-0.5 text-[11px] font-black text-white shadow ${festival.ui.tag}`}
        >
          {shop.icon} {shop.name}
        </div>
      </Html>
    </group>
  );
}

// The lotus pond with its wooden fishing dock on the east bank
function LotusPond() {
  const goFishing = useGameStore((s) => s.goFishing);
  const spot = FISHING_SPOTS.park;
  const handlers = interactable(
    '🎣 Hồ Sen (câu cá nước ngọt)',
    goFishing,
    `Click để ra cầu gỗ và quăng cần (-${FISHING_ENERGY}⚡)`
  );

  return (
    <group>
      <group position={[POND.x, 0, POND.z]}>
        <mesh position={[0, 0.03, 0]} {...handlers}>
          <cylinderGeometry args={[POND.r, POND.r, 0.04, 40]} />
          <meshLambertMaterial color="#0e7490" />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[POND.r + 0.1, 0.22, 6, 40]} />
          <meshLambertMaterial color="#a8a29e" />
        </mesh>
        {/* Reeds round the far bank */}
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * 0.6 + (i / 8) * Math.PI * 0.8;
          return (
            <mesh key={i} position={[Math.cos(a) * (POND.r - 0.3), 0.45, Math.sin(a) * (POND.r - 0.3)]}>
              <cylinderGeometry args={[0.03, 0.04, 0.9, 4]} />
              <meshLambertMaterial color="#65a30d" />
            </mesh>
          );
        })}
      </group>
      {LOTUS.map(([x, z], i) => (
        <group key={i} position={[x, 0.07, z]}>
          <mesh>
            <cylinderGeometry args={[0.45, 0.45, 0.02, 12]} />
            <meshLambertMaterial color="#16a34a" />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0.08, 0.14, 0]}>
              <coneGeometry args={[0.16, 0.26, 6]} />
              <meshLambertMaterial color="#f9a8d4" />
            </mesh>
          )}
        </group>
      ))}
      {/* Dock from the bank out over the water */}
      <group position={[0, 0, spot.z]}>
        <mesh receiveShadow position={[-11.4, 0.1, 0]} {...handlers}>
          <boxGeometry args={[2.6, 0.12, 1.4]} />
          <meshLambertMaterial color="#b45309" />
        </mesh>
        {[-10.4, -12.4].flatMap((x) =>
          [-0.62, 0.62].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
              <cylinderGeometry args={[0.07, 0.07, 0.4, 6]} />
              <meshLambertMaterial color="#78350f" />
            </mesh>
          ))
        )}
        <Html position={[-10.2, 1.6, 0.9]} zIndexRange={[15, 0]}>
          <div className="player-tag w-max rounded-full border border-white bg-cyan-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
            🎣 Hồ Sen
          </div>
        </Html>
      </group>
    </group>
  );
}

function IceCreamCart() {
  const walkTo = useGameStore((s) => s.walkTo);
  const eat = useGameStore((s) => s.eatPopcornOrSnack);
  const snackFree = useGameStore((s) => s.lastFreeSnackDay !== s.day);
  const { x, z, reach } = ZONE_SPOTS.parkIceCream;
  const snack = SNACKS.iceCream;
  const handlers = interactable(
    `${snack.icon} Xe Kem (+${snack.energy}⚡)`,
    () => walkTo({ x, z, reach, act: () => eat(snack.label, snack.energy) }),
    snackFree ? 'Phần đầu tiên hôm nay miễn phí!' : `${SNACK_PRICE} Vàng một cây`
  );

  return (
    <group position={[x, 0, z]} rotation={[0, -0.5, 0]} {...handlers}>
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[1.8, 0.9, 1.0]} />
        <meshLambertMaterial color="#f9fafb" />
      </mesh>
      <mesh position={[0, 0.75, 0.51]}>
        <boxGeometry args={[1.6, 0.25, 0.02]} />
        <meshLambertMaterial color="#f472b6" />
      </mesh>
      {[-0.6, 0.6].map((dx) => (
        <mesh key={dx} position={[dx, 0.25, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.06, 6, 14]} />
          <meshLambertMaterial color="#334155" />
        </mesh>
      ))}
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2.0, 6]} />
        <meshLambertMaterial color="#e5e7eb" />
      </mesh>
      <mesh castShadow position={[0, 2.8, 0]}>
        <coneGeometry args={[1.3, 0.5, 10]} />
        <meshLambertMaterial color="#fb7185" />
      </mesh>
      {['#fde68a', '#f9a8d4', '#a7f3d0'].map((color, i) => (
        <mesh key={color} position={[-0.45 + i * 0.45, 1.35, 0]}>
          <sphereGeometry args={[0.16, 10, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
      ))}
      <Html position={[0, 3.4, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-pink-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          🍦 Xe Kem
        </div>
      </Html>
    </group>
  );
}

// Wooden horses going round under a striped roof
function Carousel() {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const spin = spinRef.current;
    if (!spin) return;
    spin.rotation.y += Math.min(delta, 0.1) * 0.6;
    spin.children.forEach((horse, i) => {
      horse.position.y = 0.9 + Math.sin(performance.now() * 0.003 + i * 1.6) * 0.18;
    });
  });

  return (
    <group position={[15, 0, -3]}>
      <mesh receiveShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[3.2, 3.3, 0.3, 24]} />
        <meshLambertMaterial color="#fde68a" />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 3.4, 10]} />
        <meshLambertMaterial color="#facc15" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} castShadow position={[0, 3.75, 0]} rotation={[0, (i / 12) * Math.PI * 2, 0]}>
          <coneGeometry args={[3.4, 1.0, 3, 1, false, 0, (Math.PI * 2) / 12]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#ef4444' : '#fef3c7'} />
        </mesh>
      ))}
      <group ref={spinRef} userData={ANIMATED}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <group key={i} position={[Math.sin(a) * 2.3, 0.9, Math.cos(a) * 2.3]} rotation={[0, a + Math.PI / 2, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.9, 0.42, 0.3]} />
                <meshLambertMaterial color={['#f8fafc', '#fca5a5', '#93c5fd'][i % 3]} />
              </mesh>
              <mesh position={[0.45, 0.3, 0]}>
                <boxGeometry args={[0.3, 0.4, 0.26]} />
                <meshLambertMaterial color={['#f8fafc', '#fca5a5', '#93c5fd'][i % 3]} />
              </mesh>
              <mesh position={[0, 1.0, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 2.4, 5]} />
                <meshLambertMaterial color="#facc15" />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

export function ParkWorld() {
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const walkTo = useGameStore((s) => s.walkTo);
  const { x: gx, z: gz, reach } = ZONE_SPOTS.parkGazebo;
  const gazebo = interactable('Đài Nhiệm Vụ Trung Tâm (Nhận Thưởng)', () =>
    walkTo({ x: gx, z: gz, reach, act: () => setActiveModal('quests') })
  );
  const festival = activeFestival(localDateKey(new Date()));

  // The park's props are merged into a few draw calls (see StaticMerge); the bugs fly about on their own
  return (
    <group>
      <StaticMerge>
        {/* Paths: north–south from the portal to the gazebo, and the plaza */}
        <mesh receiveShadow position={[0, 0.03, 4]}>
          <boxGeometry args={[3.2, 0.06, 34]} />
          <meshLambertMaterial color="#d6d3d1" />
        </mesh>
        <mesh receiveShadow position={[-6.5, 0.03, -3]}>
          <boxGeometry args={[6, 0.06, 2.2]} />
          <meshLambertMaterial color="#d6d3d1" />
        </mesh>
        <mesh receiveShadow position={[0, 0.04, 0]}>
          <cylinderGeometry args={[6.5, 6.5, 0.08, 32]} />
          <meshLambertMaterial color="#d6d3d1" />
        </mesh>

        <Fountain x={0} z={0} scale={1.45} />

        {SAKURA_TREES.map(([x, z, scale]) => (
          <Tree key={`${x}_${z}`} x={x} z={z} scale={scale} type="sakura" />
        ))}
        {OTHER_TREES.map((t) => (
          <Tree key={`${t.x}_${t.z}`} x={t.x} z={t.z} scale={t.scale} type={t.type} />
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

        {FLOWER_BEDS.map(([x, z, color]) => (
          <group key={`${x}_${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[1.6, 0.24, 3.2]} />
              <meshLambertMaterial color="#78350f" />
            </mesh>
            {[-0.9, 0, 0.9].flatMap((dz) =>
              [-0.4, 0.4].map((dx) => (
                <mesh key={`${dx}${dz}`} position={[dx, 0.36, dz]}>
                  <sphereGeometry args={[0.2, 8, 6]} />
                  <meshLambertMaterial color={color} />
                </mesh>
              ))
            )}
          </group>
        ))}

        {/* Picnic blanket & basket */}
        <group position={[-6, 0.05, 11]}>
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
        <group position={[gx, 0, gz]}>
          <mesh position={[0, 0.15, 0]} {...gazebo}>
            <cylinderGeometry args={[2.8, 3.0, 0.3, 8]} />
            <meshLambertMaterial color="#fef3c7" />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} castShadow position={[Math.sin(a) * 2.4, 1.5, Math.cos(a) * 2.4]}>
                <cylinderGeometry args={[0.12, 0.12, 2.6, 6]} />
                <meshLambertMaterial color="#fef3c7" />
              </mesh>
            );
          })}
          <mesh castShadow position={[0, 3.2, 0]} {...gazebo}>
            <coneGeometry args={[3.2, 1.6, 8]} />
            <meshLambertMaterial color="#db2777" />
          </mesh>
          <Html position={[0, 4.6, 0]} zIndexRange={[15, 0]}>
            <div className="player-tag w-max rounded-full border border-white bg-pink-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
              📜 Đài Nhiệm Vụ
            </div>
          </Html>
        </group>

        <LotusPond />
        <IceCreamCart />
        <Carousel />
        {festival && <FestivalStall festival={festival} onOpen={() => setActiveModal('festivalShop')} />}
      </StaticMerge>
      <ParkBugs />
    </group>
  );
}
