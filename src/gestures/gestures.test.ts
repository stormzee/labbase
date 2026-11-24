import { describe, expect, it } from 'vitest';
import {
  classifyPose,
  handRoll,
  isFistLikePinch,
  isPinched,
  openness,
  pinchContactRatio,
  pinchRatio,
  twoHandDistance,
} from '../gestures/classifier';
import { DwellDetector, EdgeLatch, PoseDebouncer } from '../gestures/debounce';
import { GestureEngine } from '../gestures/engine';
import { calibratePinchFromSamples } from '../gestures/calibration';
import { DEFAULT_GESTURE_CONFIG, resolveThresholds } from '../gestures/landmarks';
import {
  fistHand,
  handWithPinchRatio,
  openHand,
  peaceHand,
  pinchHand,
  pointHand,
  rotateHand,
  tightPinchHand,
  twoHands,
} from '../test/hands';

const thresholds = resolveThresholds(55);

describe('gesture classification', () => {
  it('classifies open, fist, point and peace poses', () => {
    expect(classifyPose(openHand(), thresholds)).toBe('open');
    expect(classifyPose(fistHand(), thresholds)).toBe('fist');
    expect(classifyPose(pointHand(), thresholds)).toBe('point');
    expect(classifyPose(peaceHand(), thresholds)).toBe('peace');
    expect(classifyPose(null, thresholds)).toBe('none');
  });

  it('computes continuous openness', () => {
    expect(openness(openHand(), thresholds)).toBeGreaterThan(0.75);
    expect(openness(fistHand(), thresholds)).toBeLessThan(0.3);
  });

  it('detects pinch and rejects the fist false positive', () => {
    expect(pinchRatio(pinchHand())).toBeLessThan(thresholds.pinchOnRatio);
    expect(isPinched(pinchHand(), thresholds)).toBe(true);
    expect(isPinched(openHand(), thresholds)).toBe(false);
    expect(isPinched(fistHand(), thresholds)).toBe(false);
    expect(pinchContactRatio(fistHand())).toBeLessThan(0.8);
    expect(isFistLikePinch(fistHand())).toBe(true);
  });

  it('accepts a realistic pinch whose other fingers are curled like a fist', () => {
    const hand = tightPinchHand();
    expect(pinchContactRatio(hand)).toBeGreaterThan(0.8);
    expect(isFistLikePinch(hand)).toBe(false);
    expect(isPinched(hand, thresholds)).toBe(true);
  });

  it('relaxes thresholds as sensitivity increases', () => {
    expect(resolveThresholds(90).pinchOnRatio).toBeGreaterThan(resolveThresholds(10).pinchOnRatio);
    expect(resolveThresholds(90).fingerExtendedRatio).toBeLessThan(
      resolveThresholds(10).fingerExtendedRatio,
    );
  });

  it('turns a short pinch recording into a robust calibration value', () => {
    expect(calibratePinchFromSamples([])).toBeNull();
    expect(calibratePinchFromSamples([0.6, 0.62, 1.2, 0.01])).toBeNull();
    const samples = [0.62, 0.58, 0.55, 0.5, 0.48, 0.46, 0.44, 0.42, 0.4, 0.38, 0.36, 0.34];
    expect(calibratePinchFromSamples(samples)).toBe(0.38);
  });

  it('uses a measured pinch calibration to widen the entry band', () => {
    const automatic = resolveThresholds(55);
    const calibrated = resolveThresholds(55, 0.52);
    expect(calibrated.pinchOnRatio).toBeGreaterThan(automatic.pinchOnRatio);
    expect(calibrated.pinchOffRatio).toBeGreaterThan(calibrated.pinchOnRatio);
    expect(calibrated.pinchOffRatio).toBeLessThanOrEqual(0.85);
    // A low closed ratio must not make pinch stricter than the default.
    expect(resolveThresholds(55, 0.1).pinchOnRatio).toBeGreaterThanOrEqual(automatic.pinchOnRatio);
  });

  it('returns zero roll for an upright hand and positive roll when tilted clockwise', () => {
    expect(handRoll(openHand(), 16 / 9)).toBeCloseTo(0, 5);
    expect(handRoll(rotateHand(openHand(), 0.3), 16 / 9)).toBeGreaterThan(0.2);
    expect(handRoll(rotateHand(openHand(), -0.3), 16 / 9)).toBeLessThan(-0.2);
  });

  it('measures two-hand separation', () => {
    expect(twoHandDistance(twoHands(0.5), 1)).toBeCloseTo(0.5, 5);
    expect(twoHandDistance([openHand()], 1)).toBe(0);
  });
});

describe('gesture debouncing', () => {
  it('holds a pose for N frames and reports a single change', () => {
    const debouncer = new PoseDebouncer(3);
    expect(debouncer.update('open').stable).toBe('none');
    expect(debouncer.update('open').stable).toBe('none');
    const settled = debouncer.update('open');
    expect(settled).toEqual({ stable: 'open', changed: true });
    expect(debouncer.update('open')).toEqual({ stable: 'open', changed: false });
    debouncer.update('fist');
    debouncer.update('fist');
    expect(debouncer.update('fist')).toEqual({ stable: 'fist', changed: true });
  });

  it('does not switch on a single noisy frame', () => {
    const debouncer = new PoseDebouncer(3);
    debouncer.update('open');
    debouncer.update('open');
    expect(debouncer.update('open').stable).toBe('open');
    expect(debouncer.update('fist').stable).toBe('open');
    expect(debouncer.update('open').stable).toBe('open');
  });

  it('fires an edge once with a cooldown', () => {
    const latch = new EdgeLatch();
    expect(latch.update(true, { frames: 2, nowMs: 0 }).started).toBe(false);
    const start = latch.update(true, { frames: 2, nowMs: 16 });
    expect(start.started).toBe(true);
    expect(latch.update(true, { frames: 2, nowMs: 32 }).started).toBe(false);
    expect(latch.update(false, { nowMs: 48 }).ended).toBe(true);
    expect(latch.update(true, { frames: 2, nowMs: 50 }).started).toBe(false);
    expect(latch.update(true, { frames: 2, nowMs: 60 }).started).toBe(true);
    // cooldown blocks an immediate re-fire after release
    const cooled = new EdgeLatch();
    expect(cooled.update(true, { frames: 1, nowMs: 0, cooldownMs: 500 }).started).toBe(true);
    cooled.update(false, { nowMs: 10 });
    cooled.update(true, { frames: 1, nowMs: 20, cooldownMs: 500 });
    expect(cooled.update(true, { frames: 1, nowMs: 30, cooldownMs: 500 }).started).toBe(false);
  });

  it('debounces pinch release across a few noisy frames', () => {
    const latch = new EdgeLatch();
    expect(latch.update(true, { frames: 1, nowMs: 0 }).started).toBe(true);
    expect(latch.update(false, { nowMs: 16, releaseFrames: 3 })).toEqual({
      active: true,
      started: false,
      ended: false,
    });
    expect(latch.update(true, { nowMs: 32, releaseFrames: 3 }).active).toBe(true);
    expect(latch.update(false, { nowMs: 48, releaseFrames: 3 }).active).toBe(true);
    expect(latch.update(false, { nowMs: 64, releaseFrames: 3 }).active).toBe(true);
    const released = latch.update(false, { nowMs: 80, releaseFrames: 3 });
    expect(released.active).toBe(false);
    expect(released.ended).toBe(true);
  });

  it('fires a dwell once after the threshold', () => {
    const dwell = new DwellDetector();
    expect(dwell.update(true, 0, 500)).toBe(false);
    expect(dwell.update(true, 400, 500)).toBe(false);
    expect(dwell.update(true, 520, 500)).toBe(true);
    expect(dwell.update(true, 900, 500)).toBe(false);
    dwell.update(false, 950, 500);
    expect(dwell.update(true, 1000, 500)).toBe(false);
    expect(dwell.update(true, 1600, 500)).toBe(true);
  });
});

describe('gesture engine', () => {
  const engine = () => new GestureEngine({ ...DEFAULT_GESTURE_CONFIG, poseHoldFrames: 3, pinchHoldFrames: 2 });

  it('debounces the open pose and emits an edge once', () => {
    const subject = engine();
    subject.update([openHand()], 0);
    subject.update([openHand()], 33);
    const frame = subject.update([openHand()], 66);
    expect(frame.pose).toBe('open');
    expect(frame.openStarted).toBe(true);
    const next = subject.update([openHand()], 100);
    expect(next.openStarted).toBe(false);
  });

  it('activates a fist-like real pinch whose contact is in front of the palm', () => {
    const subject = engine();
    subject.update([tightPinchHand()], 0);
    const frame = subject.update([tightPinchHand()], 33);
    expect(frame.pinch).toBe(true);
    expect(frame.pinchStarted).toBe(true);
  });

  it('activates pinch after consecutive frames and releases on open hand', () => {
    const subject = engine();
    const first = subject.update([pinchHand()], 0);
    expect(first.pinch).toBe(false);
    const second = subject.update([pinchHand()], 33);
    expect(second.pinch).toBe(true);
    expect(second.pinchStarted).toBe(true);
    const open1 = subject.update([openHand()], 66);
    expect(open1.pinch).toBe(true);
    expect(open1.pinchEnded).toBe(false);
    subject.update([openHand()], 99);
    const open = subject.update([openHand()], 132);
    expect(open.pinch).toBe(false);
    expect(open.pinchEnded).toBe(true);
  });

  it('reports a live pinch ratio and threshold for the UI', () => {
    const subject = engine();
    const frame = subject.update([pinchHand()], 0);
    expect(frame.pinchRatio).toBeGreaterThan(0);
    expect(frame.pinchThreshold).toBeGreaterThan(0.3);
  });

  it('honours a user pinch calibration when the closed ratio is larger', () => {
    const loose = handWithPinchRatio(0.55);
    const automatic = engine();
    automatic.update([loose], 0);
    expect(automatic.update([loose], 33).pinch).toBe(false);

    const calibrated = new GestureEngine({
      ...DEFAULT_GESTURE_CONFIG,
      pinchCalibration: 0.52,
      poseHoldFrames: 3,
      pinchHoldFrames: 2,
    });
    calibrated.update([loose], 0);
    expect(calibrated.update([loose], 33).pinch).toBe(true);
  });

  it('uses hysteresis so a slightly relaxed pinch stays engaged', () => {
    const subject = engine();
    subject.update([pinchHand()], 0);
    subject.update([pinchHand()], 33);
    const relaxed = subject.update([handWithPinchRatio(0.43)], 66);
    expect(pinchRatio(handWithPinchRatio(0.43))).toBeGreaterThan(thresholds.pinchOnRatio);
    expect(relaxed.pinch).toBe(true);
    const open1 = subject.update([handWithPinchRatio(0.6)], 100);
    expect(open1.pinch).toBe(true);
    subject.update([handWithPinchRatio(0.6)], 133);
    const released = subject.update([handWithPinchRatio(0.6)], 166);
    expect(released.pinch).toBe(false);
    expect(released.pinchEnded).toBe(true);
  });

  it('fires the fist action once and not every frame', () => {
    const subject = engine();
    let started = 0;
    for (let index = 0; index < 8; index += 1) {
      const frame = subject.update([fistHand()], index * 33);
      if (frame.fistStarted) started += 1;
    }
    expect(started).toBe(1);
  });

  it('activates point dwell on a stable point', () => {
    const subject = engine();
    let activatedAt = -1;
    for (let index = 0; index < 20; index += 1) {
      const time = index * 100;
      const frame = subject.update([pointHand()], time);
      if (frame.pointActivated) activatedAt = time;
    }
    expect(activatedAt).toBeGreaterThanOrEqual(500);
  });

  it('handles two-hand zoom once both hands are stable', () => {
    const subject = engine();
    const [left, right] = twoHands(0.4);
    subject.update([left, right], 0);
    subject.update([left, right], 50);
    const active = subject.update([left, right], 100);
    expect(active.twoHand.active).toBe(true);
    const moved = subject.update([twoHands(0.6)[0], twoHands(0.6)[1]], 150);
    expect(moved.twoHand.active).toBe(true);
    expect(moved.twoHand.delta).toBeGreaterThan(0);
    const single = subject.update([left], 200);
    expect(single.twoHand.active).toBe(false);
  });

  it('holds a pinch through a brief tracking dropout, then releases', () => {
    const subject = engine();
    subject.update([pinchHand()], 0);
    const active = subject.update([pinchHand()], 33);
    expect(active.pinch).toBe(true);
    subject.update([pinchHand()], 66);

    const graced = subject.update([], 100);
    expect(graced.hasHand).toBe(false);
    expect(graced.pinch).toBe(true);
    expect(graced.pinchEnded).toBe(false);
    expect(graced.trackingLost).toBe(false);
    expect(graced.pose).not.toBe('none');

    const stillGrace = subject.update([], 300);
    expect(stillGrace.pinch).toBe(true);
    expect(stillGrace.trackingLost).toBe(false);

    const lost = subject.update([], 400);
    expect(lost.hasHand).toBe(false);
    expect(lost.trackingLost).toBe(true);
    expect(lost.pinchEnded).toBe(true);
    expect(lost.pose).toBe('none');
    expect(lost.pinch).toBe(false);
  });

  it('reacquires a held pinch without reporting a new pinch edge', () => {
    const subject = engine();
    subject.update([pinchHand()], 0);
    subject.update([pinchHand()], 33);
    subject.update([pinchHand()], 66);
    subject.update([], 100);
    const reacquired = subject.update([pinchHand()], 200);
    expect(reacquired.pinch).toBe(true);
    expect(reacquired.pinchStarted).toBe(false);
    expect(reacquired.trackingLost).toBe(false);
  });

  it('respects disabled features', () => {
    const subject = new GestureEngine({
      ...DEFAULT_GESTURE_CONFIG,
      enabled: { ...DEFAULT_GESTURE_CONFIG.enabled, pinch: false, fist: false, point: false },
    });
    for (let index = 0; index < 6; index += 1) {
      const frame = subject.update([pinchHand()], index * 33);
      expect(frame.pinch).toBe(false);
      expect(frame.pinchStarted).toBe(false);
    }
  });

  it('resets cleanly', () => {
    const subject = engine();
    subject.update([pinchHand()], 0);
    subject.update([pinchHand()], 33);
    subject.reset();
    const frame = subject.update([openHand()], 1000);
    expect(frame.pinch).toBe(false);
    expect(frame.pose).toBe('none');
  });
});
