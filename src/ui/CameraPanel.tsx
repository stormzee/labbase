import { Camera, CameraOff, Hand, Loader2, MousePointer2, RefreshCw, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { calibratePinchFromSamples } from '../gestures/calibration';
import type { TrackingStatus } from '../tracking/useHandTracking';
import type { HandTrackingApi } from '../tracking/useHandTracking';
import { useSettingsStore } from '../store/settingsStore';
import { cn, Panel, Pill, SectionLabel, StatusDot } from './primitives';

const CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

const statusLabel: Record<TrackingStatus, string> = {
  idle: 'Camera off',
  requesting: 'Requesting camera…',
  loading: 'Loading hand model…',
  tracking: 'Tracking',
  denied: 'Permission denied',
  error: 'Tracking error',
  ended: 'Camera ended',
};

function HandOverlay({ tracking }: { tracking: HandTrackingApi }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const showLandmarks = useSettingsStore((state) => state.gesture.showLandmarks);
  const status = tracking.status;

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const frame = tracking.frameRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, width, height);
          if (showLandmarks && frame?.primary && status === 'tracking') {
            const videoAspect = frame.aspect;
            const viewAspect = width / Math.max(1, height);
            const map = (point: { x: number; y: number }) => {
              let x = point.x;
              let y = point.y;
              if (videoAspect >= viewAspect) {
                x = (point.x - 0.5) * (videoAspect / viewAspect) + 0.5;
              } else {
                y = (point.y - 0.5) * (viewAspect / videoAspect) + 0.5;
              }
              return { x: x * width, y: y * height };
            };
            const points = frame.primary.map(map);
            context.lineWidth = 2.5 * dpr;
            context.strokeStyle = 'rgba(116,185,174,0.9)';
            context.beginPath();
            for (const [a, b] of CONNECTIONS) {
              context.moveTo(points[a].x, points[a].y);
              context.lineTo(points[b].x, points[b].y);
            }
            context.stroke();
            points.forEach((point, index) => {
              const tip = index === 4 || index === 8;
              context.beginPath();
              context.arc(point.x, point.y, (tip ? 4.2 : 2.4) * dpr, 0, Math.PI * 2);
              context.fillStyle = tip ? '#f2b84b' : '#d8efe9';
              context.fill();
            });
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [showLandmarks, status, tracking.frameRef]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

export function CameraPanel({ tracking }: { tracking: HandTrackingApi }) {
  const sensitivity = useSettingsStore((state) => state.gesture.sensitivity);
  const setSensitivity = useSettingsStore((state) => state.setSensitivity);
  const setGesture = useSettingsStore((state) => state.setGesture);
  const pinchCalibration = useSettingsStore((state) => state.gesture.pinchCalibration);
  const hasPinchCalibration = typeof pinchCalibration === 'number';
  const panelRef = useRef<HTMLDivElement>(null);
  const calibratingRef = useRef(false);
  const calibrationTimer = useRef<number | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState<string | null>(null);
  const live = tracking.status === 'tracking';
  const busy = tracking.status === 'requesting' || tracking.status === 'loading';
  const hasFailure = tracking.failure !== null && !live;
  const handActive = tracking.stats.hasHand;

  useEffect(() => {
    if (tracking.status === 'idle' && !tracking.failure) return;
    panelRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [tracking.failure, tracking.status]);

  useEffect(
    () => () => {
      if (calibrationTimer.current !== null) window.clearInterval(calibrationTimer.current);
    },
    [],
  );

  const calibratePinch = () => {
    if (!live) {
      setCalibrationMessage('Start the camera first, then pinch to calibrate.');
      return;
    }
    if (calibratingRef.current) return;
    calibratingRef.current = true;
    setCalibrating(true);
    setCalibrationMessage('Pinch thumb and index together and hold for a moment…');
    const samples: number[] = [];
    const startedAt = performance.now();
    calibrationTimer.current = window.setInterval(() => {
      const frame = tracking.frameRef.current;
      if (frame?.hasHand && Number.isFinite(frame.pinchRatio)) {
        const ratio = frame.pinchRatio;
        if (ratio > 0.02 && ratio < 0.78) samples.push(ratio);
      }
      if (performance.now() - startedAt < 2600) return;
      if (calibrationTimer.current !== null) window.clearInterval(calibrationTimer.current);
      calibrationTimer.current = null;
      calibratingRef.current = false;
      setCalibrating(false);
      const closed = calibratePinchFromSamples(samples);
      if (closed === null) {
        setCalibrationMessage('No closed pinch detected. Hold thumb and index together and try again.');
        return;
      }
      setGesture({ pinchCalibration: closed });
      setCalibrationMessage(
        `Calibrated to ${closed.toFixed(2)}. Pinch should now grab reliably; press Reset to use automatic thresholds.`,
      );
    }, 50);
  };

  const toggleCamera = () => {
    if (live) tracking.stop();
    else void tracking.start();
  };

  const continueWithoutCamera = () => {
    tracking.stop();
    tracking.clearFailure();
  };

  return (
    <div ref={panelRef} className="shrink-0">
      <Panel className="flex shrink-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3.5 pt-3">
        <div className="flex items-center gap-2">
          <SectionLabel>Hand tracking</SectionLabel>
          <StatusDot
            tone={live ? 'teal' : busy ? 'amber' : tracking.failure ? 'rose' : 'muted'}
            pulse={busy || (live && handActive)}
          />
        </div>
        <span className="flex items-center gap-1 text-[10px] text-lab-300">
          <ShieldCheck size={11} /> on-device
        </span>
      </div>

      <div
        className={cn(
          'relative mx-3 mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/50',
          live || busy ? 'aspect-video' : 'h-[86px]',
        )}
      >
        <video
          ref={tracking.videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'h-full w-full -scale-x-100 object-cover transition-opacity duration-300',
            live ? 'opacity-100' : 'opacity-0',
          )}
        />
        <HandOverlay tracking={tracking} />
        {!live && (
          <div className="absolute inset-0 flex items-center justify-center gap-2.5 bg-gradient-to-br from-lab-900/90 to-lab-950/95 px-3 text-left">
            {busy ? (
              <>
                <Loader2 size={20} className="animate-spin text-amber-300" />
                <p className="text-[11px] font-medium text-lab-200">{statusLabel[tracking.status]}</p>
              </>
            ) : (
              <>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lab-300">
                  <CameraOff size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-lab-200">Camera is off</p>
                  <p className="truncate text-[9px] text-lab-400">Gesture control is optional</p>
                </div>
                <button
                  type="button"
                  data-gesture-target
                  onClick={toggleCamera}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/25"
                >
                  <Camera size={12} /> Enable camera
                </button>
              </>
            )}
          </div>
        )}
        {live && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-lab-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            live
          </div>
        )}
        {live && !handActive && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-center text-[10px] text-lab-200">
            Show one or two hands in frame
          </div>
        )}
      </div>

      {hasFailure && tracking.failure && (
        <div className="mx-3 mt-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-2.5 text-[10px] text-rose-100">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{tracking.failure.title}</p>
            <button
              type="button"
              aria-label="Dismiss camera error"
              data-gesture-target
              className="rounded p-0.5 text-rose-200/70 hover:text-white"
              onClick={continueWithoutCamera}
            >
              <X size={12} />
            </button>
          </div>
          <p className="mt-1 leading-relaxed text-rose-100/80">{tracking.failure.hint}</p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              data-gesture-target
              onClick={() => void tracking.retry()}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 font-semibold text-rose-50 hover:bg-white/10"
            >
              <RefreshCw size={11} /> Retry
            </button>
            <button
              type="button"
              data-gesture-target
              onClick={continueWithoutCamera}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-rose-100/80 hover:bg-white/5"
            >
              <MousePointer2 size={11} /> Continue without camera
            </button>
          </div>
        </div>
      )}

      {(live || busy) && (
        <div className="flex items-center gap-2 px-3 pt-2">
          <button
            type="button"
            data-gesture-target
            onClick={toggleCamera}
            disabled={busy}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition',
              live
                ? 'border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                : 'border-lab-400/30 bg-lab-400/10 text-lab-100 hover:bg-lab-400/20',
              busy && 'opacity-50',
            )}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CameraOff size={12} />}
            {busy ? 'Starting…' : 'Stop camera'}
          </button>
          <Pill tone={handActive ? 'teal' : 'neutral'}>
            <Hand size={11} /> {tracking.stats.handCount}
          </Pill>
          <Pill tone="neutral">{tracking.stats.fps > 0 ? `${tracking.stats.fps} fps` : '— fps'}</Pill>
        </div>
      )}

      <div className="px-3 pb-3 pt-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-lab-300">
          <span className="flex items-center gap-1">
            <SlidersHorizontal size={11} /> Gesture sensitivity
          </span>
          <span className="font-mono text-lab-200">{sensitivity}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sensitivity}
          aria-label="Gesture sensitivity"
          onChange={(event) => setSensitivity(Number(event.target.value))}
          className="lab-range w-full"
        />
        <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-lab-500">
          <span>Strict</span>
          <span>Forgiving</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-lab-400">Pose</p>
            <p className="font-semibold capitalize text-lab-100">{live ? tracking.stats.pose : 'off'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-lab-400">Pinch</p>
            <p className={cn('font-semibold', tracking.stats.pinch ? 'text-amber-300' : 'text-lab-100')}>
              {tracking.stats.pinch ? 'closed' : 'open'}
            </p>
            <p className="mt-0.5 font-mono text-[8px] text-lab-500">
              gap {live ? tracking.stats.pinchRatio.toFixed(2) : '—'} /{' '}
              {live ? tracking.stats.pinchThreshold.toFixed(2) : '—'}
            </p>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-lab-300">Pinch calibration</p>
            <p className="truncate text-[9px] text-lab-500">
              {hasPinchCalibration ? `custom ${pinchCalibration.toFixed(2)}` : 'automatic thresholds'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasPinchCalibration && (
              <button
                type="button"
                data-gesture-target
                onClick={() => {
                  setGesture({ pinchCalibration: null });
                  setCalibrationMessage('Automatic pinch thresholds restored.');
                }}
                className="rounded-md border border-white/10 px-1.5 py-1 text-[9px] font-semibold text-lab-300 hover:bg-white/10 hover:text-white"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              data-gesture-target
              onClick={calibratePinch}
              disabled={calibrating}
              className={cn(
                'rounded-md border border-amber-400/35 bg-amber-400/10 px-1.5 py-1 text-[9px] font-semibold text-amber-200 transition hover:bg-amber-400/20',
                calibrating && 'opacity-60',
              )}
            >
              {calibrating ? 'Hold…' : 'Calibrate'}
            </button>
          </div>
        </div>
        {calibrationMessage && (
          <p aria-live="polite" className="mt-1 text-[9px] leading-relaxed text-lab-400">
            {calibrationMessage}
          </p>
        )}
        <p className="mt-1.5 text-[9px] leading-relaxed text-lab-500">
          Fist operates the selection. Pinch grabs the highlighted apparatus; calibration adapts to your hand.
        </p>
      </div>
      </Panel>
    </div>
  );
}
