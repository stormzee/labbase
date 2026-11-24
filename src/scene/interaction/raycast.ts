import * as THREE from 'three';
import type { ApparatusId } from '../../domain/types';

export interface SceneHit {
  apparatusId: ApparatusId;
  partId: string | null;
  point: THREE.Vector3;
  distance: number;
}

const isApparatusId = (value: unknown): value is ApparatusId =>
  typeof value === 'string' &&
  [
    'burette',
    'flask',
    'pipette',
    'beaker',
    'cylinder',
    'washBottle',
    'retortStand',
    'hclBottle',
    'naohBottle',
    'indicator',
  ].includes(value);

export function apparatusOwner(object: THREE.Object3D): {
  apparatusId: ApparatusId | null;
  partId: string | null;
} {
  let current: THREE.Object3D | null = object;
  let apparatusId: ApparatusId | null = null;
  let partId: string | null = null;
  while (current) {
    if (!apparatusId && isApparatusId(current.userData?.apparatusId)) {
      apparatusId = current.userData.apparatusId;
    }
    if (!partId && typeof current.userData?.partId === 'string') {
      partId = current.userData.partId;
    }
    if (apparatusId && partId) break;
    current = current.parent;
  }
  return { apparatusId, partId };
}

export type HitFilter = (owner: { apparatusId: ApparatusId; partId: string | null }) => boolean;

/** Nearest interactive apparatus under the ray; ignores room/bench geometry. */
export function pickSceneHit(
  root: THREE.Object3D | null,
  raycaster: THREE.Raycaster,
  filter?: HitFilter,
): SceneHit | null {
  if (!root) return null;
  const intersections = raycaster.intersectObject(root, true);
  for (const intersection of intersections) {
    const owner = apparatusOwner(intersection.object);
    if (!owner.apparatusId) continue;
    if (filter && !filter({ apparatusId: owner.apparatusId, partId: owner.partId })) continue;
    return {
      apparatusId: owner.apparatusId,
      partId: owner.partId,
      point: intersection.point.clone(),
      distance: intersection.distance,
    };
  }
  return null;
}

const BENCH_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);

/** Point where the hand/pointer ray meets the bench plane. */
export function benchIntersection(
  ndc: { x: number; y: number },
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
): THREE.Vector3 | null {
  raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(BENCH_PLANE, point) ? point : null;
}

export function ndcToClient(
  ndc: { x: number; y: number },
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + ((ndc.x + 1) / 2) * rect.width,
    y: rect.top + ((1 - ndc.y) / 2) * rect.height,
  };
}
