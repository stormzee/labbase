import { DwellDetector, EdgeLatch, PoseDebouncer } from './debounce';
import {
  classifyPose,
  handRoll,
  isFistLikePinch,
  openness,
  pinchPoint,
  pinchRatio,
  pointingPoint,
  twoHandDistance,
} from './classifier';
import { DEFAULT_GESTURE_CONFIG, palmCenter, resolveThresholds } from './landmarks';
import { normalizeAngle, OneEuroFilter, SmoothPoint2D } from '../lib/smoothing';
import type {
  GestureConfig,
  GestureFrame,
  GestureThresholds,
  HandLandmarks,
  Pose,
  TwoHandState,
} from './types';

const defaultCursor = { x: 0.5, y: 0.5 };

/** A brief MediaPipe dropout must not drop an object that is being carried. */
export const HAND_LOSS_GRACE_MS = 320;

/**
 * Stateful gesture recognition engine.
 *
 * Input: up to two hands of mirrored 21-point landmarks, one call per camera frame.
 * Output: debounced gestures and continuous control signals. No React or Three.js dependency.
 */
export class GestureEngine {
  private config: GestureConfig;
  private thresholds: GestureThresholds;
  private debouncer: PoseDebouncer;
  private pinchLatch = new EdgeLatch();
  private fistLatch = new EdgeLatch();
  private openLatch = new EdgeLatch();
  private pointDwell = new DwellDetector();
  private rollFilter = new OneEuroFilter({ minCutoff: 1.4, beta: 0.03 });
  private cursorFilter = new SmoothPoint2D();
  private lastPrimaryWrist: { x: number; y: number } | null = null;
  private lastRoll = 0;
  private lastTimeMs = -Infinity;
  private handSeenAt = -Infinity;
  private wasTracking = false;
  private aspect = 16 / 9;
  private cursor = { ...defaultCursor };
  private twoHandSmoothed = 0;
  private twoHandPrevious = 0;
  private twoHandSince: number | null = null;
  private pinching = false;
  private lastPinchRatio = 0;
  private lastCursorRaw = { ...defaultCursor };
  private lastOpenness = 0;

  constructor(config: GestureConfig = DEFAULT_GESTURE_CONFIG) {
    this.config = config;
    this.thresholds = resolveThresholds(config.sensitivity, config.pinchCalibration);
    this.debouncer = new PoseDebouncer(config.poseHoldFrames);
  }

  setConfig(config: GestureConfig): void {
    this.config = config;
    this.thresholds = resolveThresholds(config.sensitivity, config.pinchCalibration);
    this.debouncer.setHoldFrames(config.poseHoldFrames);
  }

  setAspect(aspect: number): void {
    if (Number.isFinite(aspect) && aspect > 0) this.aspect = aspect;
  }

  getThresholds(): GestureThresholds {
    return this.thresholds;
  }

  reset(): void {
    this.debouncer.reset();
    this.pinchLatch.reset();
    this.fistLatch.reset();
    this.openLatch.reset();
    this.pointDwell.reset();
    this.rollFilter.reset();
    this.cursorFilter.reset();
    this.lastPrimaryWrist = null;
    this.lastRoll = 0;
    this.lastTimeMs = -Infinity;
    this.handSeenAt = -Infinity;
    this.wasTracking = false;
    this.cursor = { ...defaultCursor };
    this.twoHandSmoothed = 0;
    this.twoHandPrevious = 0;
    this.twoHandSince = null;
    this.pinching = false;
    this.lastPinchRatio = 0;
    this.lastCursorRaw = { ...defaultCursor };
    this.lastOpenness = 0;
  }

  private selectPrimary(hands: HandLandmarks[]): HandLandmarks | null {
    if (hands.length === 0) return null;
    if (hands.length === 1 || !this.lastPrimaryWrist) return hands[0];
    const reference = this.lastPrimaryWrist;
    const distanceToReference = (hand: HandLandmarks) =>
      Math.hypot(hand[0].x - reference.x, hand[0].y - reference.y);
    return distanceToReference(hands[0]) <= distanceToReference(hands[1]) ? hands[0] : hands[1];
  }

  update(inputHands: HandLandmarks[], timeMs: number): GestureFrame {
    const hands = inputHands.filter((hand) => hand && hand.length >= 21).slice(0, 2);
    const primary = this.selectPrimary(hands);
    const secondary = hands.length >= 2 ? hands.find((hand) => hand !== primary) ?? null : null;
    const rawPose: Pose = primary ? classifyPose(primary, this.thresholds) : 'none';
    const openAmount = primary ? openness(primary, this.thresholds) : 0;
    const inLossGrace =
      !primary && this.wasTracking && timeMs - this.handSeenAt <= HAND_LOSS_GRACE_MS;

    let poseState: { stable: Pose; changed: boolean };
    if (primary) {
      poseState = this.debouncer.update(rawPose);
    } else if (inLossGrace) {
      poseState = { stable: this.debouncer.stable, changed: false };
    } else {
      const changed = this.wasTracking;
      this.debouncer.reset();
      poseState = { stable: 'none', changed };
    }

    let pinchStarted = false;
    let pinchEnded = false;
    let fistStarted = false;
    let fistEnded = false;
    let openStarted = false;
    let pointActivated = false;
    let pinchResult = {
      active: this.pinchLatch.active,
      started: false,
      ended: false,
    };
    let pinchRatioValue = this.lastPinchRatio;
    let roll = this.lastRoll;
    let rollDelta = 0;
    let cursorRaw = this.lastCursorRaw;
    let twoHand: TwoHandState = {
      active: false,
      distance: 0,
      delta: 0,
      center: { ...defaultCursor },
    };

    if (primary) {
      const now = timeMs;
      const appeared = now - this.handSeenAt > 400 || !this.wasTracking;
      this.handSeenAt = now;
      this.lastTimeMs = now;
      this.lastPrimaryWrist = { x: primary[0].x, y: primary[0].y };

      // --- pinch with hysteresis + consecutive-frame debounce -------------------------------
      const ratio = pinchRatio(primary);
      pinchRatioValue = ratio;
      // A real pinch can be classified as a fist when the other fingers curl. Only
      // reject poses whose thumb/index contact is genuinely low in the palm.
      const fistLike = rawPose === 'fist' && isFistLikePinch(primary);
      const threshold = this.pinchLatch.active
        ? this.thresholds.pinchOffRatio
        : this.thresholds.pinchOnRatio;
      const pinchCandidate = this.config.enabled.pinch && !fistLike && ratio < threshold;
      pinchResult = this.pinchLatch.update(pinchCandidate, {
        frames: this.config.pinchHoldFrames,
        releaseFrames: this.config.pinchReleaseFrames,
        nowMs: now,
      });
      pinchStarted = pinchResult.started;
      pinchEnded = pinchResult.ended;
      this.pinching = pinchResult.active;

      // --- debounced static poses -----------------------------------------------------------
      const fistCandidate = this.config.enabled.fist && poseState.stable === 'fist' && !pinchResult.active;
      const fistResult = this.fistLatch.update(fistCandidate, {
        frames: 1,
        cooldownMs: this.config.fistCooldownMs,
        nowMs: now,
      });
      fistStarted = fistResult.started;
      fistEnded = fistResult.ended;

      const openCandidate = this.config.enabled.open && poseState.stable === 'open' && !pinchResult.active;
      const openResult = this.openLatch.update(openCandidate, {
        frames: 1,
        cooldownMs: 250,
        nowMs: now,
      });
      openStarted = openResult.started;

      const pointCandidate =
        this.config.enabled.point && poseState.stable === 'point' && !pinchResult.active;
      pointActivated = this.pointDwell.update(
        pointCandidate,
        now,
        this.config.pointDwellMs,
        this.config.pointCooldownMs,
      );

      // --- continuous signals ----------------------------------------------------------------
      const rawRoll = handRoll(primary, this.aspect);
      if (appeared) {
        this.rollFilter.reset();
        this.cursorFilter.reset();
        this.lastRoll = rawRoll;
      }
      roll = this.rollFilter.filter(rawRoll, now);
      rollDelta =
        this.config.enabled.rotate && !appeared ? normalizeAngle(roll - this.lastRoll) : 0;
      this.lastRoll = roll;

      // Keep the cursor on the pinch point for open/pinch poses. Switching between palm
      // centre (hover) and the pinch midpoint (grab) made the raycast jump at pinch time.
      cursorRaw = pinchResult.active
        ? pinchPoint(primary)
        : poseState.stable === 'point'
          ? pointingPoint(primary)
          : poseState.stable === 'open' || poseState.stable === 'other'
            ? pinchPoint(primary)
            : palmCenter(primary);
      this.cursor = this.cursorFilter.filter(cursorRaw, now);
      this.lastCursorRaw = cursorRaw;
      this.lastPinchRatio = ratio;
      this.lastOpenness = openAmount;
    } else if (inLossGrace) {
      // Hold the current pinch/cursor/pose while MediaPipe briefly loses the hand.
      this.pointDwell.update(false, timeMs, this.config.pointDwellMs);
      this.pinching = this.pinchLatch.active;
    } else {
      const pinch = this.pinchLatch.update(false, { frames: 1, nowMs: timeMs });
      pinchEnded = pinch.ended;
      const fist = this.fistLatch.update(false, { frames: 1, nowMs: timeMs });
      fistEnded = fist.ended;
      this.openLatch.update(false, { frames: 1, nowMs: timeMs });
      this.pointDwell.update(false, timeMs, this.config.pointDwellMs);
      this.rollFilter.reset();
      this.cursorFilter.reset();
      this.pinching = false;
      this.lastPrimaryWrist = null;
      this.twoHandSince = null;
      this.twoHandPrevious = 0;
      this.lastRoll = 0;
      this.lastPinchRatio = 0;
      this.lastCursorRaw = { ...defaultCursor };
      this.lastOpenness = 0;
      roll = 0;
      cursorRaw = this.lastCursorRaw;
    }

    if (secondary && this.config.enabled.twoHand) {
      const distance = twoHandDistance([primary!, secondary], this.aspect);
      if (this.twoHandSince === null) {
        this.twoHandSince = timeMs;
        this.twoHandSmoothed = distance;
        this.twoHandPrevious = distance;
      }
      this.twoHandSmoothed += 0.25 * (distance - this.twoHandSmoothed);
      twoHand = {
        active: timeMs - this.twoHandSince > 80,
        distance: this.twoHandSmoothed,
        delta: this.twoHandSmoothed - this.twoHandPrevious,
        center: {
          x: (primary![0].x + secondary[0].x) / 2,
          y: (primary![0].y + secondary[0].y) / 2,
        },
      };
      this.twoHandPrevious = this.twoHandSmoothed;
    } else {
      this.twoHandSince = null;
      this.twoHandPrevious = 0;
    }

    const trackingLost = !primary && !inLossGrace && this.wasTracking;
    this.wasTracking = !!primary || inLossGrace;

    return {
      timeMs,
      hasHand: !!primary,
      handCount: hands.length,
      primary,
      pose: poseState.stable,
      rawPose,
      poseChanged: poseState.changed,
      pinch: this.pinching,
      pinchStarted,
      pinchEnded,
      pinchRatio: pinchRatioValue,
      pinchThreshold: this.thresholds.pinchOnRatio,
      point: this.config.enabled.point && poseState.stable === 'point' && !this.pinching,
      pointActivated,
      fist: this.config.enabled.fist && poseState.stable === 'fist' && this.fistLatch.active,
      fistStarted,
      fistEnded,
      open: this.openLatch.active,
      openStarted,
      cursor: this.cursor,
      cursorRaw,
      roll,
      rollDelta,
      openness: primary ? openAmount : inLossGrace ? this.lastOpenness : 0,
      twoHand,
      aspect: this.aspect,
      trackingLost,
    };
  }

  /** Used by the keyboard/demo tools to inject a frame without a camera. */
  handleHands(hands: HandLandmarks[], timeMs: number): GestureFrame {
    return this.update(hands, timeMs);
  }
}
