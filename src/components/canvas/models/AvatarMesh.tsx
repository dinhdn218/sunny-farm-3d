"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CropId, PlayerCosmetics, ToolId } from "@/types/game";
import { CROPS } from "@/config/crops";
import { useGameStore } from "@/store/useGameStore";
import { SafeGLTFModel } from "./GLTFModel";

// Per-frame animation input, mutated by whoever drives the avatar (player, resident or remote peer)
export interface AvatarMotion {
  moving: boolean;
  walkTime: number;
  legSwing: number;
  // Tool swing progress in radians, 0 when idle
  swing: number;
}

export const createMotion = (legSwing = 0.6): AvatarMotion => ({
  moving: false,
  walkTime: 0,
  legSwing,
  swing: 0,
});

type Vec3 = [number, number, number];
const ZERO: Vec3 = [0, 0, 0];
const SKIN = "#fde68a";
const WING_IDS = ["angel_wings", "fairy_wings", "demon_wings", "phoenix_wings"];
const PET_IDS = ["shiba_inu", "robo_cat", "bat_pet", "bunny_pet", "sea_turtle", "panda", "reindeer_pet"];

// Box piece of the rig; `glow` pieces ignore lighting so neon and visor bits read as lights
function Part({
  size,
  at,
  color,
  rot = ZERO,
  glow = false,
}: {
  size: Vec3;
  at: Vec3;
  color: string;
  rot?: Vec3;
  glow?: boolean;
}) {
  return (
    <mesh position={at} rotation={rot}>
      <boxGeometry args={size} />
      {glow ? (
        <meshBasicMaterial color={color} />
      ) : (
        <meshLambertMaterial color={color} />
      )}
    </mesh>
  );
}

// Base colours of torso, arms and legs; the detail pieces below give every outfit its own silhouette
const OUTFIT_BASE: Record<
  string,
  { torso: string; arms: string; legs: string }
> = {
  farmer_blue: { torso: "#ef4444", arms: "#ef4444", legs: "#1d4ed8" },
  casual_hoodie: { torso: "#10b981", arms: "#10b981", legs: "#1e293b" },
  beach_vibe: { torso: "#f97316", arms: SKIN, legs: SKIN },
  sakura_pink: { torso: "#f472b6", arms: SKIN, legs: "#fdf2f8" },
  royal_gold: { torso: "#7c3aed", arms: "#7c3aed", legs: "#312e81" },
  cyber_neon: { torso: "#0f172a", arms: "#1e293b", legs: "#0f172a" },
  vampire_cape: { torso: "#111827", arms: "#111827", legs: "#1f2937" },
  santa_suit: { torso: "#dc2626", arms: "#dc2626", legs: "#dc2626" },
  pajamas: { torso: "#93c5fd", arms: "#93c5fd", legs: "#93c5fd" },
  football_kit: { torso: "#dc2626", arms: SKIN, legs: SKIN },
  ao_dai: { torso: "#dc2626", arms: "#dc2626", legs: "#f8fafc" },
  ninja_suit: { torso: "#1e1b4b", arms: "#1e1b4b", legs: "#1e1b4b" },
  astronaut: { torso: "#f1f5f9", arms: "#f1f5f9", legs: "#f1f5f9" },
};

const BEACH_FLOWERS: [number, number, number, string][] = [
  [-0.15, 0.95, 0.185, "#facc15"],
  [0.12, 0.84, 0.185, "#ffffff"],
  [-0.05, 0.66, 0.185, "#ec4899"],
  [0.17, 0.58, 0.185, "#facc15"],
  [-0.19, 0.58, 0.185, "#ffffff"],
  [0.1, 0.92, -0.185, "#ec4899"],
  [-0.12, 0.7, -0.185, "#facc15"],
];

// Little stars printed on the pyjamas (front and back)
const PAJAMA_STARS: Vec3[] = [
  [0.16, 0.95, 0.19],
  [0.15, 0.62, 0.19],
  [-0.15, 0.6, 0.19],
  [0.12, 0.86, -0.19],
  [-0.12, 0.7, -0.19],
  [0.02, 0.98, -0.19],
];

// Gold flowers embroidered on the áo dài: on the bodice, then on the front panel
const AO_DAI_FLOWERS: Vec3[] = [
  [-0.12, 0.92, 0.195],
  [0.14, 0.78, 0.195],
  [-0.06, 0.64, 0.195],
  [0.1, 0.52, 0.195],
  [0.09, 0.32, 0.215],
  [-0.09, 0.18, 0.215],
];

const ASTRONAUT_BUTTONS = [
  { color: "#ef4444", x: -0.04 },
  { color: "#22c55e", x: 0.04 },
  { color: "#3b82f6", x: 0.12 },
];

// Five-pointed star, flat in the XY plane
function createStarGeometry(outer: number, inner: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

// The yellow star on the football shirt, shared by every avatar wearing it
const SHIRT_STAR = createStarGeometry(0.11, 0.045);

// Torso, neck and face pieces of each outfit (avatar space)
function OutfitBody({ id }: { id: string }) {
  switch (id) {
    case "casual_hoodie":
      return (
        <group>
          <Part
            size={[0.5, 0.42, 0.14]}
            at={[0, 1.22, -0.27]}
            color="#059669"
          />
          <Part size={[0.52, 0.08, 0.42]} at={[0, 1.08, 0]} color="#059669" />
          <Part size={[0.34, 0.16, 0.03]} at={[0, 0.6, 0.19]} color="#059669" />
          <Part
            size={[0.025, 0.16, 0.02]}
            at={[-0.07, 0.96, 0.195]}
            color="#f8fafc"
          />
          <Part
            size={[0.025, 0.16, 0.02]}
            at={[0.07, 0.96, 0.195]}
            color="#f8fafc"
          />
          <Part
            size={[0.12, 0.1, 0.02]}
            at={[0.12, 0.78, 0.195]}
            color="#fde047"
          />
        </group>
      );
    case "beach_vibe":
      return (
        <group>
          {BEACH_FLOWERS.map(([x, y, z, color]) => (
            <Part
              key={`${x}${y}${z}`}
              size={[0.07, 0.07, 0.02]}
              at={[x, y, z]}
              color={color}
            />
          ))}
          <Part
            size={[0.12, 0.12, 0.02]}
            at={[0, 1.0, 0.185]}
            rot={[0, 0, Math.PI / 4]}
            color={SKIN}
          />
          <Part size={[0.6, 0.12, 0.38]} at={[0, 0.47, 0]} color="#0ea5e9" />
          <Part
            size={[0.15, 0.08, 0.03]}
            at={[-0.11, 1.34, 0.245]}
            color="#0f172a"
          />
          <Part
            size={[0.15, 0.08, 0.03]}
            at={[0.11, 1.34, 0.245]}
            color="#0f172a"
          />
          <Part
            size={[0.08, 0.02, 0.02]}
            at={[0, 1.36, 0.245]}
            color="#0f172a"
          />
        </group>
      );
    case "sakura_pink":
      return (
        <group>
          <mesh castShadow position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 0.34, 16]} />
            <meshLambertMaterial color="#fbcfe8" />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.51, 0.51, 0.04, 16]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
          <Part size={[0.3, 0.05, 0.02]} at={[0, 1.02, 0.19]} color="#ffffff" />
          <Part size={[0.08, 0.08, 0.04]} at={[0, 0.95, 0.2]} color="#db2777" />
          <Part
            size={[0.12, 0.1, 0.03]}
            at={[-0.09, 0.95, 0.2]}
            rot={[0, 0, 0.35]}
            color="#db2777"
          />
          <Part
            size={[0.12, 0.1, 0.03]}
            at={[0.09, 0.95, 0.2]}
            rot={[0, 0, -0.35]}
            color="#db2777"
          />
        </group>
      );
    case "royal_gold":
      return (
        <group>
          <Part
            size={[0.05, 0.62, 0.02]}
            at={[0, 0.74, 0.19]}
            color="#facc15"
          />
          <Part size={[0.6, 0.05, 0.38]} at={[0, 0.45, 0]} color="#facc15" />
          {[0.95, 0.8, 0.65].map((y) => (
            <Part
              key={y}
              size={[0.05, 0.05, 0.02]}
              at={[0.08, y, 0.2]}
              color="#fde047"
            />
          ))}
          <Part
            size={[0.08, 0.78, 0.02]}
            at={[-0.02, 0.76, 0.215]}
            rot={[0, 0, 0.6]}
            color="#dc2626"
          />
          <Part size={[0.13, 0.12, 0.03]} at={[0, 1.0, 0.2]} color="#f8fafc" />
          <Part
            size={[0.62, 0.78, 0.04]}
            at={[0, 0.66, -0.23]}
            rot={[0.1, 0, 0]}
            color="#b91c1c"
          />
          <Part size={[0.64, 0.1, 0.08]} at={[0, 1.05, -0.2]} color="#facc15" />
        </group>
      );
    case "cyber_neon":
      return (
        <group>
          <Part size={[0.5, 0.36, 0.03]} at={[0, 0.84, 0.19]} color="#1e293b" />
          <Part
            size={[0.03, 0.3, 0.02]}
            at={[-0.09, 0.82, 0.21]}
            rot={[0, 0, 0.45]}
            color="#22d3ee"
            glow
          />
          <Part
            size={[0.03, 0.3, 0.02]}
            at={[0.09, 0.82, 0.21]}
            rot={[0, 0, -0.45]}
            color="#22d3ee"
            glow
          />
          <mesh position={[0, 0.74, 0.225]}>
            <octahedronGeometry args={[0.06, 0]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
          <Part
            size={[0.6, 0.04, 0.38]}
            at={[0, 0.5, 0]}
            color="#22d3ee"
            glow
          />
          <Part size={[0.36, 0.3, 0.1]} at={[0, 0.82, -0.22]} color="#334155" />
          <Part
            size={[0.2, 0.03, 0.02]}
            at={[0, 0.86, -0.275]}
            color="#22d3ee"
            glow
          />
          <Part
            size={[0.44, 0.09, 0.03]}
            at={[0, 1.34, 0.245]}
            color="#22d3ee"
            glow
          />
          <Part
            size={[0.03, 0.12, 0.2]}
            at={[-0.235, 1.34, 0.12]}
            color="#334155"
          />
          <Part
            size={[0.03, 0.12, 0.2]}
            at={[0.235, 1.34, 0.12]}
            color="#334155"
          />
        </group>
      );
    case "vampire_cape":
      return (
        <group>
          {/* White shirt front with a red bow tie */}
          <Part size={[0.22, 0.5, 0.02]} at={[0, 0.78, 0.19]} color="#f8fafc" />
          <Part
            size={[0.1, 0.07, 0.03]}
            at={[-0.05, 1.0, 0.205]}
            rot={[0, 0, 0.5]}
            color="#dc2626"
          />
          <Part
            size={[0.1, 0.07, 0.03]}
            at={[0.05, 1.0, 0.205]}
            rot={[0, 0, -0.5]}
            color="#dc2626"
          />
          {/* High collar standing up behind the head, red inside */}
          <Part
            size={[0.62, 0.36, 0.04]}
            at={[0, 1.18, -0.21]}
            rot={[-0.35, 0, 0]}
            color="#111827"
          />
          <Part
            size={[0.56, 0.32, 0.02]}
            at={[0, 1.18, -0.185]}
            rot={[-0.35, 0, 0]}
            color="#b91c1c"
          />
          {/* Long cape down the back, red lining towards the body */}
          <Part
            size={[0.7, 0.95, 0.04]}
            at={[0, 0.55, -0.25]}
            rot={[0.12, 0, 0]}
            color="#111827"
          />
          <Part
            size={[0.64, 0.9, 0.02]}
            at={[0, 0.56, -0.225]}
            rot={[0.12, 0, 0]}
            color="#991b1b"
          />
        </group>
      );
    case "pajamas":
      return (
        <group>
          {/* Button placket, a chest pocket and sleepy stars */}
          <Part size={[0.06, 0.56, 0.02]} at={[0, 0.74, 0.19]} color="#dbeafe" />
          {[0.94, 0.78, 0.62].map((y) => (
            <Part
              key={y}
              size={[0.05, 0.05, 0.02]}
              at={[0, y, 0.205]}
              color="#ffffff"
            />
          ))}
          <Part
            size={[0.14, 0.12, 0.02]}
            at={[-0.16, 0.86, 0.195]}
            color="#bfdbfe"
          />
          {PAJAMA_STARS.map(([x, y, z]) => (
            <Part
              key={`${x}${y}${z}`}
              size={[0.05, 0.05, 0.02]}
              at={[x, y, z]}
              rot={[0, 0, Math.PI / 4]}
              color="#fde047"
            />
          ))}
          <Part size={[0.6, 0.06, 0.38]} at={[0, 0.46, 0]} color="#60a5fa" />
        </group>
      );
    case "football_kit":
      return (
        <group>
          {/* Yellow star on the chest, white collar, number 10 on the back */}
          <mesh geometry={SHIRT_STAR} position={[0, 0.84, 0.182]}>
            <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
          </mesh>
          <Part size={[0.26, 0.05, 0.02]} at={[0, 1.02, 0.19]} color="#ffffff" />
          <Part
            size={[0.04, 0.22, 0.02]}
            at={[-0.09, 0.8, -0.19]}
            color="#ffffff"
          />
          {[0.01, 0.13].map((x) => (
            <Part
              key={x}
              size={[0.035, 0.22, 0.02]}
              at={[x, 0.8, -0.19]}
              color="#ffffff"
            />
          ))}
          {[0.9, 0.7].map((y) => (
            <Part
              key={y}
              size={[0.14, 0.035, 0.02]}
              at={[0.07, y, -0.19]}
              color="#ffffff"
            />
          ))}
        </group>
      );
    case "ao_dai":
      return (
        <group>
          {/* Mandarin collar with gold trim and the diagonal opening */}
          <Part size={[0.26, 0.08, 0.26]} at={[0, 1.08, 0]} color="#b91c1c" />
          <Part size={[0.27, 0.02, 0.27]} at={[0, 1.12, 0]} color="#facc15" />
          <Part
            size={[0.03, 0.22, 0.02]}
            at={[0.1, 0.96, 0.19]}
            rot={[0, 0, 0.55]}
            color="#facc15"
          />
          {AO_DAI_FLOWERS.map(([x, y, z]) => (
            <mesh key={`${x}${y}`} position={[x, y, z]}>
              <octahedronGeometry args={[0.035, 0]} />
              <meshLambertMaterial color="#fde047" />
            </mesh>
          ))}
          {/* The long front and back panels (tà áo) down past the knees */}
          {[0.2, -0.2].map((z) => (
            <group key={z}>
              <Part size={[0.4, 0.42, 0.02]} at={[0, 0.24, z]} color="#dc2626" />
              <Part
                size={[0.4, 0.05, 0.025]}
                at={[0, 0.05, z]}
                color="#facc15"
              />
            </group>
          ))}
        </group>
      );
    case "ninja_suit":
      return (
        <group>
          {/* Mask over nose and mouth, red forehead band with tails */}
          <Part size={[0.48, 0.17, 0.48]} at={[0, 1.18, 0]} color="#1e1b4b" />
          <Part size={[0.48, 0.07, 0.48]} at={[0, 1.47, 0]} color="#dc2626" />
          <Part
            size={[0.06, 0.2, 0.03]}
            at={[0.08, 1.38, -0.25]}
            rot={[0.3, 0, 0.4]}
            color="#dc2626"
          />
          <Part
            size={[0.06, 0.2, 0.03]}
            at={[-0.02, 1.37, -0.255]}
            rot={[0.3, 0, -0.2]}
            color="#dc2626"
          />
          {/* Crossed lapels, red sash with a hanging tail and a shuriken */}
          {[0.6, -0.6].map((r) => (
            <Part
              key={r}
              size={[0.03, 0.4, 0.02]}
              at={[0, 0.8, 0.19]}
              rot={[0, 0, r]}
              color="#312e81"
            />
          ))}
          <Part size={[0.6, 0.08, 0.38]} at={[0, 0.5, 0]} color="#dc2626" />
          <Part
            size={[0.08, 0.26, 0.03]}
            at={[0.2, 0.36, 0.2]}
            rot={[0, 0, 0.15]}
            color="#dc2626"
          />
          <mesh position={[-0.18, 0.5, 0.21]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshLambertMaterial color="#94a3b8" />
          </mesh>
        </group>
      );
    case "astronaut":
      return (
        <group>
          {/* Neck ring, glowing control panel and a mission patch */}
          <mesh position={[0, 1.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.045, 8, 20]} />
            <meshLambertMaterial color="#94a3b8" />
          </mesh>
          <Part
            size={[0.26, 0.17, 0.03]}
            at={[0.04, 0.8, 0.19]}
            color="#475569"
          />
          {ASTRONAUT_BUTTONS.map(({ color, x }) => (
            <Part
              key={color}
              size={[0.045, 0.045, 0.02]}
              at={[x, 0.83, 0.21]}
              color={color}
              glow
            />
          ))}
          <Part
            size={[0.18, 0.025, 0.02]}
            at={[0.04, 0.76, 0.21]}
            color="#22d3ee"
            glow
          />
          <mesh position={[-0.17, 0.94, 0.19]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
            <meshLambertMaterial color="#1d4ed8" />
          </mesh>
          <Part size={[0.6, 0.05, 0.38]} at={[0, 0.5, 0]} color="#3b82f6" />
          {/* Life-support pack with vents and a hose */}
          <Part
            size={[0.42, 0.48, 0.16]}
            at={[0, 0.78, -0.26]}
            color="#e2e8f0"
          />
          {[0.9, 0.8].map((y) => (
            <Part
              key={y}
              size={[0.3, 0.05, 0.02]}
              at={[0, y, -0.345]}
              color="#64748b"
            />
          ))}
          <mesh position={[0.2, 0.62, -0.2]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
            <meshLambertMaterial color="#94a3b8" />
          </mesh>
        </group>
      );
    case "santa_suit":
      return (
        <group>
          {/* White fur down the front, round the hem and the collar; a black belt with a gold buckle */}
          <Part size={[0.12, 0.62, 0.02]} at={[0, 0.74, 0.19]} color="#f8fafc" />
          <Part size={[0.6, 0.09, 0.38]} at={[0, 0.47, 0]} color="#f8fafc" />
          <Part size={[0.46, 0.08, 0.38]} at={[0, 1.03, 0]} color="#f8fafc" />
          <Part size={[0.6, 0.08, 0.4]} at={[0, 0.62, 0]} color="#111827" />
          <Part size={[0.13, 0.1, 0.03]} at={[0, 0.62, 0.205]} color="#facc15" />
          <Part size={[0.07, 0.05, 0.03]} at={[0, 0.62, 0.21]} color="#111827" />
        </group>
      );
    default:
      // Farmer overalls: denim bib with pocket, straps over the shoulders, brass buttons
      return (
        <group>
          <Part size={[0.6, 0.2, 0.38]} at={[0, 0.53, 0]} color="#2563eb" />
          <Part size={[0.36, 0.34, 0.03]} at={[0, 0.8, 0.19]} color="#2563eb" />
          <Part size={[0.16, 0.1, 0.02]} at={[0, 0.8, 0.21]} color="#1e40af" />
          {[-0.16, 0.16].map((x) => (
            <group key={x}>
              <Part
                size={[0.07, 0.12, 0.03]}
                at={[x, 1.0, 0.19]}
                color="#2563eb"
              />
              <Part
                size={[0.07, 0.02, 0.38]}
                at={[x, 1.06, 0]}
                color="#2563eb"
              />
              <Part
                size={[0.07, 0.5, 0.03]}
                at={[x, 0.82, -0.19]}
                color="#2563eb"
              />
              <Part
                size={[0.05, 0.05, 0.02]}
                at={[x, 0.95, 0.215]}
                color="#facc15"
              />
            </group>
          ))}
        </group>
      );
  }
}

// Footwear and trouser details, in leg space (foot at y -0.225)
function OutfitLeg({ id }: { id: string }) {
  switch (id) {
    case "casual_hoodie":
      return (
        <group>
          <Part size={[0.24, 0.1, 0.3]} at={[0, -0.18, 0.04]} color="#f8fafc" />
          <Part
            size={[0.245, 0.03, 0.305]}
            at={[0, -0.2, 0.04]}
            color="#10b981"
          />
        </group>
      );
    case "beach_vibe":
      return (
        <group>
          <Part size={[0.235, 0.2, 0.235]} at={[0, 0.12, 0]} color="#0ea5e9" />
          <Part
            size={[0.22, 0.04, 0.3]}
            at={[0, -0.215, 0.04]}
            color="#facc15"
          />
          <Part
            size={[0.05, 0.04, 0.04]}
            at={[0, -0.18, 0.11]}
            color="#f97316"
          />
        </group>
      );
    case "sakura_pink":
      return (
        <Part size={[0.23, 0.08, 0.28]} at={[0, -0.19, 0.03]} color="#db2777" />
      );
    case "royal_gold":
      return (
        <group>
          <Part
            size={[0.24, 0.16, 0.28]}
            at={[0, -0.15, 0.03]}
            color="#0f172a"
          />
          <Part
            size={[0.245, 0.03, 0.285]}
            at={[0, -0.065, 0.03]}
            color="#facc15"
          />
        </group>
      );
    case "cyber_neon":
      return (
        <group>
          <Part
            size={[0.23, 0.03, 0.23]}
            at={[0, 0.02, 0]}
            color="#22d3ee"
            glow
          />
          <Part
            size={[0.25, 0.14, 0.3]}
            at={[0, -0.16, 0.04]}
            color="#334155"
          />
          <Part
            size={[0.255, 0.03, 0.305]}
            at={[0, -0.215, 0.04]}
            color="#ec4899"
            glow
          />
        </group>
      );
    case "vampire_cape":
      return (
        <group>
          <Part size={[0.24, 0.1, 0.3]} at={[0, -0.18, 0.04]} color="#0f172a" />
          <Part
            size={[0.08, 0.05, 0.02]}
            at={[0, -0.16, 0.195]}
            color="#cbd5e1"
          />
        </group>
      );
    case "pajamas":
      return (
        <group>
          <Part
            size={[0.235, 0.04, 0.235]}
            at={[0, -0.11, 0]}
            color="#dbeafe"
          />
          <Part size={[0.26, 0.1, 0.32]} at={[0, -0.18, 0.04]} color="#fbcfe8" />
          <mesh position={[0, -0.12, 0.19]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
        </group>
      );
    case "football_kit":
      return (
        <group>
          <Part size={[0.235, 0.16, 0.235]} at={[0, 0.15, 0]} color="#ffffff" />
          <Part
            size={[0.232, 0.16, 0.232]}
            at={[0, -0.06, 0]}
            color="#dc2626"
          />
          <Part
            size={[0.245, 0.08, 0.3]}
            at={[0, -0.19, 0.04]}
            color="#111827"
          />
          <Part
            size={[0.25, 0.02, 0.305]}
            at={[0, -0.165, 0.04]}
            color="#ffffff"
          />
        </group>
      );
    case "ao_dai":
      return (
        <Part size={[0.23, 0.07, 0.28]} at={[0, -0.195, 0.03]} color="#facc15" />
      );
    case "ninja_suit":
      return (
        <group>
          <Part
            size={[0.235, 0.12, 0.235]}
            at={[0, -0.05, 0]}
            color="#475569"
          />
          <Part size={[0.24, 0.08, 0.3]} at={[0, -0.19, 0.04]} color="#0f172a" />
        </group>
      );
    case "astronaut":
      return (
        <group>
          <Part
            size={[0.235, 0.04, 0.235]}
            at={[0, 0.06, 0]}
            color="#3b82f6"
          />
          <Part
            size={[0.26, 0.15, 0.31]}
            at={[0, -0.155, 0.04]}
            color="#94a3b8"
          />
        </group>
      );
    case "santa_suit":
      return (
        <group>
          {/* Black boots with a fur cuff */}
          <Part size={[0.24, 0.16, 0.3]} at={[0, -0.15, 0.04]} color="#111827" />
          <Part size={[0.25, 0.05, 0.25]} at={[0, -0.05, 0]} color="#f8fafc" />
        </group>
      );
    default:
      return (
        <group>
          <Part
            size={[0.235, 0.06, 0.235]}
            at={[0, -0.11, 0]}
            color="#3b82f6"
          />
          <Part size={[0.24, 0.1, 0.3]} at={[0, -0.18, 0.04]} color="#78350f" />
        </group>
      );
  }
}

// Sleeves, cuffs and shoulder pieces, in arm space (shoulder at y +0.24)
function OutfitArm({ id }: { id: string }) {
  switch (id) {
    case "casual_hoodie":
      return (
        <Part size={[0.19, 0.07, 0.19]} at={[0, -0.2, 0]} color="#059669" />
      );
    case "beach_vibe":
      return <Part size={[0.2, 0.18, 0.2]} at={[0, 0.15, 0]} color="#f97316" />;
    case "sakura_pink":
      return (
        <mesh position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshLambertMaterial color="#fbcfe8" />
        </mesh>
      );
    case "royal_gold":
      return (
        <group>
          <Part size={[0.19, 0.06, 0.19]} at={[0, -0.19, 0]} color="#facc15" />
          <Part size={[0.22, 0.05, 0.22]} at={[0, 0.25, 0]} color="#facc15" />
          <Part size={[0.22, 0.05, 0.04]} at={[0, 0.21, 0.1]} color="#fde047" />
        </group>
      );
    case "cyber_neon":
      return (
        <group>
          <Part size={[0.24, 0.12, 0.24]} at={[0, 0.2, 0]} color="#334155" />
          <Part
            size={[0.245, 0.02, 0.245]}
            at={[0, 0.14, 0]}
            color="#ec4899"
            glow
          />
          <Part
            size={[0.19, 0.03, 0.19]}
            at={[0, -0.18, 0]}
            color="#22d3ee"
            glow
          />
        </group>
      );
    case "vampire_cape":
      return (
        <Part size={[0.19, 0.06, 0.19]} at={[0, -0.19, 0]} color="#b91c1c" />
      );
    case "pajamas":
      return (
        <Part size={[0.19, 0.05, 0.19]} at={[0, -0.2, 0]} color="#dbeafe" />
      );
    case "football_kit":
      return (
        <group>
          <Part size={[0.2, 0.18, 0.2]} at={[0, 0.15, 0]} color="#dc2626" />
          <Part
            size={[0.205, 0.03, 0.205]}
            at={[0, 0.07, 0]}
            color="#facc15"
          />
        </group>
      );
    case "ao_dai":
      return (
        <Part size={[0.19, 0.05, 0.19]} at={[0, -0.2, 0]} color="#facc15" />
      );
    case "ninja_suit":
      return (
        <group>
          <Part size={[0.19, 0.12, 0.19]} at={[0, -0.15, 0]} color="#475569" />
          <Part
            size={[0.195, 0.03, 0.195]}
            at={[0, -0.08, 0]}
            color="#dc2626"
          />
        </group>
      );
    case "astronaut":
      return (
        <group>
          <Part size={[0.2, 0.1, 0.2]} at={[0, -0.2, 0]} color="#94a3b8" />
          <Part
            size={[0.19, 0.04, 0.19]}
            at={[0, 0.15, 0]}
            color="#3b82f6"
          />
        </group>
      );
    case "santa_suit":
      return (
        <Part size={[0.2, 0.08, 0.2]} at={[0, -0.18, 0]} color="#f8fafc" />
      );
    default:
      return null;
  }
}

const CROWN_FLOWERS = [
  "#f472b6",
  "#ffffff",
  "#facc15",
  "#a78bfa",
  "#fb7185",
  "#ffffff",
  "#f472b6",
  "#fde68a",
];

function Hat({ id }: { id: string }) {
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (haloRef.current) {
      haloRef.current.position.y =
        0.28 + Math.sin(performance.now() * 0.004) * 0.04;
    }
  });

  switch (id) {
    case "straw_hat":
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.52, 0.52, 0.06, 12]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.29, 0.32, 0.22, 12]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.325, 0.325, 0.05, 12]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0.26, 0.07, 0.15]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshLambertMaterial color="#f472b6" />
          </mesh>
        </group>
      );
    case "crown":
      return (
        <group>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.28, 0.25, 0.18, 10]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.sin(a) * 0.24, 0.24, Math.cos(a) * 0.24]}
              >
                <coneGeometry args={[0.055, 0.15, 4]} />
                <meshLambertMaterial color="#fbbf24" />
              </mesh>
            );
          })}
          <mesh position={[0, 0.1, 0.27]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {[-0.27, 0.27].map((x) => (
            <mesh key={x} position={[x, 0.1, 0]}>
              <octahedronGeometry args={[0.05, 0]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          ))}
        </group>
      );
    case "cat_ears":
      return (
        <group>
          <Part size={[0.5, 0.05, 0.1]} at={[0, 0, 0]} color="#f472b6" />
          {[-0.16, 0.16].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.12, 0]}>
                <coneGeometry args={[0.13, 0.26, 4]} />
                <meshLambertMaterial color="#f472b6" />
              </mesh>
              <mesh position={[x, 0.1, 0.05]}>
                <coneGeometry args={[0.07, 0.15, 4]} />
                <meshLambertMaterial color="#fbcfe8" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "cowboy_hat":
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.56, 0.56, 0.05, 14]} />
            <meshLambertMaterial color="#92400e" />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.24, 0.3, 0.3, 10]} />
            <meshLambertMaterial color="#78350f" />
          </mesh>
          <Part size={[0.08, 0.04, 0.3]} at={[0, 0.31, 0]} color="#5c2d0b" />
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.305, 0.305, 0.05, 10]} />
            <meshLambertMaterial color="#fbbf24" />
          </mesh>
          <Part
            size={[0.12, 0.1, 0.56]}
            at={[-0.52, 0.06, 0]}
            rot={[0, 0, 0.7]}
            color="#92400e"
          />
          <Part
            size={[0.12, 0.1, 0.56]}
            at={[0.52, 0.06, 0]}
            rot={[0, 0, -0.7]}
            color="#92400e"
          />
        </group>
      );
    case "wizard_hat":
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.54, 0.54, 0.05, 14]} />
            <meshLambertMaterial color="#4338ca" />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <coneGeometry args={[0.3, 0.62, 12]} />
            <meshLambertMaterial color="#4f46e5" />
          </mesh>
          <mesh position={[0.1, 0.72, 0]} rotation={[0, 0, -0.6]}>
            <coneGeometry args={[0.12, 0.34, 10]} />
            <meshLambertMaterial color="#4f46e5" />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.31, 0.3, 0.07, 12]} />
            <meshLambertMaterial color="#facc15" />
          </mesh>
          {[
            [0.12, 0.3, 0.2],
            [-0.12, 0.42, 0.14],
            [0.06, 0.5, -0.13],
          ].map(([x, y, z]) => (
            <mesh key={`${x}${y}`} position={[x, y, z]}>
              <octahedronGeometry args={[0.05, 0]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          ))}
        </group>
      );
    case "halo":
      return (
        <mesh
          ref={haloRef}
          position={[0, 0.28, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.26, 0.045, 8, 24]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      );
    case "pumpkin_hat":
      return (
        <group position={[0, 0.1, 0]}>
          {[-0.1, 0, 0.1].map((x, i) => (
            <mesh
              key={x}
              position={[x, 0.08, 0]}
              scale={[i === 1 ? 1 : 0.8, 0.8, 1]}
            >
              <sphereGeometry args={[0.24, 12, 10]} />
              <meshLambertMaterial color={i === 1 ? "#f97316" : "#ea580c"} />
            </mesh>
          ))}
          {/* Carved face lit from inside */}
          {[-0.09, 0.09].map((x) => (
            <Part
              key={x}
              size={[0.07, 0.07, 0.03]}
              at={[x, 0.13, 0.22]}
              rot={[0, 0, Math.PI / 4]}
              color="#fde047"
              glow
            />
          ))}
          <Part
            size={[0.18, 0.04, 0.03]}
            at={[0, 0.02, 0.235]}
            color="#fde047"
            glow
          />
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.12, 6]} />
            <meshLambertMaterial color="#4d7c0f" />
          </mesh>
          <Part
            size={[0.12, 0.02, 0.07]}
            at={[0.07, 0.3, 0]}
            rot={[0, 0, -0.4]}
            color="#65a30d"
          />
        </group>
      );
    case "non_la":
      return (
        <group>
          {/* Conical leaf hat with woven rings and a red chin strap */}
          <mesh position={[0, 0.14, 0]}>
            <coneGeometry args={[0.6, 0.42, 20]} />
            <meshLambertMaterial color="#e9d8a6" />
          </mesh>
          {[0.05, 0.16, 0.26].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry
                args={[0.6 * (1 - (y + 0.07) / 0.42) + 0.004, 0.008, 4, 24]}
              />
              <meshLambertMaterial color="#c8b27a" />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <Part
              key={side}
              size={[0.025, 0.4, 0.025]}
              at={[side * 0.235, -0.22, 0.06]}
              color="#dc2626"
            />
          ))}
          <Part
            size={[0.49, 0.025, 0.025]}
            at={[0, -0.43, 0.13]}
            color="#dc2626"
          />
        </group>
      );
    case "frog_hat":
      return (
        <group>
          {/* Green knitted beanie with big frog eyes and rosy cheeks */}
          <mesh position={[0, -0.04, 0]} scale={[1, 0.62, 1]}>
            <sphereGeometry args={[0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color="#4ade80" />
          </mesh>
          <Part size={[0.5, 0.06, 0.5]} at={[0, -0.05, 0]} color="#22c55e" />
          {[-0.12, 0.12].map((x) => (
            <group key={x} position={[x, 0.16, 0.06]}>
              <mesh>
                <sphereGeometry args={[0.085, 12, 10]} />
                <meshLambertMaterial color="#ffffff" />
              </mesh>
              <mesh position={[0, 0.01, 0.065]}>
                <sphereGeometry args={[0.038, 8, 6]} />
                <meshBasicMaterial color="#111827" />
              </mesh>
            </group>
          ))}
          {[-0.17, 0.17].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.2]}>
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshLambertMaterial color="#f9a8d4" />
            </mesh>
          ))}
        </group>
      );
    case "chef_hat":
      return (
        <group>
          {/* Pleated band under a puffed white top */}
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.16, 16]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <Part
                key={i}
                size={[0.02, 0.15, 0.02]}
                at={[Math.sin(a) * 0.262, 0.07, Math.cos(a) * 0.262]}
                rot={[0, a, 0]}
                color="#e2e8f0"
              />
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.sin(a) * 0.15, 0.3, Math.cos(a) * 0.15]}
              >
                <sphereGeometry args={[0.15, 12, 10]} />
                <meshLambertMaterial color="#ffffff" />
              </mesh>
            );
          })}
          <mesh position={[0, 0.36, 0]}>
            <sphereGeometry args={[0.17, 12, 10]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
        </group>
      );
    case "flower_crown":
      return (
        <group position={[0, 0.02, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.25, 0.035, 6, 24]} />
            <meshLambertMaterial color="#65a30d" />
          </mesh>
          {CROWN_FLOWERS.map((color, i) => {
            const a = (i / CROWN_FLOWERS.length) * Math.PI * 2;
            return (
              <group
                key={i}
                position={[Math.sin(a) * 0.25, 0.04, Math.cos(a) * 0.25]}
              >
                <mesh>
                  <sphereGeometry args={[0.065, 10, 8]} />
                  <meshLambertMaterial color={color} />
                </mesh>
                <mesh position={[0, 0.045, 0]}>
                  <sphereGeometry args={[0.025, 6, 6]} />
                  <meshLambertMaterial color="#fde047" />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    case "bunny_ears":
      return (
        <group>
          <Part size={[0.5, 0.05, 0.1]} at={[0, 0, 0]} color="#f8fafc" />
          {/* Left ear straight up, right ear flopping forward at the tip */}
          <group position={[-0.12, 0.04, 0]} rotation={[0, 0, 0.12]}>
            <Part size={[0.11, 0.44, 0.06]} at={[0, 0.22, 0]} color="#f8fafc" />
            <Part
              size={[0.06, 0.34, 0.02]}
              at={[0, 0.22, 0.035]}
              color="#f9a8d4"
            />
          </group>
          <group position={[0.12, 0.04, 0]} rotation={[0, 0, -0.12]}>
            <Part size={[0.11, 0.24, 0.06]} at={[0, 0.12, 0]} color="#f8fafc" />
            <Part
              size={[0.06, 0.18, 0.02]}
              at={[0, 0.12, 0.035]}
              color="#f9a8d4"
            />
            <group position={[0, 0.24, 0]} rotation={[1.1, 0, 0]}>
              <Part
                size={[0.11, 0.22, 0.06]}
                at={[0, 0.11, 0]}
                color="#f8fafc"
              />
              <Part
                size={[0.06, 0.16, 0.02]}
                at={[0, 0.11, 0.035]}
                color="#f9a8d4"
              />
            </group>
          </group>
        </group>
      );
    case "top_hat":
      return (
        <group>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.04, 20]} />
            <meshLambertMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.26, 0.24, 0.52, 18]} />
            <meshLambertMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.245, 0.245, 0.09, 18]} />
            <meshLambertMaterial color="#b91c1c" />
          </mesh>
        </group>
      );
    case "santa_hat":
      return (
        <group>
          {/* White fur band, a red cone flopping over to one side and a pom-pom on the tip */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.12, 16]} />
            <meshLambertMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <coneGeometry args={[0.28, 0.34, 16]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0.12, 0.42, 0]} rotation={[0, 0, -2.0]}>
            <coneGeometry args={[0.1, 0.26, 12]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0.25, 0.35, 0]}>
            <sphereGeometry args={[0.075, 10, 8]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

const FEATHERS: [number, number, number][] = [
  [0.62, 0.16, 0.42],
  [0.56, 0.06, 0.2],
  [0.48, -0.04, 0],
  [0.38, -0.13, -0.22],
];

// Longer, fiery feathers: from the dark outer row in to the light inner one
const PHOENIX_FEATHERS: [number, number, number][] = [
  [0.8, 0.2, 0.5],
  [0.7, 0.08, 0.25],
  [0.6, -0.04, 0.02],
  [0.48, -0.15, -0.24],
];
const PHOENIX_COLORS = ["#ea580c", "#f97316", "#fb923c", "#fdba74"];

function createBatWingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.12, 0.3);
  shape.lineTo(0.64, 0.42);
  shape.quadraticCurveTo(0.52, 0.2, 0.58, 0.02);
  shape.quadraticCurveTo(0.44, 0.06, 0.4, -0.16);
  shape.quadraticCurveTo(0.28, -0.04, 0.16, -0.2);
  shape.quadraticCurveTo(0.1, -0.04, 0, 0);
  return new THREE.ShapeGeometry(shape, 6);
}

// One wing reaching out towards `side` (+1 right, -1 left)
function Wing({ id, side }: { id: string; side: 1 | -1 }) {
  const batWing = useMemo(
    () => (id === "demon_wings" ? createBatWingGeometry() : null),
    [id],
  );
  useEffect(() => () => batWing?.dispose(), [batWing]);

  if (id === "angel_wings") {
    return (
      <group>
        {FEATHERS.map(([len, y, tilt], i) => (
          <group
            key={i}
            position={[0, y, -i * 0.015]}
            rotation={[0, 0, side * tilt]}
          >
            <Part
              size={[len, 0.11, 0.04]}
              at={[(side * len) / 2, 0, 0]}
              color="#ffffff"
            />
            <Part
              size={[0.12, 0.115, 0.045]}
              at={[side * (len - 0.06), 0, 0]}
              color="#bae6fd"
            />
          </group>
        ))}
      </group>
    );
  }

  if (id === "phoenix_wings") {
    return (
      <group>
        {PHOENIX_FEATHERS.map(([len, y, tilt], i) => (
          <group
            key={i}
            position={[0, y, -i * 0.015]}
            rotation={[0, 0, side * tilt]}
          >
            <Part
              size={[len, 0.12, 0.04]}
              at={[(side * len) / 2, 0, 0]}
              color={PHOENIX_COLORS[i]}
            />
            <Part
              size={[0.16, 0.125, 0.045]}
              at={[side * (len - 0.08), 0, 0]}
              color="#fde047"
              glow
            />
          </group>
        ))}
      </group>
    );
  }

  if (id === "fairy_wings") {
    return (
      <group>
        <mesh position={[side * 0.3, 0.15, 0]} scale={[0.32, 0.26, 0.025]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshLambertMaterial color="#c084fc" transparent opacity={0.85} />
        </mesh>
        <mesh position={[side * 0.22, -0.13, 0.01]} scale={[0.2, 0.17, 0.025]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshLambertMaterial color="#f472b6" transparent opacity={0.85} />
        </mesh>
        {[
          [0.4, 0.2],
          [0.22, 0.26],
          [0.27, -0.14],
        ].map(([x, y]) => (
          <mesh key={`${x}${y}`} position={[side * x, y, 0.035]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        ))}
      </group>
    );
  }

  if (batWing) {
    return (
      <group scale={[side, 1, 1]}>
        <mesh geometry={batWing}>
          <meshLambertMaterial color="#991b1b" side={THREE.DoubleSide} />
        </mesh>
        <Part
          size={[0.77, 0.04, 0.04]}
          at={[0.32, 0.21, 0.01]}
          rot={[0, 0, 0.58]}
          color="#1e293b"
        />
        <Part
          size={[0.58, 0.035, 0.035]}
          at={[0.29, 0.01, 0.01]}
          rot={[0, 0, 0.03]}
          color="#1e293b"
        />
        <Part
          size={[0.44, 0.035, 0.035]}
          at={[0.2, -0.08, 0.01]}
          rot={[0, 0, -0.38]}
          color="#1e293b"
        />
        <mesh position={[0.66, 0.46, 0]} rotation={[0, 0, -0.6]}>
          <coneGeometry args={[0.035, 0.12, 5]} />
          <meshLambertMaterial color="#0f172a" />
        </mesh>
      </group>
    );
  }

  return null;
}

function Backpack() {
  return (
    <group>
      <Part size={[0.4, 0.44, 0.2]} at={[0, 0.76, -0.27]} color="#d97706" />
      <Part size={[0.42, 0.14, 0.22]} at={[0, 0.94, -0.27]} color="#b45309" />
      <Part size={[0.28, 0.16, 0.05]} at={[0, 0.64, -0.39]} color="#b45309" />
      <Part size={[0.06, 0.06, 0.02]} at={[0, 0.88, -0.385]} color="#facc15" />
      <Part size={[0.05, 0.5, 0.02]} at={[-0.22, 0.8, 0.2]} color="#92400e" />
      <Part size={[0.05, 0.5, 0.02]} at={[0.22, 0.8, 0.2]} color="#92400e" />
    </group>
  );
}

const UP = new THREE.Vector3(0, 1, 0);

// A thin cord from one point to another (balloon strings)
function Cord({ from, to, color }: { from: Vec3; to: Vec3; color: string }) {
  const { mid, length, turn } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      length: dir.length(),
      turn: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={mid} quaternion={turn}>
      <cylinderGeometry args={[0.006, 0.006, length, 4]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// Twin tanks on the back with flickering flames under the nozzles
function Jetpack() {
  const flameRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const t = performance.now() * 0.03;
    flameRefs.current.forEach((flame, i) => {
      flame?.scale.set(1, 0.75 + Math.abs(Math.sin(t + i * 1.7)) * 0.6, 1);
    });
  });

  return (
    <group>
      <Part size={[0.36, 0.3, 0.08]} at={[0, 0.8, -0.22]} color="#475569" />
      {[-0.2, 0.2].map((x) => (
        <Part key={x} size={[0.05, 0.5, 0.02]} at={[x, 0.8, 0.2]} color="#334155" />
      ))}
      {[-0.11, 0.11].map((x, i) => (
        <group key={x} position={[x, 0.78, -0.32]}>
          <mesh>
            <cylinderGeometry args={[0.09, 0.09, 0.42, 12]} />
            <meshLambertMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <sphereGeometry args={[0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, -0.25, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.07, 0.1, 10]} />
            <meshLambertMaterial color="#475569" />
          </mesh>
          <group
            ref={(el) => {
              flameRefs.current[i] = el;
            }}
            position={[0, -0.3, 0]}
          >
            <mesh position={[0, -0.1, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.065, 0.22, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
            <mesh position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.035, 0.13, 8]} />
              <meshBasicMaterial color="#bae6fd" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// Acoustic guitar slung across the back, its strap over the chest
function Guitar() {
  return (
    <group>
      <Part
        size={[0.05, 0.7, 0.02]}
        at={[0, 0.76, 0.19]}
        rot={[0, 0, -0.6]}
        color="#7c2d12"
      />
      <group position={[0, 0.78, -0.27]} rotation={[0, 0, 0.6]}>
        {[
          [-0.12, 0.17],
          [0.08, 0.13],
        ].map(([y, r]) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r, 0.08, 16]} />
            <meshLambertMaterial color="#d97706" />
          </mesh>
        ))}
        <mesh position={[0, -0.04, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.01, 12]} />
          <meshBasicMaterial color="#451a03" />
        </mesh>
        <Part size={[0.06, 0.46, 0.04]} at={[0, 0.38, 0]} color="#78350f" />
        <Part size={[0.09, 0.1, 0.05]} at={[0, 0.64, 0]} color="#451a03" />
      </group>
    </group>
  );
}

const BALLOONS: { at: Vec3; color: string }[] = [
  { at: [0.08, 1.82, -0.52], color: "#ef4444" },
  { at: [0.4, 1.95, -0.38], color: "#facc15" },
  { at: [-0.24, 1.98, -0.4], color: "#3b82f6" },
];
const BALLOON_KNOT: Vec3 = [0.1, 0.95, -0.22];
const BALLOON_TIES: Vec3[] = BALLOONS.map(({ at: [x, y, z] }) => [x, y - 0.24, z]);

// Three balloons tied to the back, bobbing on their strings
function Balloons() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() * 0.002;
    groupRef.current?.children.forEach((balloon, i) => {
      balloon.position.y = BALLOONS[i].at[1] + Math.sin(t + i * 2) * 0.05;
    });
  });

  return (
    <group>
      <group ref={groupRef}>
        {BALLOONS.map(({ at, color }) => (
          <group key={color} position={at}>
            <mesh scale={[1, 1.15, 1]}>
              <sphereGeometry args={[0.17, 14, 12]} />
              <meshLambertMaterial color={color} />
            </mesh>
            <mesh position={[0, -0.21, 0]}>
              <coneGeometry args={[0.035, 0.05, 6]} />
              <meshLambertMaterial color={color} />
            </mesh>
          </group>
        ))}
      </group>
      {BALLOON_TIES.map((tie, i) => (
        <Cord key={i} from={BALLOON_KNOT} to={tie} color="#f8fafc" />
      ))}
    </group>
  );
}

// Whatever rides on the back besides wings
function BackItem({ id }: { id: string }) {
  switch (id) {
    case "backpack":
      return <Backpack />;
    case "jetpack":
      return <Jetpack />;
    case "guitar":
      return <Guitar />;
    case "balloons":
      return <Balloons />;
    default:
      return null;
  }
}

function Bunny() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.9, 1.15]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshLambertMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0.4, 0.15]}>
        <sphereGeometry args={[0.15, 14, 12]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {[-0.06, 0.06].map((x) => (
        <group
          key={x}
          position={[x, 0.52, 0.12]}
          rotation={[-0.2, 0, x > 0 ? -0.15 : 0.15]}
        >
          <Part size={[0.06, 0.26, 0.04]} at={[0, 0.12, 0]} color="#ffffff" />
          <Part size={[0.03, 0.2, 0.01]} at={[0, 0.12, 0.022]} color="#f9a8d4" />
        </group>
      ))}
      {[-0.055, 0.055].map((x) => (
        <mesh key={x} position={[x, 0.44, 0.28]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
      ))}
      <mesh position={[0, 0.39, 0.3]}>
        <sphereGeometry args={[0.022, 6, 6]} />
        <meshLambertMaterial color="#f472b6" />
      </mesh>
      <mesh position={[0, 0.24, -0.22]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <Part key={x} size={[0.07, 0.05, 0.14]} at={[x, 0.03, 0.12]} color="#f1f5f9" />
      ))}
    </group>
  );
}

const SHELL_PATCHES: Vec3[] = [
  [0, 0.29, 0],
  [0.11, 0.26, 0.09],
  [-0.11, 0.26, 0.09],
  [0.1, 0.26, -0.1],
  [-0.1, 0.26, -0.1],
];

// Sea turtle paddling its front flippers
function SeaTurtle() {
  const flipperRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame(() => {
    const paddle = Math.sin(performance.now() * 0.006) * 0.35;
    flipperRefs.current.forEach((flipper, i) => {
      if (flipper) flipper.rotation.y = (i === 0 ? 1 : -1) * (0.4 + paddle);
    });
  });

  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[0, 0.16, 0]} scale={[1, 0.55, 1.15]}>
        <sphereGeometry args={[0.24, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color="#15803d" />
      </mesh>
      <mesh position={[0, 0.14, 0]} scale={[1, 1, 1.15]}>
        <cylinderGeometry args={[0.25, 0.23, 0.05, 14]} />
        <meshLambertMaterial color="#fde68a" />
      </mesh>
      {SHELL_PATCHES.map(([x, y, z]) => (
        <mesh key={`${x}${z}`} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.05, 6]} />
          <meshLambertMaterial color="#4ade80" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.18, 0.31]}>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshLambertMaterial color="#86efac" />
      </mesh>
      {[-0.04, 0.04].map((x) => (
        <mesh key={x} position={[x, 0.21, 0.385]}>
          <sphereGeometry args={[0.016, 6, 6]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
      ))}
      {[1, -1].map((side, i) => (
        <group
          key={side}
          ref={(el) => {
            flipperRefs.current[i] = el;
          }}
          position={[side * 0.2, 0.13, 0.14]}
        >
          <Part size={[0.2, 0.03, 0.09]} at={[side * 0.1, 0, 0]} color="#86efac" />
        </group>
      ))}
      {[1, -1].map((side) => (
        <Part
          key={side}
          size={[0.12, 0.03, 0.08]}
          at={[side * 0.2, 0.13, -0.2]}
          rot={[0, side * 0.5, 0]}
          color="#86efac"
        />
      ))}
    </group>
  );
}

// Round panda hugging a bamboo shoot
function Panda() {
  return (
    <group>
      <mesh position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.22, 14, 12]} />
        <meshLambertMaterial color="#f8fafc" />
      </mesh>
      <Part size={[0.42, 0.12, 0.34]} at={[0, 0.34, 0]} color="#111827" />
      <mesh position={[0, 0.52, 0.06]}>
        <sphereGeometry args={[0.17, 14, 12]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.66, 0.03]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshLambertMaterial color="#111827" />
        </mesh>
      ))}
      {[-0.065, 0.065].map((x) => (
        <group key={x} position={[x, 0.54, 0.2]}>
          <mesh scale={[0.8, 1.1, 0.4]} rotation={[0, 0, x > 0 ? -0.4 : 0.4]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshLambertMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0.005, 0.02]}>
            <sphereGeometry args={[0.014, 6, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.47, 0.22]}>
        <sphereGeometry args={[0.022, 6, 6]} />
        <meshLambertMaterial color="#111827" />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <Part key={x} size={[0.08, 0.16, 0.08]} at={[x, 0.28, 0.16]} color="#111827" />
      ))}
      {[-0.1, 0.1].map((x) => (
        <Part key={x} size={[0.1, 0.1, 0.12]} at={[x, 0.05, 0.06]} color="#111827" />
      ))}
      <mesh position={[0.02, 0.32, 0.23]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.022, 0.022, 0.42, 6]} />
        <meshLambertMaterial color="#65a30d" />
      </mesh>
      <Part
        size={[0.12, 0.02, 0.05]}
        at={[-0.05, 0.5, 0.23]}
        rot={[0, 0, 0.6]}
        color="#84cc16"
      />
    </group>
  );
}

// The pet trotting along behind the player
// Giáng Sinh: a little reindeer with a glowing red nose and branching antlers
function Reindeer() {
  return (
    <group>
      <Part size={[0.3, 0.24, 0.48]} at={[0, 0.36, 0]} color="#92400e" />
      <Part size={[0.2, 0.14, 0.06]} at={[0, 0.33, 0.24]} color="#fef3c7" />
      {[
        [-0.1, 0.16],
        [0.1, 0.16],
        [-0.1, -0.16],
        [0.1, -0.16],
      ].map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Part size={[0.07, 0.24, 0.07]} at={[x, 0.12, z]} color="#78350f" />
          <Part size={[0.075, 0.04, 0.075]} at={[x, 0.02, z]} color="#1c1917" />
        </group>
      ))}
      <Part size={[0.12, 0.2, 0.12]} at={[0, 0.52, 0.2]} color="#92400e" />
      <Part size={[0.22, 0.2, 0.26]} at={[0, 0.64, 0.28]} color="#92400e" />
      <Part size={[0.14, 0.1, 0.08]} at={[0, 0.6, 0.42]} color="#a16207" />
      <mesh position={[0, 0.62, 0.47]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {[-0.06, 0.06].map((x) => (
        <Part key={x} size={[0.035, 0.045, 0.02]} at={[x, 0.69, 0.41]} color="#1e293b" />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Part size={[0.09, 0.04, 0.05]} at={[side * 0.14, 0.69, 0.24]} rot={[0, 0, side * 0.4]} color="#92400e" />
          {/* Antler: a beam with two tines */}
          <Part size={[0.03, 0.2, 0.03]} at={[side * 0.07, 0.82, 0.25]} rot={[0, 0, side * -0.3]} color="#d6d3d1" />
          <Part size={[0.025, 0.1, 0.025]} at={[side * 0.14, 0.86, 0.25]} rot={[0, 0, side * -1.0]} color="#d6d3d1" />
          <Part size={[0.025, 0.09, 0.025]} at={[side * 0.1, 0.92, 0.2]} rot={[0.6, 0, side * -0.2]} color="#d6d3d1" />
        </group>
      ))}
      <Part size={[0.08, 0.08, 0.06]} at={[0, 0.44, -0.26]} color="#fef3c7" />
    </group>
  );
}

function Pet({ id }: { id: string }) {
  switch (id) {
    case "shiba_inu":
      return <Shiba />;
    case "robo_cat":
      return <RoboCat />;
    case "bat_pet":
      return <BatPet />;
    case "bunny_pet":
      return <Bunny />;
    case "sea_turtle":
      return <SeaTurtle />;
    case "panda":
      return <Panda />;
    case "reindeer_pet":
      return <Reindeer />;
    default:
      return null;
  }
}

function Shiba() {
  return (
    <group>
      <Part size={[0.34, 0.26, 0.48]} at={[0, 0.27, 0]} color="#f59e0b" />
      <Part size={[0.22, 0.16, 0.06]} at={[0, 0.25, 0.24]} color="#fef3c7" />
      <Part size={[0.3, 0.28, 0.28]} at={[0, 0.45, 0.22]} color="#f59e0b" />
      <Part size={[0.16, 0.12, 0.12]} at={[0, 0.4, 0.38]} color="#fef3c7" />
      <Part size={[0.06, 0.04, 0.03]} at={[0, 0.44, 0.445]} color="#1e293b" />
      {[-0.07, 0.07].map((x) => (
        <Part
          key={x}
          size={[0.04, 0.05, 0.02]}
          at={[x, 0.5, 0.365]}
          color="#1e293b"
        />
      ))}
      {[-0.09, 0.09].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.63, 0.2]}>
            <coneGeometry args={[0.07, 0.14, 4]} />
            <meshLambertMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[x, 0.62, 0.225]}>
            <coneGeometry args={[0.04, 0.09, 4]} />
            <meshLambertMaterial color="#fef3c7" />
          </mesh>
        </group>
      ))}
      {[
        [-0.11, 0.15],
        [0.11, 0.15],
        [-0.11, -0.15],
        [0.11, -0.15],
      ].map(([x, z]) => (
        <Part
          key={`${x}${z}`}
          size={[0.08, 0.16, 0.08]}
          at={[x, 0.08, z]}
          color="#f59e0b"
        />
      ))}
      <mesh position={[0, 0.48, -0.26]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.09, 0.035, 6, 12, Math.PI * 1.5]} />
        <meshLambertMaterial color="#fef3c7" />
      </mesh>
    </group>
  );
}

// Little purple bat flapping at shoulder height
function BatPet() {
  const wingLRef = useRef<THREE.Group>(null);
  const wingRRef = useRef<THREE.Group>(null);
  const wing = useMemo(() => createBatWingGeometry(), []);
  useEffect(() => () => wing.dispose(), [wing]);

  useFrame(() => {
    const flap = Math.sin(performance.now() * 0.025) * 0.7;
    if (wingLRef.current) wingLRef.current.rotation.y = flap;
    if (wingRRef.current) wingRRef.current.rotation.y = -flap;
  });

  return (
    <group position={[0, 1.25, 0]} scale={0.6}>
      <mesh>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshLambertMaterial color="#4c1d95" />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <coneGeometry args={[0.06, 0.16, 4]} />
          <meshLambertMaterial color="#4c1d95" />
        </mesh>
      ))}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.05, 0.18]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      ))}
      <Part size={[0.06, 0.03, 0.02]} at={[0, -0.05, 0.19]} color="#f8fafc" />
      {[-1, 1].map((side) => (
        <group
          key={side}
          ref={side === 1 ? wingRRef : wingLRef}
          position={[side * 0.15, 0.02, 0]}
        >
          <mesh
            geometry={wing}
            scale={[side * 0.8, 0.65, 1]}
            rotation={[0, 0, side * -0.2]}
          >
            <meshLambertMaterial color="#6d28d9" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RoboCat() {
  return (
    <group position={[0, 0.08, 0]}>
      <Part size={[0.32, 0.22, 0.44]} at={[0, 0.3, 0]} color="#64748b" />
      <Part size={[0.33, 0.025, 0.2]} at={[0, 0.34, 0]} color="#22d3ee" glow />
      <Part size={[0.3, 0.26, 0.26]} at={[0, 0.5, 0.2]} color="#94a3b8" />
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.68, 0.2]}>
          <coneGeometry args={[0.08, 0.14, 4]} />
          <meshLambertMaterial color="#64748b" />
        </mesh>
      ))}
      {[-0.07, 0.07].map((x) => (
        <Part
          key={x}
          size={[0.07, 0.05, 0.02]}
          at={[x, 0.52, 0.335]}
          color="#22d3ee"
          glow
        />
      ))}
      <Part
        size={[0.08, 0.02, 0.02]}
        at={[0, 0.44, 0.335]}
        color="#ec4899"
        glow
      />
      <mesh position={[0.06, 0.72, 0.16]}>
        <cylinderGeometry args={[0.012, 0.012, 0.16, 5]} />
        <meshLambertMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0.06, 0.81, 0.16]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial color="#ec4899" />
      </mesh>
      {[
        [0.38, -0.25],
        [0.46, -0.3],
        [0.55, -0.32],
      ].map(([y, z]) => (
        <Part
          key={y}
          size={[0.05, 0.08, 0.05]}
          at={[0, y, z]}
          color="#94a3b8"
        />
      ))}
      <Part
        size={[0.06, 0.06, 0.06]}
        at={[0, 0.62, -0.32]}
        color="#22d3ee"
        glow
      />
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.14, 0.08, 0.05, 12]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
    </group>
  );
}

// What the right hand holds: a farm tool, or the fishing rod at the Beach jetty
export type HeldItem = ToolId | "rod";

// Basic, copper and gold versions of the hoe blade and the watering can
const HOE_BLADE = ["#94a3b8", "#d97706", "#facc15"];
const CAN_BODY = ["#0ea5e9", "#b45309", "#eab308"];

function HeldTool({ tool, tier = 0 }: { tool: HeldItem; tier?: number }) {
  if (tool === "rod") {
    return (
      <group rotation={[-0.75, 0, 0]}>
        <mesh position={[0, 0, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.035, 1.6, 6]} />
          <meshLambertMaterial color="#78350f" />
        </mesh>
        <mesh position={[0.06, -0.02, 0.12]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.06, 10]} />
          <meshLambertMaterial color="#475569" />
        </mesh>
      </group>
    );
  }
  if (tool === "hoe") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.72, 6]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
        <mesh position={[0, -0.1, 0.34]}>
          <boxGeometry args={[0.1, 0.26, 0.08]} />
          <meshLambertMaterial color={HOE_BLADE[tier] ?? HOE_BLADE[0]} />
        </mesh>
      </group>
    );
  }
  if (tool === "water") {
    return (
      <mesh position={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.16, 0.18, 0.3, 8]} />
        <meshLambertMaterial color={CAN_BODY[tier] ?? CAN_BODY[0]} />
      </mesh>
    );
  }
  if (tool === "basket") {
    return (
      <mesh position={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.22, 0.16, 0.24, 8]} />
        <meshLambertMaterial color="#d97706" />
      </mesh>
    );
  }
  const bagColor = tool.startsWith("seed_")
    ? CROPS[tool.replace("seed_", "") as CropId].color
    : "#fde68a";
  return (
    <mesh position={[0, 0, 0.15]}>
      <boxGeometry args={[0.24, 0.28, 0.14]} />
      <meshLambertMaterial color={bagColor} />
    </mesh>
  );
}

interface AvatarMeshProps {
  cosmetics: PlayerCosmetics;
  motion?: AvatarMotion;
  tool?: HeldItem | null;
  // Upgrade tier of the held hoe or watering can
  toolTier?: number;
}

// Blocky character rig from the HTML version; every outfit, hat, back item and pet has its own model
export function AvatarMesh({
  cosmetics,
  motion,
  tool,
  toolTier,
}: AvatarMeshProps) {
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const wingLRef = useRef<THREE.Group>(null);
  const wingRRef = useRef<THREE.Group>(null);
  const petRef = useRef<THREE.Group>(null);

  const useGlbModels = useGameStore((s) => s.useGlbModels);

  const outfitId = OUTFIT_BASE[cosmetics.outfit]
    ? cosmetics.outfit
    : "farmer_blue";
  const base = OUTFIT_BASE[outfitId];
  const hasWings = WING_IDS.includes(cosmetics.wing);
  const hasPet = PET_IDS.includes(cosmetics.pet);

  useFrame(() => {
    const now = performance.now();
    if (motion && leftLegRef.current && rightLegRef.current) {
      if (motion.moving) {
        leftLegRef.current.rotation.x =
          Math.sin(motion.walkTime) * motion.legSwing;
        rightLegRef.current.rotation.x =
          -Math.sin(motion.walkTime) * motion.legSwing;
      } else {
        leftLegRef.current.rotation.x *= 0.85;
        rightLegRef.current.rotation.x *= 0.85;
      }
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x =
        motion && motion.swing > 0 ? -Math.sin(motion.swing) * 1.35 : 0;
    }
    if (wingLRef.current && wingRRef.current) {
      // Wings sweep back from the shoulder blades and flap gently
      const flap = Math.sin(now * 0.008) * 0.25;
      wingLRef.current.rotation.y = -(0.35 + flap);
      wingRRef.current.rotation.y = 0.35 + flap;
    }
    if (petRef.current) {
      petRef.current.position.y = Math.abs(Math.sin(now * 0.009)) * 0.12;
    }
  });

  return (
    <group>
      {useGlbModels && (
        <SafeGLTFModel
          url="/models/character.glb"
          scale={0.35}
          position={[0, 0.2, 0]}
          fallback={null}
        />
      )}

      <mesh ref={leftLegRef} castShadow position={[-0.15, 0.225, 0]}>
        <boxGeometry args={[0.22, 0.45, 0.22]} />
        <meshLambertMaterial color={base.legs} />
        <OutfitLeg id={outfitId} />
      </mesh>
      <mesh ref={rightLegRef} castShadow position={[0.15, 0.225, 0]}>
        <boxGeometry args={[0.22, 0.45, 0.22]} />
        <meshLambertMaterial color={base.legs} />
        <OutfitLeg id={outfitId} />
      </mesh>

      <mesh castShadow position={[0, 0.74, 0]}>
        <boxGeometry args={[0.58, 0.62, 0.36]} />
        <meshLambertMaterial color={base.torso} />
      </mesh>
      <OutfitBody id={outfitId} />

      <mesh castShadow position={[0, 1.32, 0]}>
        <boxGeometry args={[0.46, 0.46, 0.46]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 1.34, 0.23]}>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
          <meshBasicMaterial color="#1e293b" />
        </mesh>
      ))}

      <mesh position={[-0.39, 0.76, 0]}>
        <boxGeometry args={[0.18, 0.48, 0.18]} />
        <meshLambertMaterial color={base.arms} />
        <OutfitArm id={outfitId} />
      </mesh>
      <group ref={rightArmRef} position={[0.39, 0.98, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.18, 0.48, 0.18]} />
          <meshLambertMaterial color={base.arms} />
          <OutfitArm id={outfitId} />
        </mesh>
        <group position={[0, -0.4, 0.25]}>
          {tool && <HeldTool tool={tool} tier={toolTier} />}
        </group>
      </group>

      <group position={[0, 1.55, 0]}>
        <Hat id={cosmetics.hat} />
      </group>

      <BackItem id={cosmetics.wing} />
      {hasWings && (
        <>
          <group ref={wingLRef} position={[-0.14, 0.9, -0.2]}>
            <Wing id={cosmetics.wing} side={-1} />
          </group>
          <group ref={wingRRef} position={[0.14, 0.9, -0.2]}>
            <Wing id={cosmetics.wing} side={1} />
          </group>
        </>
      )}

      {hasPet && (
        <group ref={petRef} position={[-0.85, 0, -0.75]}>
          <Pet id={cosmetics.pet} />
        </group>
      )}
    </group>
  );
}
