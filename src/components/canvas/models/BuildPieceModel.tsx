'use client';

import { BuildPieceId } from '@/types/game';
import { BUILD_CELL } from '@/lib/build';
import { Block, Mat } from './DecorModel';

const HALF = BUILD_CELL / 2;
const FLOWERS: [number, number, string][] = [
  [-0.28, -0.28, '#ef4444'],
  [0.28, -0.28, '#facc15'],
  [0, 0, '#ec4899'],
  [-0.28, 0.28, '#a855f7'],
  [0.28, 0.28, '#ffffff'],
];

// One building piece, centred on its grid cell. `leaves` follows the season, `winter` puts snow
// on the flower beds and `night` lights the lamps.
export function BuildPieceModel({
  kind,
  ghost,
  leaves = '#4d7c0f',
  winter = false,
  night = false,
  grown = false,
  fruit = 0,
}: {
  kind: BuildPieceId;
  ghost?: boolean;
  leaves?: string;
  winter?: boolean;
  night?: boolean;
  // Fruit trees: grown yet, and the fruit hanging on it
  grown?: boolean;
  fruit?: number;
}) {
  switch (kind) {
    // White picket fence along the cell; posts on the cell edges meet the next piece's
    case 'fence':
      return (
        <group>
          {[-HALF + 0.07, HALF - 0.07].map((x) => (
            <Block key={x} size={[0.12, 0.72, 0.12]} at={[x, 0.36, 0]} color="#e7e5e4" ghost={ghost} shadow />
          ))}
          {[0.28, 0.54].map((y) => (
            <Block key={y} size={[BUILD_CELL, 0.08, 0.06]} at={[0, y, 0]} color="#fafaf9" ghost={ghost} shadow />
          ))}
          {[-0.3, 0, 0.3].map((x) => (
            <Block key={x} size={[0.1, 0.62, 0.04]} at={[x, 0.31, 0]} color="#f5f5f4" ghost={ghost} />
          ))}
        </group>
      );

    // Flagstones set in gravel
    case 'path':
      return (
        <group>
          <Block size={[BUILD_CELL - 0.04, 0.04, BUILD_CELL - 0.04]} at={[0, 0.02, 0]} color="#a8a29e" ghost={ghost} />
          {[
            [-0.3, -0.3],
            [0.31, -0.28],
            [-0.29, 0.31],
            [0.3, 0.3],
          ].map(([x, z]) => (
            <Block key={`${x}_${z}`} size={[0.54, 0.03, 0.54]} at={[x, 0.045, z]} color="#e7e5e4" ghost={ghost} />
          ))}
        </group>
      );

    case 'lamp':
      return (
        <group>
          <Block size={[0.34, 0.1, 0.34]} at={[0, 0.05, 0]} color="#1f2937" ghost={ghost} />
          <mesh position={[0, 0.95, 0]} castShadow={!ghost}>
            <cylinderGeometry args={[0.05, 0.06, 1.8, 8]} />
            <Mat color="#334155" ghost={ghost} />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <boxGeometry args={[0.3, 0.32, 0.3]} />
            <Mat color={night ? '#fde047' : '#fef9c3'} ghost={ghost} glow />
          </mesh>
          <mesh position={[0, 2.19, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.28, 0.18, 4]} />
            <Mat color="#1f2937" ghost={ghost} />
          </mesh>
          {night && !ghost && (
            <mesh position={[0, 1.95, 0]}>
              <sphereGeometry args={[0.55, 12, 10]} />
              <meshBasicMaterial color="#fde68a" transparent opacity={0.22} depthWrite={false} />
            </mesh>
          )}
        </group>
      );

    // Wooden planter: flowers most of the year, snow in winter
    case 'flowerbed':
      return (
        <group>
          <Block size={[1.1, 0.24, 1.1]} at={[0, 0.12, 0]} color="#92400e" ghost={ghost} shadow />
          <Block size={[0.96, 0.02, 0.96]} at={[0, 0.245, 0]} color={winter ? '#f8fafc' : '#57361a'} ghost={ghost} />
          {!winter &&
            FLOWERS.map(([x, z, color]) => (
              <group key={`${x}_${z}`}>
                <Block size={[0.04, 0.2, 0.04]} at={[x, 0.34, z]} color="#15803d" ghost={ghost} />
                <Block size={[0.16, 0.12, 0.16]} at={[x, 0.48, z]} color={color} ghost={ghost} />
              </group>
            ))}
        </group>
      );

    case 'bush':
      return (
        <group>
          <mesh position={[0, 0.42, 0]} castShadow={!ghost}>
            <dodecahedronGeometry args={[0.48, 0]} />
            <Mat color={leaves} ghost={ghost} />
          </mesh>
          <mesh position={[0.24, 0.66, 0.12]} castShadow={!ghost}>
            <dodecahedronGeometry args={[0.3, 0]} />
            <Mat color={leaves} ghost={ghost} />
          </mesh>
        </group>
      );

    case 'mango_tree':
    case 'orange_tree':
      return <FruitTree kind={kind} ghost={ghost} grown={grown} fruit={fruit} />;
  }
}

const FRUIT_LOOK = {
  mango_tree: { leaves: '#166534', fruit: '#f59e0b', stretch: 1.35 },
  orange_tree: { leaves: '#15803d', fruit: '#f97316', stretch: 1 },
};
// Where the fruit hang on the crown
const FRUIT_SPOTS: [number, number, number][] = [
  [0.42, 1.25, 0.22],
  [-0.38, 1.35, 0.26],
  [0.05, 1.18, 0.48],
];

// A sapling until it has grown, then a round crown with its fruit
function FruitTree({
  kind,
  ghost,
  grown,
  fruit,
}: {
  kind: 'mango_tree' | 'orange_tree';
  ghost?: boolean;
  grown: boolean;
  fruit: number;
}) {
  const look = FRUIT_LOOK[kind];
  if (!grown) {
    return (
      <group>
        <Block size={[0.08, 0.5, 0.08]} at={[0, 0.25, 0]} color="#78350f" ghost={ghost} />
        <mesh position={[0, 0.58, 0]}>
          <dodecahedronGeometry args={[0.22, 0]} />
          <Mat color={look.leaves} ghost={ghost} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <Block size={[0.18, 0.9, 0.18]} at={[0, 0.45, 0]} color="#78350f" ghost={ghost} shadow />
      <mesh position={[0, 1.3, 0]} castShadow={!ghost}>
        <dodecahedronGeometry args={[0.55, 1]} />
        <Mat color={look.leaves} ghost={ghost} />
      </mesh>
      {FRUIT_SPOTS.slice(0, fruit).map((at) => (
        <mesh key={at.join()} position={at} scale={[1, look.stretch, 1]}>
          <sphereGeometry args={[0.1, 10, 8]} />
          <Mat color={look.fruit} ghost={ghost} />
        </mesh>
      ))}
    </group>
  );
}
