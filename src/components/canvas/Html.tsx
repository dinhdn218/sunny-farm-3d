'use client';

import { ComponentPropsWithoutRef } from 'react';
import { Html as DreiHtml } from '@react-three/drei';
import * as THREE from 'three';

const anchor = new THREE.Vector3();

// Where drei puts the label (the anchor projected to the screen), rounded to whole pixels. drei's own position keeps
// the fraction, and every sub-pixel move makes Chrome raster the label again for the new offset: with the name tags of
// a walking crowd that was enough to drop a third of the frames. Snapped, a moving label is just slid across.
function snappedPosition(el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) {
  anchor.setFromMatrixPosition(el.matrixWorld).project(camera);
  return [Math.round((anchor.x + 1) * (size.width / 2)), Math.round((1 - anchor.y) * (size.height / 2))];
}

// drei's <Html> pinned to whole pixels: use it for every label floating over the 3D view
export function Html(props: ComponentPropsWithoutRef<typeof DreiHtml>) {
  return <DreiHtml calculatePosition={snappedPosition} {...props} />;
}
