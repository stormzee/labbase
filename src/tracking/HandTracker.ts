import type { Landmark } from '../gestures/types';
import {
  CameraError,
  requestCameraStream,
  type CameraRequestOptions,
  type MediaDevicesLike,
} from './camera';

export interface RawLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface HandLandmarkerLike {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => { landmarks?: RawLandmark[][] };
  close?: () => void;
}

export interface DetectionResult {
  hands: Landmark[][];
  videoWidth: number;
  videoHeight: number;
  detectMs: number;
}

export interface TrackerStats {
  fps: number;
  detectMs: number;
  frames: number;
  handCount: number;
  delegate: 'GPU' | 'CPU' | 'injected';
}

export type TrackerStatus = 'requesting' | 'loading' | 'tracking';

export type TrackerStatusCallback = (status: TrackerStatus, detail?: string) => void;

export interface HandTrackerDependencies {
  mediaDevices?: MediaDevicesLike;
  requestStream?: (
    mediaDevices: MediaDevicesLike | undefined,
    options: CameraRequestOptions,
  ) => Promise<MediaStream>;
  createLandmarker?: (options: { baseUrl: string }) => Promise<{
    landmarker: HandLandmarkerLike;
    delegate: 'GPU' | 'CPU';
  }>;
  now?: () => number;
  baseUrl?: string;
}

export class TrackingError extends Error {
  constructor(
    message: string,
    readonly stage: 'camera' | 'model' | 'runtime',
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'TrackingError';
  }
}

const assetBase = (): string => {
  const base = import.meta.env.BASE_URL ?? '/';
  return base.endsWith('/') ? base : `${base}/`;
};

async function createDefaultLandmarker(baseUrl: string): Promise<{
  landmarker: HandLandmarkerLike;
  delegate: 'GPU' | 'CPU';
}> {
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks(`${baseUrl}mediapipe/wasm`);
  const make = (delegate: 'GPU' | 'CPU') =>
    vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: `${baseUrl}models/hand_landmarker.task`,
        delegate,
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  try {
    const landmarker = await make('GPU');
    return { landmarker: landmarker as unknown as HandLandmarkerLike, delegate: 'GPU' };
  } catch (gpuError) {
    try {
      const landmarker = await make('CPU');
      return { landmarker: landmarker as unknown as HandLandmarkerLike, delegate: 'CPU' };
    } catch (cpuError) {
      throw new TrackingError(
        'The hand-tracking model could not be initialised. The model or WASM assets may be missing.',
        'model',
        { cause: { gpuError, cpuError } },
      );
    }
  }
}

/**
 * Owns the webcam and MediaPipe Hand Landmarker lifecycle.
 * Frames are processed locally; the class never performs network I/O beyond loading static assets.
 */
export class HandTracker {
  private landmarker: HandLandmarkerLike | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private running = false;
  private lastVideoTime = -1;
  private lastTimestamp = 0;
  private frameIndex = 0;
  private frameSkip = 1;
  private frameTimestamps: number[] = [];
  private frames = 0;
  private detectMs = 0;
  private consecutiveErrors = 0;
  private delegate: TrackerStats['delegate'] = 'GPU';
  private mirror = true;
  private streamEndedHandler: (() => void) | null = null;

  readonly stats: TrackerStats = { fps: 0, detectMs: 0, frames: 0, handCount: 0, delegate: 'GPU' };

  constructor(private readonly deps: HandTrackerDependencies = {}) {}

  get isRunning(): boolean {
    return this.running;
  }

  setFrameSkip(skip: number): void {
    this.frameSkip = Math.max(1, Math.round(skip));
  }

  setMirror(mirror: boolean): void {
    this.mirror = mirror;
  }

  async start(
    video: HTMLVideoElement,
    options: CameraRequestOptions & {
      onStatus?: TrackerStatusCallback;
      onStreamEnded?: () => void;
      frameSkip?: number;
    },
  ): Promise<void> {
    if (this.running) return;
    const onStatus = options.onStatus ?? (() => {});
    this.setFrameSkip(options.frameSkip ?? 1);
    this.video = video;
    onStatus('requesting');
    try {
      const devices =
        this.deps.mediaDevices ??
        (typeof navigator !== 'undefined' ? (navigator.mediaDevices as MediaDevicesLike) : undefined);
      this.stream =
        (await (this.deps.requestStream ?? requestCameraStream)(devices, options)) ??
        (() => {
          throw new CameraError('unknown', 'No camera stream was returned.', 'Retry camera access.');
        })();
      video.srcObject = this.stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      onStatus('loading');
      const baseUrl = this.deps.baseUrl ?? assetBase();
      if (this.deps.createLandmarker) {
        const created = await this.deps.createLandmarker({ baseUrl });
        this.landmarker = created.landmarker;
        this.delegate = created.delegate;
      } else {
        const created = await createDefaultLandmarker(baseUrl);
        this.landmarker = created.landmarker;
        this.delegate = created.delegate;
      }
      this.stats.delegate = this.delegate;
      this.running = true;
      this.lastVideoTime = -1;
      this.lastTimestamp = 0;
      this.frameIndex = 0;
      this.frames = 0;
      this.frameTimestamps = [];
      onStatus('tracking');

      const track = this.stream.getVideoTracks?.()[0];
      if (track?.addEventListener) {
        this.streamEndedHandler = () => {
          options.onStreamEnded?.();
          this.stop();
        };
        track.addEventListener('ended', this.streamEndedHandler);
      }
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  stop(): void {
    this.running = false;
    const track = this.stream?.getVideoTracks?.()[0];
    if (track && this.streamEndedHandler && track.removeEventListener) {
      track.removeEventListener('ended', this.streamEndedHandler);
    }
    this.stream?.getTracks?.().forEach((mediaTrack) => mediaTrack.stop());
    this.stream = null;
    this.streamEndedHandler = null;
    this.landmarker?.close?.();
    this.landmarker = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.stats.handCount = 0;
    this.stats.fps = 0;
  }

  /**
   * Run inference only when the video element has delivered a new frame.
   * Returns null when there is no new frame or the frame was skipped for performance.
   */
  detect(nowMs?: number): DetectionResult | null {
    if (!this.running || !this.landmarker || !this.video) return null;
    const video = this.video;
    if (video.readyState < 2) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    const currentTime = video.currentTime;
    this.lastVideoTime = currentTime;
    this.frameIndex += 1;
    if (this.frameSkip > 1 && this.frameIndex % this.frameSkip !== 0) return null;

    const ts = Math.max(
      Math.round(nowMs ?? this.deps.now?.() ?? performance.now()),
      this.lastTimestamp + 1,
    );
    this.lastTimestamp = ts;
    const started = performance.now();
    try {
      const result = this.landmarker.detectForVideo(video, ts);
      const detectMs = performance.now() - started;
      this.detectMs = this.detectMs === 0 ? detectMs : this.detectMs * 0.9 + detectMs * 0.1;
      this.frames += 1;
      this.consecutiveErrors = 0;
      this.frameTimestamps.push(ts);
      const oneSecondAgo = ts - 1000;
      while (this.frameTimestamps.length && this.frameTimestamps[0] < oneSecondAgo) {
        this.frameTimestamps.shift();
      }
      this.stats.fps = this.frameTimestamps.length;
      this.stats.detectMs = Math.round(this.detectMs * 10) / 10;
      this.stats.frames = this.frames;
      const rawHands = result.landmarks ?? [];
      this.stats.handCount = rawHands.length;
      const hands = rawHands.map((landmarks) =>
        landmarks.map((point) => ({
          x: this.mirror ? 1 - point.x : point.x,
          y: point.y,
          z: point.z,
        })),
      );
      return {
        hands,
        videoWidth: video.videoWidth || 640,
        videoHeight: video.videoHeight || 480,
        detectMs,
      };
    } catch (error) {
      this.consecutiveErrors += 1;
      if (this.consecutiveErrors >= 3) {
        throw new TrackingError('Hand tracking stopped responding. Try restarting the camera.', 'runtime', {
          cause: error,
        });
      }
      return null;
    }
  }
}
