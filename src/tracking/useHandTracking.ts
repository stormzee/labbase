import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { QUALITY_PRESETS } from '../domain/constants';
import { GestureEngine } from '../gestures/engine';
import type { GestureFrame, Pose } from '../gestures/types';
import { useSettingsStore } from '../store/settingsStore';
import { CameraError, type CameraFailureCode } from './camera';
import { HandTracker, TrackingError, type TrackerStats } from './HandTracker';

export type TrackingStatus =
  | 'idle'
  | 'requesting'
  | 'loading'
  | 'tracking'
  | 'denied'
  | 'error'
  | 'ended';

export interface TrackingFailure {
  title: string;
  message: string;
  hint: string;
  code: CameraFailureCode | 'tracking' | 'ended';
}

export interface TrackingStats {
  fps: number;
  detectMs: number;
  frames: number;
  handCount: number;
  delegate: TrackerStats['delegate'];
  pose: Pose;
  pinch: boolean;
  pinchRatio: number;
  pinchThreshold: number;
  pointing: boolean;
  hasHand: boolean;
}

export interface HandTrackingApi {
  videoRef: RefObject<HTMLVideoElement | null>;
  frameRef: RefObject<GestureFrame | null>;
  status: TrackingStatus;
  failure: TrackingFailure | null;
  stats: TrackingStats;
  start: () => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  clearFailure: () => void;
}

const EMPTY_STATS: TrackingStats = {
  fps: 0,
  detectMs: 0,
  frames: 0,
  handCount: 0,
  delegate: 'GPU',
  pose: 'none',
  pinch: false,
  pinchRatio: 0,
  pinchThreshold: 0,
  pointing: false,
  hasHand: false,
};

/**
 * React binding around HandTracker + GestureEngine.
 * Camera frames never leave the browser: the only network requests load static model/WASM assets.
 */
export function useHandTracking(): HandTrackingApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<GestureFrame | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const engineRef = useRef<GestureEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const lastUiRef = useRef(0);
  const statusRef = useRef<TrackingStatus>('idle');
  const gestureConfig = useSettingsStore((state) => state.gesture);
  const quality = useSettingsStore((state) => state.quality);

  if (!engineRef.current) engineRef.current = new GestureEngine(gestureConfig);

  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [failure, setFailure] = useState<TrackingFailure | null>(null);
  const [stats, setStats] = useState<TrackingStats>(EMPTY_STATS);

  const updateStatus = useCallback((next: TrackingStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    engineRef.current?.setConfig(gestureConfig);
    trackerRef.current?.setMirror(gestureConfig.mirror);
  }, [gestureConfig]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    trackerRef.current?.stop();
    trackerRef.current = null;
    engineRef.current?.reset();
    frameRef.current = null;
    startingRef.current = false;
    updateStatus('idle');
    setStats(EMPTY_STATS);
  }, [updateStatus]);

  const startLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    const tick = () => {
      const tracker = trackerRef.current;
      const engine = engineRef.current;
      if (!tracker || !engine) return;
      try {
        const detection = tracker.detect();
        const now = performance.now();
        if (detection) {
          engine.setAspect(detection.videoWidth / Math.max(1, detection.videoHeight));
          const frame = engine.update(detection.hands, now);
          frameRef.current = frame;
          if (now - lastUiRef.current > 220) {
            lastUiRef.current = now;
            setStats({
              fps: tracker.stats.fps,
              detectMs: tracker.stats.detectMs,
              frames: tracker.stats.frames,
              handCount: detection.hands.length,
              delegate: tracker.stats.delegate,
              pose: frame.pose,
              pinch: frame.pinch,
              pinchRatio: frame.pinchRatio,
              pinchThreshold: frame.pinchThreshold,
              pointing: frame.point,
              hasHand: frame.hasHand,
            });
          }
        }
      } catch (error) {
        tracker.stop();
        trackerRef.current = null;
        frameRef.current = null;
        rafRef.current = null;
        if (error instanceof TrackingError) {
          updateStatus('error');
          setFailure({
            title: 'Hand tracking stopped',
            message: error.message,
            hint: 'Retry the camera. Mouse, keyboard and touch controls are still fully available.',
            code: 'tracking',
          });
        } else {
          updateStatus('error');
          setFailure({
            title: 'Hand tracking error',
            message: error instanceof Error ? error.message : 'Unknown tracking failure.',
            hint: 'Retry, or continue with mouse and keyboard.',
            code: 'tracking',
          });
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [updateStatus]);

  const start = useCallback(async () => {
    if (startingRef.current || statusRef.current === 'tracking') return;
    const video = videoRef.current;
    if (!video) {
      setFailure({
        title: 'Camera preview not ready',
        message: 'The video element is not mounted yet.',
        hint: 'Close the panel and try again.',
        code: 'tracking',
      });
      return;
    }
    startingRef.current = true;
    setFailure(null);
    setStats(EMPTY_STATS);
    updateStatus('requesting');
    const preset = QUALITY_PRESETS[quality];
    const tracker = new HandTracker();
    trackerRef.current = tracker;
    engineRef.current?.reset();
    try {
      await tracker.start(video, {
        width: preset.cameraWidth,
        height: preset.cameraHeight,
        frameSkip: preset.frameSkip,
        onStatus: (next) => updateStatus(next),
        onStreamEnded: () => {
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          trackerRef.current = null;
          frameRef.current = null;
          updateStatus('ended');
          setFailure({
            title: 'Camera stream ended',
            message: 'The webcam stopped sending frames.',
            hint: 'Reconnect the camera and retry, or continue with mouse and keyboard.',
            code: 'ended',
          });
          setStats(EMPTY_STATS);
        },
      });
      updateStatus('tracking');
      startingRef.current = false;
      startLoop();
    } catch (error) {
      tracker.stop();
      trackerRef.current = null;
      startingRef.current = false;
      if (error instanceof CameraError) {
        updateStatus(error.code === 'denied' ? 'denied' : 'error');
        setFailure({
          title: error.code === 'denied' ? 'Camera permission denied' : 'Camera unavailable',
          message: error.message,
          hint: error.hint,
          code: error.code,
        });
      } else if (error instanceof TrackingError) {
        updateStatus('error');
        setFailure({
          title: 'Hand tracker could not start',
          message: error.message,
          hint: 'Check that the model files are present, then retry. Mouse and keyboard still work.',
          code: 'tracking',
        });
      } else {
        updateStatus('error');
        setFailure({
          title: 'Camera could not start',
          message: error instanceof Error ? error.message : 'Unknown camera error.',
          hint: 'Retry, or continue with mouse and keyboard.',
          code: 'tracking',
        });
      }
    }
  }, [quality, startLoop, updateStatus]);

  const retry = useCallback(async () => {
    stop();
    await new Promise((resolve) => setTimeout(resolve, 60));
    await start();
  }, [start, stop]);

  const clearFailure = useCallback(() => setFailure(null), []);

  useEffect(() => {
    trackerRef.current?.setFrameSkip(QUALITY_PRESETS[quality].frameSkip);
  }, [quality]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      trackerRef.current?.stop();
    },
    [],
  );

  return { videoRef, frameRef, status, failure, stats, start, stop, retry, clearFailure };
}
