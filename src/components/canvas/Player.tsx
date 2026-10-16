'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { useCasinoStore } from '@/store/useCasinoStore';
import { camControl, touchMove } from '@/lib/controls';
import { WALK_MARGIN, insideIsland, islandShape } from '@/lib/farmLayout';
import { WALK_SPEED, walkStep } from '@/lib/walk';
import { walkSpeedScale } from '@/lib/food';
import { ToolId } from '@/types/game';
import { levelInfo } from '@/lib/leveling';
import { nextSeedTool } from '@/lib/tools';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { PlayerTag } from './PlayerTag';

// 4 is the seed slot: it takes out the last seeds, then moves on to the next crop's
const HOTBAR_KEYS: Record<string, ToolId | 'seeds'> = {
  Digit1: 'hoe',
  Digit2: 'water',
  Digit3: 'basket',
  Digit4: 'seeds',
  Digit5: 'bread',
  Digit6: 'feed',
  Digit7: 'fertilizer',
};

const MODAL_KEYS = {
  KeyM: 'map',
  KeyQ: 'quests',
  KeyC: 'wardrobe',
  KeyB: 'shop',
  KeyR: 'ranch',
  KeyX: 'workshop',
  KeyO: 'orders',
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

      // The card table window has the keyboard while it is open
      if (useCasinoStore.getState().open) return;
      keys.current[e.code] = true;
      const store = useGameStore.getState();
      // The save-conflict dialog must be answered before anything else opens
      if (store.activeModal === 'cloudConflict') return;
      // While fishing, Space belongs to the fishing overlay and Esc reels the line in
      if (store.fishing) {
        if (e.code === 'Escape') store.endFishing();
        return;
      }
      // The net game has Space; Esc puts the net away
      if (store.bugCatch) {
        if (e.code === 'Escape') store.endBugCatch();
        return;
      }

      // P switches photo mode; while it is on only walking works (the overlay takes the pictures)
      if (e.code === 'KeyP' || (store.photoMode && e.code === 'Escape')) {
        store.togglePhotoMode();
        return;
      }
      if (store.photoMode) return;

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

      // Building: R turns the piece and Esc finishes; walking still works
      if (store.buildMode) {
        if (e.code === 'KeyR') store.rotateBuildPiece();
        else if (e.code === 'Escape') store.stopBuilding();
        return;
      }

      const tool = HOTBAR_KEYS[e.code];
      if (tool) {
        store.setActiveTool(tool === 'seeds' ? nextSeedTool(store.activeTool, store.lastSeedCrop) : tool);
      } else if ((e.code === 'Space' || e.code === 'KeyE') && !store.activeModal) {
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
    const store = useGameStore.getState();
    const { playerPos: pos, currentWorld, ownedPlots, fishing } = store;
    const k = keys.current;
    // A drink today puts a spring in the step
    const speed = WALK_SPEED * walkSpeedScale(store.buff, store.day);

    // The player stays put on the jetty while the line is out, and in their chair at a card table
    const seated = !!useCasinoStore.getState().open;
    const still = !!fishing || seated || !!store.bugCatch;
    let moveX = still ? 0 : touchMove.x;
    let moveZ = still ? 0 : touchMove.z;
    if (!still) {
      if (k.KeyW || k.ArrowUp) moveZ -= 1;
      if (k.KeyS || k.ArrowDown) moveZ += 1;
      if (k.KeyA || k.ArrowLeft) moveX -= 1;
      if (k.KeyD || k.ArrowRight) moveX += 1;
    }

    let goal = store.walkGoal;
    let nextX = pos.x;
    let nextZ = pos.z;
    let arrived = false;
    if (moveX !== 0 || moveZ !== 0) {
      // Taking the controls calls off the walk to whatever was clicked
      if (goal) {
        store.cancelWalk();
        goal = null;
      }
      // Keys walk at full speed; the thumbstick walks slower the less it is pushed
      const len = Math.hypot(moveX, moveZ);
      const throttle = Math.min(1, len);
      moveX = (moveX / len) * throttle;
      moveZ = (moveZ / len) * throttle;

      // Movement is relative to the orbit camera's heading
      const sinT = Math.sin(camControl.theta);
      const cosT = Math.cos(camControl.theta);
      nextX = pos.x + (moveX * cosT + moveZ * sinT) * speed * dt;
      nextZ = pos.z + (-moveX * sinT + moveZ * cosT) * speed * dt;
    } else if (goal && !still) {
      // Something that wanders about (an animal) is followed
      const at = goal.track?.();
      if (at) {
        goal.x = at.x;
        goal.z = at.z;
      }
      ({ x: nextX, z: nextZ, arrived } = walkStep(pos.x, pos.z, goal, speed * dt));
    }

    let y = 0.08;
    const stepX = nextX - pos.x;
    const stepZ = nextZ - pos.z;
    if (stepX !== 0 || stepZ !== 0) {
      // Stay on the island (which grows when farm land is bought)
      if (insideIsland(nextX, nextZ, islandShape(currentWorld, ownedPlots), WALK_MARGIN)) {
        pos.x = nextX;
        pos.z = nextZ;
      } else if (goal) {
        // The shore is as close as the player can get
        arrived = true;
      }
      pos.rotY = Math.atan2(stepX, stepZ);
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
    if (arrived) store.reachGoal();

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
