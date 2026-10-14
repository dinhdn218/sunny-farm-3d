'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CropId, PlayerCosmetics, ToolId } from '@/types/game';
import { COSMETICS } from '@/config/cosmetics';
import { CROPS } from '@/config/crops';
import { useGameStore } from '@/store/useGameStore';
import { SafeGLTFModel } from './GLTFModel';

// Per-frame animation input, mutated by whoever drives the avatar (player, resident or remote peer)
export interface AvatarMotion {
  moving: boolean;
  walkTime: number;
  legSwing: number;
  // Tool swing progress in radians, 0 when idle
  swing: number;
}

export const createMotion = (legSwing = 0.6): AvatarMotion => ({
  moving: false,
  walkTime: 0,
  legSwing,
  swing: 0,
});

const DEFAULT_OUTFIT = COSMETICS.find((c) => c.id === 'farmer_blue')!;

function Hat({ id }: { id: string }) {
  switch (id) {
    case 'straw_hat':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.52, 0.52, 0.06, 12]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.29, 0.32, 0.22, 12]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.325, 0.325, 0.05, 12]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
        </group>
      );
    case 'crown':
      return (
        <group>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.28, 0.25, 0.18, 8]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          <mesh position={[0, 0.1, 0.26]}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      );
    case 'cat_ears':
      return (
        <group>
          {[-0.16, 0.16].map((x) => (
            <mesh key={x} position={[x, 0.1, 0]}>
              <coneGeometry args={[0.13, 0.24, 4]} />
              <meshLambertMaterial color="#f472b6" />
            </mesh>
          ))}
        </group>
      );
    case 'cowboy_hat':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.54, 0.54, 0.06, 12]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.24, 0.3, 0.26, 10]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
        </group>
      );
    case 'wizard_hat':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.52, 0.52, 0.05, 12]} />
            <meshLambertMaterial color="#4f46e5" />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <coneGeometry args={[0.28, 0.65, 10]} />
            <meshLambertMaterial color="#4f46e5" />
          </mesh>
        </group>
      );
    case 'halo':
      return (
        <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.04, 8, 20]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      );
    default:
      return null;
  }
}

function HeldTool({ tool }: { tool: ToolId }) {
  if (tool === 'hoe') {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.72, 6]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
        <mesh position={[0, -0.1, 0.34]}>
          <boxGeometry args={[0.1, 0.26, 0.08]} />
          <meshLambertMaterial color="#94a3b8" />
        </mesh>
      </group>
    );
  }
  if (tool === 'water') {
    return (
      <mesh position={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.16, 0.18, 0.3, 8]} />
        <meshLambertMaterial color="#0ea5e9" />
      </mesh>
    );
  }
  if (tool === 'basket') {
    return (
      <mesh position={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.22, 0.16, 0.24, 8]} />
        <meshLambertMaterial color="#d97706" />
      </mesh>
    );
  }
  const bagColor = tool.startsWith('seed_')
    ? CROPS[tool.replace('seed_', '') as CropId].color
    : '#fde68a';
  return (
    <mesh position={[0, 0, 0.15]}>
      <boxGeometry args={[0.24, 0.28, 0.14]} />
      <meshLambertMaterial color={bagColor} />
    </mesh>
  );
}

interface AvatarMeshProps {
  cosmetics: PlayerCosmetics;
  motion?: AvatarMotion;
  tool?: ToolId | null;
}

// Blocky character rig from the HTML version (createAvatarRig + applyAvatarCosmetics)
export function AvatarMesh({ cosmetics, motion, tool }: AvatarMeshProps) {
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const wingLRef = useRef<THREE.Mesh>(null);
  const wingRRef = useRef<THREE.Mesh>(null);
  const petRef = useRef<THREE.Group>(null);

  const useGlbModels = useGameStore((s) => s.useGlbModels);

  const outfit =
    COSMETICS.find((c) => c.id === cosmetics.outfit && c.category === 'outfit') ||
    DEFAULT_OUTFIT;
  const backItem = COSMETICS.find((c) => c.id === cosmetics.wing);
  const petItem = COSMETICS.find((c) => c.id === cosmetics.pet);
  const wingColor = backItem?.id !== 'backpack' ? backItem?.color : undefined;

  useFrame(() => {
    const now = performance.now();
    if (motion && leftLegRef.current && rightLegRef.current) {
      if (motion.moving) {
        leftLegRef.current.rotation.x = Math.sin(motion.walkTime) * motion.legSwing;
        rightLegRef.current.rotation.x = -Math.sin(motion.walkTime) * motion.legSwing;
      } else {
        leftLegRef.current.rotation.x *= 0.85;
        rightLegRef.current.rotation.x *= 0.85;
      }
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x =
        motion && motion.swing > 0 ? -Math.sin(motion.swing) * 1.35 : 0;
    }
    if (wingLRef.current && wingRRef.current) {
      const flap = Math.sin(now * 0.008) * 0.25;
      wingLRef.current.rotation.y = 0.35 + flap;
      wingRRef.current.rotation.y = -0.35 - flap;
    }
    if (petRef.current) {
      petRef.current.position.y = Math.abs(Math.sin(now * 0.009)) * 0.12;
    }
  });

  return (
    <group>
      {useGlbModels && (
        <SafeGLTFModel
          url="/models/character.glb"
          scale={0.35}
          position={[0, 0.2, 0]}
          fallback={null}
        />
      )}

      <mesh ref={leftLegRef} castShadow position={[-0.15, 0.225, 0]}>
        <boxGeometry args={[0.22, 0.45, 0.22]} />
        <meshLambertMaterial color={outfit.pantsColor} />
      </mesh>
      <mesh ref={rightLegRef} castShadow position={[0.15, 0.225, 0]}>
        <boxGeometry args={[0.22, 0.45, 0.22]} />
        <meshLambertMaterial color={outfit.pantsColor} />
      </mesh>

      <mesh castShadow position={[0, 0.74, 0]}>
        <boxGeometry args={[0.58, 0.62, 0.36]} />
        <meshLambertMaterial color={outfit.overallColor} />
      </mesh>

      <mesh castShadow position={[0, 1.32, 0]}>
        <boxGeometry args={[0.46, 0.46, 0.46]} />
        <meshLambertMaterial color="#fde68a" />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 1.34, 0.23]}>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      ))}

      <mesh position={[-0.39, 0.76, 0]}>
        <boxGeometry args={[0.18, 0.48, 0.18]} />
        <meshLambertMaterial color={outfit.shirtColor} />
      </mesh>
      <group ref={rightArmRef} position={[0.39, 0.98, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.18, 0.48, 0.18]} />
          <meshLambertMaterial color={outfit.shirtColor} />
        </mesh>
        <group position={[0, -0.4, 0.25]}>
          {tool && <HeldTool tool={tool} />}
        </group>
      </group>

      <group position={[0, 1.55, 0]}>
        <Hat id={cosmetics.hat} />
      </group>

      {backItem?.id === 'backpack' && (
        <mesh position={[0, 0.76, -0.26]}>
          <boxGeometry args={[0.38, 0.42, 0.22]} />
          <meshLambertMaterial color={backItem.color} />
        </mesh>
      )}
      {wingColor && (
        <>
          <mesh ref={wingLRef} position={[-0.34, 0.85, -0.22]} rotation={[0, 0.35, 0]}>
            <boxGeometry args={[0.55, 0.42, 0.06]} />
            <meshLambertMaterial color={wingColor} />
          </mesh>
          <mesh ref={wingRRef} position={[0.34, 0.85, -0.22]} rotation={[0, -0.35, 0]}>
            <boxGeometry args={[0.55, 0.42, 0.06]} />
            <meshLambertMaterial color={wingColor} />
          </mesh>
        </>
      )}

      {petItem?.color && (
        <group ref={petRef} position={[-0.85, 0, -0.75]}>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.34, 0.28, 0.48]} />
            <meshLambertMaterial color={petItem.color} />
          </mesh>
          <mesh position={[0, 0.42, 0.2]}>
            <boxGeometry args={[0.3, 0.28, 0.28]} />
            <meshLambertMaterial color={petItem.color} />
          </mesh>
          <mesh position={[0, 0.38, 0.36]}>
            <boxGeometry args={[0.16, 0.12, 0.14]} />
            <meshLambertMaterial color={petItem.accentColor} />
          </mesh>
          {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 0.6, 0.2]}>
              <coneGeometry args={[0.07, 0.14, 4]} />
              <meshLambertMaterial color={petItem.color} />
            </mesh>
          ))}
          <mesh position={[0, 0.36, -0.24]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.09, 0.18, 0.09]} />
            <meshLambertMaterial color={petItem.accentColor} />
          </mesh>
        </group>
      )}
    </group>
  );
}
