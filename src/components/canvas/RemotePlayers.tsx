'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { RemotePlayer } from '@/types/game';
import { AvatarMesh } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';

function RemotePlayerActor({ data }: { data: RemotePlayer }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.x += (data.x - group.position.x) * 0.15;
    group.position.z += (data.z - group.position.z) * 0.15;
    group.rotation.y = data.rotY;
  });

  return (
    <group ref={groupRef} position={[data.x, 0.08, data.z]}>
      <AvatarMesh cosmetics={data.cosmetics} />
      <PlayerTag name={data.name} chatText={data.chatMsg} level={data.level} />
    </group>
  );
}

export function RemotePlayers() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const remotePlayers = useGameStore((s) => s.remotePlayers);

  const visiblePlayers = Object.values(remotePlayers).filter(
    (p) => p.world === currentWorld
  );

  return (
    <group>
      {visiblePlayers.map((player) => (
        <RemotePlayerActor key={player.uid} data={player} />
      ))}
    </group>
  );
}
