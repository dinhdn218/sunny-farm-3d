'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { FISHING_SPOTS } from '@/config/fish';

// Float and line while a cast is out, at whichever spot it was cast; the float dips when a fish bites
export function FishingTackle() {
  const spotId = useGameStore((s) => (s.fishing && s.fishing.stage !== 'result' ? s.fishing.spot : null));
  const floatRef = useRef<THREE.Group>(null);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return geometry;
  }, []);

  useFrame(() => {
    const { fishing, playerPos } = useGameStore.getState();
    if (!fishing || !floatRef.current) return;
    const [bx, by, bz] = FISHING_SPOTS[fishing.spot].bobber;
    const t = performance.now();
    const pulled = fishing.stage === 'bite' || fishing.stage === 'reeling';
    const y = by + (pulled ? -0.12 + Math.sin(t * 0.03) * 0.07 : Math.sin(t * 0.003) * 0.05);
    floatRef.current.position.set(bx, y, bz);

    // From the rod tip in the player's right hand to the float
    const { x, z, rotY } = playerPos;
    const position = line.attributes.position as THREE.BufferAttribute;
    position.setXYZ(
      0,
      x + Math.sin(rotY) * 1.2 + Math.cos(rotY) * 0.39,
      1.95,
      z + Math.cos(rotY) * 1.2 - Math.sin(rotY) * 0.39
    );
    position.setXYZ(1, bx, y + 0.12, bz);
    position.needsUpdate = true;
  });

  if (!spotId) return null;
  return (
    <group>
      <group ref={floatRef} position={FISHING_SPOTS[spotId].bobber}>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshLambertMaterial color="#f8fafc" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[0.2, 0.27, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <lineSegments geometry={line} frustumCulled={false}>
        <lineBasicMaterial color="#f8fafc" />
      </lineSegments>
    </group>
  );
}
