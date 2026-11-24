/** Camera access helpers with a testable, explicit error taxonomy. */

export type CameraFailureCode =
  | 'unsupported'
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'constraints'
  | 'security'
  | 'unknown';

export class CameraError extends Error {
  readonly code: CameraFailureCode;
  readonly hint: string;

  constructor(code: CameraFailureCode, message: string, hint: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CameraError';
    this.code = code;
    this.hint = hint;
  }
}

const HINTS: Record<CameraFailureCode, string> = {
  unsupported:
    'This browser does not expose a camera API. Use Chrome or Edge on localhost/HTTPS, or continue with mouse and keyboard.',
  denied:
    'Camera permission was denied. Allow camera access in the address-bar site settings and retry, or continue without a camera.',
  'not-found': 'No webcam was found. Connect a camera and retry, or continue with mouse and keyboard.',
  'in-use': 'The camera is being used by another application. Close it and retry, or continue without a camera.',
  constraints: 'The camera could not provide the requested resolution. Retry, or lower the camera quality.',
  security:
    'Camera access requires a secure context (localhost or HTTPS). Open the app through the local dev server.',
  unknown: 'The camera could not be started. Retry, or continue with mouse and keyboard.',
};

export function mapCameraError(error: unknown): CameraError {
  if (error instanceof CameraError) return error;
  const name = (error as { name?: string } | null)?.name ?? '';
  const code: CameraFailureCode =
    name === 'NotAllowedError' || name === 'PermissionDeniedError'
      ? 'denied'
      : name === 'NotFoundError' || name === 'DevicesNotFoundError'
        ? 'not-found'
        : name === 'NotReadableError' || name === 'TrackStartError'
          ? 'in-use'
          : name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError'
            ? 'constraints'
            : name === 'SecurityError'
              ? 'security'
              : 'unknown';
  const message =
    error instanceof Error && error.message ? error.message : `Camera error (${name || 'unknown'})`;
  return new CameraError(code, message, HINTS[code], { cause: error });
}

export interface MediaDevicesLike {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}

export interface CameraRequestOptions {
  width: number;
  height: number;
  frameRate?: number;
}

export function cameraConstraints(options: CameraRequestOptions): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      width: { ideal: options.width },
      height: { ideal: options.height },
      frameRate: { ideal: options.frameRate ?? 30 },
      facingMode: 'user',
    },
  };
}

/** Request a front-facing stream and normalise every failure into a CameraError. */
export async function requestCameraStream(
  mediaDevices: MediaDevicesLike | null | undefined,
  options: CameraRequestOptions,
): Promise<MediaStream> {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    throw new CameraError('unsupported', 'getUserMedia is not available.', HINTS.unsupported);
  }
  try {
    return await mediaDevices.getUserMedia(cameraConstraints(options));
  } catch (error) {
    throw mapCameraError(error);
  }
}

export const CAMERA_ERROR_HINTS = HINTS;
