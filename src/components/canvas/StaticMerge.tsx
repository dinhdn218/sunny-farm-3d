'use client';

import { ReactNode, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// userData for a node that moves or changes by itself (a ref animated in useFrame, a component with its own state):
// <StaticMerge> leaves it, and everything under it, as it is
export const ANIMATED = Object.freeze({ animated: true });

const MERGEABLE_MATERIALS = new Set([
  'MeshBasicMaterial',
  'MeshLambertMaterial',
  'MeshPhongMaterial',
  'MeshStandardMaterial',
]);
const TEXTURE_SLOTS = [
  'map',
  'alphaMap',
  'aoMap',
  'lightMap',
  'emissiveMap',
  'envMap',
  'bumpMap',
  'normalMap',
  'displacementMap',
  'specularMap',
  'roughnessMap',
  'metalnessMap',
] as const;

// How often (in frames) the children are looked over for changes nothing announced
const RECHECK_FRAMES = 60;

type AnyMaterial = THREE.Material &
  Partial<Record<(typeof TEXTURE_SLOTS)[number], unknown>> & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    specular?: THREE.Color;
    shininess?: number;
    roughness?: number;
    metalness?: number;
    flatShading?: boolean;
    fog?: boolean;
    wireframe?: boolean;
  };

type Drawable = THREE.Object3D & {
  isMesh?: boolean;
  isLine?: boolean;
  isPoints?: boolean;
  isSprite?: boolean;
  isInstancedMesh?: boolean;
  isSkinnedMesh?: boolean;
  isBatchedMesh?: boolean;
};

interface Part {
  mesh: THREE.Mesh;
  matrix: THREE.Matrix4;
}

const colorKey = (c?: THREE.Color) => (c ? c.getHexString() : '-');

function mergeable(o: Drawable): o is THREE.Mesh {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || o.layers.mask !== 1) return false;
  const { geometry: g, material } = o as THREE.Mesh;
  if (Array.isArray(material) || !MERGEABLE_MATERIALS.has(material.type)) return false;
  const m = material as AnyMaterial;
  return (
    !!g.attributes.position &&
    !!g.attributes.normal &&
    Object.keys(g.morphAttributes).length === 0 &&
    g.drawRange.start === 0 &&
    g.drawRange.count === Infinity &&
    m.visible &&
    !m.transparent &&
    m.opacity === 1 &&
    !m.vertexColors &&
    !m.wireframe &&
    m.alphaTest === 0 &&
    !m.clippingPlanes &&
    TEXTURE_SLOTS.every((slot) => !m[slot])
  );
}

// Meshes drawn together must look the same apart from their colour
function bucketKey(mesh: THREE.Mesh) {
  const m = mesh.material as AnyMaterial;
  return [
    m.type,
    m.side,
    m.flatShading,
    m.fog,
    m.toneMapped,
    m.depthTest,
    m.depthWrite,
    m.colorWrite,
    m.blending,
    m.polygonOffset,
    m.polygonOffsetFactor,
    m.polygonOffsetUnits,
    colorKey(m.emissive),
    m.emissiveIntensity,
    colorKey(m.specular),
    m.shininess,
    m.roughness,
    m.metalness,
    mesh.castShadow,
    mesh.receiveShadow,
    mesh.renderOrder,
    mesh.frustumCulled,
  ].join('|');
}

// Gathers the meshes under `o` that can be merged (with their transform relative to the merge group) and every node
// looked at. True when `o` and everything below it is merged, so it may be hidden as a whole.
function collect(
  o: Drawable,
  parentMatrix: THREE.Matrix4,
  buckets: Map<string, Part[]>,
  visited: THREE.Object3D[]
): boolean {
  if (o.userData.animated || o.userData.merged || !o.visible) return false;
  visited.push(o);
  o.updateMatrix();
  const matrix = new THREE.Matrix4().multiplyMatrices(parentMatrix, o.matrix);
  let allMerged = true;
  for (const child of o.children) {
    if (!collect(child, matrix, buckets, visited)) allMerged = false;
  }
  if (allMerged && mergeable(o)) {
    const key = bucketKey(o);
    const parts = buckets.get(key) ?? [];
    parts.push({ mesh: o, matrix });
    buckets.set(key, parts);
    return true;
  }
  // Whatever else draws (lines, points, transparent or textured meshes) stays as it is
  return allMerged && !o.isMesh && !o.isLine && !o.isPoints && !o.isSprite;
}

const v = new THREE.Vector3();
const normalMatrix = new THREE.Matrix3();

// One geometry holding every part, moved into the merge group's space, with each part's colour on its vertices
function mergeParts(parts: Part[]) {
  let vertices = 0;
  let indices = 0;
  for (const { mesh } of parts) {
    const g = mesh.geometry;
    vertices += g.attributes.position.count;
    indices += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const colors = new Float32Array(vertices * 3);
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);

  let vi = 0;
  let ii = 0;
  for (const { mesh, matrix } of parts) {
    const { position, normal } = mesh.geometry.attributes;
    const sourceIndex = mesh.geometry.index;
    const color = (mesh.material as AnyMaterial).color;
    normalMatrix.getNormalMatrix(matrix);
    for (let k = 0; k < position.count; k++) {
      const o = (vi + k) * 3;
      v.fromBufferAttribute(position, k).applyMatrix4(matrix);
      positions[o] = v.x;
      positions[o + 1] = v.y;
      positions[o + 2] = v.z;
      v.fromBufferAttribute(normal, k).applyNormalMatrix(normalMatrix);
      normals[o] = v.x;
      normals[o + 1] = v.y;
      normals[o + 2] = v.z;
      colors[o] = color ? color.r : 1;
      colors[o + 1] = color ? color.g : 1;
      colors[o + 2] = color ? color.b : 1;
    }
    // A mirroring transform turns triangles inside out: swapping two corners keeps their front faces in front
    const mirrored = matrix.determinant() < 0;
    const count = sourceIndex ? sourceIndex.count : position.count;
    for (let k = 0; k < count; k += 3) {
      const a = sourceIndex ? sourceIndex.getX(k) : k;
      const b = sourceIndex ? sourceIndex.getX(k + 1) : k + 1;
      const c = sourceIndex ? sourceIndex.getX(k + 2) : k + 2;
      index[ii++] = vi + a;
      index[ii++] = vi + (mirrored ? c : b);
      index[ii++] = vi + (mirrored ? b : c);
    }
    vi += position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(index, 1));
  merged.computeBoundingSphere();
  return merged;
}

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);
const mix = (h: number, x: number) => Math.imul(h ^ x, 16777619) >>> 0;
const mixFloat = (h: number, x: number) => {
  f32[0] = x;
  return mix(h, u32[0]);
};

// Fingerprint of what a subtree draws: its objects, transforms, geometries and colours (the merge's own meshes and
// the originals it hid count as they were)
function fingerprint(o: THREE.Object3D, hidden: Set<THREE.Object3D>, h: number): number {
  if (o.userData.merged) return h;
  h = mix(h, o.id);
  if (o.userData.animated) return h;
  h = mix(h, o.visible || hidden.has(o) ? 1 : 0);
  const { position: p, quaternion: q, scale: s } = o;
  h = mixFloat(mixFloat(mixFloat(h, p.x), p.y), p.z);
  h = mixFloat(mixFloat(mixFloat(mixFloat(h, q.x), q.y), q.z), q.w);
  h = mixFloat(mixFloat(mixFloat(h, s.x), s.y), s.z);
  const mesh = o as THREE.Mesh;
  if (mesh.isMesh) {
    h = mix(mix(h, mesh.geometry.id), (mesh.castShadow ? 1 : 0) | (mesh.receiveShadow ? 2 : 0));
    // Not material.version: three.js bumps it twice a frame while drawing a see-through double-sided material
    for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as AnyMaterial[]) {
      h = mixFloat(mix(h, m.id), m.opacity);
      h = mix(h, (m.transparent ? 1 : 0) | (m.visible ? 2 : 0) | (m.vertexColors ? 4 : 0) | (m.side << 3));
      if (m.color) h = mix(h, m.color.getHex());
      if (m.emissive) h = mix(h, m.emissive.getHex());
    }
  }
  for (const child of o.children) h = fingerprint(child, hidden, h);
  return h;
}

// Keeps a group's static meshes merged, and merges again whenever what they draw changes
class Merger {
  private meshes: THREE.Mesh[] = [];
  private hidden = new Set<THREE.Object3D>();
  private watched: THREE.Object3D[] = [];
  private frozen: THREE.Object3D[] = [];
  private print = 0;
  private dirty = false;
  // Spread over the frames so a crowd of merge groups never checks in the same frame
  private frames = Math.floor(Math.random() * RECHECK_FRAMES);

  constructor(private readonly root: THREE.Group) {
    // three.js recomputes every object's matrices every frame. The static nodes under the group are frozen
    // (matrixAutoUpdate off), and the group only pushes new world matrices down to them when it has itself moved;
    // anything still updating itself (the animated parts) keeps doing so
    const before = new THREE.Matrix4();
    root.updateMatrixWorld = function (this: THREE.Group, force?: boolean) {
      if (this.matrixAutoUpdate) this.updateMatrix();
      if (this.matrixWorldNeedsUpdate || force) {
        before.copy(this.matrixWorld);
        if (this.matrixWorldAutoUpdate) {
          if (this.parent === null) this.matrixWorld.copy(this.matrix);
          else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
        }
        this.matrixWorldNeedsUpdate = false;
        force = !this.matrixWorld.equals(before);
      }
      for (const child of this.children) child.updateMatrixWorld(force);
    };
  }

  // Children added or removed by a component that rendered on its own
  private readonly onChildren = (event: { child: THREE.Object3D | null }) => {
    if (!event.child?.userData.merged) this.dirty = true;
  };

  update() {
    this.dirty = false;
    const print = this.root.children.reduce((h, child) => fingerprint(child, this.hidden, h), 2166136261);
    if (print === this.print && this.watched.length) return;
    this.undo();
    this.print = print;

    const buckets = new Map<string, Part[]>();
    const identity = new THREE.Matrix4();
    for (const child of this.root.children) collect(child, identity, buckets, this.watched);
    // Their matrices were just brought up to date (see collect)
    this.frozen = this.watched.filter((o) => o.matrixAutoUpdate);
    this.frozen.forEach((o) => (o.matrixAutoUpdate = false));
    this.watched.push(this.root);
    this.watched.forEach((o) => {
      o.addEventListener('childadded', this.onChildren);
      o.addEventListener('childremoved', this.onChildren);
    });

    // Drawn in three.js's order for separate meshes (by material, oldest first), so where two faces lie flush on
    // each other the same one stays on top
    const order = (p: Part) => (p.mesh.material as THREE.Material).id;
    const sorted = Array.from(buckets.values()).map((parts) =>
      parts.sort((a, b) => order(a) - order(b) || a.mesh.id - b.mesh.id)
    );
    sorted.sort((a, b) => order(a[0]) - order(b[0]));

    sorted.forEach((parts) => {
      const source = parts[0].mesh;
      const material = (source.material as AnyMaterial).clone() as AnyMaterial;
      material.vertexColors = true;
      material.color?.setRGB(1, 1, 1);
      const mesh = new THREE.Mesh(mergeParts(parts), material);
      mesh.castShadow = source.castShadow;
      mesh.receiveShadow = source.receiveShadow;
      // Ground that only takes shadows (tiles, paths, floors) is drawn after the solid things standing on it, so the
      // GPU skips shading it where they hide it (see BaseIsland)
      mesh.renderOrder = source.renderOrder + (source.receiveShadow && !source.castShadow ? 1 : 0);
      mesh.frustumCulled = source.frustumCulled;
      // Clicks and hovers keep going to the originals, which stay where they are (hidden)
      mesh.raycast = () => {};
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.userData.merged = true;
      this.root.add(mesh);
      this.meshes.push(mesh);
      parts.forEach(({ mesh: original }) => {
        original.visible = false;
        this.hidden.add(original);
      });
    });
  }

  // Once a frame: merge again if a child changed without this group rendering
  tick() {
    if (this.dirty || ++this.frames % RECHECK_FRAMES === 0) this.update();
  }

  undo() {
    this.watched.forEach((o) => {
      o.removeEventListener('childadded', this.onChildren);
      o.removeEventListener('childremoved', this.onChildren);
    });
    this.watched = [];
    this.frozen.forEach((o) => (o.matrixAutoUpdate = true));
    this.frozen = [];
    this.meshes.forEach((mesh) => {
      this.root.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.meshes = [];
    this.hidden.forEach((o) => (o.visible = true));
    this.hidden.clear();
  }
}

// Draws everything static under it in as few draw calls as possible: meshes that differ only in colour become one mesh
// with the colours on its vertices. The picture is exactly the same (same triangles, shading, fog and shadows), but a
// blocky model of 40 boxes costs 2 or 3 draw calls instead of 40. The original meshes stay in place, hidden, so clicks,
// hovers and React keep working on them. Anything that moves or changes by itself must be marked
// `userData={ANIMATED}`; when what the rest draws changes (another outfit, a crop grows) it is merged again.
export function StaticMerge({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const merger = useRef<Merger | null>(null);

  // After every render, merge again if the children now draw something else
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    merger.current ??= new Merger(groupRef.current);
    merger.current.update();
  });

  useLayoutEffect(
    () => () => {
      merger.current?.undo();
      merger.current = null;
    },
    []
  );

  useFrame(() => merger.current?.tick());

  return <group ref={groupRef}>{children}</group>;
}
