'use client';

import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { interactable } from '@/lib/interact';
import { nunito } from '@/lib/fonts';

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

export function CinemaWorld() {
  const cycleCinemaChannel = useGameStore((s) => s.cycleCinemaChannel);
  const eatPopcornOrSnack = useGameStore((s) => s.eatPopcornOrSnack);

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
  const popcorn = interactable('Quầy Bắp Rang Bơ (+30⚡ Thể lực miễn phí!)', () =>
    eatPopcornOrSnack('Bắp rang bơ', 30)
  );

  return (
    <group>
      {/* Giant movie screen */}
      <group position={[0, 0, -8.2]}>
        <mesh castShadow position={[0, 3.8, 0]}>
          <boxGeometry args={[12.6, 6.8, 0.6]} />
          <meshLambertMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 3.8, 0.32]} {...screen}>
          <planeGeometry args={[11.6, 5.8]} />
          <meshBasicMaterial map={screenTexture} />
        </mesh>
      </group>

      {/* Red velvet seats */}
      {[0, 1, 2].flatMap((row) =>
        [-3, -2, -1, 0, 1, 2, 3].map((col) => (
          <mesh
            key={`${row}_${col}`}
            castShadow
            position={[col * 1.35, 0.375, -2.5 + row * 2.2]}
          >
            <boxGeometry args={[1.0, 0.75, 0.85]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
        ))
      )}

      {/* Popcorn & soda stand */}
      <mesh position={[-8.2, 1.1, 0]} {...popcorn}>
        <boxGeometry args={[2.4, 2.2, 1.6]} />
        <meshLambertMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
}
