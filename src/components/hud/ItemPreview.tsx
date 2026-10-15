'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerCosmetics } from '@/types/game';
import { AvatarMesh, createMotion } from '@/components/canvas/models/AvatarMesh';
import { DecorModel } from '@/components/canvas/models/DecorModel';

// Same rendering setup as the game canvas (see GameCanvas)
const LEGACY_LIGHT_SCALE = Math.PI;

type Framing = { position: [number, number, number]; target: [number, number, number] };

const AVATAR_FRAMING: Framing = { position: [0, 1.5, 4.0], target: [0, 0.8, 0] };

// Decorations range from a 2 m scarecrow to a 5.5 m windmill, so each gets its own framing
const DECOR_FRAMING: Record<string, Framing> = {
  decor_scarecrow: { position: [0, 2.2, 5.2], target: [0, 1.1, 0] },
  decor_windmill: { position: [0, 5.2, 13.5], target: [0, 2.6, 0] },
  decor_fountain: { position: [0, 3.8, 7.5], target: [0, 1.0, 0] },
  decor_sakura_grove: { position: [0, 4.4, 10], target: [0, 1.8, 0.4] },
  decor_gold_statue: { position: [0, 2.6, 5.6], target: [0, 1.2, 0] },
  decor_jack_lantern: { position: [0, 1.5, 3.0], target: [0, 0.4, 0] },
  decor_cauldron: { position: [0, 1.7, 3.2], target: [0, 0.5, 0] },
  machine_oven: { position: [0, 2.0, 4.2], target: [0, 0.55, 0] },
  machine_kitchen: { position: [0, 2.2, 4.4], target: [0, 0.8, 0] },
  machine_cheese: { position: [0, 2.2, 4.4], target: [0, 0.85, 0] },
  machine_loom: { position: [0, 2.2, 4.4], target: [0, 0.8, 0] },
};

function PreviewCamera({ decorId }: { decorId: string | null }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const { position, target } = (decorId && DECOR_FRAMING[decorId]) || AVATAR_FRAMING;
    camera.position.set(...position);
    camera.lookAt(...target);
  }, [camera, decorId]);
  return null;
}

function Turntable({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += Math.min(delta, 0.1) * 0.9;
  });
  return <group ref={ref}>{children}</group>;
}

// Rotating try-on preview of the character (or a farm decoration or machine) for the shops
export default function ItemPreview({
  cosmetics,
  decorId,
}: {
  cosmetics?: PlayerCosmetics;
  decorId: string | null;
}) {
  const motion = useRef(createMotion()).current;

  return (
    <Canvas
      flat
      linear
      legacy
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [0, 1.5, 4.0] }}
    >
      <PreviewCamera decorId={decorId} />
      <ambientLight intensity={0.75 * LEGACY_LIGHT_SCALE} />
      <directionalLight position={[3, 6, 4]} intensity={0.85 * LEGACY_LIGHT_SCALE} />
      <Turntable>
        {decorId ? (
          <DecorModel id={decorId} />
        ) : (
          cosmetics && <AvatarMesh cosmetics={cosmetics} motion={motion} />
        )}
      </Turntable>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[decorId ? 3.4 : 1.3, 40]} />
        <meshLambertMaterial color="#84cc16" />
      </mesh>
    </Canvas>
  );
}
