'use client';

import { Html } from '@react-three/drei';
import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';

const AWNING_STRIPES = [-1.375, -0.825, -0.275, 0.275, 0.825, 1.375];

// Produce piled in the crates on the market counter
const CRATES: { x: number; color: string; size: number }[] = [
  { x: -1.0, color: '#f97316', size: 0.11 },
  { x: 0, color: '#ef4444', size: 0.12 },
  { x: 1.0, color: '#fef3c7', size: 0.1 },
];

function MarketStall({ onOpen }: { onOpen: () => void }) {
  const stall = interactable('Chợ Phiên Nông Sản', onOpen, 'Click để bán hàng theo giá hôm nay');

  return (
    <group position={[-7.5, 0, 3.0]}>
      <mesh castShadow position={[0, 0.5, 0]} {...stall}>
        <boxGeometry args={[3.2, 1.0, 1.0]} />
        <meshLambertMaterial color="#a16207" />
      </mesh>
      <mesh position={[0, 0.55, 0.51]}>
        <boxGeometry args={[3.0, 0.18, 0.02]} />
        <meshLambertMaterial color="#fef08a" />
      </mesh>
      {[-1.5, 1.5].flatMap((x) =>
        [-0.45, 0.45].map((z) => (
          <mesh key={`${x}${z}`} castShadow position={[x, 1.2, z]}>
            <cylinderGeometry args={[0.07, 0.07, 2.4, 6]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
        ))
      )}
      {AWNING_STRIPES.map((x, i) => (
        <mesh key={x} castShadow position={[x, 2.45, 0.1]} rotation={[-0.15, 0, 0]} {...stall}>
          <boxGeometry args={[0.55, 0.08, 1.5]} />
          <meshLambertMaterial color={i % 2 === 0 ? '#ef4444' : '#fef3c7'} />
        </mesh>
      ))}
      {CRATES.map(({ x, color, size }) => (
        <group key={x} position={[x, 1.15, 0]}>
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

export function MallWorld() {
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const openWardrobe = () => setActiveModal('wardrobe');
  const runway = interactable('Sàn Diễn Thời Trang (Mở Tủ Đồ)', openWardrobe);
  const boutique = interactable(
    'Boutique Thời Trang Cao Cấp (Mua Quần Áo)',
    openWardrobe
  );
  const petShop = interactable('Cửa Hàng Thú Cưng Shiba & Phụ Kiện', openWardrobe);

  return (
    <group>
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
      </group>

      {/* Fashion boutique */}
      <group position={[-7.5, 0, -5.5]}>
        <mesh castShadow position={[0, 2.1, 0]} {...boutique}>
          <boxGeometry args={[5.0, 4.2, 4.0]} />
          <meshLambertMaterial color="#f472b6" />
        </mesh>
        <mesh position={[0, 3.6, 2.05]} {...boutique}>
          <boxGeometry args={[3.8, 0.9, 0.3]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* Pet & accessory store */}
      <group position={[7.5, 0, -5.5]}>
        <mesh castShadow position={[0, 2.1, 0]} {...petShop}>
          <boxGeometry args={[5.0, 4.2, 4.0]} />
          <meshLambertMaterial color="#38bdf8" />
        </mesh>
      </group>

      <MarketStall onOpen={() => setActiveModal('market')} />
    </group>
  );
}
