import { useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { APPARATUS_CATALOGUE } from '../../domain/catalogue';
import { BENCH_TOP_Y } from '../../domain/constants';
import { useLabStore } from '../../store/labStore';
import { benchIntersection, pickSceneHit } from './raycast';

interface PointerControllerProps {
  interactiveRootRef: RefObject<THREE.Group | null>;
}

/**
 * Mouse/touch counterpart of the gesture bridge. Uses window-capture pointerdown so a grab
 * cannot also start an OrbitControls rotation.
 */
export function PointerController({ interactiveRootRef }: PointerControllerProps) {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const grabbing = useRef<{ id: string; offset: THREE.Vector3; pointerId: number } | null>(null);
  const lastHoverAt = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.touchAction = 'none';

    const updateNdc = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.set(
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
      );
      return pointer.current;
    };

    const cast = () => {
      const root = interactiveRootRef.current;
      if (!root) return null;
      raycaster.current.setFromCamera(pointer.current, camera);
      return pickSceneHit(root, raycaster.current);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.target !== canvas) return;
      if (grabbing.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      updateNdc(event);
      const hit = cast();
      const state = useLabStore.getState();
      if (!hit) {
        state.deselect();
        return;
      }
      if (hit.apparatusId === 'burette' && hit.partId === 'stopcock') {
        event.stopPropagation();
        event.preventDefault();
        state.selectApparatus('burette');
        state.toggleStopcock();
        return;
      }
      state.selectApparatus(hit.apparatusId);
      state.hoverApparatus(hit.apparatusId);
      if (!APPARATUS_CATALOGUE[hit.apparatusId].movable) return;
      const point = benchIntersection(pointer.current, camera, raycaster.current) ?? hit.point;
      const placement = state.placements[hit.apparatusId];
      const offset = new THREE.Vector3(
        placement.position[0] - point.x,
        0,
        placement.position[2] - point.z,
      );
      if (state.beginGrab(hit.apparatusId, 'pointer')) {
        event.stopPropagation();
        event.preventDefault();
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          /* synthetic pointers in tests cannot be captured */
        }
        grabbing.current = { id: hit.apparatusId, offset, pointerId: event.pointerId };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (grabbing.current) {
        if (event.target !== canvas) return;
        updateNdc(event);
        const point = benchIntersection(pointer.current, camera, raycaster.current);
        if (point) {
          const { offset } = grabbing.current;
          useLabStore.getState().dragTo([
            point.x + offset.x,
            BENCH_TOP_Y,
            point.z + offset.z,
          ]);
        }
        return;
      }
      if (event.target !== canvas) return;
      const now = performance.now();
      if (now - lastHoverAt.current < 40) return;
      lastHoverAt.current = now;
      updateNdc(event);
      const hit = cast();
      const state = useLabStore.getState();
      if (!state.interaction.grabbedId) state.hoverApparatus(hit?.apparatusId ?? null);
      canvas.style.cursor = hit
        ? APPARATUS_CATALOGUE[hit.apparatusId].movable
          ? 'grab'
          : 'pointer'
        : 'default';
    };

    const onPointerUp = () => {
      if (!grabbing.current) return;
      const pointerId = grabbing.current.pointerId;
      grabbing.current = null;
      try {
        if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      } catch {
        /* no capture to release */
      }
      useLabStore.getState().endGrab();
      canvas.style.cursor = 'default';
    };

    const onPointerCancel = () => {
      if (!grabbing.current) return;
      const pointerId = grabbing.current.pointerId;
      grabbing.current = null;
      try {
        if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      } catch {
        /* no capture to release */
      }
      useLabStore.getState().cancelGrab();
      canvas.style.cursor = 'default';
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (event.target !== canvas) return;
      updateNdc(event);
      const hit = cast();
      if (!hit) return;
      const info = APPARATUS_CATALOGUE[hit.apparatusId];
      useLabStore.getState().inspectPart(hit.apparatusId, hit.partId ?? info.parts[0]?.id ?? 'overview');
    };

    const onPointerLeave = () => {
      if (grabbing.current) return;
      useLabStore.getState().hoverApparatus(null);
    };

    const onBlur = () => onPointerCancel();

    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('dblclick', onDoubleClick, { capture: true });
    canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('dblclick', onDoubleClick, { capture: true });
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onBlur);
    };
  }, [camera, gl, interactiveRootRef]);

  return null;
}
