'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { camControl } from '@/lib/controls';
import { seasonOf, weatherOf } from '@/lib/seasons';
import { music } from '@/lib/music';
import { activeFestival } from '@/lib/festivals';
import { todayKey } from '@/lib/clock';

type Fall = 'rain' | 'snow' | 'leaves';

const SETTINGS: Record<Fall, { count: number; speed: number; color: string; size: [number, number, number] }> = {
  rain: { count: 600, speed: 16, color: '#bfdbfe', size: [0.03, 0.5, 0.03] },
  snow: { count: 380, speed: 1.4, color: '#ffffff', size: [0.09, 0.09, 0.09] },
  leaves: { count: 70, speed: 1.1, color: '#ea580c', size: [0.16, 0.02, 0.12] },
};

const AREA = 30;
const TOP = 14;
// Drops closer than this to the camera would fill the screen, so they're hidden
const NEAR = 6;

// Rain, snow or autumn leaves falling around the camera's focus
function Falling({ kind }: { kind: Fall }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { count, speed, color, size } = SETTINGS[kind];
  const drops = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * AREA,
        y: Math.random() * TOP,
        z: (Math.random() - 0.5) * AREA,
        phase: Math.random() * Math.PI * 2,
      })),
    [count]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.count = count;
  }, [count]);

  useFrame(({ camera }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);
    const t = performance.now() * 0.001;
    const { target } = camControl;
    drops.forEach((d, i) => {
      d.y -= speed * dt;
      if (kind !== 'rain') d.x += Math.sin(t + d.phase) * dt * 0.6;
      if (d.y < 0) {
        d.y = TOP;
        d.x = (Math.random() - 0.5) * AREA;
        d.z = (Math.random() - 0.5) * AREA;
      }
      dummy.position.set(target.x + d.x, d.y, target.z + d.z);
      dummy.scale.setScalar(dummy.position.distanceToSquared(camera.position) < NEAR * NEAR ? 0 : 1);
      dummy.rotation.set(kind === 'leaves' ? t * 2 + d.phase : 0, kind === 'leaves' ? d.phase : 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} transparent opacity={kind === 'rain' ? 0.55 : 0.9} />
    </instancedMesh>
  );
}

// Thunderstorm: the scene lights up for a blink every few seconds
function Lightning() {
  const lightRef = useRef<THREE.AmbientLight>(null);
  const timing = useRef({ flashAt: -Infinity, nextAt: performance.now() + 4000 });

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;
    const now = performance.now();
    if (now >= timing.current.nextAt) {
      timing.current = { flashAt: now, nextAt: now + 5000 + Math.random() * 7000 };
      music.thunder(0.3 + Math.random() * 1.2);
    }
    light.intensity = now - timing.current.flashAt < 120 ? 3.5 : 0;
  });

  return <ambientLight ref={lightRef} intensity={0} color="#e0e7ff" />;
}

// The day's weather over every zone: rain or snow, leaves in autumn, lightning in storms
export function WeatherEffects() {
  const day = useGameStore((s) => s.day);
  const weather = weatherOf(day);
  const kind: Fall | null =
    weather === 'rain' || weather === 'storm'
      ? 'rain'
      : weather === 'snow' || activeFestival(todayKey())?.snowfall
      ? 'snow'
      : seasonOf(day) === 'autumn'
      ? 'leaves'
      : null;

  return (
    <group>
      {kind && <Falling key={kind} kind={kind} />}
      {weather === 'storm' && <Lightning />}
    </group>
  );
}
