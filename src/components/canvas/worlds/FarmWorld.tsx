'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { CROPS } from '@/config/crops';
import { COSMETICS } from '@/config/cosmetics';
import { MACHINES, RECIPES } from '@/config/machines';
import { ITEMS } from '@/config/items';
import { formatCountdown } from '@/lib/format';
import { areaTiles } from '@/lib/tools';
import { seasonOf } from '@/lib/seasons';
import { SEASON_LOOK } from '@/config/seasons';
import {
  PLOT_SIZE,
  TILE_SIZE,
  isPlotPurchasable,
  plotCenter,
  plotKey,
  plotOfTile,
  plotPrice,
  tileToWorld,
} from '@/config/farm';
import {
  BARN_OFFSET,
  ExpansionSide,
  FARM_SITES,
  FARM_TREES,
  expansionSigns,
  farmBands,
  fieldRect,
  ranchOffset,
  stretchPoint,
} from '@/lib/farmLayout';
import { DecorPlacement, MachineId, MachineJob, TileData } from '@/types/game';
import { interactable } from '@/lib/interact';
import { REACH, STAND_GAP } from '@/lib/walk';
import { BEEHIVE_ID } from '@/lib/beehive';
import { MAILBOX_ID } from '@/lib/mail';
import { CropMesh } from '../models/CropMesh';
import { AnimalMesh } from '../models/AnimalMesh';
import { DecorModel } from '../models/DecorModel';
import { MachineModel } from '../models/MachineModel';
import { Tree } from '../environment/Props';
import { DecorPlacer } from '../DecorPlacer';
import { BuildPieces } from '../BuildPieces';
import { BuildPlacer } from '../BuildPlacer';

const SIDE_NAMES: Record<ExpansionSide, string> = {
  west: 'Tây',
  east: 'Đông',
  north: 'Bắc',
  south: 'Nam',
};

function tileTooltip(tile: TileData) {
  const coords = `(${tile.c + 1}, ${tile.r + 1})`;
  if (tile.sprinkler) {
    return { title: '💦 Bình Phun Tự Động', desc: 'Tưới 8 ô xung quanh mỗi sáng • dùng Giỏ (3) để cất' };
  }
  if (useGameStore.getState().placingSprinkler) {
    return { title: `Ô đất ${coords}`, desc: '💦 Click để đặt Bình Phun vào ô này' };
  }
  if (tile.state === 'empty') {
    return { title: `Ô đất ${coords}`, desc: 'Dùng Cuốc (1) để cày đất' };
  }
  if (tile.state === 'tilled' || !tile.crop) {
    return {
      title: `Đất canh tác ${coords}`,
      desc: `${tile.watered ? '💧 Đã tưới' : '🏜️ Đất khô'} • ${
        tile.fertilized ? '🪴 Đã bón phân' : 'Phân Bón (7) để thu gấp đôi'
      } • Hạt Giống (4) để gieo`,
    };
  }
  const crop = CROPS[tile.crop];
  return {
    title: `${crop.icon} ${crop.name}`,
    desc:
      tile.stage >= 3
        ? '✨ ĐÃ CHÍN! Click để thu hoạch!'
        : `Giai đoạn ${tile.stage}/3${tile.fertilized ? ' • 🪴 Đã bón phân' : ''}`,
  };
}

// Sprinkler standing on a field tile; its head turns slowly
function Sprinkler() {
  const headRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (headRef.current) headRef.current.rotation.y += Math.min(delta, 0.1) * 1.5;
  });

  return (
    <group position={[0, 0.07, 0]}>
      <mesh castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 10]} />
        <meshLambertMaterial color="#64748b" />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshLambertMaterial color="#94a3b8" />
      </mesh>
      <group ref={headRef} position={[0, 0.52, 0]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 10]} />
          <meshLambertMaterial color="#0ea5e9" />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[Math.sin((i * Math.PI) / 2) * 0.17, 0, Math.cos((i * Math.PI) / 2) * 0.17]}
            rotation={[0, (i * Math.PI) / 2, 0]}
          >
            <boxGeometry args={[0.06, 0.04, 0.14]} />
            <meshLambertMaterial color="#38bdf8" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Green granules scattered over fertilized soil
const FERTILIZER_SPOTS: [number, number][] = [
  [-0.36, -0.34],
  [0.3, 0],
  [-0.1, 0.34],
  [0.4, 0.34],
  [0.05, -0.34],
];

const FarmTile = memo(function FarmTile({
  tile,
  grass,
  onHover,
}: {
  tile: TileData;
  // Colour of untilled ground this season
  grass: string;
  onHover: (id: string | null) => void;
}) {
  const { x, z } = tileToWorld(tile.r, tile.c);
  const tilled = tile.state !== 'empty';
  const baseColor = !tilled ? grass : tile.watered ? '#3b1d0a' : '#78350f';
  const ridgeColor = tile.watered ? '#451a03' : '#92400e';

  return (
    <group position={[x, 0.08, z]}>
      <mesh
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          const store = useGameStore.getState();
          if (e.delta > 8 || store.placingDecor) return;
          // Walk over first; a click made while placing a sprinkler places it on arrival
          const placing = store.placingSprinkler;
          store.walkTo({
            x,
            z,
            reach: REACH.tile,
            act: () => {
              const s = useGameStore.getState();
              if (placing) s.placeSprinkler(tile.r, tile.c);
              else s.interactTile(tile.r, tile.c);
            },
          });
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (useGameStore.getState().placingDecor) return;
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
      {tile.fertilized &&
        FERTILIZER_SPOTS.map(([fx, fz]) => (
          <mesh key={`${fx}${fz}`} position={[fx, 0.15, fz]}>
            <sphereGeometry args={[0.05, 5, 4]} />
            <meshLambertMaterial color="#a3e635" />
          </mesh>
        ))}
      {tile.sprinkler && <Sprinkler />}
    </group>
  );
});

// Deterministic weeds and rocks so every wild plot looks a little different
function wildScatter(px: number, pz: number) {
  let seed = px * 31 + pz * 17 + 7;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 9 }, (_, i) => ({
    x: (random() - 0.5) * (PLOT_SIZE - 1),
    z: (random() - 0.5) * (PLOT_SIZE - 1),
    scale: 0.7 + random() * 0.6,
    rock: i < 2,
  }));
}

// Unowned land inside the field: overgrown, with a for-sale signboard
const LockedPlot = memo(function LockedPlot({
  px,
  pz,
  purchasable,
  price,
  grass,
}: {
  px: number;
  pz: number;
  purchasable: boolean;
  price: number;
  grass: string;
}) {
  const key = plotKey(px, pz);
  const { x, z } = plotCenter(px, pz);
  const scatter = useMemo(() => wildScatter(px, pz), [px, pz]);
  const handlers = interactable(
    `🔒 Lô đất hoang (${px + 1}, ${pz + 1})`,
    () => useGameStore.getState().openExpand(key),
    purchasable ? `Click để mở khóa: ${price} Vàng` : 'Cần mở khóa lô đất liền kề trước'
  );

  return (
    <group position={[x, 0, z]}>
      <mesh receiveShadow position={[0, 0.1, 0]} {...handlers}>
        <boxGeometry args={[PLOT_SIZE - 0.08, 0.12, PLOT_SIZE - 0.08]} />
        <meshLambertMaterial color={grass} />
      </mesh>
      {scatter.map((p, i) =>
        p.rock ? (
          <mesh key={i} position={[p.x, 0.22, p.z]} scale={p.scale}>
            <dodecahedronGeometry args={[0.22, 0]} />
            <meshLambertMaterial color="#a8a29e" />
          </mesh>
        ) : (
          <mesh key={i} position={[p.x, 0.3, p.z]} scale={p.scale}>
            <coneGeometry args={[0.16, 0.36, 5]} />
            <meshLambertMaterial color="#3f6212" />
          </mesh>
        )
      )}
      <mesh castShadow position={[0, 0.55, 0.9]}>
        <cylinderGeometry args={[0.06, 0.07, 1.1, 6]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>
      <mesh castShadow position={[0, 1.05, 0.9]} {...handlers}>
        <boxGeometry args={[1.0, 0.52, 0.08]} />
        <meshLambertMaterial color={purchasable ? '#d97706' : '#78716c'} />
      </mesh>
      <Html position={[0, 1.65, 0.9]} zIndexRange={[15, 0]}>
        <div
          className={`player-tag w-max rounded-full border px-2.5 py-0.5 text-[11px] font-black shadow ${
            purchasable
              ? 'border-white bg-amber-400 text-amber-950'
              : 'border-white/30 bg-slate-900/85 text-slate-300'
          }`}
        >
          {purchasable ? `🔓 ${price}🪙` : '🔒 Khóa'}
        </div>
      </Html>
    </group>
  );
});

function ExpansionSign({
  side,
  x,
  z,
  onOpen,
}: {
  side: ExpansionSide;
  x: number;
  z: number;
  onOpen: () => void;
}) {
  const handlers = interactable(
    `🏗️ Mở rộng phía ${SIDE_NAMES[side]}`,
    onOpen,
    'Click để xem các lô đất có thể mua'
  );

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 1.2, 6]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>
      <mesh castShadow position={[0, 1.15, 0]} {...handlers}>
        <boxGeometry args={[1.1, 0.6, 0.1]} />
        <meshLambertMaterial color="#16a34a" />
      </mesh>
      <mesh position={[0, 1.15, 0.06]}>
        <boxGeometry args={[0.46, 0.12, 0.02]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <mesh position={[0, 1.15, 0.06]}>
        <boxGeometry args={[0.12, 0.42, 0.02]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <Html position={[0, 1.75, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          ➕ Mở Rộng Đất
        </div>
      </Html>
    </group>
  );
}

// Jars waiting in the hive, bouncing over it
function HoneyBadge() {
  const honey = useGameStore((s) => s.beehiveHoney);
  if (honey <= 0) return null;
  return (
    <Html position={[0, 1.55, 0]} zIndexRange={[15, 0]}>
      <div className="player-tag w-max animate-bounce rounded-full border border-white bg-amber-500 px-2 py-0.5 text-[11px] font-black text-white shadow">
        🍯 {honey}
      </div>
    </Html>
  );
}

// The beehive and the mailbox do their job when clicked (moved from the fashion shop); other decor moves
function decorHandlers(id: string, placement: DecorPlacement) {
  const item = COSMETICS.find((c) => c.id === id);
  const title = `${item?.icon} ${item?.name}`;
  const walkThen = (act: () => void) => () =>
    useGameStore.getState().walkTo({
      x: placement.x,
      z: placement.z,
      reach: (item?.footprint ?? 1) + STAND_GAP,
      act,
    });
  if (id === BEEHIVE_ID) {
    return interactable(
      title,
      walkThen(() => useGameStore.getState().collectHoney()),
      'Click để thu Mật Ong • Di chuyển trong Thời Trang & Decor'
    );
  }
  if (id === MAILBOX_ID) {
    return interactable(
      title,
      walkThen(() => useGameStore.getState().setActiveModal('mail')),
      'Click để đọc thư • Di chuyển trong Thời Trang & Decor'
    );
  }
  return interactable(
    title,
    () => useGameStore.getState().startPlacingDecor(id),
    'Click để di chuyển • Cất kho trong Thời Trang & Decor'
  );
}

function PlacedDecor({ id, placement }: { id: string; placement: DecorPlacement }) {
  return (
    <group
      position={[placement.x, 0, placement.z]}
      rotation={[0, placement.rotY, 0]}
      {...decorHandlers(id, placement)}
    >
      <DecorModel id={id} />
      {id === BEEHIVE_ID && <HoneyBadge />}
    </group>
  );
}

// Floating badge over a machine: a countdown while it works, a bouncing "done" sign when goods are waiting
function MachineBadge({ job }: { job: MachineJob | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!job) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [job]);

  if (!job) return null;
  const { output } = RECIPES[job.recipeId];
  const icon = output.id === 'bread' ? '🥖' : ITEMS[output.id].icon;
  const left = job.readyAt - now;

  return (
    <Html position={[0, 2.1, 0]} zIndexRange={[15, 0]}>
      {left > 0 ? (
        <div className="player-tag w-max rounded-full border border-white/30 bg-slate-900/85 px-2.5 py-0.5 text-[11px] font-black text-amber-200 shadow">
          {icon} ⏳ {formatCountdown(left)}
        </div>
      ) : (
        <div className="player-tag w-max animate-bounce rounded-full border border-white bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-amber-950 shadow">
          {icon} Xong! Click thu hàng
        </div>
      )}
    </Html>
  );
}

// A workshop machine on the farm: click collects finished goods, otherwise opens it in the workshop
function PlacedMachine({
  id,
  placement,
  job,
}: {
  id: MachineId;
  placement: DecorPlacement;
  job: MachineJob | null;
}) {
  const cfg = MACHINES[id];
  const handlers = interactable(
    `${cfg.icon} ${cfg.name}`,
    () =>
      useGameStore.getState().walkTo({
        x: placement.x,
        z: placement.z,
        reach: cfg.footprint + STAND_GAP,
        act: () => {
          const store = useGameStore.getState();
          const current = store.machines[id]?.job;
          if (current && Date.now() >= current.readyAt) store.collectMachine(id);
          else store.openWorkshop(id);
        },
      }),
    job ? 'Click để xem mẻ đang làm hoặc thu hàng' : 'Click để chọn món chế biến'
  );

  return (
    <group position={[placement.x, 0, placement.z]}>
      <group rotation={[0, placement.rotY, 0]} {...handlers}>
        <MachineModel id={id} job={job} />
      </group>
      <MachineBadge job={job} />
    </group>
  );
}

export function FarmWorld() {
  const tiles = useGameStore((s) => s.tiles);
  const animals = useGameStore((s) => s.animals);
  const ownedPlots = useGameStore((s) => s.ownedPlots);
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics);
  const decorPlacements = useGameStore((s) => s.decorPlacements);
  const machines = useGameStore((s) => s.machines);
  const placingDecor = useGameStore((s) => s.placingDecor);
  const placingSprinkler = useGameStore((s) => s.placingSprinkler);
  const activeTool = useGameStore((s) => s.activeTool);
  const toolTiers = useGameStore((s) => s.toolTiers);
  const look = useGameStore((s) => SEASON_LOOK[seasonOf(s.day)]);
  const fetchWater = useGameStore((s) => s.fetchWater);
  const walkTo = useGameStore((s) => s.walkTo);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const nextDay = useGameStore((s) => s.nextDay);
  const openExpand = useGameStore((s) => s.openExpand);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const onHover = useCallback((id: string | null) => setHoveredId(id), []);
  const hoverBox = useMemo(
    () => new THREE.BoxGeometry(TILE_SIZE * 0.96, 0.22, TILE_SIZE * 0.96),
    []
  );

  const bands = useMemo(() => farmBands(ownedPlots), [ownedPlots]);
  const field = useMemo(() => fieldRect(ownedPlots), [ownedPlots]);
  const signs = useMemo(() => expansionSigns(ownedPlots), [ownedPlots]);
  const ownedTiles = useMemo(() => {
    const owned = new Set(ownedPlots);
    return tiles.filter((t) => owned.has(plotOfTile(t.r, t.c)));
  }, [tiles, ownedPlots]);
  const lockedPlots = useMemo(() => {
    const list: { px: number; pz: number; purchasable: boolean }[] = [];
    for (let pz = field.minPz; pz <= field.maxPz; pz++) {
      for (let px = field.minPx; px <= field.maxPx; px++) {
        const key = plotKey(px, pz);
        if (!ownedPlots.includes(key)) {
          list.push({ px, pz, purchasable: isPlotPurchasable(key, ownedPlots) });
        }
      }
    }
    return list;
  }, [field, ownedPlots]);
  const price = plotPrice(ownedPlots.length);

  // Buildings keep their place relative to the field edges, so new land pushes them outward
  const at = ([x, z]: [number, number]) => stretchPoint(x, z, bands);
  const [houseX, houseZ] = at(FARM_SITES.house);
  const [binX, binZ] = at(FARM_SITES.shippingBin);
  const [shopX, shopZ] = at(FARM_SITES.seedShop);
  const [wellX, wellZ] = at(FARM_SITES.well);
  const [ranchDx, ranchDz] = ranchOffset(ownedPlots);

  // Outline every owned tile the next click will work (wider with upgraded tools)
  const hovered = hoveredId ? tiles.find((t) => t.id === hoveredId) : undefined;
  const hoverTier = placingSprinkler
    ? 0
    : activeTool === 'hoe'
    ? toolTiers.hoe
    : activeTool === 'water'
    ? toolTiers.water
    : 0;
  const hoverArea = hovered
    ? areaTiles(hovered.r, hovered.c, hoverTier)
        .filter(([r, c]) => ownedPlots.includes(plotOfTile(r, c)))
        .map(([r, c]) => tileToWorld(r, c))
    : [];

  // The player walks over before using a building
  const goTo = (x: number, z: number, reach: number, act: () => void) => () =>
    walkTo({ x, z, reach, act });
  const barnX = FARM_SITES.ranch[0] + ranchDx + BARN_OFFSET[0];
  const barnZ = FARM_SITES.ranch[1] + ranchDz + BARN_OFFSET[1];
  const house = interactable(
    'Nhà Nông Trại (Ngủ qua ngày)',
    goTo(houseX, houseZ, REACH.house, nextDay)
  );
  const shippingBin = interactable(
    'Rương Bán Hàng',
    goTo(binX, binZ, REACH.shippingBin, () => setActiveModal('inventory'))
  );
  const seedShop = interactable(
    'Cửa Hàng Hạt Giống',
    goTo(shopX, shopZ, REACH.seedShop, () => setActiveModal('shop'))
  );
  const well = interactable('Giếng Nước (Múc đầy bình tưới)', fetchWater);
  const barn = interactable(
    'Chuồng Trại Chăn Nuôi (Phím R)',
    goTo(barnX, barnZ, REACH.barn, () => setActiveModal('ranch'))
  );

  // A signboard pre-selects the first plot you can buy on its side
  const openFromSign = (side: ExpansionSide) => {
    const candidates: string[] = [];
    if (side === 'west' || side === 'east') {
      const px = side === 'west' ? field.minPx - 1 : field.maxPx + 1;
      for (let pz = field.minPz; pz <= field.maxPz; pz++) candidates.push(plotKey(px, pz));
    } else {
      const pz = side === 'north' ? field.minPz - 1 : field.maxPz + 1;
      for (let px = field.minPx; px <= field.maxPx; px++) candidates.push(plotKey(px, pz));
    }
    openExpand(candidates.find((k) => isPlotPurchasable(k, ownedPlots)) ?? null);
  };

  return (
    <group>
      <mesh
        receiveShadow
        position={[(field.minX + field.maxX) / 2, 0.01, (field.minZ + field.maxZ) / 2]}
      >
        <boxGeometry args={[field.maxX - field.minX, 0.12, field.maxZ - field.minZ]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>

      {ownedTiles.map((tile) => (
        <FarmTile key={tile.id} tile={tile} grass={look.grass} onHover={onHover} />
      ))}
      {lockedPlots.map((p) => (
        <LockedPlot key={`${p.px}-${p.pz}`} {...p} price={price} grass={look.wildGrass} />
      ))}

      {hoverArea.map((p) => (
        <lineSegments key={`${p.x}_${p.z}`} position={[p.x, 0.14, p.z]}>
          <edgesGeometry args={[hoverBox]} />
          <lineBasicMaterial color={placingSprinkler ? '#7dd3fc' : '#fef08a'} />
        </lineSegments>
      ))}

      {signs.map((s) => (
        <ExpansionSign key={s.side} {...s} onOpen={() => openFromSign(s.side)} />
      ))}

      {/* Farmhouse (click: sleep to the next day) */}
      <group position={[houseX, 0, houseZ]}>
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

      <mesh position={[binX, 0.5, binZ]} {...shippingBin}>
        <boxGeometry args={[1.35, 1.0, 0.95]} />
        <meshLambertMaterial color="#dc2626" />
      </mesh>

      {/* Seed stall */}
      <group position={[shopX, 0, shopZ]}>
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
      <group position={[wellX, 0, wellZ]}>
        <mesh position={[0, 0.475, 0]} {...well}>
          <cylinderGeometry args={[1.1, 1.2, 0.95, 12]} />
          <meshLambertMaterial color="#64748b" />
        </mesh>
        <mesh position={[0, 0.52, 0]} {...well}>
          <cylinderGeometry args={[0.92, 0.92, 0.82, 12]} />
          <meshLambertMaterial color="#0ea5e9" />
        </mesh>
      </group>

      {FARM_TREES.map((t) => {
        const [x, z] = at([t.x, t.z]);
        return <Tree key={`${t.x}_${t.z}`} x={x} z={z} scale={t.scale} type={t.type} />;
      })}

      {/* Livestock pasture & barn (moves as one piece) */}
      <group position={[FARM_SITES.ranch[0] + ranchDx, 0, FARM_SITES.ranch[1] + ranchDz]}>
        <mesh receiveShadow position={[0, 0.03, 0]}>
          <boxGeometry args={[6.2, 0.06, 5.4]} />
          <meshLambertMaterial color={look.pasture} />
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
        <group position={[BARN_OFFSET[0], 0, BARN_OFFSET[1]]}>
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
        <AnimalMesh key={animal.id} animal={animal} offset={[ranchDx, ranchDz]} />
      ))}

      {/* Player-placed decorations (hidden while being moved: the ghost shows instead) */}
      {Object.entries(decorPlacements)
        .filter(([id]) => ownedCosmetics.includes(id) && placingDecor?.id !== id)
        .map(([id, placement]) => (
          <PlacedDecor key={id} id={id} placement={placement} />
        ))}

      {(Object.keys(machines) as MachineId[])
        .filter((id) => decorPlacements[id] && placingDecor?.id !== id)
        .map((id) => (
          <PlacedMachine
            key={id}
            id={id}
            placement={decorPlacements[id]}
            job={machines[id]?.job ?? null}
          />
        ))}

      <DecorPlacer />
      <BuildPieces />
      <BuildPlacer />
    </group>
  );
}
