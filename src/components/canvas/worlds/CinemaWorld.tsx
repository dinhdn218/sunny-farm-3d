'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SNACK_PRICE, useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { nunito } from '@/lib/fonts';
import { SNACKS, ZONE_SPOTS } from '@/config/zones';
import { CLAW_PRICE } from '@/config/claw';

const FIREWORK_COLORS = ['#f43f5e', '#facc15', '#38bdf8', '#a855f7', '#4ade80'];

function drawChannel(ctx: CanvasRenderingContext2D, channel: number, now: number) {
  const { width: w, height: h } = ctx.canvas;
  const font = `bold 22px ${nunito.style.fontFamily}`;

  if (channel === 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 73 + now * 0.08) % w, (i * 41) % h, 3, 3);
    }
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(w * 0.5 + Math.sin(now * 0.0015) * 90, h * 0.5, 46, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.font = font;
    ctx.fillText('🚀 KÊNH 1: DU HÀNH VŨ TRỤ 3D', 24, 38);
  } else if (channel === 1) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 6; i++) {
      const fx = (i * 95 + now * 0.09) % w;
      const fy = 60 + Math.sin(now * 0.003 + i) * 50 + i * 20;
      ctx.fillStyle = i % 2 === 0 ? '#fb923c' : '#fde047';
      ctx.beginPath();
      ctx.arc(fx, fy, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = font;
    ctx.fillText('🐠 KÊNH 2: ĐẠI DƯƠNG KỲ THÚ', 24, 38);
  } else {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);
    FIREWORK_COLORS.forEach((color, i) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(85 + i * 85, 130, (now * 0.08 + i * 40) % 85, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = '#f472b6';
    ctx.font = font;
    ctx.fillText('🎆 KÊNH 3: ĐÊM NHẠC PHÁO HOA', 24, 38);
  }
}

// Toys piled behind the glass of each claw machine
const MACHINE_TOYS = ['#f472b6', '#facc15', '#60a5fa', '#a3e635', '#fb923c'];
const CLAW_MACHINES = [0.2, 2.5, 4.8];
const POSTERS: { x: number; z: number; rotY: number; color: string; title: string }[] = [
  { x: -14, z: -4, rotY: Math.PI / 2, color: '#1e3a8a', title: '🚀' },
  { x: -14, z: 1, rotY: Math.PI / 2, color: '#7c2d12', title: '🐉' },
  { x: 14, z: -6, rotY: -Math.PI / 2, color: '#14532d', title: '🦖' },
];

// A claw machine: glass box full of toys, with a claw that sways about
function ClawMachine({ z }: { z: number }) {
  const clawRef = useRef<THREE.Group>(null);
  const walkTo = useGameStore((s) => s.walkTo);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const x = ZONE_SPOTS.cinemaClaw.x;
  const handlers = interactable(
    '🕹️ Máy Gắp Thú',
    () => walkTo({ x, z, reach: ZONE_SPOTS.cinemaClaw.reach, act: () => setActiveModal('claw') }),
    `${CLAW_PRICE} Vàng một lượt • gắp trúng Vàng, Kim Cương và quà`
  );

  useFrame(() => {
    if (clawRef.current) clawRef.current.position.x = Math.sin(performance.now() * 0.0012 + z) * 0.3;
  });

  return (
    <group position={[x, 0, z]} rotation={[0, -Math.PI / 2, 0]} {...handlers}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.3, 1.0, 1.2]} />
        <meshLambertMaterial color="#db2777" />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[1.25, 1.3, 1.15]} />
        <meshLambertMaterial color="#e0f2fe" transparent opacity={0.35} />
      </mesh>
      <mesh castShadow position={[0, 2.4, 0]}>
        <boxGeometry args={[1.35, 0.2, 1.25]} />
        <meshLambertMaterial color="#be185d" />
      </mesh>
      {MACHINE_TOYS.map((color, i) => (
        <mesh key={color} position={[-0.4 + (i % 3) * 0.4, 1.12 + Math.floor(i / 3) * 0.2, -0.2 + (i % 2) * 0.3]}>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshLambertMaterial color={color} />
        </mesh>
      ))}
      <group ref={clawRef} position={[0, 2.0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 4]} />
          <meshLambertMaterial color="#94a3b8" />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.07, -0.3, 0]} rotation={[0, 0, side * 0.4]}>
            <boxGeometry args={[0.03, 0.18, 0.03]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
        ))}
      </group>
      <mesh position={[0.3, 0.85, 0.61]}>
        <cylinderGeometry args={[0.04, 0.04, 0.2, 6]} />
        <meshLambertMaterial color="#111827" />
      </mesh>
      <mesh position={[0.3, 0.98, 0.61]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshLambertMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

export function CinemaWorld() {
  const cycleCinemaChannel = useGameStore((s) => s.cycleCinemaChannel);
  const eatPopcornOrSnack = useGameStore((s) => s.eatPopcornOrSnack);
  const walkTo = useGameStore((s) => s.walkTo);
  const snackFree = useGameStore((s) => s.lastFreeSnackDay !== s.day);

  const screenTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => () => screenTexture.dispose(), [screenTexture]);

  useFrame(() => {
    const ctx = (screenTexture.image as HTMLCanvasElement).getContext('2d');
    if (!ctx) return;
    drawChannel(ctx, useGameStore.getState().cinemaChannel, performance.now());
    screenTexture.needsUpdate = true;
  });

  const screen = interactable(
    'Màn Hình Rạp Chiếu Phim (Click để đổi Kênh Phim!)',
    cycleCinemaChannel
  );
  const popcornSpot = ZONE_SPOTS.cinemaPopcorn;
  const snack = SNACKS.popcorn;
  const popcorn = interactable(
    `Quầy Bắp Rang Bơ (+${snack.energy}⚡ Thể lực)`,
    () =>
      walkTo({
        x: popcornSpot.x,
        z: popcornSpot.z,
        reach: popcornSpot.reach,
        act: () => eatPopcornOrSnack(snack.label, snack.energy),
      }),
    snackFree ? 'Phần đầu tiên hôm nay miễn phí!' : `${SNACK_PRICE} Vàng một phần`
  );

  return (
    <group>
      {/* Carpeted auditorium floor */}
      <mesh receiveShadow position={[0, 0.03, -3]}>
        <boxGeometry args={[22, 0.06, 16]} />
        <meshLambertMaterial color="#450a0a" />
      </mesh>
      <mesh receiveShadow position={[0, 0.04, 8.5]}>
        <boxGeometry args={[3, 0.06, 8]} />
        <meshLambertMaterial color="#b91c1c" />
      </mesh>

      {/* Giant movie screen */}
      <group position={[0, 0, -10.5]}>
        <mesh castShadow position={[0, 4.2, 0]}>
          <boxGeometry args={[14.6, 7.8, 0.6]} />
          <meshLambertMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 4.2, 0.32]} {...screen}>
          <planeGeometry args={[13.4, 6.7]} />
          <meshBasicMaterial map={screenTexture} />
        </mesh>
        {[-7.6, 7.6].map((x) => (
          <mesh key={x} castShadow position={[x, 4, 0.4]}>
            <boxGeometry args={[1.2, 8, 0.4]} />
            <meshLambertMaterial color="#991b1b" />
          </mesh>
        ))}
      </group>

      {/* Red velvet seats, rising towards the back */}
      {[0, 1, 2, 3].flatMap((row) =>
        [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((col) => (
          <mesh
            key={`${row}_${col}`}
            castShadow
            position={[col * 1.35, 0.375 + row * 0.12, -4 + row * 2.1]}
          >
            <boxGeometry args={[1.0, 0.75, 0.85]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
        ))
      )}

      {/* Popcorn & soda stand */}
      <group position={[popcornSpot.x - 1.6, 0, popcornSpot.z]}>
        <mesh castShadow position={[0, 1.1, 0]} {...popcorn}>
          <boxGeometry args={[2.4, 2.2, 1.6]} />
          <meshLambertMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[2.6, 0.5, 1.8]} />
          <meshLambertMaterial color="#dc2626" />
        </mesh>
        <Html position={[0, 3.3, 0]} zIndexRange={[15, 0]}>
          <div className="player-tag w-max rounded-full border border-white bg-amber-500 px-2.5 py-0.5 text-[11px] font-black text-amber-950 shadow">
            🍿 Bắp Rang Bơ
          </div>
        </Html>
      </group>

      {/* Claw machine corner */}
      {CLAW_MACHINES.map((z) => (
        <ClawMachine key={z} z={z} />
      ))}
      <Html position={[ZONE_SPOTS.cinemaClaw.x + 0.4, 3.4, 2.5]} zIndexRange={[15, 0]}>
        <div className="player-tag w-max rounded-full border border-white bg-pink-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
          🕹️ Khu Gắp Thú
        </div>
      </Html>

      {/* Ticket booth by the entrance */}
      <group position={[-6, 0, 10]}>
        <mesh castShadow position={[0, 1.3, 0]}>
          <boxGeometry args={[2.4, 2.6, 1.8]} />
          <meshLambertMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 1.5, 0.92]}>
          <boxGeometry args={[1.6, 0.9, 0.04]} />
          <meshLambertMaterial color="#7dd3fc" transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, 2.85, 0]}>
          <boxGeometry args={[2.6, 0.3, 2.0]} />
          <meshBasicMaterial color="#facc15" />
        </mesh>
      </group>

      {POSTERS.map((p) => (
        <group key={`${p.x}_${p.z}`} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
          <mesh castShadow position={[0, 1.8, 0]}>
            <boxGeometry args={[2.2, 3.2, 0.15]} />
            <meshLambertMaterial color={p.color} />
          </mesh>
          <Html position={[0, 1.9, 0.2]} center zIndexRange={[10, 0]}>
            <div className="player-tag text-3xl">{p.title}</div>
          </Html>
        </group>
      ))}
    </group>
  );
}
