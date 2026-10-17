'use client';

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { RemotePlayer } from '@/types/game';
import { livePeers } from '@/lib/multiplayer';
import { MAX_EXTRAPOLATE_S, MOVING_SPEED, predict } from '@/lib/netSync';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';

// Another player in this zone. Where they are comes from lib/multiplayer's livePeers, not from React: drawn where
// their last message puts them now (their walk carried on), eased there so a correction never jumps, facing where
// they walk, legs swinging. React re-renders this only when their look changes.
const RemotePlayerActor = memo(function RemotePlayerActor({ data }: { data: RemotePlayer }) {
  const groupRef = useRef<THREE.Group>(null);
  const motion = useRef(createMotion()).current;
  const placed = useRef(false);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const peer = livePeers.get(data.uid);
    if (!group || !peer) return;
    const dt = Math.min(delta, 0.1);
    const age = performance.now() - peer.at;
    const target = predict(peer, age);
    const walking = Math.hypot(peer.vx, peer.vz) > MOVING_SPEED && age < MAX_EXTRAPOLATE_S * 1000;
    const facing = walking ? Math.atan2(peer.vx, peer.vz) : peer.r;
    if (!placed.current) {
      placed.current = true;
      group.position.set(target.x, 0.08, target.z);
      group.rotation.y = facing;
    }
    const ease = 1 - Math.exp(-dt * 12);
    group.position.x += (target.x - group.position.x) * ease;
    group.position.z += (target.z - group.position.z) * ease;
    // Turn the short way round
    const turn = facing - group.rotation.y;
    group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * ease;
    motion.moving = walking;
    if (walking) motion.walkTime += dt * 12;
    group.position.y = walking ? 0.08 + Math.abs(Math.sin(motion.walkTime)) * 0.08 : 0.08;
  });

  return (
    <group ref={groupRef}>
      <AvatarMesh cosmetics={data.cosmetics} motion={motion} />
      <PlayerTag name={data.name} chatText={data.chatMsg} level={data.level} />
    </group>
  );
});

// The other players in this zone (lib/multiplayer keeps only them: nobody shows on the player's own farm)
export function RemotePlayers() {
  const remotePlayers = useGameStore((s) => s.remotePlayers);

  return (
    <group>
      {Object.values(remotePlayers).map((player) => (
        <RemotePlayerActor key={player.uid} data={player} />
      ))}
    </group>
  );
}
