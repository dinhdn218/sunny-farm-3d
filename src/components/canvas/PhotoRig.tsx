'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '@/store/useGameStore';
import { photoCamera } from '@/lib/photo';

// Photo mode: clicks stop reaching the world (left-drag orbits instead), and the
// current view can be copied out as a picture
export function PhotoRig() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setEvents = useThree((s) => s.setEvents);
  const photoMode = useGameStore((s) => s.photoMode);

  useEffect(() => {
    setEvents({ enabled: !photoMode });
  }, [photoMode, setEvents]);

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
