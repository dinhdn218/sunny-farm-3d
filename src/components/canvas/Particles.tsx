'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { particleQueue } from '@/lib/effects';

const MAX_PARTICLES = 400;

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: number;
}

// Little cubes that pop out on farming actions, teleports and rewards (the HTML version's spawnParticles)
export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    if (meshRef.current) meshRef.current.count = 0;
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(delta, 0.1);

    while (particleQueue.length > 0) {
      const burst = particleQueue.shift()!;
      for (let i = 0; i < burst.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 2.2;
        particles.current.push({
          x: burst.x,
          y: burst.y + 0.2,
          z: burst.z,
          vx: Math.cos(angle) * speed,
          vy: 2.3 + Math.random() * 2.2,
          vz: Math.sin(angle) * speed,
          life: 0.65,
          color: burst.color,
        });
      }
    }

    const alive = particles.current.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      return true;
    });
    particles.current = alive.slice(-MAX_PARTICLES);

    particles.current.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.setHex(p.color));
    });
    mesh.count = particles.current.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_PARTICLES]}
      frustumCulled={false}
    >
      <boxGeometry args={[0.11, 0.11, 0.11]} />
      <meshLambertMaterial />
      <instancedBufferAttribute
        attach="instanceColor"
        args={[new Float32Array(MAX_PARTICLES * 3), 3]}
      />
    </instancedMesh>
  );
}
