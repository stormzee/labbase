/** Normalised screen-space helpers shared by tracking, gestures and the 3D raycast bridge. */

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface NdcPoint {
  x: number;
  y: number;
}

/**
 * Map a point in the mirrored camera image (0..1, y down) to WebGL NDC (-1..1, y up),
 * assuming the video is displayed with `object-fit: cover` inside the viewport.
 */
export function mapCameraToNdc(
  point: NormalizedPoint,
  videoAspect: number,
  viewportAspect: number,
): NdcPoint {
  const safeVideoAspect = Number.isFinite(videoAspect) && videoAspect > 0 ? videoAspect : 16 / 9;
  const safeViewAspect =
    Number.isFinite(viewportAspect) && viewportAspect > 0 ? viewportAspect : 16 / 9;
  let x = (point.x - 0.5) * 2;
  let y = (0.5 - point.y) * 2;
  if (safeVideoAspect >= safeViewAspect) {
    // Video is wider: the sides are cropped.
    x *= safeVideoAspect / safeViewAspect;
  } else {
    // Video is narrower: the top and bottom are cropped.
    y *= safeViewAspect / safeVideoAspect;
  }
  return { x: clampNdc(x), y: clampNdc(y) };
}

const clampNdc = (value: number): number => Math.min(1, Math.max(-1, value));

export const ndcToScreen = (
  ndc: NdcPoint,
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: (ndc.x + 1) * 0.5 * width,
  y: (1 - ndc.y) * 0.5 * height,
});
