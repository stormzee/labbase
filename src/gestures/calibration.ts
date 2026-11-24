export const MIN_PINCH_SAMPLES = 8;
export const PINCH_SAMPLE_MAX = 0.78;

/**
 * Convert raw pinch-ratio samples into a calibration value.
 *
 * Samples are collected while the user holds a pinch. The lowest quintile represents
 * a solidly closed pinch; adding headroom to that value produces the activation threshold.
 * Open-hand samples and fist contamination are excluded by the range check.
 */
export function calibratePinchFromSamples(
  samples: readonly number[],
  percentile = 0.2,
): number | null {
  const clean = samples.filter(
    (ratio) => Number.isFinite(ratio) && ratio > 0.02 && ratio < PINCH_SAMPLE_MAX,
  );
  if (clean.length < MIN_PINCH_SAMPLES) return null;
  clean.sort((a, b) => a - b);
  const index = Math.min(clean.length - 1, Math.max(0, Math.floor(clean.length * percentile)));
  return Math.round(clean[index] * 100) / 100;
}
