'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { TIME_PHASES } from '@/config/time';
import { FIELD_BORDER } from '@/config/farm';
import { fieldRect } from '@/lib/farmLayout';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';
import { DecorModel } from '../models/DecorModel';

const BAT_COUNT = 6;

// Lanterns along the field's border strip, where nothing else can be placed
function fieldLanterns(ownedPlots: string[]): [number, number][] {
  const f = fieldRect(ownedPlots);
  const inset = FIELD_BORDER / 2;
  const xs = [f.minX + inset, (f.minX + f.maxX) / 2, f.maxX - inset];
  const zs = [f.minZ + inset, (f.minZ + f.maxZ) / 2, f.maxZ - inset];
  return xs.flatMap((x, i) =>
    zs.filter((_, j) => i !== 1 || j !== 1).map((z): [number, number] => [x, z])
  );
}

// Ring of lanterns just outside the Park's plaza
const PARK_LANTERNS: [number, number][] = Array.from({ length: 8 }, (_, i) => {
  const a = ((i + 0.5) / 8) * Math.PI * 2;
  return [Math.cos(a) * 6.9, Math.sin(a) * 6.9];
});

// A small flock circling overhead at night
function Bats({ center }: { center: [number, number] }) {
  const batRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const t = performance.now() * 0.001;
    batRefs.current.forEach((bat, i) => {
      if (!bat) return;
      const a = t * (0.35 + (i % 3) * 0.08) + (i * Math.PI * 2) / BAT_COUNT;
      const r = 6 + (i % 3) * 2.2;
      bat.position.set(
        center[0] + Math.cos(a) * r,
        5.2 + Math.sin(t * 1.3 + i) * 0.8,
        center[1] + Math.sin(a) * r
      );
      bat.rotation.y = -a;
      const flap = Math.sin(t * 14 + i) * 0.8;
      bat.children[1].rotation.z = flap;
      bat.children[2].rotation.z = -flap;
    });
  });

  return (
    <group>
      {Array.from({ length: BAT_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            batRefs.current[i] = el;
          }}
        >
          <mesh>
            <sphereGeometry args={[0.16, 8, 6]} />
            <meshBasicMaterial color="#1e1b4b" />
          </mesh>
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.12, 0, 0]}>
              <mesh position={[side * 0.2, 0, 0]}>
                <boxGeometry args={[0.4, 0.02, 0.22]} />
                <meshBasicMaterial color="#312e81" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// Lễ Hội Bí Ngô decorations on the farm and in the Park while the festival runs
export function HalloweenScene() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const ownedPlots = useGameStore((s) => s.ownedPlots);
  const night = useGameStore((s) => TIME_PHASES[s.timePhaseIndex].id === 'night');

  if (!isEventActive(localDateKey(new Date()))) return null;
  if (currentWorld !== 'farm' && currentWorld !== 'park') return null;

  const lanterns = currentWorld === 'farm' ? fieldLanterns(ownedPlots) : PARK_LANTERNS;
  const f = fieldRect(ownedPlots);
  const center: [number, number] =
    currentWorld === 'farm' ? [(f.minX + f.maxX) / 2, (f.minZ + f.maxZ) / 2] : [0, 0];

  return (
    <group>
      {lanterns.map(([x, z]) => (
        <group key={`${x}_${z}`} position={[x, 0.06, z]} scale={0.42}>
          <DecorModel id="decor_jack_lantern" />
        </group>
      ))}
      {night && <Bats center={center} />}
    </group>
  );
}
