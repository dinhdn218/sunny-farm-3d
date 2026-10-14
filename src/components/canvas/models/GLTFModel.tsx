'use client';

import React, { Suspense, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface GLTFSceneProps {
  url: string;
  animationName?: string;
  scale?: number | [number, number, number];
  position?: [number, number, number];
}

function LoadedGLTFScene({
  url,
  animationName,
  scale = 1,
  position = [0, 0, 0],
}: GLTFSceneProps) {
  const { scene, animations } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  const { actions, names } = useAnimations(animations, clonedScene);

  useEffect(() => {
    if (!names || names.length === 0) return;
    const targetClip =
      animationName && actions[animationName] ? animationName : names[0];
    const action = actions[targetClip];
    if (action) {
      action.reset().fadeIn(0.2).play();
    }
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names, animationName]);

  return <primitive object={clonedScene} scale={scale} position={position} />;
}

class GLTFErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function SafeGLTFModel({
  url,
  animationName,
  scale = 1,
  position = [0, 0, 0],
  fallback,
}: GLTFSceneProps & { fallback: React.ReactNode }) {
  return (
    <GLTFErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedGLTFScene
          url={url}
          animationName={animationName}
          scale={scale}
          position={position}
        />
      </Suspense>
    </GLTFErrorBoundary>
  );
}

useGLTF.preload('/models/character.glb');
useGLTF.preload('/models/chicken.glb');
useGLTF.preload('/models/sheep.glb');
useGLTF.preload('/models/cow.glb');
