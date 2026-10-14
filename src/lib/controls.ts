import * as THREE from 'three';

// Orbit camera state (same numbers as the HTML version), shared by the camera rig,
// the player's camera-relative movement and floating-label projection
export const camControl = {
  target: new THREE.Vector3(0, 0, 0),
  theta: 0.35,
  phi: 0.86,
  radius: 17.5,
  camera: null as THREE.Camera | null,
};

// Mobile D-pad direction, read by the player every frame
export const touchMove = { x: 0, z: 0 };

const projected = new THREE.Vector3();

export function projectToScreen(x: number, y: number, z: number) {
  if (!camControl.camera || typeof window === 'undefined') return null;
  projected.set(x, y, z).project(camControl.camera);
  return {
    x: (projected.x * 0.5 + 0.5) * window.innerWidth,
    y: (-(projected.y * 0.5) + 0.5) * window.innerHeight,
  };
}
