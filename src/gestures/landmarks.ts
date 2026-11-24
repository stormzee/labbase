import type { GestureConfig, GestureThresholds, HandLandmarks, Landmark } from './types';

/** MediaPipe hand landmark indices. */
export const WRIST = 0;
export const THUMB_TIP = 4;
export const INDEX_MCP = 5;
export const INDEX_PIP = 6;
export const INDEX_TIP = 8;
export const MIDDLE_MCP = 9;
export const MIDDLE_PIP = 10;
export const MIDDLE_TIP = 12;
export const RING_MCP = 13;
export const RING_PIP = 14;
export const RING_TIP = 16;
export const PINKY_MCP = 17;
export const PINKY_PIP = 18;
export const PINKY_TIP = 20;

export const TIPS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP] as const;
export const PIPS = [INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP] as const;
export const MCPS = [INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP] as const;

export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  sensitivity: 55,
  enabled: { pinch: true, open: true, point: true, fist: true, rotate: true, twoHand: true },
  poseHoldFrames: 4,
  pinchHoldFrames: 2,
  pinchReleaseFrames: 3,
  pinchCalibration: null,
  fistCooldownMs: 650,
  pointDwellMs: 550,
  pointCooldownMs: 900,
  rotationGain: 1,
  twoHandZoomGain: 1,
  fistAction: 'operate',
  mirror: true,
  showLandmarks: true,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Map a 0–100 sensitivity slider to concrete thresholds.
 * A more forgiving profile relaxes the extension test, makes pinch easier to enter,
 * and widens the pinch hysteresis band so a shaky hand does not chatter.
 */
export function resolveThresholds(
  sensitivity: number,
  pinchCalibration: number | null = null,
): GestureThresholds {
  const t = Math.min(100, Math.max(0, sensitivity)) / 100;
  let pinchOnRatio = lerp(0.33, 0.48, t);
  let pinchOffRatio = lerp(0.5, 0.68, t);
  if (pinchCalibration !== null && Number.isFinite(pinchCalibration)) {
    // Calibrated against the user's own closed pinch. Keep a generous entry band,
    // but never let calibration make pinch harder than the default profile.
    pinchOnRatio = Math.max(pinchOnRatio, Math.min(0.62, Math.max(0.28, pinchCalibration + 0.12)));
    pinchOffRatio = Math.max(
      pinchOffRatio,
      Math.min(0.85, Math.max(pinchOnRatio + 0.18, pinchCalibration + 0.28)),
    );
  }
  return {
    fingerExtendedRatio: lerp(1.2, 1.07, t),
    fingerCurledRatio: lerp(1.18, 1.3, t),
    thumbOutRatio: lerp(1.14, 1.02, t),
    pinchOnRatio,
    pinchOffRatio,
    opennessClosed: lerp(1.02, 1.12, t),
    opennessOpen: lerp(1.86, 1.64, t),
    thumbClosed: 0.92,
    thumbOpen: lerp(1.58, 1.44, t),
  };
}

export const distance = (a: Landmark, b: Landmark): number => Math.hypot(a.x - b.x, a.y - b.y);

export const handScale = (landmarks: HandLandmarks): number => {
  const palmLength = distance(landmarks[WRIST], landmarks[MIDDLE_MCP]);
  const palmWidth = distance(landmarks[INDEX_MCP], landmarks[PINKY_MCP]);
  return Math.max(palmLength, palmWidth * 0.8, 1e-6);
};

export const isHand = (landmarks: HandLandmarks | null | undefined): landmarks is HandLandmarks =>
  !!landmarks && landmarks.length >= 21;

export const midpoint = (a: Landmark, b: Landmark): { x: number; y: number } => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const palmCenter = (landmarks: HandLandmarks): { x: number; y: number } => {
  const points = [landmarks[WRIST], landmarks[INDEX_MCP], landmarks[MIDDLE_MCP], landmarks[PINKY_MCP]];
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
};
