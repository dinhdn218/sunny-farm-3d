'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { camControl } from '@/lib/controls';
import { BOBBER_POS, FISHING_SPOT } from '@/config/fish';

// While fishing the view centres between the angler and the float so both stay in sight
const FISHING_VIEW = new THREE.Vector3(
  (FISHING_SPOT.x + BOBBER_POS[0]) / 2,
  0.6,
  (FISHING_SPOT.z + BOBBER_POS[2]) / 2
);

const NORMAL_VIEW = { minRadius: 8.5, maxRadius: 28, minPhi: 0.35, maxPhi: 1.35 };
// Photo mode lets the camera come closer, pull further back and look from lower and higher
const PHOTO_VIEW = { minRadius: 4, maxRadius: 45, minPhi: 0.12, maxPhi: 1.5 };
const viewLimits = () => (useGameStore.getState().photoMode ? PHOTO_VIEW : NORMAL_VIEW);

// Follow-orbit camera from the HTML version: right/middle (or Shift+left) drag to orbit, wheel to zoom.
// In photo mode a plain left drag orbits too.
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const followPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    camControl.camera = camera;
    const dom = gl.domElement;
    const drag = { active: false, prevX: 0, prevY: 0 };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2 || e.button === 1 || e.shiftKey || useGameStore.getState().photoMode) {
        drag.active = true;
        drag.prevX = e.clientX;
        drag.prevY = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active) return;
      camControl.theta -= (e.clientX - drag.prevX) * 0.007;
      const { minPhi, maxPhi } = viewLimits();
      camControl.phi = THREE.MathUtils.clamp(
        camControl.phi - (e.clientY - drag.prevY) * 0.007,
        minPhi,
        maxPhi
      );
      drag.prevX = e.clientX;
      drag.prevY = e.clientY;
    };
    const onPointerUp = () => {
      drag.active = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { minRadius, maxRadius } = viewLimits();
      camControl.radius = THREE.MathUtils.clamp(
        camControl.radius + e.deltaY * 0.012,
        minRadius,
        maxRadius
      );
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      camControl.camera = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    const { playerPos, fishing, photoMode } = useGameStore.getState();
    // Back from photo mode, the camera eases into its usual range
    if (!photoMode) {
      const { minRadius, maxRadius, minPhi, maxPhi } = NORMAL_VIEW;
      camControl.radius += (THREE.MathUtils.clamp(camControl.radius, minRadius, maxRadius) - camControl.radius) * 0.1;
      camControl.phi += (THREE.MathUtils.clamp(camControl.phi, minPhi, maxPhi) - camControl.phi) * 0.1;
    }
    const { target, radius, phi, theta } = camControl;
    if (fishing) followPoint.copy(FISHING_VIEW);
    else followPoint.set(playerPos.x * 0.5, 0.6, playerPos.z * 0.5);
    target.lerp(followPoint, 0.08);
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
  });

  return null;
}
