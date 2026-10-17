'use client';

import { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MachineId } from '@/types/game';
import { FIELD_BORDER, TILE_SIZE, plotOfTile, tileToWorld } from '@/config/farm';
import { SEASON_LOOK } from '@/config/seasons';
import { isMachineId } from '@/config/machines';
import {
  BARN_OFFSET,
  FARM_SITES,
  FARM_TREES,
  farmBands,
  fieldRect,
  islandShape,
  ranchOffset,
  stretchPoint,
} from '@/lib/farmLayout';
import { seasonOf } from '@/lib/seasons';
import { daysUntilGrown } from '@/lib/trees';
import { FarmView } from '@/lib/visit';
import { now as clockNow } from '@/lib/clock';
import { refreshStages } from '@/lib/growth';
import { useGameStore } from '@/store/useGameStore';
import { CropMesh } from './models/CropMesh';
import { DecorModel } from './models/DecorModel';
import { MachineModel } from './models/MachineModel';
import { BuildPieceModel } from './models/BuildPieceModel';
import { AnimalMesh } from './models/AnimalMesh';
import { AvatarMesh, createMotion } from './models/AvatarMesh';
import { Tree } from './environment/Props';

// Same rendering setup as the game canvas (see GameCanvas)
const LEGACY_LIGHT_SCALE = Math.PI;

// Someone else's farm as it stands, to look round but not touch
function Farm({ farm }: { farm: FarmView }) {
  const motion = useRef(createMotion()).current;
  // Their crops as they stand now, in today's season (their save may be hours old)
  const day = useGameStore((s) => s.day);
  const tiles = useMemo(() => refreshStages(farm.tiles, clockNow()), [farm.tiles]);
  const look = SEASON_LOOK[seasonOf(day)];
  const bands = useMemo(() => farmBands(farm.ownedPlots), [farm.ownedPlots]);
  const field = useMemo(() => fieldRect(farm.ownedPlots), [farm.ownedPlots]);
  const island = useMemo(() => islandShape('farm', farm.ownedPlots), [farm.ownedPlots]);
  const at = ([x, z]: [number, number]) => stretchPoint(x, z, bands);
  const [houseX, houseZ] = at(FARM_SITES.house);
  const [binX, binZ] = at(FARM_SITES.shippingBin);
  const [shopX, shopZ] = at(FARM_SITES.seedShop);
  const [wellX, wellZ] = at(FARM_SITES.well);
  const [ranchDx, ranchDz] = ranchOffset(farm.ownedPlots);
  const owned = new Set(farm.ownedPlots);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[island.cx, -0.02, island.cz]} scale={[island.rx, island.rz, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshLambertMaterial color={look.farmGround} />
      </mesh>
      <mesh position={[(field.minX + field.maxX) / 2, 0.01, (field.minZ + field.maxZ) / 2]}>
        <boxGeometry args={[field.maxX - field.minX, 0.12, field.maxZ - field.minZ]} />
        <meshLambertMaterial color="#78350f" />
      </mesh>

      {tiles.map((tile) => {
        const { x, z } = tileToWorld(tile.r, tile.c);
        if (x < field.minX + FIELD_BORDER || x > field.maxX - FIELD_BORDER) return null;
        if (z < field.minZ + FIELD_BORDER || z > field.maxZ - FIELD_BORDER) return null;
        const mine = owned.has(plotOfTile(tile.r, tile.c));
        const worked = mine && tile.state !== 'empty';
        return (
          <group key={tile.id} position={[x, 0.08, z]}>
            <mesh>
              <boxGeometry args={[TILE_SIZE * 0.92, 0.14, TILE_SIZE * 0.92]} />
              <meshLambertMaterial color={!mine ? look.wildGrass : worked ? '#78350f' : look.grass} />
            </mesh>
            {mine && tile.state === 'planted' && tile.crop && (
              <group position={[0, 0.12, 0]}>
                <CropMesh crop={tile.crop} stage={tile.stage} seed={tile.r + tile.c} />
              </group>
            )}
          </group>
        );
      })}

      {/* Farmhouse, shipping bin, seed stall and well */}
      <group position={[houseX, 0, houseZ]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[3.6, 2.4, 3.0]} />
          <meshLambertMaterial color="#fef3c7" />
        </mesh>
        <mesh position={[0, 3.25, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[3.1, 1.8, 4]} />
          <meshLambertMaterial color="#b91c1c" />
        </mesh>
      </group>
      <mesh position={[binX, 0.5, binZ]}>
        <boxGeometry args={[1.35, 1.0, 0.95]} />
        <meshLambertMaterial color="#dc2626" />
      </mesh>
      <group position={[shopX, 0, shopZ]}>
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[2.6, 1.05, 1.4]} />
          <meshLambertMaterial color="#92400e" />
        </mesh>
        <mesh position={[0, 2.35, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[2.1, 0.95, 4]} />
          <meshLambertMaterial color="#10b981" />
        </mesh>
      </group>
      <mesh position={[wellX, 0.475, wellZ]}>
        <cylinderGeometry args={[1.1, 1.2, 0.95, 12]} />
        <meshLambertMaterial color="#64748b" />
      </mesh>

      {FARM_TREES.map((t) => {
        const [x, z] = at([t.x, t.z]);
        return <Tree key={`${t.x}_${t.z}`} x={x} z={z} scale={t.scale} type={t.type} />;
      })}

      {/* Pasture and barn, with the animals out grazing */}
      <group position={[FARM_SITES.ranch[0] + ranchDx, 0, FARM_SITES.ranch[1] + ranchDz]}>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[6.2, 0.06, 5.4]} />
          <meshLambertMaterial color={look.pasture} />
        </mesh>
        <group position={[BARN_OFFSET[0], 0, BARN_OFFSET[1]]}>
          <mesh position={[0, 1.35, 0]}>
            <boxGeometry args={[3.4, 2.7, 2.6]} />
            <meshLambertMaterial color="#dc2626" />
          </mesh>
          <mesh position={[0, 3.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[2.9, 1.5, 4]} />
            <meshLambertMaterial color="#7f1d1d" />
          </mesh>
        </group>
      </group>
      {farm.animals.map((animal) => (
        <AnimalMesh key={animal.id} animal={animal} offset={[ranchDx, ranchDz]} interactive={false} />
      ))}

      {Object.entries(farm.decorPlacements).map(([id, p]) => {
        if (isMachineId(id)) {
          if (!farm.machines[id as MachineId]) return null;
        } else if (!farm.ownedCosmetics.includes(id)) {
          return null;
        }
        return (
          <group key={id} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
            {isMachineId(id) ? <MachineModel id={id} job={null} /> : <DecorModel id={id} />}
          </group>
        );
      })}

      {farm.buildPieces.map((p) => (
        <group key={`${p.x}_${p.z}`} position={[p.x, 0, p.z]} rotation={[0, p.rotY, 0]}>
          <BuildPieceModel
            kind={p.kind}
            leaves={look.oak}
            winter={seasonOf(day) === 'winter'}
            grown={daysUntilGrown(p, day) === 0}
            fruit={p.fruit ?? 0}
          />
        </group>
      ))}

      {/* The farmer waiting at the door */}
      <group position={[houseX, 0.08, houseZ + 2.0]}>
        <AvatarMesh cosmetics={farm.cosmetics} motion={motion} />
      </group>
    </group>
  );
}

export default function FarmDiorama({ farm }: { farm: FarmView }) {
  return (
    <Canvas
      flat
      linear
      legacy
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: 40, near: 0.5, far: 200, position: [14, 19, 23] }}
    >
      <ambientLight intensity={0.75 * LEGACY_LIGHT_SCALE} />
      <directionalLight position={[12, 24, 10]} intensity={0.85 * LEGACY_LIGHT_SCALE} />
      <Farm farm={farm} />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.6}
        enablePan={false}
        minDistance={10}
        maxDistance={60}
        maxPolarAngle={1.25}
      />
    </Canvas>
  );
}
