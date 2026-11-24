import { useEffect, useRef, type RefObject } from 'react';
import type { GestureFrame } from '../gestures/types';
import { mapCameraToNdc, ndcToScreen } from '../lib/screen';

interface GestureCursorProps {
  frameRef: RefObject<GestureFrame | null>;
  active: boolean;
}

/** Screen-space hand cursor. Updated imperatively so it never re-renders the app at camera rate. */
export function GestureCursor({ frameRef, active }: GestureCursorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const element = rootRef.current;
      const frame = frameRef.current;
      if (element) {
        const visible = active && !!frame?.hasHand;
        if (visible && frame) {
          const ndc = mapCameraToNdc(
            frame.cursor,
            frame.aspect,
            window.innerWidth / Math.max(1, window.innerHeight),
          );
          const screen = ndcToScreen(ndc, window.innerWidth, window.innerHeight);
          element.style.transform = `translate3d(${screen.x}px, ${screen.y}px, 0) translate(-50%, -50%)`;
          element.style.opacity = '1';
          element.classList.toggle('gesture-cursor--pinch', frame.pinch);
          element.classList.toggle('gesture-cursor--point', frame.point);
          if (labelRef.current) {
            labelRef.current.textContent = frame.pinch
              ? 'PINCH'
              : frame.point
                ? 'POINT'
                : frame.pose === 'open'
                  ? 'OPEN'
                  : 'HAND';
          }
          if (dotRef.current) {
            dotRef.current.style.opacity = frame.pinch ? '0.25' : '0.9';
          }
        } else {
          element.style.opacity = '0';
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, frameRef]);

  return (
    <div
      ref={rootRef}
      className="gesture-cursor pointer-events-none fixed left-0 top-0 z-[70] opacity-0 transition-opacity duration-150"
      aria-hidden
    >
      <div className="gesture-cursor__ring" />
      <div ref={dotRef} className="gesture-cursor__dot" />
      <span ref={labelRef} className="gesture-cursor__label">
        HAND
      </span>
    </div>
  );
}
