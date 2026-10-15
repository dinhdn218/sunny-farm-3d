'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { canPlaceDecor, decorFootprint } from '@/lib/farmLayout';
import { DecorModel } from './models/DecorModel';

// Translucent copy of the decoration that follows the cursor while it is being placed or moved.
// Green ring = free spot, red ring = blocked. Click to place, R to rotate, Esc to cancel.
export function DecorPlacer() {
  const placing = useGameStore((s) => s.placingDecor);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ghostRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const cursor = useRef({ x: 0, z: 0, valid: false });
  const placingId = placing?.id;

  useEffect(() => {
    if (!placingId) return;
    const dom = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    let pressedAt: { x: number; y: number } | null = null;

    const moveTo = (x: number, z: number) => {
      const { ownedPlots, decorPlacements, buildPieces } = useGameStore.getState();
      cursor.current = {
        x,
        z,
        valid: canPlaceDecor(placingId, x, z, ownedPlots, decorPlacements, buildPieces),
      };
    };
    const aim = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(ground, hit)) moveTo(hit.x, hit.z);
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedAt = e.button === 0 && !e.shiftKey ? { x: e.clientX, y: e.clientY } : null;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!pressedAt || e.button !== 0) return;
      const dragged = Math.hypot(e.clientX - pressedAt.x, e.clientY - pressedAt.y) > 8;
      pressedAt = null;
      if (dragged) return;
      aim(e);
      const { x, z } = cursor.current;
      // Place after this click has finished so it can't also trigger whatever is under the cursor
      setTimeout(() => useGameStore.getState().placeDecor(x, z), 0);
    };

    // Start just in front of the player until the mouse moves
    const { playerPos } = useGameStore.getState();
    moveTo(
      playerPos.x + Math.sin(playerPos.rotY) * 3,
      playerPos.z + Math.cos(playerPos.rotY) * 3
    );

    dom.addEventListener('pointermove', aim);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    return () => {
      dom.removeEventListener('pointermove', aim);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }, [placingId, camera, gl]);

  useFrame(() => {
    const ghost = ghostRef.current;
    const current = useGameStore.getState().placingDecor;
    if (!ghost || !current) return;
    ghost.position.set(cursor.current.x, 0, cursor.current.z);
    ghost.rotation.y = current.rotY;
    ringMaterialRef.current?.color.set(cursor.current.valid ? '#4ade80' : '#ef4444');
  });

  if (!placing) return null;
  const radius = decorFootprint(placing.id);

  return (
    <group ref={ghostRef}>
      <DecorModel id={placing.id} ghost />
      {/* Kept above the farm tiles so the red "blocked" ring stays visible over the field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[radius - 0.12, radius, 40]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color="#4ade80"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.19, 0]}>
        <circleGeometry args={[radius, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
