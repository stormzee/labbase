import { BENCH_BOUNDS, BENCH_TOP_Y } from './constants';
import type { ApparatusId, ApparatusPlacements, Placement, SnapId, Vec3 } from './types';

export interface SnapZone {
  id: SnapId;
  apparatusId: ApparatusId;
  position: Vec3;
  rotation: Vec3;
  /** Horizontal snap radius in metres. */
  radius: number;
  label: string;
  hint: string;
}

/**
 * Fixed poses that apparatus can snap into. Only the matching apparatus may occupy a zone.
 * Coordinates are world-space metres; each apparatus' origin sits at its base/tip.
 */
export const SNAP_ZONES: readonly SnapZone[] = [
  {
    id: 'buretteClamp',
    apparatusId: 'burette',
    position: [-0.62, 0.92, -0.06],
    rotation: [0, 0, 0],
    radius: 0.24,
    label: 'Burette clamp',
    hint: 'Clamped vertically on the retort stand',
  },
  {
    id: 'buretteRest',
    apparatusId: 'burette',
    position: [0.62, 0.818, 0.27],
    rotation: [0, 0, Math.PI / 2],
    radius: 0.26,
    label: 'Bench rest',
    hint: 'Lying safely on the bench',
  },
  {
    id: 'flaskBay',
    apparatusId: 'flask',
    position: [-0.62, BENCH_TOP_Y, -0.06],
    rotation: [0, 0, 0],
    radius: 0.18,
    label: 'Titration bay',
    hint: 'Centred under the burette tip',
  },
  {
    id: 'pipetteRack',
    apparatusId: 'pipette',
    position: [0.02, 0.85, -0.29],
    rotation: [0, 0, Math.PI / 2],
    radius: 0.2,
    label: 'Pipette rack',
    hint: 'Resting in the pipette rack',
  },
  {
    id: 'beakerZone',
    apparatusId: 'beaker',
    position: [0.88, BENCH_TOP_Y, 0.12],
    rotation: [0, 0, 0],
    radius: 0.14,
    label: 'Beaker zone',
    hint: 'Front-right bench position',
  },
  {
    id: 'cylinderZone',
    apparatusId: 'cylinder',
    position: [1.02, BENCH_TOP_Y, 0.27],
    rotation: [0, 0, 0],
    radius: 0.14,
    label: 'Cylinder zone',
    hint: 'Front-right bench position',
  },
  {
    id: 'washBottleZone',
    apparatusId: 'washBottle',
    position: [0.98, BENCH_TOP_Y, -0.04],
    rotation: [0, 0, 0],
    radius: 0.14,
    label: 'Wash bottle zone',
    hint: 'Right-hand bench position',
  },
] as const;

export const zoneById = (id: SnapId): SnapZone | undefined => SNAP_ZONES.find((zone) => zone.id === id);

export const distanceXZ = (a: Vec3 | readonly [number, number, number], b: Vec3): number =>
  Math.hypot(a[0] - b[0], a[2] - b[2]);

/**
 * Nearest compatible, unoccupied zone within its radius.
 * Y is deliberately ignored: gestures drag on the bench plane, while the clamp is elevated.
 */
export function findSnap(
  apparatusId: ApparatusId,
  position: Vec3,
  placements?: ApparatusPlacements,
  zones: readonly SnapZone[] = SNAP_ZONES,
): SnapZone | null {
  let best: SnapZone | null = null;
  let bestDistance = Infinity;
  for (const zone of zones) {
    if (zone.apparatusId !== apparatusId) continue;
    const occupied =
      placements &&
      Object.entries(placements).some(
        ([id, placement]) => id !== apparatusId && placement.snappedTo === zone.id,
      );
    if (occupied) continue;
    const distance = distanceXZ(position, zone.position);
    if (distance <= zone.radius && distance < bestDistance) {
      best = zone;
      bestDistance = distance;
    }
  }
  return best;
}

export function clampToBench(position: Vec3, inset = 0.09): Vec3 {
  const safe = position.map((value) => (Number.isFinite(value) ? value : 0)) as Vec3;
  return [
    Math.min(BENCH_BOUNDS.maxX - inset, Math.max(BENCH_BOUNDS.minX + inset, safe[0])),
    BENCH_TOP_Y,
    Math.min(BENCH_BOUNDS.maxZ - inset, Math.max(BENCH_BOUNDS.minZ + inset, safe[2])),
  ];
}

export interface ResolvePlacementInput {
  apparatusId: ApparatusId;
  position: Vec3;
  placements?: ApparatusPlacements;
}

/**
 * Resolve a release into a legal pose.
 * The burette can only be clamped or laid in the bench rest; other apparatus may sit anywhere on
 * the bench, but nearby zones are magnetic.
 */
export function resolvePlacement({ apparatusId, position, placements }: ResolvePlacementInput): Placement {
  const snap = findSnap(apparatusId, position, placements);
  if (snap) {
    return { position: [...snap.position], rotation: [...snap.rotation], snappedTo: snap.id };
  }
  if (apparatusId === 'burette') {
    const rest = SNAP_ZONES.find((zone) => zone.id === 'buretteRest')!;
    return { position: [...rest.position], rotation: [...rest.rotation], snappedTo: 'buretteRest' };
  }
  return { position: clampToBench(position), rotation: [0, 0, 0], snappedTo: null };
}

export const isClamped = (placement: Placement): boolean => placement.snappedTo === 'buretteClamp';

export const INITIAL_PLACEMENTS: ApparatusPlacements = {
  burette: { position: [0.62, 0.818, 0.27], rotation: [0, 0, Math.PI / 2], snappedTo: 'buretteRest' },
  flask: { position: [0.36, BENCH_TOP_Y, 0.02], rotation: [0, 0, 0], snappedTo: null },
  pipette: { position: [0.02, 0.85, -0.29], rotation: [0, 0, Math.PI / 2], snappedTo: 'pipetteRack' },
  beaker: { position: [0.88, BENCH_TOP_Y, 0.12], rotation: [0, 0, 0], snappedTo: 'beakerZone' },
  cylinder: { position: [1.02, BENCH_TOP_Y, 0.27], rotation: [0, 0, 0], snappedTo: 'cylinderZone' },
  washBottle: { position: [0.98, BENCH_TOP_Y, -0.04], rotation: [0, 0, 0], snappedTo: 'washBottleZone' },
  retortStand: { position: [-0.92, BENCH_TOP_Y, -0.1], rotation: [0, 0, 0], snappedTo: null },
  hclBottle: { position: [0.52, BENCH_TOP_Y, -0.28], rotation: [0, 0, 0], snappedTo: null },
  naohBottle: { position: [0.72, BENCH_TOP_Y, -0.28], rotation: [0, 0, 0], snappedTo: null },
  indicator: { position: [0.3, BENCH_TOP_Y, -0.28], rotation: [0, 0, 0], snappedTo: null },
};

export const clonePlacements = (placements: ApparatusPlacements): ApparatusPlacements =>
  Object.fromEntries(
    Object.entries(placements).map(([id, placement]) => [
      id,
      { ...placement, position: [...placement.position], rotation: [...placement.rotation] },
    ]),
  ) as ApparatusPlacements;
