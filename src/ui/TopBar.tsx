import { Camera, CameraOff, FlaskConical, Gauge, HelpCircle, RotateCcw, Settings } from 'lucide-react';
import { STEP_META } from '../domain/constants';
import { useProgress } from './useLabData';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import type { TrackingStatus } from '../tracking/useHandTracking';
import { IconButton, Pill, ProgressBar, StatusDot } from './primitives';
import { ProgressStepper } from './ProgressStepper';

interface TopBarProps {
  status: TrackingStatus;
  helpOpen: boolean;
  settingsOpen: boolean;
  onHelp: () => void;
  onSettings: () => void;
  onReset: () => void;
}

export function TopBar({ status, helpOpen, settingsOpen, onHelp, onSettings, onReset }: TopBarProps) {
  const progress = useProgress();
  const showFps = useSettingsStore((state) => state.showFps);
  const quality = useSettingsStore((state) => state.quality);
  const fps = useUiStore((state) => state.renderFps);
  const cameraLive = status === 'tracking';
  const cameraBusy = status === 'requesting' || status === 'loading';
  const current = progress.currentStep ? STEP_META[progress.currentStep] : null;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <div className="pointer-events-auto flex w-full max-w-[1800px] items-center gap-3 rounded-2xl border border-white/10 bg-lab-950/85 px-3 py-2.5 text-lab-100 shadow-panel backdrop-blur-xl sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-400/25 to-lab-500/20 text-amber-300 shadow-glow">
            <FlaskConical size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-sm font-bold tracking-tight">LabBase</span>
              <span className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-lab-300 sm:inline">
                Virtual Lab
              </span>
            </div>
            <p className="hidden truncate text-[11px] text-lab-300 sm:block">
              Acid–base titration · HCl + NaOH
            </p>
          </div>
        </div>

        <div className="mx-auto hidden min-w-0 flex-col items-center gap-2 md:flex">
          <ProgressStepper progress={progress} compact />
          <div className="flex items-center gap-2 text-[10px] text-lab-300">
            <span className="font-semibold uppercase tracking-[0.16em] text-lab-200">
              Step {Math.min(7, progress.completedCount + 1)} of 7
            </span>
            <span className="h-1 w-1 rounded-full bg-lab-600" />
            <span>{current ? current.short : 'Complete'}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Pill tone={cameraLive ? 'green' : cameraBusy ? 'amber' : 'neutral'} className="hidden lg:inline-flex">
            <StatusDot tone={cameraLive ? 'teal' : cameraBusy ? 'amber' : 'muted'} pulse={cameraBusy} />
            {cameraLive ? 'Camera live' : cameraBusy ? 'Starting…' : 'Camera off'}
          </Pill>
          {showFps && (
            <Pill tone="neutral" className="hidden xl:inline-flex">
              <Gauge size={11} />
              {fps > 0 ? `${fps} fps` : '— fps'}
            </Pill>
          )}
          <Pill tone="neutral" className="hidden 2xl:inline-flex">
            {quality}
          </Pill>
          <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
          <IconButton label="Gesture and keyboard help (H)" onClick={onHelp} active={helpOpen}>
            <HelpCircle size={17} />
          </IconButton>
          <IconButton label="Lab settings (,)" onClick={onSettings} active={settingsOpen}>
            <Settings size={17} />
          </IconButton>
          <IconButton label="Reset the experiment (Shift+R)" onClick={onReset} className="hover:border-rose-400/40 hover:bg-rose-500/10">
            <RotateCcw size={17} />
          </IconButton>
          <span className="hidden sm:block">
            <Pill tone="neutral" className="hidden xl:inline-flex">
              {cameraLive ? <Camera size={11} /> : <CameraOff size={11} />}
              on-device
            </Pill>
          </span>
        </div>
      </div>
      <div className="absolute inset-x-3 top-[68px] md:hidden">
        <div className="mx-auto w-full max-w-md">
          <ProgressBar value={progress.ratio} className="bg-white/10" />
          <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-lab-300">
            {current ? current.short : 'Complete'}
          </p>
        </div>
      </div>
    </header>
  );
}
