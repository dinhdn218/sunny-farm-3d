'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { NpcPreset, npcPresetsFor } from '@/config/npcs';
import { WORLDS } from '@/config/worlds';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';
import { interactable } from '@/lib/interact';
import { hearts } from '@/lib/friendship';

// Wandering resident with periodic speech bubbles (the HTML version's simulated online players)
function SimulatedResident({ preset, index, roam }: { preset: NpcPreset; index: number; roam: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const motion = useRef(createMotion(0.5)).current;
  const [sim] = useState(() => {
    const x = (Math.random() - 0.5) * roam;
    const z = (Math.random() - 0.5) * roam * 0.8;
    return {
      x,
      z,
      targetX: x,
      targetZ: z,
      rotY: 0,
      waitTimer: 1 + Math.random() * 3,
      chatTimer: 3 + index * 3.5,
      chatUntil: 0,
    };
  });
  const [chatText, setChatText] = useState('');
  const heartCount = useGameStore((s) => hearts(s.friendship[preset.id] ?? 0));
  // A click walks over to them (they may be strolling) and opens their card
  const handlers = interactable(
    preset.name,
    () =>
      useGameStore.getState().walkTo({
        x: sim.x,
        z: sim.z,
        reach: 1.4,
        track: () => ({ x: sim.x, z: sim.z }),
        act: () => useGameStore.getState().openResident(preset.id),
      }),
    'Click để trò chuyện và tặng quà'
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.1);
    const now = performance.now();

    const dx = sim.targetX - sim.x;
    const dz = sim.targetZ - sim.z;
    const dist = Math.hypot(dx, dz);
    let y = 0.08;
    // While their card is open they stand still and face the player
    const store = useGameStore.getState();
    if (store.activeModal === 'resident' && store.activeResident === preset.id) {
      motion.moving = false;
      sim.rotY = Math.atan2(store.playerPos.x - sim.x, store.playerPos.z - sim.z);
    } else if (dist > 0.2) {
      sim.x += (dx / dist) * 2.4 * dt;
      sim.z += (dz / dist) * 2.4 * dt;
      sim.rotY = Math.atan2(dx, dz);
      motion.moving = true;
      motion.walkTime += dt * 9;
      y = 0.08 + Math.abs(Math.sin(motion.walkTime)) * 0.06;
    } else {
      motion.moving = false;
      sim.waitTimer -= dt;
      if (sim.waitTimer <= 0) {
        sim.waitTimer = 2.5 + Math.random() * 4;
        sim.targetX = (Math.random() - 0.5) * roam * 1.2;
        sim.targetZ = (Math.random() - 0.5) * roam;
      }
    }

    sim.chatTimer -= dt;
    if (sim.chatTimer <= 0) {
      sim.chatTimer = 9 + Math.random() * 10;
      sim.chatUntil = now + 4200;
      setChatText(
        preset.phrases[Math.floor(Math.random() * preset.phrases.length)]
      );
    } else if (chatText && now > sim.chatUntil) {
      setChatText('');
    }

    group.position.set(sim.x, y, sim.z);
    group.rotation.y = sim.rotY;
  });

  return (
    <group ref={groupRef} position={[sim.x, 0.08, sim.z]} {...handlers}>
      <AvatarMesh cosmetics={preset.cosmetics} motion={motion} />
      <PlayerTag name={preset.name} chatText={chatText} hearts={heartCount} />
    </group>
  );
}

export function SimulatedPlayers() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const presets = useMemo(() => npcPresetsFor(currentWorld), [currentWorld]);
  // How far they stroll: across the middle of the zone's island
  const roam = WORLDS[currentWorld].islandRadius * 0.55;

  return (
    <group>
      {presets.map((preset, i) => (
        <SimulatedResident
          key={`${currentWorld}-${i}`}
          preset={preset}
          index={i}
          roam={roam}
        />
      ))}
    </group>
  );
}
