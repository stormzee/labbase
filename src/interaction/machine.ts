import type { ApparatusId, ApparatusPlacements, Placement, Vec3 } from '../domain/types';

export type ManipulationPhase = 'idle' | 'hover' | 'selected' | 'grabbed' | 'dragging' | 'inspecting';

export interface InspectedPart {
  apparatusId: ApparatusId;
  partId: string;
}

export interface ManipulationState {
  phase: ManipulationPhase;
  hoveredId: ApparatusId | null;
  selectedId: ApparatusId | null;
  grabbedId: ApparatusId | null;
  inspected: InspectedPart | null;
  grabbedOrigin: Placement | null;
  lastTarget: Vec3 | null;
}

export type ManipulationEvent =
  | { type: 'hover'; apparatusId: ApparatusId | null }
  | { type: 'pointer-out' }
  | { type: 'select'; apparatusId: ApparatusId }
  | { type: 'grab'; apparatusId: ApparatusId; origin: Placement }
  | { type: 'move'; position: Vec3 }
  | { type: 'release' }
  | { type: 'cancel' }
  | { type: 'inspect'; apparatusId: ApparatusId; partId: string }
  | { type: 'close-inspect' }
  | { type: 'deselect' };

export const initialManipulationState: ManipulationState = {
  phase: 'idle',
  hoveredId: null,
  selectedId: null,
  grabbedId: null,
  inspected: null,
  grabbedOrigin: null,
  lastTarget: null,
};

const clonePlacement = (placement: Placement): Placement => ({
  position: [...placement.position],
  rotation: [...placement.rotation],
  snappedTo: placement.snappedTo,
});

/**
 * Pure interaction state machine shared by gestures, mouse, touch and keyboard.
 * The reducer never mutates the world; the store applies the resulting intent.
 */
export function reduceManipulation(
  state: ManipulationState,
  event: ManipulationEvent,
): ManipulationState {
  switch (event.type) {
    case 'hover': {
      if (state.grabbedId) return state;
      if (state.phase === 'inspecting') {
        return { ...state, hoveredId: event.apparatusId };
      }
      if (event.apparatusId) {
        return {
          ...state,
          phase: state.selectedId ? state.phase : 'hover',
          hoveredId: event.apparatusId,
        };
      }
      return {
        ...state,
        hoveredId: null,
        phase: state.selectedId ? 'selected' : 'idle',
      };
    }
    case 'pointer-out': {
      if (state.grabbedId || state.phase === 'inspecting') return { ...state, hoveredId: null };
      return {
        ...state,
        hoveredId: null,
        phase: state.selectedId ? 'selected' : 'idle',
      };
    }
    case 'select': {
      if (state.grabbedId) return state;
      return {
        ...state,
        phase: 'selected',
        selectedId: event.apparatusId,
        hoveredId: event.apparatusId,
        inspected: null,
      };
    }
    case 'grab': {
      if (state.grabbedId) return state;
      return {
        ...state,
        phase: 'grabbed',
        selectedId: event.apparatusId,
        hoveredId: event.apparatusId,
        grabbedId: event.apparatusId,
        grabbedOrigin: clonePlacement(event.origin),
        lastTarget: null,
        inspected: null,
      };
    }
    case 'move': {
      if (!state.grabbedId) return state;
      return { ...state, phase: 'dragging', lastTarget: [...event.position] };
    }
    case 'release': {
      if (!state.grabbedId) return state;
      return {
        ...state,
        phase: 'selected',
        grabbedId: null,
        grabbedOrigin: null,
        lastTarget: null,
      };
    }
    case 'cancel': {
      if (state.grabbedId) {
        return {
          ...state,
          phase: 'selected',
          grabbedId: null,
          grabbedOrigin: null,
          lastTarget: null,
        };
      }
      return state;
    }
    case 'inspect': {
      if (state.grabbedId) return state;
      return {
        ...state,
        phase: 'inspecting',
        selectedId: event.apparatusId,
        inspected: { apparatusId: event.apparatusId, partId: event.partId },
      };
    }
    case 'close-inspect': {
      return {
        ...state,
        phase: state.selectedId ? 'selected' : 'idle',
        inspected: null,
      };
    }
    case 'deselect': {
      if (state.grabbedId) return state;
      return {
        ...state,
        phase: 'idle',
        selectedId: null,
        inspected: null,
        hoveredId: state.hoveredId,
      };
    }
    default:
      return state;
  }
}

export interface RaycastCandidate {
  apparatusId: ApparatusId;
  partId?: string;
  distance: number;
}

export interface SelectionResult {
  apparatusId: ApparatusId;
  partId: string | null;
}

/** Pick the closest raycast candidate, ignoring hits without an apparatus owner. */
export function selectFromRaycast(candidates: readonly RaycastCandidate[]): SelectionResult | null {
  let best: RaycastCandidate | null = null;
  for (const candidate of candidates) {
    if (!candidate.apparatusId) continue;
    if (!best || candidate.distance < best.distance) best = candidate;
  }
  if (!best) return null;
  return { apparatusId: best.apparatusId, partId: best.partId ?? null };
}

export function placementChanged(a: Placement | undefined, b: Placement | undefined): boolean {
  if (!a || !b) return a !== b;
  return (
    a.position.some((value, index) => Math.abs(value - b.position[index]) > 1e-6) ||
    a.rotation.some((value, index) => Math.abs(value - b.rotation[index]) > 1e-6) ||
    a.snappedTo !== b.snappedTo
  );
}

export function getPlacement(
  placements: ApparatusPlacements,
  id: ApparatusId,
): Placement | undefined {
  return placements[id];
}
