'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { TIME_PHASES } from '@/config/time';
import { FestivalId } from '@/types/game';
import { FIELD_BORDER } from '@/config/farm';
import { fieldRect } from '@/lib/farmLayout';
import { activeFestival } from '@/lib/festivals';
import { localDateKey } from '@/lib/dailyGift';
import { camControl } from '@/lib/controls';
import { DecorModel } from '../models/DecorModel';
import { StaticMerge } from '../StaticMerge';

const BAT_COUNT = 6;

// Spots along the field's border strip, where nothing else can be placed
function fieldSpots(ownedPlots: string[]): [number, number][] {
  const f = fieldRect(ownedPlots);
  const inset = FIELD_BORDER / 2;
  const xs = [f.minX + inset, (f.minX + f.maxX) / 2, f.maxX - inset];
  const zs = [f.minZ + inset, (f.minZ + f.maxZ) / 2, f.maxZ - inset];
  return xs.flatMap((x, i) =>
    zs.filter((_, j) => i !== 1 || j !== 1).map((z): [number, number] => [x, z])
  );
}

// Ring of spots just outside the Park's plaza
const PARK_SPOTS: [number, number][] = Array.from({ length: 8 }, (_, i) => {
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

interface DressingProps {
  // Spots around the field (or the Park's plaza), and the middle of it
  spots: [number, number][];
  center: [number, number];
  night: boolean;
}

// Lễ Hội Bí Ngô: jack-o'-lanterns all round, bats circling at night
function HalloweenDressing({ spots, center, night }: DressingProps) {
  return (
    <group>
      <StaticMerge>
        {spots.map(([x, z]) => (
          <group key={`${x}_${z}`} position={[x, 0.06, z]} scale={0.42}>
            <DecorModel id="decor_jack_lantern" />
          </group>
        ))}
      </StaticMerge>
      {night && <Bats center={center} />}
    </group>
  );
}

// Giáng Sinh: little Christmas trees and snowmen taking turns round the spots (the snow falls in WeatherEffects)
function ChristmasDressing({ spots }: DressingProps) {
  return (
    <StaticMerge>
      {spots.map(([x, z], i) => (
        <group key={`${x}_${z}`} position={[x, 0.06, z]} scale={i % 2 === 0 ? 0.42 : 0.5}>
          <DecorModel id={i % 2 === 0 ? 'decor_xmas_tree' : 'decor_snowman'} />
        </group>
      ))}
    </StaticMerge>
  );
}

// A red lantern hanging from a bamboo pole
function PoleLantern() {
  return (
    <group>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.2, 6]} />
        <meshLambertMaterial color="#a16207" />
      </mesh>
      <mesh position={[0.25, 2.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 6]} />
        <meshLambertMaterial color="#a16207" />
      </mesh>
      <mesh position={[0.45, 1.75, 0]} scale={[1, 1.25, 1]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {[1.99, 1.51].map((y) => (
        <mesh key={y} position={[0.45, y, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.05, 10]} />
          <meshLambertMaterial color="#facc15" />
        </mesh>
      ))}
      <mesh position={[0.45, 1.4, 0]}>
        <cylinderGeometry args={[0.02, 0.005, 0.18, 4]} />
        <meshLambertMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

const FIREWORK_COLORS = [0xfacc15, 0xef4444, 0xf472b6, 0x22d3ee, 0xa3e635, 0xffffff];
const SPARKS_PER_BURST = 60;
const MAX_SPARKS = 320;
const SPARK_LIFE = 1.6;

interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: number;
}

// Bursts of sparks in front of the camera, one every second or so
function Fireworks() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const sparks = useRef<Spark[]>([]);
  const nextBurst = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.count = 0;
  }, []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);
    const now = state.clock.elapsedTime;
    if (now >= nextBurst.current) {
      nextBurst.current = now + 0.8 + Math.random() * 0.9;
      // Round the camera's focus and low enough to stay under the top of the view
      const x = camControl.target.x + (Math.random() - 0.5) * 12;
      const y = 4.5 + Math.random() * 2;
      const z = camControl.target.z - 2 + Math.random() * 4;
      const burstColor = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      for (let i = 0; i < SPARKS_PER_BURST; i++) {
        // An even spray in every direction
        const up = Math.random() * 2 - 1;
        const around = Math.random() * Math.PI * 2;
        const flat = Math.sqrt(1 - up * up);
        const speed = 3.5 + Math.random() * 1.5;
        sparks.current.push({
          x,
          y,
          z,
          vx: flat * Math.cos(around) * speed,
          vy: up * speed,
          vz: flat * Math.sin(around) * speed,
          life: SPARK_LIFE,
          color: burstColor,
        });
      }
    }

    // Air slows the sparks, gravity pulls them down and they shrink as they burn out
    const drag = Math.max(0, 1 - 1.8 * dt);
    sparks.current = sparks.current
      .filter((s) => {
        s.life -= dt;
        if (s.life <= 0) return false;
        s.vx *= drag;
        s.vy = s.vy * drag - 1.5 * dt;
        s.vz *= drag;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        return true;
      })
      .slice(-MAX_SPARKS);

    sparks.current.forEach((s, i) => {
      dummy.position.set(s.x, s.y, s.z);
      dummy.scale.setScalar(s.life / SPARK_LIFE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.setHex(s.color));
    });
    mesh.count = sparks.current.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_SPARKS]}>
      <sphereGeometry args={[0.13, 6, 4]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

// Tết: potted mai trees and red lanterns taking turns round the spots, fireworks at night
function TetDressing({ spots, night }: DressingProps) {
  return (
    <group>
      <StaticMerge>
        {spots.map(([x, z], i) => (
          <group key={`${x}_${z}`} position={[x, 0.06, z]} scale={i % 2 === 0 ? 0.55 : 0.6}>
            {i % 2 === 0 ? <DecorModel id="decor_mai_tree" /> : <PoleLantern />}
          </group>
        ))}
      </StaticMerge>
      {night && <Fireworks />}
    </group>
  );
}

const DRESSING: Record<FestivalId, (props: DressingProps) => JSX.Element> = {
  halloween: HalloweenDressing,
  christmas: ChristmasDressing,
  tet: TetDressing,
};

// The running festival's decorations on the farm and in the Park
export function FestivalScene() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const ownedPlots = useGameStore((s) => s.ownedPlots);
  const night = useGameStore((s) => TIME_PHASES[s.timePhaseIndex].id === 'night');

  const festival = activeFestival(localDateKey(new Date()));
  if (!festival) return null;
  if (currentWorld !== 'farm' && currentWorld !== 'park') return null;

  const spots = currentWorld === 'farm' ? fieldSpots(ownedPlots) : PARK_SPOTS;
  const f = fieldRect(ownedPlots);
  const center: [number, number] =
    currentWorld === 'farm' ? [(f.minX + f.maxX) / 2, (f.minZ + f.maxZ) / 2] : [0, 0];
  const Dressing = DRESSING[festival.id];

  return <Dressing spots={spots} center={center} night={night} />;
}
