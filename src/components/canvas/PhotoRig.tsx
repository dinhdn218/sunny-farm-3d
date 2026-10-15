'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { photoCamera } from '@/lib/photo';

// Lets photo mode copy the current view out as a picture
export function PhotoRig() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    photoCamera.snap = () => {
      // Draw a fresh frame and copy it before the browser clears the drawing buffer
      gl.render(scene, camera);
      const shot = document.createElement('canvas');
      shot.width = gl.domElement.width;
      shot.height = gl.domElement.height;
      shot.getContext('2d')?.drawImage(gl.domElement, 0, 0);
      return shot;
    };
    return () => {
      photoCamera.snap = null;
    };
  }, [gl, scene, camera]);

  return null;
}
