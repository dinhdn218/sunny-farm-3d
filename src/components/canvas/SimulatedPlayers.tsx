'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { NpcPreset, npcPresetsFor } from '@/config/npcs';
import { WORLDS } from '@/config/worlds';
import { VISITOR_GREETINGS, VISITOR_PHRASES } from '@/config/visitors';
import { Visitor, visitorsFor } from '@/lib/visitors';
import { localDateKey } from '@/lib/dailyGift';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';
import { interactable } from '@/lib/interact';
import { hearts } from '@/lib/friendship';

// Within this distance of the player a visitor's name and words show; further off they just stroll by
const TAG_RANGE = 9;

const pickLine = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];

// Strolling round the middle of the zone, lingering here and there, with a line to say now and then.
// While `face()` returns a spot they stand still, turned towards it.
function useStroller(
  roam: number,
  firstLineIn: number,
  phrases: string[],
  face: () => { x: number; z: number } | null
) {
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
      chatTimer: firstLineIn,
      chatUntil: 0,
    };
  });
  const [chatText, setChatText] = useState('');

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.1);
    const now = performance.now();

    const dx = sim.targetX - sim.x;
    const dz = sim.targetZ - sim.z;
    const dist = Math.hypot(dx, dz);
    let y = 0.08;
    const spot = face();
    if (spot) {
      motion.moving = false;
      sim.rotY = Math.atan2(spot.x - sim.x, spot.z - sim.z);
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
      setChatText(pickLine(phrases));
    } else if (chatText && now > sim.chatUntil) {
      setChatText('');
    }

    group.position.set(sim.x, y, sim.z);
    group.rotation.y = sim.rotY;
  });

  // Say something now, for a few seconds
  const say = (text: string, ms = 3500) => {
    sim.chatUntil = performance.now() + ms;
    setChatText(text);
  };

  return { groupRef, motion, sim, chatText, say };
}

// A resident strolling about (the HTML version's simulated online players): click to talk and give gifts
function SimulatedResident({ preset, index, roam }: { preset: NpcPreset; index: number; roam: number }) {
  // While their card is open they stand still and face the player
  const { groupRef, motion, sim, chatText } = useStroller(roam, 3 + index * 3.5, preset.phrases, () => {
    const store = useGameStore.getState();
    return store.activeModal === 'resident' && store.activeResident === preset.id ? store.playerPos : null;
  });
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

  return (
    <group ref={groupRef} position={[sim.x, 0.08, sim.z]} {...handlers}>
      <AvatarMesh cosmetics={preset.cosmetics} motion={motion} />
      <PlayerTag name={preset.name} chatText={chatText} hearts={heartCount} />
    </group>
  );
}

// One of the visitors making the zone busy: a click and they stop, turn round and say hello
function SimulatedVisitor({
  visitor,
  phrases,
  index,
  roam,
}: {
  visitor: Visitor;
  phrases: string[];
  index: number;
  roam: number;
}) {
  const faceUntil = useRef(0);
  const { groupRef, motion, sim, chatText, say } = useStroller(roam, 5 + index * 2.1, phrases, () =>
    performance.now() < faceUntil.current ? useGameStore.getState().playerPos : null
  );
  const shadeRef = useRef<THREE.Mesh>(null);
  const [near, setNear] = useState(false);
  const handlers = interactable(
    `🧳 ${visitor.name}`,
    () => {
      faceUntil.current = performance.now() + 3500;
      say(pickLine(VISITOR_GREETINGS));
    },
    'Khách tham quan • Click để chào'
  );

  useFrame(() => {
    const { playerPos } = useGameStore.getState();
    // A little give either side so the tag doesn't flicker at the edge of the range
    const d = Math.hypot(playerPos.x - sim.x, playerPos.z - sim.z);
    if (near ? d > TAG_RANGE + 1 : d < TAG_RANGE) setNear(!near);
    // The shade stays on the ground while they bob along
    if (shadeRef.current && groupRef.current) shadeRef.current.position.y = 0.09 - groupRef.current.position.y;
  });

  return (
    <group ref={groupRef} position={[sim.x, 0.08, sim.z]} {...handlers}>
      <AvatarMesh cosmetics={visitor.cosmetics} motion={motion} castShadow={false} />
      <mesh ref={shadeRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {near && <PlayerTag name={visitor.name} chatText={chatText} />}
    </group>
  );
}

export function SimulatedPlayers() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const presets = useMemo(() => npcPresetsFor(currentWorld), [currentWorld]);
  // A new crowd each calendar day
  const today = localDateKey(new Date());
  const visitors = useMemo(() => visitorsFor(currentWorld, today), [currentWorld, today]);
  // How far they stroll: across the middle of the zone's island
  const roam = WORLDS[currentWorld].islandRadius * 0.55;

  return (
    <group>
      {presets.map((preset, i) => (
        <SimulatedResident key={`${currentWorld}-${i}`} preset={preset} index={i} roam={roam} />
      ))}
      {visitors.map((visitor, i) => (
        <SimulatedVisitor
          key={visitor.id}
          visitor={visitor}
          phrases={VISITOR_PHRASES[currentWorld]}
          index={i}
          roam={roam}
        />
      ))}
    </group>
  );
}
