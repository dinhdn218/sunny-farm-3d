'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { camControl, touchMove } from '@/lib/controls';
import { WALK_MARGIN, insideIsland, islandShape } from '@/lib/farmLayout';
import { ToolId } from '@/types/game';
import { levelInfo } from '@/lib/leveling';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';

const HOTBAR_KEYS: Record<string, ToolId> = {
  Digit1: 'hoe',
  Digit2: 'water',
  Digit3: 'basket',
  Digit4: 'seed_carrot',
  Digit5: 'seed_wheat',
  Digit6: 'seed_tomato',
  Digit7: 'seed_pumpkin',
  Digit8: 'bread',
  Digit9: 'feed',
};

const MODAL_KEYS = {
  KeyM: 'map',
  KeyQ: 'quests',
  KeyC: 'wardrobe',
  KeyB: 'shop',
  KeyR: 'ranch',
  KeyX: 'workshop',
} as const;

export function Player() {
  const groupRef = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const motion = useRef(createMotion()).current;
  const anim = useRef({ emoteTimer: 0, emote: '', spin: 0, lastAction: 0 });

  const playerName = useGameStore((s) => s.playerName);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const activeTool = useGameStore((s) => s.activeTool);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const localChatMsg = useGameStore((s) => s.localChatMsg);
  const localEmote = useGameStore((s) => s.localEmote);
  const fishing = useGameStore((s) => !!s.fishing);
  const level = useGameStore((s) => levelInfo(s.xp).level);
  const toolTier = useGameStore((s) =>
    s.activeTool === 'hoe' ? s.toolTiers.hoe : s.activeTool === 'water' ? s.toolTiers.water : 0
  );

  useEffect(() => {
    if (localEmote) {
      anim.current.emoteTimer = 2.6;
      anim.current.emote = localEmote;
    }
  }, [localEmote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const focused = document.activeElement?.tagName;
      if (focused === 'INPUT' || focused === 'TEXTAREA') return;

      keys.current[e.code] = true;
      const store = useGameStore.getState();
      // The save-conflict dialog must be answered before anything else opens
      if (store.activeModal === 'cloudConflict') return;
      // While fishing, Space belongs to the fishing overlay and Esc reels the line in
      if (store.fishing) {
        if (e.code === 'Escape') store.endFishing();
        return;
      }

      if (store.placingSprinkler && e.code === 'Escape') {
        store.cancelPlacingSprinkler();
        return;
      }

      // While a decoration is being placed, R rotates it and Esc cancels
      if (store.placingDecor && (e.code === 'KeyR' || e.code === 'Escape')) {
        if (e.code === 'KeyR') store.rotatePlacingDecor();
        else store.cancelPlacingDecor();
        return;
      }

      const tool = HOTBAR_KEYS[e.code];
      if (tool) {
        store.setActiveTool(tool);
      } else if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        store.interactFront();
      } else if (e.code in MODAL_KEYS) {
        const modal = MODAL_KEYS[e.code as keyof typeof MODAL_KEYS];
        store.setActiveModal(store.activeModal === modal ? null : modal);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const dt = Math.min(delta, 0.1);
    const { playerPos: pos, currentWorld, ownedPlots, fishing } = useGameStore.getState();
    const k = keys.current;

    // The player stays put on the jetty while the line is out
    let moveX = fishing ? 0 : touchMove.x;
    let moveZ = fishing ? 0 : touchMove.z;
    if (!fishing) {
      if (k.KeyW || k.ArrowUp) moveZ -= 1;
      if (k.KeyS || k.ArrowDown) moveZ += 1;
      if (k.KeyA || k.ArrowLeft) moveX -= 1;
      if (k.KeyD || k.ArrowRight) moveX += 1;
    }

    let y = 0.08;
    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      moveX /= len;
      moveZ /= len;

      // Movement is relative to the orbit camera's heading
      const sinT = Math.sin(camControl.theta);
      const cosT = Math.cos(camControl.theta);
      const worldX = moveX * cosT + moveZ * sinT;
      const worldZ = -moveX * sinT + moveZ * cosT;

      const nextX = pos.x + worldX * 6.0 * dt;
      const nextZ = pos.z + worldZ * 6.0 * dt;
      // Stay on the island (which grows when farm land is bought)
      if (insideIsland(nextX, nextZ, islandShape(currentWorld, ownedPlots), WALK_MARGIN)) {
        pos.x = nextX;
        pos.z = nextZ;
      }
      pos.rotY = Math.atan2(worldX, worldZ);
      anim.current.spin = 0;

      motion.moving = true;
      motion.walkTime += dt * 12;
      y = 0.08 + Math.abs(Math.sin(motion.walkTime)) * 0.08;
    } else {
      motion.moving = false;
      if (anim.current.emoteTimer > 0) {
        anim.current.emoteTimer -= dt;
        y = 0.08 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.32;
        if (anim.current.emote === '💃') anim.current.spin += dt * 6.5;
      }
    }

    // Swing the tool whenever a store action stamps a new actionTime
    if (pos.actionTime !== anim.current.lastAction) {
      anim.current.lastAction = pos.actionTime;
      motion.swing = 0.0001;
    }
    if (motion.swing > 0) {
      motion.swing += dt * 7.5;
      if (motion.swing >= Math.PI) motion.swing = 0;
    }

    group.position.set(pos.x, y, pos.z);
    group.rotation.y = pos.rotY + anim.current.spin;
  });

  const { playerPos } = useGameStore.getState();

  return (
    <group ref={groupRef} position={[playerPos.x, 0.08, playerPos.z]}>
      <AvatarMesh
        cosmetics={cosmetics}
        motion={motion}
        tool={fishing ? 'rod' : currentWorld === 'farm' ? activeTool : null}
        toolTier={toolTier}
      />
      <PlayerTag name={playerName} chatText={localChatMsg} isSelf level={level} />
    </group>
  );
}
