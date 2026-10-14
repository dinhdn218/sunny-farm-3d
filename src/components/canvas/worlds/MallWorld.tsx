'use client';

import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';

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
    </group>
  );
}
