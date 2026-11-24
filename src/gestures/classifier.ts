import {
  INDEX_MCP,
  INDEX_PIP,
  INDEX_TIP,
  MCPS,
  MIDDLE_MCP,
  PINKY_MCP,
  PIPS,
  THUMB_TIP,
  TIPS,
  WRIST,
  distance,
  handScale,
  isHand,
  resolveThresholds,
} from './landmarks';
import type { GestureThresholds, HandLandmarks, Pose } from './types';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function extensionStates(landmarks: HandLandmarks, thresholds: GestureThresholds): boolean[] {
  return TIPS.map(
    (tip, index) =>
      distance(landmarks[tip], landmarks[WRIST]) >
      distance(landmarks[PIPS[index]], landmarks[WRIST]) * thresholds.fingerExtendedRatio,
  );
}

export function curledStates(landmarks: HandLandmarks, thresholds: GestureThresholds): boolean[] {
  return TIPS.map(
    (tip, index) =>
      distance(landmarks[tip], landmarks[WRIST]) <
      distance(landmarks[MCPS[index]], landmarks[WRIST]) * thresholds.fingerCurledRatio,
  );
}

export function thumbOut(landmarks: HandLandmarks, thresholds: GestureThresholds): boolean {
  return (
    distance(landmarks[THUMB_TIP], landmarks[PINKY_MCP]) >
    handScale(landmarks) * thresholds.thumbOutRatio
  );
}

/** 0 = closed fist, 1 = fully open hand. */
export function openness(landmarks: HandLandmarks, thresholds: GestureThresholds): number {
  let fingerScore = 0;
  for (let index = 0; index < TIPS.length; index += 1) {
    const ratio =
      distance(landmarks[TIPS[index]], landmarks[WRIST]) /
      Math.max(distance(landmarks[MCPS[index]], landmarks[WRIST]), 1e-6);
    fingerScore += clamp01(
      (ratio - thresholds.opennessClosed) /
        Math.max(1e-6, thresholds.opennessOpen - thresholds.opennessClosed),
    );
  }
  const thumbRatio = distance(landmarks[THUMB_TIP], landmarks[PINKY_MCP]) / handScale(landmarks);
  const thumbScore = clamp01(
    (thumbRatio - thresholds.thumbClosed) / Math.max(1e-6, thresholds.thumbOpen - thresholds.thumbClosed),
  );
  return 0.8 * (fingerScore / TIPS.length) + 0.2 * thumbScore;
}

/** Thumb–index separation normalised by palm size. */
export function pinchRatio(landmarks: HandLandmarks): number {
  return distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) / handScale(landmarks);
}

/**
 * How far the thumb/index contact point sits from the wrist, in palm-size units.
 * A fist also touches thumb to index, but the contact is down in the palm. A real
 * pinch keeps the contact out in front of the palm even when the other fingers curl.
 */
export function pinchContactRatio(landmarks: HandLandmarks): number {
  const contact = pinchPoint(landmarks);
  return Math.hypot(contact.x - landmarks[WRIST].x, contact.y - landmarks[WRIST].y) / handScale(landmarks);
}

/** Contact must be this far from the wrist for a closed fist not to count as a pinch. */
export const PINCH_CONTACT_MIN = 0.8;
/** If the index tip reaches out past its knuckle, a low contact is still a pinch. */
export const PINCH_INDEX_OUT_RATIO = 1.08;

/**
 * A fist and a pinch both bring thumb and index tips together. This distinguishes them
 * geometrically: a fist's contact is low in the palm and its index tip stays near its
 * knuckle, while a pinch contact is in front of the palm or the index is reaching out.
 */
export function isFistLikePinch(landmarks: HandLandmarks): boolean {
  if (pinchContactRatio(landmarks) >= PINCH_CONTACT_MIN) return false;
  const indexTipFromWrist = distance(landmarks[INDEX_TIP], landmarks[WRIST]);
  const indexMcpFromWrist = distance(landmarks[INDEX_MCP], landmarks[WRIST]);
  return indexTipFromWrist <= indexMcpFromWrist * PINCH_INDEX_OUT_RATIO;
}

export function isPinched(
  landmarks: HandLandmarks,
  thresholds: GestureThresholds = resolveThresholds(55),
): boolean {
  if (!isHand(landmarks)) return false;
  if (pinchRatio(landmarks) >= thresholds.pinchOnRatio) return false;
  return !isFistLikePinch(landmarks);
}

/** Instant static pose. Pinch is modelled as an independent event, not a static pose. */
export function classifyPose(
  landmarks: HandLandmarks | null | undefined,
  thresholds: GestureThresholds = resolveThresholds(55),
): Pose {
  if (!isHand(landmarks)) return 'none';
  const extended = extensionStates(landmarks, thresholds);
  const openAmount = openness(landmarks, thresholds);
  const thumb = thumbOut(landmarks, thresholds);
  const extendedCount = extended.filter(Boolean).length;

  if (extendedCount === 4 && openAmount > 0.5) return 'open';
  if (extendedCount === 0 && openAmount < 0.42) return 'fist';
  if (extended[0] && !extended[1] && !extended[2] && !extended[3]) return 'point';
  if (extended[0] && extended[1] && !extended[2] && !extended[3]) return 'peace';
  // A relaxed open hand with a tucked thumb still reads as open.
  if (extendedCount >= 3 && openAmount > 0.45 && thumb) return 'open';
  return 'other';
}

/** Wrist-to-middle-knuckle angle in the image plane. 0 = fingers up, positive = clockwise. */
export function handRoll(landmarks: HandLandmarks, aspect = 1): number {
  return Math.atan2(
    (landmarks[MIDDLE_MCP].x - landmarks[WRIST].x) * aspect,
    -(landmarks[MIDDLE_MCP].y - landmarks[WRIST].y),
  );
}

export function pinchPoint(landmarks: HandLandmarks): { x: number; y: number } {
  return {
    x: (landmarks[THUMB_TIP].x + landmarks[INDEX_TIP].x) / 2,
    y: (landmarks[THUMB_TIP].y + landmarks[INDEX_TIP].y) / 2,
  };
}

export function pointingPoint(landmarks: HandLandmarks): { x: number; y: number } {
  return { x: landmarks[INDEX_TIP].x, y: landmarks[INDEX_TIP].y };
}

export function twoHandDistance(hands: HandLandmarks[], aspect = 1): number {
  if (hands.length < 2) return 0;
  const [a, b] = hands;
  return Math.hypot((a[WRIST].x - b[WRIST].x) * aspect, a[WRIST].y - b[WRIST].y);
}

export const indexExtension = (landmarks: HandLandmarks, thresholds: GestureThresholds): number => {
  const ratio =
    distance(landmarks[INDEX_TIP], landmarks[WRIST]) /
    Math.max(distance(landmarks[INDEX_PIP], landmarks[WRIST]), 1e-6);
  return ratio;
};

export { INDEX_TIP, THUMB_TIP };
