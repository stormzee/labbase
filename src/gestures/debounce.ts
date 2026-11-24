import type { Pose } from './types';

/**
 * Require a pose to be seen for N consecutive frames before reporting it as stable.
 * Prevents a single noisy landmark frame from triggering an action.
 */
export class PoseDebouncer {
  stable: Pose = 'none';
  candidate: Pose = 'none';
  private count = 0;
  private holdFrames: number;

  constructor(holdFrames = 4) {
    this.holdFrames = Math.max(1, Math.round(holdFrames));
  }

  setHoldFrames(frames: number): void {
    this.holdFrames = Math.max(1, Math.round(frames));
  }

  update(pose: Pose): { stable: Pose; changed: boolean } {
    if (pose === this.candidate) {
      this.count += 1;
    } else {
      this.candidate = pose;
      this.count = 1;
    }
    let changed = false;
    if (this.count >= this.holdFrames && this.candidate !== this.stable) {
      this.stable = this.candidate;
      changed = true;
    }
    return { stable: this.stable, changed };
  }

  reset(): void {
    this.stable = 'none';
    this.candidate = 'none';
    this.count = 0;
  }
}

export interface EdgeResult {
  active: boolean;
  started: boolean;
  ended: boolean;
}

/**
 * Debounced boolean edge detector with a per-start cooldown.
 * The output is a rising edge at most once per activation; holding does not repeat.
 */
export class EdgeLatch {
  active = false;
  private count = 0;
  private releaseCount = 0;
  private lastStartMs = -Infinity;

  reset(): void {
    this.active = false;
    this.count = 0;
    this.releaseCount = 0;
    this.lastStartMs = -Infinity;
  }

  update(
    value: boolean,
    options: { frames?: number; releaseFrames?: number; cooldownMs?: number; nowMs: number },
  ): EdgeResult {
    const frames = Math.max(1, Math.round(options.frames ?? 1));
    const releaseFrames = Math.max(1, Math.round(options.releaseFrames ?? 1));
    const cooldownMs = options.cooldownMs ?? 0;
    if (value) {
      this.releaseCount = 0;
      this.count += 1;
      if (!this.active && this.count >= frames && options.nowMs - this.lastStartMs >= cooldownMs) {
        this.active = true;
        this.lastStartMs = options.nowMs;
        return { active: true, started: true, ended: false };
      }
      return { active: this.active, started: false, ended: false };
    }
    if (this.active) {
      this.releaseCount += 1;
      if (this.releaseCount < releaseFrames) {
        return { active: true, started: false, ended: false };
      }
      this.active = false;
      this.count = 0;
      this.releaseCount = 0;
      return { active: false, started: false, ended: true };
    }
    this.count = 0;
    this.releaseCount = 0;
    return { active: false, started: false, ended: false };
  }
}

/**
 * Fires once after the signal has been continuously active for `dwellMs`.
 * Re-arms only after the signal drops and the cooldown expires.
 */
export class DwellDetector {
  private startedAt: number | null = null;
  private fired = false;
  private lastFireMs = -Infinity;

  reset(): void {
    this.startedAt = null;
    this.fired = false;
  }

  update(active: boolean, nowMs: number, dwellMs: number, cooldownMs = 0): boolean {
    if (!active) {
      this.startedAt = null;
      this.fired = false;
      return false;
    }
    if (this.startedAt === null) {
      this.startedAt = nowMs;
      return false;
    }
    if (this.fired) return false;
    if (nowMs - this.startedAt < dwellMs) return false;
    if (nowMs - this.lastFireMs < cooldownMs) return false;
    this.fired = true;
    this.lastFireMs = nowMs;
    return true;
  }
}
