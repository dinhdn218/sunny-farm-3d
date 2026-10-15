'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { BUILD_CELL, pieceAt, snapToCell } from '@/lib/build';
import { canPlaceBuildPiece } from '@/lib/farmLayout';
import { BuildPieceModel } from './models/BuildPieceModel';

// Ghost of the piece being built, snapped to the grid cell under the cursor (green = free,
// red = blocked). Click, or hold and drag, to build a row; the eraser marks pieces in red and
// lifts them back into the stock.
export function BuildPlacer() {
  const mode = useGameStore((s) => s.buildMode);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const ghostRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const cellMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const cursor = useRef({ x: 0, z: 0, valid: false });
  const active = !!mode;

  useEffect(() => {
    if (!active) return;
    const dom = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    let painting = false;
    let lastCell = '';

    // Free for the current piece, or holding a piece the eraser can lift
    const check = (x: number, z: number) => {
      const { buildMode, ownedPlots, decorPlacements, buildPieces } = useGameStore.getState();
      if (!buildMode) return false;
      return buildMode.kind === 'erase'
        ? !!pieceAt(buildPieces, x, z)
        : canPlaceBuildPiece(x, z, ownedPlots, decorPlacements, buildPieces);
    };
    const aim = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(ground, hit)) return false;
      const x = snapToCell(hit.x);
      const z = snapToCell(hit.z);
      cursor.current = { x, z, valid: check(x, z) };
      return true;
    };
    // Each cell is built once per stroke; dragging skips blocked cells quietly,
    // while a single click explains why a cell can't be used
    const build = (dragging: boolean) => {
      const { x, z, valid } = cursor.current;
      const cell = `${x}_${z}`;
      if (cell === lastCell) return;
      lastCell = cell;
      if (valid || !dragging) useGameStore.getState().buildAt(x, z);
      cursor.current.valid = check(x, z);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.shiftKey) return;
      painting = true;
      lastCell = '';
      if (aim(e)) build(false);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (aim(e) && painting) build(true);
    };
    const onPointerUp = () => {
      painting = false;
    };

    // Start just in front of the player until the mouse moves
    const { playerPos } = useGameStore.getState();
    const x = snapToCell(playerPos.x + Math.sin(playerPos.rotY) * 2.5);
    const z = snapToCell(playerPos.z + Math.cos(playerPos.rotY) * 2.5);
    cursor.current = { x, z, valid: check(x, z) };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [active, camera, gl]);

  useFrame(() => {
    const ghost = ghostRef.current;
    const current = useGameStore.getState().buildMode;
    if (!ghost || !current) return;
    ghost.position.set(cursor.current.x, 0, cursor.current.z);
    if (modelRef.current) modelRef.current.rotation.y = current.rotY;
    const { valid } = cursor.current;
    cellMaterialRef.current?.color.set(
      current.kind === 'erase' ? (valid ? '#ef4444' : '#94a3b8') : valid ? '#4ade80' : '#ef4444'
    );
  });

  if (!mode) return null;

  return (
    <group ref={ghostRef}>
      {mode.kind !== 'erase' && (
        <group ref={modelRef}>
          <BuildPieceModel kind={mode.kind} ghost />
        </group>
      )}
      {/* Cell marker, kept just above the grass and paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <planeGeometry args={[BUILD_CELL * 0.96, BUILD_CELL * 0.96]} />
        <meshBasicMaterial ref={cellMaterialRef} color="#4ade80" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}
