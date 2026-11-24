import { useFrame, useThree } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { APPARATUS_CATALOGUE } from '../../domain/catalogue';
import { BENCH_TOP_Y } from '../../domain/constants';
import type { ApparatusId } from '../../domain/types';
import { pinchPoint, pointingPoint } from '../../gestures/classifier';
import { palmCenter } from '../../gestures/landmarks';
import type { GestureFrame } from '../../gestures/types';
import { clamp } from '../../lib/smoothing';
import { mapCameraToNdc } from '../../lib/screen';
import { useLabStore } from '../../store/labStore';
import { useSettingsStore } from '../../store/settingsStore';
import { benchIntersection, ndcToClient, pickSceneHit, type SceneHit } from './raycast';

export interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
}

interface GestureBridgeProps {
  frameRef: RefObject<GestureFrame | null>;
  interactiveRootRef: RefObject<THREE.Group | null>;
  controlsRef: RefObject<ControlsLike | null>;
}

interface HoverInfo {
  id: ApparatusId;
  partId: string | null;
  at: number;
}

interface PinchTarget {
  hit: SceneHit | null;
  ndc: { x: number; y: number };
}

const PINCH_PENDING_MS = 650;
const HOVER_FALLBACK_MS = 1200;
const SCREEN_RING: Array<[number, number]> = [
  [0.018, 0],
  [-0.018, 0],
  [0, 0.018],
  [0, -0.018],
  [0.013, 0.013],
  [-0.013, -0.013],
  [0.013, -0.013],
  [-0.013, 0.013],
];

const isPinchTarget = (owner: { apparatusId: ApparatusId; partId: string | null }): boolean =>
  APPARATUS_CATALOGUE[owner.apparatusId].movable ||
  (owner.apparatusId === 'burette' && owner.partId === 'stopcock');

/**
 * Translates debounced hand gestures into the same store commands used by mouse/keyboard.
 *
 * Pinch is deliberately forgiving:
 *  - the raycast tries the pinch point, index tip and palm centre, plus a small screen-space ring;
 *  - a recent hover is used as a fallback if the fingers move between hover and pinch;
 *  - a newly closed pinch gets a short acquisition window while the hand keeps moving;
 *  - a brief MediaPipe tracking dropout holds the current grab instead of dropping it.
 */
export function GestureBridge({ frameRef, interactiveRootRef, controlsRef }: GestureBridgeProps) {
  const { camera, gl, size } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const lastFrameMs = useRef(-1);
  const grabRef = useRef<string | null>(null);
  const offset = useRef(new THREE.Vector3());
  const lastHover = useRef<HoverInfo | null>(null);
  const pendingPinch = useRef<number | null>(null);

  useFrame(() => {
    const state = useLabStore.getState();
    if (grabRef.current && !state.interaction.grabbedId) grabRef.current = null;

    const frame = frameRef.current;
    if (!frame) {
      if (grabRef.current) {
        state.endGrab();
        grabRef.current = null;
      }
      return;
    }
    if (frame.timeMs === lastFrameMs.current) return;
    lastFrameMs.current = frame.timeMs;

    if (!frame.hasHand) {
      // While the engine's dropout grace period is active, keep the grabbed apparatus.
      if (frame.trackingLost) {
        pendingPinch.current = null;
        lastHover.current = null;
        state.hoverApparatus(null);
        if (grabRef.current) {
          state.endGrab();
          grabRef.current = null;
        }
      }
      return;
    }

    const viewportAspect = size.width / Math.max(1, size.height);
    const root = interactiveRootRef.current;
    const baseNdc = mapCameraToNdc(frame.cursorRaw, frame.aspect, viewportAspect);

    const cast = (
      normalized: { x: number; y: number },
      filter?: (owner: { apparatusId: ApparatusId; partId: string | null }) => boolean,
    ): PinchTarget & { hit: SceneHit | null } => {
      const ndc = mapCameraToNdc(normalized, frame.aspect, viewportAspect);
      raycaster.current.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
      const hit = root ? pickSceneHit(root, raycaster.current, filter) : null;
      return { hit, ndc };
    };

    const hover = cast(frame.cursorRaw);
    state.hoverApparatus(hover.hit?.apparatusId ?? null);
    if (hover.hit) {
      lastHover.current = {
        id: hover.hit.apparatusId,
        partId: hover.hit.partId,
        at: frame.timeMs,
      };
    }

    const findPinchTarget = (): (PinchTarget & { hit: SceneHit }) | null => {
      const points: Array<{ x: number; y: number }> = [frame.cursorRaw];
      if (frame.primary) {
        points.push(pinchPoint(frame.primary), pointingPoint(frame.primary), palmCenter(frame.primary));
      }
      const unique = points.filter(
        (point, index) =>
          points.findIndex(
            (other) => Math.hypot(other.x - point.x, other.y - point.y) < 0.008,
          ) === index,
      );
      for (const point of unique) {
        const result = cast(point, isPinchTarget);
        if (result.hit) return result as PinchTarget & { hit: SceneHit };
      }
      // A small screen-space ring absorbs landmark jitter and thin apparatus geometry.
      for (const [dx, dy] of SCREEN_RING) {
        const result = cast({ x: frame.cursorRaw.x + dx, y: frame.cursorRaw.y + dy }, isPinchTarget);
        if (result.hit) return result as PinchTarget & { hit: SceneHit };
      }
      return null;
    };

    const acquire = (id: ApparatusId, target: PinchTarget): boolean => {
      const point = benchIntersection(target.ndc, camera, raycaster.current) ?? target.hit?.point;
      if (!point) return false;
      const position = state.placements[id].position;
      offset.current.set(position[0] - point.x, 0, position[2] - point.z);
      if (state.beginGrab(id, 'gesture')) {
        grabRef.current = id;
        return true;
      }
      return false;
    };

    // --- pinch: acquire, grab and move ------------------------------------------------------
    if (frame.pinchStarted) {
      pendingPinch.current = null;
      const target = findPinchTarget();
      if (target?.hit.apparatusId === 'burette' && target.hit.partId === 'stopcock') {
        state.toggleStopcock();
      } else if (target?.hit) {
        acquire(target.hit.apparatusId, target);
      } else {
        const recent = lastHover.current;
        const recentUsable =
          recent &&
          frame.timeMs - recent.at <= HOVER_FALLBACK_MS &&
          APPARATUS_CATALOGUE[recent.id].movable &&
          recent.partId !== 'stopcock';
        if (recentUsable && recent) {
          acquire(recent.id, { hit: null, ndc: baseNdc });
        } else {
          // The hand may still be closing. Retry for a short time while the pinch is held.
          pendingPinch.current = frame.timeMs;
        }
      }
    }

    if (frame.pinch && !grabRef.current && pendingPinch.current !== null) {
      if (frame.timeMs - pendingPinch.current > PINCH_PENDING_MS) {
        pendingPinch.current = null;
      } else {
        const target = findPinchTarget();
        if (target?.hit.apparatusId === 'burette' && target.hit.partId === 'stopcock') {
          state.toggleStopcock();
          pendingPinch.current = null;
        } else if (target?.hit && acquire(target.hit.apparatusId, target)) {
          pendingPinch.current = null;
        }
      }
    }

    if (frame.pinch && grabRef.current) {
      const point = benchIntersection(baseNdc, camera, raycaster.current);
      if (point) {
        state.dragTo([point.x + offset.current.x, BENCH_TOP_Y, point.z + offset.current.z]);
      }
      const config = useSettingsStore.getState().gesture;
      if (config.enabled.rotate && Math.abs(frame.rollDelta) > 0.004) {
        state.rotateSelected(frame.rollDelta * config.rotationGain);
      }
    }

    if (frame.pinchEnded) pendingPinch.current = null;
    if ((frame.pinchEnded || frame.openStarted || frame.trackingLost) && grabRef.current) {
      state.endGrab();
      grabRef.current = null;
    }

    // --- point: select equipment or activate a DOM control ---------------------------------
    if (frame.pointActivated) {
      const client = ndcToClient(baseNdc, gl.domElement);
      const element = document.elementFromPoint(client.x, client.y) as HTMLElement | null;
      const target = element?.closest<HTMLElement>('[data-gesture-target]');
      const overUi = element?.closest<HTMLElement>('[data-gesture-ui]');
      if (target && !(target as HTMLButtonElement).disabled && target.getAttribute('aria-disabled') !== 'true') {
        target.click();
      } else if (!overUi && hover.hit) {
        state.selectApparatus(hover.hit.apparatusId);
      }
    }

    // --- fist: the configurable "operate" gesture -------------------------------------------
    if (frame.fistStarted && !frame.pinch && !grabRef.current) {
      const config = useSettingsStore.getState().gesture;
      if (config.fistAction === 'flow') {
        state.toggleStopcock();
      } else {
        const selected = state.interaction.selectedId;
        switch (selected) {
          case 'burette':
            if (!state.experiment.buretteFilled) state.actionFillBurette();
            else state.toggleStopcock();
            break;
          case 'pipette':
            state.actionPipette();
            break;
          case 'indicator':
            state.actionIndicator();
            break;
          case 'washBottle':
            state.actionWater();
            break;
          case 'flask':
            if (state.experiment.readings.finalMl === null) state.recordReading();
            else if (state.experiment.result === null) state.calculate();
            else state.notify('success', 'Titration complete', 'Reset for a fresh sample.');
            break;
          default:
            if (state.placements.burette.snappedTo === 'buretteClamp') {
              if (!state.experiment.buretteFilled) state.actionFillBurette();
              else state.toggleStopcock();
            }
            break;
        }
      }
    }

    // --- two-hand zoom -----------------------------------------------------------------------
    if (frame.twoHand.active && !grabRef.current) {
      const config = useSettingsStore.getState().gesture;
      const delta = frame.twoHand.delta * 10 * config.twoHandZoomGain;
      if (Math.abs(delta) > 0.001) {
        const controls = controlsRef.current;
        const target = controls?.target ?? new THREE.Vector3(0, 1.05, 0);
        const offsetVector = camera.position.clone().sub(target);
        const distance = offsetVector.length();
        const nextDistance = clamp(distance * (1 - delta), 1.1, 4.5);
        camera.position.copy(target).add(offsetVector.setLength(nextDistance));
        controls?.update();
      }
    }
  });

  return null;
}
