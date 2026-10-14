'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { CROPS } from '@/config/crops';
import { GRID_SIZE, TILE_SIZE, tileToWorld } from '@/config/farm';
import { TileData } from '@/types/game';
import { interactable } from '@/lib/interact';
import { CropMesh } from '../models/CropMesh';
import { AnimalMesh } from '../models/AnimalMesh';
import { Fountain, Tree, TreeType } from '../environment/Props';

const FARM_TREES: [number, number, number, TreeType][] = [
  [-11, -7, 1.1, 'pine'],
  [-12, 2, 1.0, 'oak'],
  [11.5, 4, 1.05, 'pine'],
  [10, -8, 1.2, 'oak'],
];

// The HTML version's third grove tree sits where the ranch pasture is, so it moves east
const SAKURA_GROVE: [number, number, number][] = [
  [8.5, -5.5, 1.15],
  [9.2, 5.8, 1.1],
  [12.6, -1.4, 1.05],
];

function tileTooltip(tile: TileData) {
  const coords = `(${tile.c + 1}, ${tile.r + 1})`;
  if (tile.state === 'empty') {
    return { title: `Ô đất ${coords}`, desc: 'Dùng Cuốc (1) để cày đất' };
  }
  if (tile.state === 'tilled' || !tile.crop) {
    return {
      title: `Đất canh tác ${coords}`,
      desc: `${tile.watered ? '💧 Đã tưới' : '🏜️ Đất khô'} • Chọn Hạt Giống (4-7) để gieo`,
    };
  }
  const crop = CROPS[tile.crop];
  return {
    title: `${crop.icon} ${crop.name}`,
    desc:
      tile.stage >= 3
        ? '✨ ĐÃ CHÍN! Click để thu hoạch!'
        : `Giai đoạn ${tile.stage}/3`,
  };
}

const FarmTile = memo(function FarmTile({
  tile,
  onHover,
}: {
  tile: TileData;
  onHover: (id: string | null) => void;
}) {
  const { x, z } = tileToWorld(tile.r, tile.c);
  const tilled = tile.state !== 'empty';
  const baseColor = !tilled ? '#84cc16' : tile.watered ? '#3b1d0a' : '#78350f';
  const ridgeColor = tile.watered ? '#451a03' : '#92400e';

  return (
    <group position={[x, 0.08, z]}>
      <mesh
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 8) return;
          useGameStore.getState().interactTile(tile.r, tile.c);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onHover(tile.id);
          useGameStore.getState().setTooltip({
            ...tileTooltip(tile),
            x: e.nativeEvent.clientX,
            y: e.nativeEvent.clientY,
          });
        }}
        onPointerOut={() => {
          onHover(null);
          useGameStore.getState().setTooltip(null);
        }}
      >
        <boxGeometry args={[TILE_SIZE * 0.92, 0.14, TILE_SIZE * 0.92]} />
        <meshLambertMaterial color={baseColor} />
      </mesh>

      {tilled &&
        [-1, 0, 1].map((i) => (
          <mesh key={i} position={[0, 0.09, i * 0.34]}>
            <boxGeometry args={[TILE_SIZE * 0.82, 0.07, 0.24]} />
            <meshLambertMaterial color={ridgeColor} />
          </mesh>
        ))}

      {tile.state === 'planted' && tile.crop && (
        <group position={[0, 0.12, 0]}>
          <CropMesh crop={tile.crop} stage={tile.stage} seed={tile.r + tile.c} />
        </group>
      )}
    </group>
  );
});

export function FarmWorld() {
  const tiles = useGameStore((s) => s.tiles);
  const animals = useGameStore((s) => s.animals);
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics);
  const refillWater = useGameStore((s) => s.refillWater);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const nextDay = useGameStore((s) => s.nextDay);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHoveredId(id), []);
  const hoverBox = useMemo(
    () => new THREE.BoxGeometry(TILE_SIZE * 0.96, 0.22, TILE_SIZE * 0.96),
    []
  );
  const windmillBladesRef = useRef<THREE.Group>(null);
  const statueStarRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (windmillBladesRef.current) windmillBladesRef.current.rotation.z += 1.5 * dt;
    if (statueStarRef.current) statueStarRef.current.rotation.y += 2.5 * dt;
  });

  const hovered = hoveredId ? tiles.find((t) => t.id === hoveredId) : undefined;
  const hoverPos = hovered ? tileToWorld(hovered.r, hovered.c) : null;
  const has = (id: string) => ownedCosmetics.includes(id);

  const house = interactable('Nhà Nông Trại (Ngủ qua ngày)', nextDay);
  const shippingBin = interactable('Rương Bán Hàng', () =>
    setActiveModal('inventory')
  );
  const seedShop = interactable('Cửa Hàng Hạt Giống', () => setActiveModal('shop'));
  const well = interactable('Giếng Nước (Múc đầy bình tưới)', refillWater);
  const barn = interactable('Chuồng Trại Chăn Nuôi (Phím R)', () =>
    setActiveModal('ranch')
  );

  return (
    <group>
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry
          args={[GRID_SIZE * TILE_SIZE + 0.9, 0.12, GRID_SIZE * TILE_SIZE + 0.9]}
        />
        <meshLambertMaterial color="#78350f" />
      </mesh>

      {tiles.map((tile) => (
        <FarmTile key={tile.id} tile={tile} onHover={onHover} />
      ))}

      {hoverPos && (
        <lineSegments position={[hoverPos.x, 0.14, hoverPos.z]}>
          <edgesGeometry args={[hoverBox]} />
          <lineBasicMaterial color="#fef08a" />
        </lineSegments>
      )}

      {/* Farmhouse (click: sleep to the next day) */}
      <group position={[-5.4, 0, -8.5]}>
        <mesh castShadow position={[0, 1.2, 0]} {...house}>
          <boxGeometry args={[3.6, 2.4, 3.0]} />
          <meshLambertMaterial color="#fef3c7" />
        </mesh>
        <mesh position={[0, 3.25, 0]} rotation={[0, Math.PI / 4, 0]} {...house}>
          <coneGeometry args={[3.1, 1.8, 4]} />
          <meshLambertMaterial color="#b91c1c" />
        </mesh>
        <mesh position={[0, 0.75, 1.52]}>
          <boxGeometry args={[0.85, 1.5, 0.12]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
      </group>

      <mesh position={[-2.1, 0.5, -7.4]} {...shippingBin}>
        <boxGeometry args={[1.35, 1.0, 0.95]} />
        <meshLambertMaterial color="#dc2626" />
      </mesh>

      {/* Seed stall */}
      <group position={[4.5, 0, -8.0]}>
        <mesh position={[0, 0.52, 0]} {...seedShop}>
          <boxGeometry args={[2.6, 1.05, 1.4]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
        <mesh position={[0, 2.35, 0]} rotation={[0, Math.PI / 4, 0]} {...seedShop}>
          <coneGeometry args={[2.1, 0.95, 4]} />
          <meshLambertMaterial color="#10b981" />
        </mesh>
      </group>

      {/* Water well */}
      <group position={[7.6, 0, 0]}>
        <mesh position={[0, 0.475, 0]} {...well}>
          <cylinderGeometry args={[1.1, 1.2, 0.95, 12]} />
          <meshLambertMaterial color="#64748b" />
        </mesh>
        <mesh position={[0, 0.52, 0]} {...well}>
          <cylinderGeometry args={[0.92, 0.92, 0.82, 12]} />
          <meshLambertMaterial color="#0ea5e9" />
        </mesh>
      </group>

      {FARM_TREES.map(([x, z, scale, type]) => (
        <Tree key={`${x}_${z}`} x={x} z={z} scale={scale} type={type} />
      ))}

      {/* Livestock pasture & barn */}
      <group position={[-10.5, 0, 6.8]}>
        <mesh receiveShadow position={[0, 0.03, 0]}>
          <boxGeometry args={[6.2, 0.06, 5.4]} />
          <meshLambertMaterial color="#4ade80" />
        </mesh>
        {[
          [0, 2.7, 6.2, 0.12],
          [0, -2.7, 6.2, 0.12],
          [3.1, 0, 0.12, 5.4],
          [-3.1, 0, 0.12, 5.4],
        ].map(([x, z, w, d]) => (
          <mesh key={`${x}_${z}`} castShadow position={[x, 0.35, z]}>
            <boxGeometry args={[w, 0.45, d]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
        ))}
        <group position={[1.5, 0, -3.9]}>
          <mesh castShadow receiveShadow position={[0, 1.35, 0]} {...barn}>
            <boxGeometry args={[3.4, 2.7, 2.6]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh
            castShadow
            position={[0, 3.2, 0]}
            rotation={[0, Math.PI / 4, 0]}
            {...barn}
          >
            <coneGeometry args={[2.9, 1.5, 4]} />
            <meshLambertMaterial color="#7f1d1d" />
          </mesh>
        </group>
      </group>

      {animals.map((animal) => (
        <AnimalMesh key={animal.id} animal={animal} />
      ))}

      {has('decor_scarecrow') && (
        <group position={[-6.8, 0, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 6]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[1.3, 0.12, 0.12]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <coneGeometry args={[0.42, 0.8, 7]} />
            <meshLambertMaterial color="#d97706" />
          </mesh>
          <mesh position={[0, 1.65, 0]}>
            <sphereGeometry args={[0.28, 8, 8]} />
            <meshLambertMaterial color="#f97316" />
          </mesh>
        </group>
      )}

      {has('decor_windmill') && (
        <group position={[-9.2, 0, -4.2]}>
          <mesh castShadow position={[0, 2.25, 0]}>
            <cylinderGeometry args={[1.1, 1.6, 4.5, 8]} />
            <meshLambertMaterial color="#b45309" />
          </mesh>
          <mesh position={[0, 5.1, 0]}>
            <coneGeometry args={[1.25, 1.2, 8]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
          <group ref={windmillBladesRef} position={[0, 3.8, 1.25]}>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
                <boxGeometry args={[0.35, 2.6, 0.08]} />
                <meshLambertMaterial color="#fef3c7" />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* The HTML version's fountain spot is under the pasture, so it sits by the east trees */}
      {has('decor_fountain') && <Fountain x={8.6} z={8.4} scale={0.9} />}

      {has('decor_sakura_grove') &&
        SAKURA_GROVE.map(([x, z, scale]) => (
          <Tree key={`${x}_${z}`} x={x} z={z} scale={scale} type="sakura" />
        ))}

      {has('decor_gold_statue') && (
        <group position={[5.8, 0, 5.8]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1.2, 0.8, 1.2]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.55, 0.25, 1.1, 10]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
          <mesh ref={statueStarRef} position={[0, 2.3, 0]}>
            <octahedronGeometry args={[0.4, 0]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      )}
    </group>
  );
}
