/** Lightweight 1€ filter for noisy interaction signals (hand cursor, roll). */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private value: number | null = null;
  private derivative = 0;
  private lastTime: number | null = null;

  constructor(options: { minCutoff?: number; beta?: number; dCutoff?: number } = {}) {
    this.minCutoff = options.minCutoff ?? 1.2;
    this.beta = options.beta ?? 0.02;
    this.dCutoff = options.dCutoff ?? 1.0;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  reset(): void {
    this.value = null;
    this.derivative = 0;
    this.lastTime = null;
  }

  filter(next: number, timeMs: number): number {
    const time = timeMs / 1000;
    if (this.value === null || this.lastTime === null) {
      this.value = next;
      this.lastTime = time;
      return next;
    }
    const dt = Math.max(1e-3, time - this.lastTime);
    this.lastTime = time;
    const rawDerivative = (next - this.value) / dt;
    const derivativeAlpha = this.alpha(this.dCutoff, dt);
    this.derivative += derivativeAlpha * (rawDerivative - this.derivative);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.derivative);
    const alpha = this.alpha(cutoff, dt);
    this.value += alpha * (next - this.value);
    return this.value;
  }
}

export class SmoothPoint2D {
  private x = new OneEuroFilter({ minCutoff: 1.4, beta: 0.025 });
  private y = new OneEuroFilter({ minCutoff: 1.4, beta: 0.025 });
  reset(): void {
    this.x.reset();
    this.y.reset();
  }
  filter(point: { x: number; y: number }, timeMs: number): { x: number; y: number } {
    return { x: this.x.filter(point.x, timeMs), y: this.y.filter(point.y, timeMs) };
  }
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const normalizeAngle = (angle: number): number => {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
