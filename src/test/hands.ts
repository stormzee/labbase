import type { Landmark } from '../gestures/types';

/** Synthetic 21-landmark hands for deterministic gesture tests. Coordinates are mirrored, 0–1. */

const WRIST = { x: 0.5, y: 0.85 };

const base: Landmark[] = [
  { ...WRIST }, // 0 wrist
  { x: 0.45, y: 0.79 }, // 1 thumb CMC
  { x: 0.42, y: 0.74 }, // 2 thumb MCP
  { x: 0.38, y: 0.7 }, // 3 thumb IP
  { x: 0.32, y: 0.66 }, // 4 thumb tip
  { x: 0.44, y: 0.68 }, // 5 index MCP
  { x: 0.43, y: 0.58 }, // 6 index PIP
  { x: 0.42, y: 0.49 }, // 7 index DIP
  { x: 0.41, y: 0.4 }, // 8 index tip
  { x: 0.5, y: 0.66 }, // 9 middle MCP
  { x: 0.49, y: 0.55 }, // 10 middle PIP
  { x: 0.49, y: 0.45 }, // 11 middle DIP
  { x: 0.49, y: 0.36 }, // 12 middle tip
  { x: 0.54, y: 0.68 }, // 13 ring MCP
  { x: 0.55, y: 0.57 }, // 14 ring PIP
  { x: 0.56, y: 0.48 }, // 15 ring DIP
  { x: 0.57, y: 0.4 }, // 16 ring tip
  { x: 0.58, y: 0.71 }, // 17 pinky MCP
  { x: 0.6, y: 0.62 }, // 18 pinky PIP
  { x: 0.62, y: 0.55 }, // 19 pinky DIP
  { x: 0.63, y: 0.48 }, // 20 pinky tip
];

const clone = (): Landmark[] => base.map((point) => ({ ...point }));

const set = (hand: Landmark[], index: number, x: number, y: number) => {
  hand[index] = { x, y };
};

export function openHand(): Landmark[] {
  return clone();
}

export function fistHand(): Landmark[] {
  const hand = clone();
  set(hand, 6, 0.44, 0.64);
  set(hand, 7, 0.45, 0.69);
  set(hand, 8, 0.46, 0.73);
  set(hand, 10, 0.49, 0.63);
  set(hand, 11, 0.5, 0.68);
  set(hand, 12, 0.5, 0.72);
  set(hand, 14, 0.54, 0.64);
  set(hand, 15, 0.55, 0.69);
  set(hand, 16, 0.54, 0.73);
  set(hand, 18, 0.58, 0.66);
  set(hand, 19, 0.59, 0.71);
  set(hand, 20, 0.58, 0.76);
  set(hand, 3, 0.45, 0.72);
  set(hand, 4, 0.47, 0.74);
  return hand;
}

export function pointHand(): Landmark[] {
  const hand = fistHand();
  // restore the index finger to an extended pose
  set(hand, 6, 0.43, 0.58);
  set(hand, 7, 0.42, 0.49);
  set(hand, 8, 0.41, 0.4);
  set(hand, 3, 0.44, 0.72);
  set(hand, 4, 0.46, 0.73);
  return hand;
}

export function peaceHand(): Landmark[] {
  const hand = fistHand();
  set(hand, 6, 0.43, 0.58);
  set(hand, 7, 0.42, 0.49);
  set(hand, 8, 0.41, 0.4);
  set(hand, 10, 0.49, 0.55);
  set(hand, 11, 0.49, 0.45);
  set(hand, 12, 0.49, 0.36);
  return hand;
}

export function pinchHand(thumbOffset = { x: 0.405, y: 0.42 }): Landmark[] {
  const hand = openHand();
  set(hand, 3, thumbOffset.x + 0.01, thumbOffset.y + 0.03);
  set(hand, 4, thumbOffset.x, thumbOffset.y);
  return hand;
}

/**
 * A realistic pinch: thumb and index touch in front of the palm while the other
 * fingers are curled. It reads as a fist to the static pose classifier, which is
 * exactly the case that used to make pinch unreliable.
 */
export function tightPinchHand(): Landmark[] {
  const hand = fistHand();
  set(hand, 6, 0.44, 0.66); // index PIP
  set(hand, 7, 0.43, 0.64); // index DIP
  set(hand, 8, 0.42, 0.62); // index tip meets thumb
  set(hand, 3, 0.42, 0.63); // thumb IP
  set(hand, 4, 0.41, 0.61); // thumb tip
  return hand;
}

/** Place the thumb tip at a chosen normalised distance from the index tip. */
export function handWithPinchRatio(ratio: number, scale = 0.19): Landmark[] {
  const hand = openHand();
  const indexTip = hand[8];
  set(hand, 4, indexTip.x + ratio * scale, indexTip.y);
  set(hand, 3, indexTip.x + ratio * scale + 0.02, indexTip.y + 0.02);
  return hand;
}

export function rotateHand(hand: Landmark[], angle: number): Landmark[] {
  const origin = hand[0];
  return hand.map((point) => {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    return {
      x: origin.x + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: origin.y + dx * Math.sin(angle) + dy * Math.cos(angle),
    };
  });
}

export function shiftedHand(hand: Landmark[], dx: number, dy = 0): Landmark[] {
  return hand.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

export function twoHands(separation = 0.5): Landmark[][] {
  return [shiftedHand(openHand(), -separation / 2), shiftedHand(openHand(), separation / 2)];
}
