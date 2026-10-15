'use client';

import { Html } from '@react-three/drei';
import { SNACK_PRICE, useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { SNACKS, ZONE_SPOTS } from '@/config/zones';

const AWNING_STRIPES = [-1.375, -0.825, -0.275, 0.275, 0.825, 1.375];

// Produce piled in the crates on the market counter
const CRATES: { x: number; color: string; size: number }[] = [
  { x: -1.0, color: '#f97316', size: 0.11 },
  { x: 0, color: '#ef4444', size: 0.12 },
  { x: 1.0, color: '#fef3c7', size: 0.1 },
];

const PLANTERS: [number, number][] = [
  [-5, 6],
  [5, 6],
  [-5, -7],
  [5, -7],
  [-15, -4],
  [15, -4],
];

const LAMPS: [number, number][] = [
  [-3, 11],
  [3, 11],
  [-11, 10],
  [11, 10],
  [-16, 1],
  [16, 1],
];

function MarketStall({ onOpen }: { onOpen: () => void }) {
  const walkTo = useGameStore((s) => s.walkTo);
  const { x, z, reach } = ZONE_SPOTS.mallMarket;
  const stall = interactable(
    'Chợ Phiên Nông Sản',
    () => walkTo({ x, z, reach, act: onOpen }),
    'Click để bán hàng theo giá hôm nay'
  );

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.5, 0]} {...stall}>
        <boxGeometry args={[3.2, 1.0, 1.0]} />
        <meshLambertMaterial color="#a16207" />
      </mesh>
      <mesh position={[0, 0.55, 0.51]}>
        <boxGeometry args={[3.0, 0.18, 0.02]} />
        <meshLambertMaterial color="#fef08a" />
      </mesh>
      {[-1.5, 1.5].flatMap((px) =>
        [-0.45, 0.45].map((pz) => (
          <mesh key={`${px}${pz}`} castShadow position={[px, 1.2, pz]}>
            <cylinderGeometry args={[0.07, 0.07, 2.4, 6]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
        ))
      )}
      {AWNING_STRIPES.map((px, i) => (
        <mesh key={px} castShadow position={[px, 2.45, 0.1]} rotation={[-0.15, 0, 0]} {...stall}>
          <boxGeometry args={[0.55, 0.08, 1.5]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#ef4444' : '#fef3c7'} />
        </mesh>
      ))}
      {CRATES.map(({ x: cx, color, size }) => (
        <group key={cx} position={[cx, 1.15, 0]}>
          <mesh>
            <boxGeometry args={[0.75, 0.3, 0.6]} />
            <meshLambertMaterial color="#d97706" />
          </mesh>
          {[-0.2, 0, 0.2].flatMap((dx) =>
            [-0.12, 0.12].map((dz) => (
              <mesh key={`${dx}${dz}`} position={[dx, 0.2, dz]}>
                <sphereGeometry args={[size, 8, 6]} />
                <meshLambertMaterial color={color} />
              </mesh>
            ))
          )}
        </group>
      ))}
      <Html position={[0, 3.05, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-rose-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          🧺 Chợ Phiên
        </div>
      </Html>
    </group>
  );
}

function BubbleTeaStand() {
  const walkTo = useGameStore((s) => s.walkTo);
  const eat = useGameStore((s) => s.eatPopcornOrSnack);
  const snackFree = useGameStore((s) => s.lastFreeSnackDay !== s.day);
  const { x, z, reach } = ZONE_SPOTS.mallBubbleTea;
  const snack = SNACKS.bubbleTea;
  const handlers = interactable(
    `${snack.icon} Quầy Trà Sữa (+${snack.energy}⚡)`,
    () => walkTo({ x, z, reach, act: () => eat(snack.label, snack.energy) }),
    snackFree ? 'Ly đầu tiên hôm nay miễn phí!' : `${SNACK_PRICE} Vàng một ly`
  );

  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]} {...handlers}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[2.6, 1.2, 1.2]} />
        <meshLambertMaterial color="#fde68a" />
      </mesh>
      <mesh castShadow position={[0, 2.0, -0.5]}>
        <boxGeometry args={[2.6, 1.6, 0.2]} />
        <meshLambertMaterial color="#92400e" />
      </mesh>
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[2.9, 0.3, 1.5]} />
        <meshLambertMaterial color="#a855f7" />
      </mesh>
      {[-0.7, 0, 0.7].map((dx, i) => (
        <group key={dx} position={[dx, 1.45, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.13, 0.11, 0.36, 10]} />
            <meshLambertMaterial color={['#d6b98c', '#f9a8d4', '#86efac'][i]} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0.04, 0.26, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 5]} />
            <meshLambertMaterial color="#111827" />
          </mesh>
        </group>
      ))}
      <Html position={[0, 3.6, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-purple-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          🧋 Trà Sữa
        </div>
      </Html>
    </group>
  );
}

export function MallWorld() {
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const walkTo = useGameStore((s) => s.walkTo);
  // The shops all open the wardrobe once the player is at their door
  const shopAt = (title: string, x: number, z: number) =>
    interactable(title, () => walkTo({ x, z: z + 2.4, reach: 1.2, act: () => setActiveModal('wardrobe') }));
  const runway = interactable('Sàn Diễn Thời Trang (Mở Tủ Đồ)', () =>
    walkTo({ x: 0, z: 4.5, reach: 1.5, act: () => setActiveModal('wardrobe') })
  );
  const boutique = shopAt('Boutique Thời Trang Cao Cấp (Mua Quần Áo)', -9, -9);
  const petShop = shopAt('Cửa Hàng Thú Cưng Shiba & Phụ Kiện', 9, -9);

  return (
    <group>
      {/* Paved plaza with tile lines */}
      <mesh receiveShadow position={[0, 0.03, -1]}>
        <boxGeometry args={[34, 0.06, 30]} />
        <meshLambertMaterial color="#94a3b8" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={`x${i}`} position={[-16 + i * 4, 0.065, -1]}>
          <boxGeometry args={[0.05, 0.01, 30]} />
          <meshLambertMaterial color="#cbd5e1" />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`z${i}`} position={[0, 0.065, -15 + i * 4]}>
          <boxGeometry args={[34, 0.01, 0.05]} />
          <meshLambertMaterial color="#cbd5e1" />
        </mesh>
      ))}

      {/* Fashion runway stage */}
      <group position={[0, 0, -1.0]}>
        <mesh position={[0, 0.225, 0]} {...runway}>
          <boxGeometry args={[5.2, 0.45, 9.0]} />
          <meshLambertMaterial color="#1e1b4b" />
        </mesh>
        <mesh position={[0, 0.23, 0]} {...runway}>
          <boxGeometry args={[2.6, 0.48, 8.6]} />
          <meshLambertMaterial color="#ec4899" />
        </mesh>
        {[-2.3, 2.3].flatMap((x) =>
          [-3.8, 0, 3.8].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.55, z]}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          ))
        )}
      </group>

      {/* Shopping centre front along the north side */}
      <group position={[0, 0, -17]}>
        <mesh castShadow position={[0, 3.2, 0]}>
          <boxGeometry args={[14, 6.4, 3]} />
          <meshLambertMaterial color="#e2e8f0" />
        </mesh>
        <mesh position={[0, 2.0, 1.52]}>
          <boxGeometry args={[11, 3.2, 0.06]} />
          <meshLambertMaterial color="#7dd3fc" transparent opacity={0.75} />
        </mesh>
        <mesh position={[0, 5.4, 1.55]}>
          <boxGeometry args={[9, 0.9, 0.1]} />
          <meshBasicMaterial color="#f472b6" />
        </mesh>
        <Html position={[0, 7.4, 0]} center zIndexRange={[15, 0]}>
          <div className="player-tag w-max rounded-2xl border-2 border-white bg-pink-600 px-4 py-1 text-sm font-black text-white shadow-xl">
            🛍️ SUNNY MALL
          </div>
        </Html>
      </group>

      {/* Fashion boutique */}
      <group position={[-9, 0, -9]}>
        <mesh castShadow position={[0, 2.1, 0]} {...boutique}>
          <boxGeometry args={[5.0, 4.2, 4.0]} />
          <meshLambertMaterial color="#f472b6" />
        </mesh>
        <mesh position={[0, 3.6, 2.05]} {...boutique}>
          <boxGeometry args={[3.8, 0.9, 0.3]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[0, 1.1, 2.03]}>
          <boxGeometry args={[1.4, 2.2, 0.06]} />
          <meshLambertMaterial color="#831843" />
        </mesh>
      </group>

      {/* Pet & accessory store */}
      <group position={[9, 0, -9]}>
        <mesh castShadow position={[0, 2.1, 0]} {...petShop}>
          <boxGeometry args={[5.0, 4.2, 4.0]} />
          <meshLambertMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[0, 3.6, 2.05]} {...petShop}>
          <boxGeometry args={[3.8, 0.9, 0.3]} />
          <meshBasicMaterial color="#fef9c3" />
        </mesh>
        <mesh position={[0, 1.1, 2.03]}>
          <boxGeometry args={[1.4, 2.2, 0.06]} />
          <meshLambertMaterial color="#0c4a6e" />
        </mesh>
      </group>

      {PLANTERS.map(([x, z]) => (
        <group key={`${x}_${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[1.4, 0.7, 1.4]} />
            <meshLambertMaterial color="#e5e7eb" />
          </mesh>
          <mesh castShadow position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.75, 10, 8]} />
            <meshLambertMaterial color="#16a34a" />
          </mesh>
        </group>
      ))}

      {LAMPS.map(([x, z]) => (
        <group key={`${x}_${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 3.2, 6]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <sphereGeometry args={[0.28, 10, 8]} />
            <meshBasicMaterial color="#fef9c3" />
          </mesh>
        </group>
      ))}

      <MarketStall onOpen={() => setActiveModal('market')} />
      <BubbleTeaStand />
    </group>
  );
}
