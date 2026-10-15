'use client';

import { useLayoutEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { TIME_PHASES } from '@/config/time';
import { CameraRig } from './CameraRig';
import { Player } from './Player';
import { SimulatedPlayers } from './SimulatedPlayers';
import { RemotePlayers } from './RemotePlayers';
import { Particles } from './Particles';
import { BaseIsland } from './environment/BaseIsland';
import { CloudsAndPortal } from './environment/CloudsAndPortal';
import { FarmWorld } from './worlds/FarmWorld';
import { ParkWorld } from './worlds/ParkWorld';
import { BeachWorld } from './worlds/BeachWorld';
import { MallWorld } from './worlds/MallWorld';
import { CinemaWorld } from './worlds/CinemaWorld';
import { HalloweenScene } from './environment/Halloween';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';

// The HTML version renders with three r128 defaults (no tone mapping, no colour management,
// legacy light units). `flat linear legacy` restores the first two; lights are scaled by π for the third.
const LEGACY_LIGHT_SCALE = Math.PI;

function SkyAndLights() {
  const timePhaseIndex = useGameStore((s) => s.timePhaseIndex);
  const phase = TIME_PHASES[timePhaseIndex];
  const sunRef = useRef<THREE.DirectionalLight>(null);
  // Festival nights turn purple
  const festiveNight = phase.id === 'night' && isEventActive(localDateKey(new Date()));
  const sky = festiveNight ? '#1e1036' : phase.sky;
  const fog = festiveNight ? '#2e1065' : phase.fog;

  useLayoutEffect(() => {
    const shadowCam = sunRef.current?.shadow.camera;
    if (!shadowCam) return;
    shadowCam.left = -20;
    shadowCam.right = 20;
    shadowCam.top = 20;
    shadowCam.bottom = -20;
    shadowCam.updateProjectionMatrix();
  }, []);

  return (
    <>
      <color attach="background" args={[sky]} />
      <fogExp2 attach="fog" args={[fog, 0.014]} />
      <ambientLight intensity={phase.ambientIntensity * LEGACY_LIGHT_SCALE} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[18, 28, 16]}
        color={phase.sunColor}
        intensity={phase.sunIntensity * LEGACY_LIGHT_SCALE}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
      />
    </>
  );
}

export default function GameCanvas() {
  const currentWorld = useGameStore((s) => s.currentWorld);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        shadows
        flat
        linear
        legacy
        camera={{ fov: 45, near: 0.1, far: 160, position: [4.5, 12, 15.6] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <SkyAndLights />
        <CameraRig />

        <BaseIsland />
        <CloudsAndPortal />

        {currentWorld === 'farm' && <FarmWorld />}
        {currentWorld === 'park' && <ParkWorld />}
        {currentWorld === 'beach' && <BeachWorld />}
        {currentWorld === 'mall' && <MallWorld />}
        {currentWorld === 'cinema' && <CinemaWorld />}
        <HalloweenScene />

        <Player />
        <SimulatedPlayers />
        <RemotePlayers />
        <Particles />
      </Canvas>
    </div>
  );
}
