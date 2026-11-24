export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type HandLandmarks = readonly Landmark[];

export type Pose = 'none' | 'open' | 'fist' | 'point' | 'peace' | 'other';

export interface GestureThresholds {
  /** Tip distance from wrist must exceed PIP distance by this factor. */
  fingerExtendedRatio: number;
  /** Tip distance from the MCP must be below this factor for a curled finger. */
  fingerCurledRatio: number;
  thumbOutRatio: number;
  pinchOnRatio: number;
  pinchOffRatio: number;
  opennessClosed: number;
  opennessOpen: number;
  thumbClosed: number;
  thumbOpen: number;
}

export interface GestureFeatureFlags {
  pinch: boolean;
  open: boolean;
  point: boolean;
  fist: boolean;
  rotate: boolean;
  twoHand: boolean;
}

export type FistAction = 'operate' | 'flow';

export interface GestureConfig {
  /** 0 = strict, 100 = very forgiving. */
  sensitivity: number;
  enabled: GestureFeatureFlags;
  poseHoldFrames: number;
  pinchHoldFrames: number;
  /** Consecutive frames the ratio must stay open before a pinch releases. */
  pinchReleaseFrames: number;
  /** Measured closed-pinch ratio from the calibration tool, or null for automatic thresholds. */
  pinchCalibration: number | null;
  fistCooldownMs: number;
  pointDwellMs: number;
  pointCooldownMs: number;
  rotationGain: number;
  twoHandZoomGain: number;
  fistAction: FistAction;
  mirror: boolean;
  showLandmarks: boolean;
}

export interface TwoHandState {
  active: boolean;
  distance: number;
  delta: number;
  center: { x: number; y: number };
}

export interface GestureFrame {
  timeMs: number;
  hasHand: boolean;
  handCount: number;
  primary: HandLandmarks | null;
  pose: Pose;
  rawPose: Pose;
  poseChanged: boolean;
  pinch: boolean;
  pinchStarted: boolean;
  pinchEnded: boolean;
  /** Raw thumb–index gap / palm size, for calibration and diagnostics. */
  pinchRatio: number;
  /** Active activation threshold (on the same normalised scale as pinchRatio). */
  pinchThreshold: number;
  point: boolean;
  pointActivated: boolean;
  fist: boolean;
  fistStarted: boolean;
  fistEnded: boolean;
  open: boolean;
  openStarted: boolean;
  cursor: { x: number; y: number };
  cursorRaw: { x: number; y: number };
  roll: number;
  rollDelta: number;
  openness: number;
  twoHand: TwoHandState;
  aspect: number;
  trackingLost: boolean;
}
