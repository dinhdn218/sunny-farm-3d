'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { useCasinoStore } from '@/store/useCasinoStore';
import { interactable } from '@/lib/interact';
import { CHAIR_DISTANCE, SEAT_OFFSETS, TABLE_LIST, TableConfig, humans, seatSpot } from '@/lib/casino';
import { goToTable } from '@/lib/casinoNet';
import { NPC_PRESETS } from '@/config/npcs';
import { WHEEL_COLORS, WHEEL_PRIZES } from '@/config/luckyWheel';
import { ZONE_SPOTS } from '@/config/zones';
import { localDateKey } from '@/lib/dailyGift';
import { activeFestival } from '@/lib/festivals';
import { BAU_CUA_FACES } from '@/config/baucua';
import { PlayerCosmetics } from '@/types/game';
import { AvatarMesh } from '../models/AvatarMesh';
import { PlayerTag } from '../PlayerTag';


const SLOT_ROWS: { x: number; rotY: number }[] = [
  { x: -15.5, rotY: Math.PI / 2 },
  { x: 15.5, rotY: -Math.PI / 2 },
];
const SLOT_Z = [-7, -4.5, -2, 0.5, 3];
const PILLARS = Array.from({ length: 8 }, (_, i) => {
  const a = ((i + 0.5) / 8) * Math.PI * 2;
  return [Math.sin(a) * 13, -3 + Math.cos(a) * 13] as [number, number];
}).filter(([x, z]) => !(Math.abs(x) < 4 && z > 5));

// Computer players at the tables dress up for the occasion
const BOT_LOOKS: PlayerCosmetics[] = NPC_PRESETS.slice(0, 4).map((p) => ({ ...p.cosmetics, pet: 'none_pet' }));

function Chair({ rotY }: { rotY: number }) {
  return (
    <group rotation={[0, rotY, 0]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.62, 0.12, 0.6]} />
        <meshLambertMaterial color="#7f1d1d" />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0.27]}>
        <boxGeometry args={[0.62, 0.75, 0.1]} />
        <meshLambertMaterial color="#991b1b" />
      </mesh>
      {[-0.25, 0.25].flatMap((x) =>
        [-0.24, 0.24].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 5]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
        ))
      )}
    </group>
  );
}

// A round card table with four chairs; computer players sit in theirs during a game
function CardTable({ config }: { config: TableConfig }) {
  const table = useCasinoStore((s) => s.tables[config.id]);
  const handlers = interactable(
    `🃏 ${config.name} • Tiến Lên Miền Nam`,
    () => goToTable(config.id),
    `Cược ${config.stake}🪙 mỗi ván • Click để vào bàn`
  );
  const seated = table ? humans(table).length : 0;
  const status = !table ? 'Bàn trống' : table.phase === 'playing' ? 'Đang chơi' : 'Đang chờ';

  return (
    <group>
      <group position={[config.x, 0, config.z]} {...handlers}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.25, 0.5, 0.8, 10]} />
          <meshLambertMaterial color="#422006" />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.84, 0]}>
          <cylinderGeometry args={[1.3, 1.3, 0.1, 28]} />
          <meshLambertMaterial color={config.felt} />
        </mesh>
        <mesh position={[0, 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.3, 0.09, 8, 32]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
        {/* A few cards in the middle */}
        {[-0.18, 0, 0.18].map((x, i) => (
          <mesh key={x} position={[x, 0.9, 0.05 * i]} rotation={[-Math.PI / 2, 0, (i - 1) * 0.3]}>
            <planeGeometry args={[0.22, 0.32]} />
            <meshLambertMaterial color={i === 1 ? '#fef2f2' : '#ffffff'} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {SEAT_OFFSETS.map(([dx, dz], seat) => (
          <group key={seat} position={[dx * CHAIR_DISTANCE, 0, dz * CHAIR_DISTANCE]}>
            <Chair rotY={Math.atan2(dx, dz)} />
          </group>
        ))}
      </group>

      {table?.seats.map((info, seat) => {
        if (info?.kind !== 'bot') return null;
        const spot = seatSpot(config.id, seat);
        return (
          <group key={seat} position={[spot.x, 0.08, spot.z]} rotation={[0, spot.rotY, 0]}>
            <AvatarMesh cosmetics={BOT_LOOKS[seat]} />
            <PlayerTag name={info.name} />
          </group>
        );
      })}

      <Html position={[config.x, 2.6, config.z]} zIndexRange={[15, 0]}>
        <div className="player-tag flex w-max flex-col items-center gap-0.5">
          <div className="rounded-full border border-white bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-amber-950 shadow">
            🃏 {config.name} • {config.stake}🪙
          </div>
          <div className="rounded-full border border-white/30 bg-slate-900/85 px-2 py-0.5 text-[10px] font-black text-white shadow">
            👥 {seated}/4 • {status}
          </div>
        </div>
      </Html>
    </group>
  );
}

function SlotMachine({ seed }: { seed: number }) {
  const screenRef = useRef<THREE.MeshBasicMaterial>(null);
  const lampRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const t = performance.now() * 0.001 + seed;
    screenRef.current?.color.setHSL((t * 0.15) % 1, 0.75, 0.55);
    lampRef.current?.color.set(Math.sin(t * 6) > 0 ? '#fde047' : '#f97316');
  });

  return (
    <group>
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[1.0, 1.8, 0.8]} />
        <meshLambertMaterial color="#4c1d95" />
      </mesh>
      <mesh position={[0, 1.15, 0.41]}>
        <planeGeometry args={[0.72, 0.5]} />
        <meshBasicMaterial ref={screenRef} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[1.0, 0.18, 0.8]} />
        <meshBasicMaterial ref={lampRef} />
      </mesh>
      <mesh position={[0.6, 1.1, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.6, 6]} />
        <meshLambertMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0.66, 1.42, 0]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshLambertMaterial color="#dc2626" />
      </mesh>
    </group>
  );
}

// The face of the lucky wheel: coloured slices with their prize icons
function useWheelTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const icons = WHEEL_PRIZES.map((p) => p.icon);
      WHEEL_COLORS.forEach((color, i) => {
        const a0 = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(256, 256);
        ctx.arc(256, 256, 250, a0, a1);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 6;
        ctx.stroke();
        const mid = (a0 + a1) / 2;
        ctx.font = '64px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icons[i], 256 + Math.cos(mid) * 165, 256 + Math.sin(mid) * 165);
      });
      ctx.beginPath();
      ctx.arc(256, 256, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function LuckyWheelBooth() {
  const wheelRef = useRef<THREE.Mesh>(null);
  const texture = useWheelTexture();
  const walkTo = useGameStore((s) => s.walkTo);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const ready = useGameStore((s) => s.lastWheelDate !== localDateKey(new Date()));
  const handlers = interactable(
    '🎡 Vòng Quay May Mắn',
    () => walkTo({ ...ZONE_SPOTS.casinoWheel, act: () => setActiveModal('luckyWheel') }),
    ready ? 'Hôm nay còn 1 lượt quay miễn phí!' : 'Đã quay hôm nay • Quay lại vào ngày mai'
  );

  useFrame((_, delta) => {
    if (wheelRef.current) wheelRef.current.rotation.z -= Math.min(delta, 0.1) * 0.4;
  });

  return (
    <group position={[ZONE_SPOTS.casinoWheel.x, 0, ZONE_SPOTS.casinoWheel.z]} {...handlers}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[3.2, 0.6, 1.4]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} castShadow position={[x, 2.0, 0]} rotation={[0, 0, x > 0 ? 0.12 : -0.12]}>
          <boxGeometry args={[0.22, 3.2, 0.3]} />
          <meshLambertMaterial color="#ca8a04" />
        </mesh>
      ))}
      <mesh ref={wheelRef} position={[0, 2.8, 0.2]}>
        <circleGeometry args={[2.0, 48]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      <mesh position={[0, 2.8, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.05, 0.12, 8, 48]} />
        <meshLambertMaterial color="#facc15" />
      </mesh>
      <mesh position={[0, 4.95, 0.3]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.22, 0.45, 3]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <Html position={[0, 5.6, 0]} zIndexRange={[15, 0]}>
        <div
          className={`player-tag w-max rounded-full border border-white px-2.5 py-0.5 text-[11px] font-black shadow ${
            ready ? 'animate-bounce bg-pink-500 text-white' : 'bg-slate-900/85 text-white'
          }`}
        >
          🎡 Vòng Quay May Mắn{ready ? ' • 1 lượt miễn phí!' : ''}
        </div>
      </Html>
    </group>
  );
}

// The Bầu Cua mat: six squares in two rows; the gourd is drawn, there being no emoji for it
function useBauCuaMatTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(0, 0, 600, 400);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 586, 386);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      BAU_CUA_FACES.forEach((face, i) => {
        const x = 30 + (i % 3) * 185;
        const y = 30 + Math.floor(i / 3) * 175;
        const cx = x + 85;
        const cy = y + 68;
        ctx.fillStyle = face.color;
        ctx.fillRect(x, y, 170, 160);
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, 170, 160);
        if (face.icon) {
          ctx.font = '84px serif';
          ctx.fillText(face.icon, cx, cy);
        } else {
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 40);
          ctx.lineTo(cx, cy - 56);
          ctx.stroke();
          [
            { y: cy - 20, r: 20, color: '#84cc16' },
            { y: cy + 16, r: 32, color: '#a3e635' },
          ].forEach((bulb) => {
            ctx.beginPath();
            ctx.arc(cx, bulb.y, bulb.r, 0, Math.PI * 2);
            ctx.fillStyle = bulb.color;
            ctx.fill();
          });
        }
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(face.name.toUpperCase(), cx, y + 140);
      });
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

// Stools on the near side of the Bầu Cua table
const BAU_CUA_STOOLS = [-0.9, 0, 0.9];
// Dice resting by the plate
const BAU_CUA_DICE: [number, number, number][] = [
  [0.85, 0.5, 0.55],
  [1.1, 0.5, 0.62],
  [0.98, 0.5, 0.36],
];

// A low red table set out by the entrance while Tết runs: the mat, the plate and the bowl for the dice
function BauCuaTable() {
  const texture = useBauCuaMatTexture();
  const bowlRef = useRef<THREE.Group>(null);
  const walkTo = useGameStore((s) => s.walkTo);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const spot = ZONE_SPOTS.casinoBauCua;
  const handlers = interactable(
    '🎲 Bầu Cua Tôm Cá',
    () => walkTo({ ...spot, act: () => setActiveModal('bauCua') }),
    'Trò chơi ngày Tết • Cược tối đa 500🪙 một ván'
  );

  // Every few seconds the bowl gets a rattle, as if a round were being played
  useFrame(() => {
    if (!bowlRef.current) return;
    const t = performance.now() / 1000;
    const rattling = t % 5 < 0.8;
    bowlRef.current.rotation.z = rattling ? Math.sin(t * 40) * 0.12 : 0;
    bowlRef.current.position.x = 0.85 + (rattling ? Math.sin(t * 33) * 0.03 : 0);
  });

  return (
    <group position={[spot.x, 0, spot.z]} {...handlers}>
      <mesh castShadow receiveShadow position={[0, 0.38, 0]}>
        <boxGeometry args={[2.8, 0.1, 1.6]} />
        <meshLambertMaterial color="#7f1d1d" />
      </mesh>
      {[-1.25, 1.25].flatMap((x) =>
        [-0.65, 0.65].map((z) => (
          <mesh key={`${x}${z}`} castShadow position={[x, 0.17, z]}>
            <boxGeometry args={[0.14, 0.34, 0.14]} />
            <meshLambertMaterial color="#450a0a" />
          </mesh>
        ))
      )}
      <mesh position={[-0.4, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {/* Plate with the bowl turned over it */}
      <mesh position={[0.85, 0.45, -0.15]}>
        <cylinderGeometry args={[0.34, 0.3, 0.04, 20]} />
        <meshLambertMaterial color="#f8fafc" />
      </mesh>
      <group ref={bowlRef} position={[0.85, 0.47, -0.15]}>
        <mesh castShadow>
          <sphereGeometry args={[0.27, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#e0f2fe" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24, 0.02, 6, 20]} />
          <meshLambertMaterial color="#38bdf8" />
        </mesh>
      </group>
      {BAU_CUA_DICE.map((at, i) => (
        <mesh key={i} castShadow position={at} rotation={[0, i * 0.7, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshLambertMaterial color="#ffffff" />
        </mesh>
      ))}
      {BAU_CUA_STOOLS.map((x) => (
        <group key={x} position={[x, 0, 1.25]}>
          <mesh castShadow position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.16, 0.2, 0.2, 10]} />
            <meshLambertMaterial color="#b91c1c" />
          </mesh>
        </group>
      ))}
      <Html position={[0, 2.0, 0]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-amber-100 shadow">
          🎲 Bầu Cua Tôm Cá • Tết
        </div>
      </Html>
    </group>
  );
}

export function CasinoWorld() {
  // Bầu Cua comes out for Tết
  const tet = activeFestival(localDateKey(new Date()))?.id === 'tet';

  return (
    <group>
      {/* Polished hall floor with a gold rim */}
      <mesh receiveShadow position={[0, 0.03, -3]}>
        <cylinderGeometry args={[13.5, 13.5, 0.06, 48]} />
        <meshLambertMaterial color="#1c1917" />
      </mesh>
      <mesh position={[0, 0.07, -3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[13.5, 0.14, 6, 64]} />
        <meshLambertMaterial color="#ca8a04" />
      </mesh>
      <mesh position={[0, 0.065, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 4.9, 48]} />
        <meshBasicMaterial color="#a16207" />
      </mesh>

      {/* Red carpet from the portal to the hall */}
      <mesh receiveShadow position={[0, 0.05, 9.5]}>
        <boxGeometry args={[3.2, 0.04, 13]} />
        <meshLambertMaterial color="#b91c1c" />
      </mesh>
      {[-1.65, 1.65].map((x) => (
        <mesh key={x} position={[x, 0.06, 9.5]}>
          <boxGeometry args={[0.12, 0.05, 13]} />
          <meshLambertMaterial color="#facc15" />
        </mesh>
      ))}

      {/* Entrance: two lamp posts with the casino's sign between them */}
      <group position={[0, 0, 10.5]}>
        {[-2.6, 2.6].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh castShadow position={[0, 1.1, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 2.2, 8]} />
              <meshLambertMaterial color="#b45309" />
            </mesh>
            <mesh position={[0, 2.35, 0]}>
              <sphereGeometry args={[0.32, 12, 8]} />
              <meshBasicMaterial color="#fde68a" />
            </mesh>
          </group>
        ))}
        <Html position={[0, 3.2, 0]} center zIndexRange={[15, 0]}>
          <div className="player-tag w-max rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-red-700 to-red-900 px-4 py-1 text-base font-black tracking-wide text-amber-200 shadow-xl">
            🎰 CASINO HOÀNG GIA
          </div>
        </Html>
      </group>

      {PILLARS.map(([x, z]) => (
        <group key={`${x}_${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 1.8, 0]}>
            <cylinderGeometry args={[0.32, 0.4, 3.6, 10]} />
            <meshLambertMaterial color="#fef3c7" />
          </mesh>
          <mesh position={[0, 3.8, 0]}>
            <sphereGeometry args={[0.35, 12, 8]} />
            <meshBasicMaterial color="#fde68a" />
          </mesh>
        </group>
      ))}

      {TABLE_LIST.map((config) => (
        <CardTable key={config.id} config={config} />
      ))}

      {SLOT_ROWS.flatMap(({ x, rotY }) =>
        SLOT_Z.map((z, i) => (
          <group key={`${x}_${z}`} position={[x, 0, z]} rotation={[0, rotY, 0]}>
            <SlotMachine seed={i * 1.7 + x} />
          </group>
        ))
      )}

      {/* Bar counter */}
      <group position={[11, 0, -11.5]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[4.2, 1.2, 1.0]} />
          <meshLambertMaterial color="#422006" />
        </mesh>
        <mesh position={[0, 1.24, 0]}>
          <boxGeometry args={[4.4, 0.08, 1.2]} />
          <meshLambertMaterial color="#facc15" />
        </mesh>
        {['#16a34a', '#dc2626', '#2563eb', '#f59e0b', '#9333ea'].map((color, i) => (
          <mesh key={color} position={[-1.6 + i * 0.8, 1.5, -0.2]}>
            <cylinderGeometry args={[0.09, 0.11, 0.45, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
        ))}
      </group>

      <LuckyWheelBooth />
      {tet && <BauCuaTable />}

      {/* Potted palms by the entrance */}
      {[-5, 5].map((x) => (
        <group key={x} position={[x, 0, 11.5]}>
          <mesh castShadow position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.45, 0.35, 0.7, 10]} />
            <meshLambertMaterial color="#ca8a04" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, 1.15, 0]} rotation={[0.9, (i / 5) * Math.PI * 2, 0]}>
              <coneGeometry args={[0.18, 1.3, 4]} />
              <meshLambertMaterial color="#15803d" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

