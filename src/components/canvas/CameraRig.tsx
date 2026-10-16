'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { CAMERA_FAR, camControl } from '@/lib/controls';
import { WALK_MARGIN, islandShape } from '@/lib/farmLayout';
import { FISHING_SPOTS } from '@/config/fish';

const NORMAL_VIEW = { minRadius: 8.5, maxRadius: CAMERA_FAR, minPhi: 0.35, maxPhi: 1.35 };
// Photo mode lets the camera come closer, pull further back and look from lower and higher
const PHOTO_VIEW = { minRadius: 4, maxRadius: 45, minPhi: 0.12, maxPhi: 1.5 };
const viewLimits = () => (useGameStore.getState().photoMode ? PHOTO_VIEW : NORMAL_VIEW);
// Phones (below md, like the thumbstick) keep the camera all the way back: no zooming in
const phoneScreen = () => typeof window !== 'undefined' && window.innerWidth < 768;

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
      if (phoneScreen() && !useGameStore.getState().photoMode) return;
      const { minRadius, maxRadius } = viewLimits();
      camControl.radius = THREE.MathUtils.clamp(
        camControl.radius + e.deltaY * 0.012,
        minRadius,
        maxRadius
      );
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    // iOS Safari ignores user-scalable=no in the viewport: a pinch would still zoom the whole page
    const onGesture = (e: Event) => e.preventDefault();

    dom.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('gesturestart', onGesture);
    document.addEventListener('gesturechange', onGesture);
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
      document.removeEventListener('gesturestart', onGesture);
      document.removeEventListener('gesturechange', onGesture);
      camControl.camera = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    const { playerPos, fishing, photoMode, currentWorld, ownedPlots } = useGameStore.getState();
    // Back from photo mode, the camera eases into its usual range (on phones, all the way back)
    if (!photoMode) {
      const { minRadius, maxRadius, minPhi, maxPhi } = NORMAL_VIEW;
      const wanted = phoneScreen() ? CAMERA_FAR : THREE.MathUtils.clamp(camControl.radius, minRadius, maxRadius);
      camControl.radius += (wanted - camControl.radius) * 0.1;
      camControl.phi += (THREE.MathUtils.clamp(camControl.phi, minPhi, maxPhi) - camControl.phi) * 0.1;
    }
    const { target, radius, phi, theta } = camControl;
    if (fishing) {
      // While fishing the view centres between the angler and the float so both stay in sight
      const spot = FISHING_SPOTS[fishing.spot];
      followPoint.set((spot.x + spot.bobber[0]) / 2, 0.6, (spot.z + spot.bobber[2]) / 2);
    }
    else {
      // The view centres halfway to the player, closer on big islands, zoomed in or on narrow
      // screens so they stay in sight
      const shape = islandShape(currentWorld, ownedPlots);
      const walkable = Math.max(shape.rx, shape.rz) - WALK_MARGIN;
      const lens = camera as THREE.PerspectiveCamera;
      const halfView = radius * Math.tan((lens.fov * Math.PI) / 360);
      const room = 0.8 * halfView * Math.min(lens.aspect, 1.4);
      const follow = Math.max(0.5, 1 - room / walkable);
      followPoint.set(playerPos.x * follow, 0.6, playerPos.z * follow);
    }
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
