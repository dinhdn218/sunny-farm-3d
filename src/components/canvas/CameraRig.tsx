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

// Follow-orbit camera from the HTML version: right/middle (or Shift+left) drag to orbit, wheel to zoom
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const followPoint = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    camControl.camera = camera;
    const dom = gl.domElement;
    const drag = { active: false, prevX: 0, prevY: 0 };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2 || e.button === 1 || e.shiftKey) {
        drag.active = true;
        drag.prevX = e.clientX;
        drag.prevY = e.clientY;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active) return;
      camControl.theta -= (e.clientX - drag.prevX) * 0.007;
      camControl.phi = THREE.MathUtils.clamp(
        camControl.phi - (e.clientY - drag.prevY) * 0.007,
        0.35,
        1.35
      );
      drag.prevX = e.clientX;
      drag.prevY = e.clientY;
    };
    const onPointerUp = () => {
      drag.active = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camControl.radius = THREE.MathUtils.clamp(
        camControl.radius + e.deltaY * 0.012,
        8.5,
        28
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
    const { playerPos, fishing } = useGameStore.getState();
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
