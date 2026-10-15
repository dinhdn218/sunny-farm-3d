'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
import { WeatherEffects } from './environment/WeatherEffects';
import { PhotoRig } from './PhotoRig';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';
import { weatherOf } from '@/lib/seasons';
import { Weather } from '@/types/game';

// Overcast skies on wet days
const WET_SKY: Partial<Record<Weather, string>> = { rain: '#64748b', storm: '#334155', snow: '#cbd5e1' };

// The HTML version renders with three r128 defaults (no tone mapping, no colour management,
// legacy light units). `flat linear legacy` restores the first two; lights are scaled by π for the third.
const LEGACY_LIGHT_SCALE = Math.PI;

function SkyAndLights() {
  const timePhaseIndex = useGameStore((s) => s.timePhaseIndex);
  const weather = useGameStore((s) => weatherOf(s.day));
  const phase = TIME_PHASES[timePhaseIndex];
  const sunRef = useRef<THREE.DirectionalLight>(null);
  // Festival nights turn purple; wet days are overcast
  const festiveNight = phase.id === 'night' && isEventActive(localDateKey(new Date()));
  const overcast = WET_SKY[weather];
  const tint = (color: string) =>
    overcast ? `#${new THREE.Color(color).lerp(new THREE.Color(overcast), 0.6).getHexString()}` : color;
  const sky = festiveNight ? '#1e1036' : tint(phase.sky);
  const fog = festiveNight ? '#2e1065' : tint(phase.fog);
  // Clouds dim the sun and thicken the haze
  const sunIntensity = phase.sunIntensity * (overcast ? 0.55 : 1);
  const ambientIntensity = phase.ambientIntensity * (overcast ? 0.85 : 1);
  const fogDensity = overcast ? 0.022 : 0.014;

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
      <fogExp2 attach="fog" args={[fog, fogDensity]} />
      <ambientLight intensity={ambientIntensity * LEGACY_LIGHT_SCALE} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[18, 28, 16]}
        color={phase.sunColor}
        intensity={sunIntensity * LEGACY_LIGHT_SCALE}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
      />
    </>
  );
}

// The world stops answering clicks while the camera roams for photos (left-drag orbits)
// or pieces are being built (left click builds)
function WorldClicks() {
  const setEvents = useThree((s) => s.setEvents);
  const paused = useGameStore((s) => s.photoMode || !!s.buildMode);

  useEffect(() => {
    setEvents({ enabled: !paused });
  }, [paused, setEvents]);

  return null;
}

export default function GameCanvas() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const photoMode = useGameStore((s) => s.photoMode);

  return (
    // Photo mode hides the name tags and labels floating over the 3D view (see globals.css)
    <div className="fixed inset-0 z-0" data-photo-mode={photoMode || undefined}>
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
        <PhotoRig />
        <WorldClicks />

        <BaseIsland />
        <CloudsAndPortal />

        {currentWorld === 'farm' && <FarmWorld />}
        {currentWorld === 'park' && <ParkWorld />}
        {currentWorld === 'beach' && <BeachWorld />}
        {currentWorld === 'mall' && <MallWorld />}
        {currentWorld === 'cinema' && <CinemaWorld />}
        <HalloweenScene />
        <WeatherEffects />

        <Player />
        <SimulatedPlayers />
        <RemotePlayers />
        <Particles />
      </Canvas>
    </div>
  );
}
