export interface ParticleBurst {
  x: number;
  y: number;
  z: number;
  color: number;
  count: number;
}

// Bursts queued by game actions and consumed by <Particles /> on the next frame
export const particleQueue: ParticleBurst[] = [];

export function spawnParticles(
  x: number,
  y: number,
  z: number,
  color: number,
  count = 12
) {
  particleQueue.push({ x, y, z, color, count });
}
