import { Gauge, Hand, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import type { GestureFeatureFlags } from '../gestures/types';
import { ActionButton, Pill, SectionLabel, cn } from './primitives';

const FEATURE_LABELS: Array<{ key: keyof GestureFeatureFlags; label: string }> = [
  { key: 'pinch', label: 'Pinch to grab' },
  { key: 'open', label: 'Open hand to release' },
  { key: 'point', label: 'Point to select' },
  { key: 'fist', label: 'Fist to operate' },
  { key: 'rotate', label: 'Twist to rotate' },
  { key: 'twoHand', label: 'Two-hand zoom' },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-gesture-target
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition',
        checked ? 'border-lab-300/50 bg-lab-400/70' : 'border-white/15 bg-white/10',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}

function SettingRow({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-lab-100">{title}</p>
        {detail && <p className="mt-0.5 text-[9px] leading-relaxed text-lab-500">{detail}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettingsStore();
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close settings"
        className="fixed inset-0 z-[55] cursor-default bg-black/20"
        onClick={onClose}
      />
      <div
        data-gesture-ui
        className="fixed right-2 top-[70px] z-[60] max-h-[calc(100dvh-90px)] w-[min(94vw,370px)] overflow-y-auto rounded-2xl border border-white/10 bg-lab-950/96 p-4 text-lab-100 shadow-panel backdrop-blur-xl lab-scroll sm:right-3"
      >
        <div className="flex items-start justify-between">
          <div>
            <SectionLabel>Lab settings</SectionLabel>
            <h2 className="mt-1 text-base font-bold text-white">Tune the experience</h2>
          </div>
          <button
            type="button"
            data-gesture-target
            aria-label="Close settings"
            onClick={onClose}
            className="rounded-lg p-1.5 text-lab-400 hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-lab-300">
            <Gauge size={12} /> Graphics
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(['high', 'balanced', 'performance'] as const).map((quality) => (
              <button
                key={quality}
                type="button"
                data-gesture-target
                onClick={() => settings.setQuality(quality)}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[10px] font-semibold capitalize transition',
                  settings.quality === quality
                    ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                    : 'border-white/10 bg-white/5 text-lab-300 hover:bg-white/10',
                )}
              >
                {quality}
              </button>
            ))}
          </div>
          <SettingRow title="Adaptive quality" detail="Reduce DPR and shadows if FPS stays below 32.">
            <Toggle checked={settings.autoQuality} onChange={settings.setAutoQuality} label="Adaptive quality" />
          </SettingRow>
          <SettingRow title="Show FPS" detail="Display the live render rate in the top bar.">
            <Toggle checked={settings.showFps} onChange={settings.setShowFps} label="Show FPS" />
          </SettingRow>
          <SettingRow title="Floor grid" detail="Show grid lines on the laboratory floor.">
            <Toggle checked={settings.showGrid} onChange={settings.setShowGrid} label="Floor grid" />
          </SettingRow>
        </div>

        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-lab-300">
            <Hand size={12} /> Hand tracking
          </p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-lab-300">
              <span>Sensitivity</span>
              <span className="font-mono text-lab-100">{settings.gesture.sensitivity}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.gesture.sensitivity}
              aria-label="Gesture sensitivity"
              onChange={(event) => settings.setSensitivity(Number(event.target.value))}
              className="lab-range mt-1 w-full"
            />
            <div className="mt-1 flex justify-between text-[8px] uppercase tracking-wider text-lab-500">
              <span>Strict</span>
              <span>Forgiving</span>
            </div>
          </div>
          <div className="mt-1 divide-y divide-white/5">
            {FEATURE_LABELS.map((feature) => (
              <SettingRow key={feature.key} title={feature.label}>
                <Toggle
                  checked={settings.gesture.enabled[feature.key]}
                  onChange={(value) => settings.setGestureFeature(feature.key, value)}
                  label={feature.label}
                />
              </SettingRow>
            ))}
          </div>
          <SettingRow title="Show hand skeleton" detail="Draw landmark connections on the camera preview.">
            <Toggle
              checked={settings.gesture.showLandmarks}
              onChange={(value) => settings.setGesture({ showLandmarks: value })}
              label="Show hand skeleton"
            />
          </SettingRow>
          <div className="mt-1">
            <p className="text-[10px] font-medium text-lab-100">Fist action</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                data-gesture-target
                onClick={() => settings.setFistAction('operate')}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[9px] font-semibold transition',
                  settings.gesture.fistAction === 'operate'
                    ? 'border-lab-400/50 bg-lab-400/15 text-lab-100'
                    : 'border-white/10 bg-white/5 text-lab-300',
                )}
              >
                Operate selected
              </button>
              <button
                type="button"
                data-gesture-target
                onClick={() => settings.setFistAction('flow')}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[9px] font-semibold transition',
                  settings.gesture.fistAction === 'flow'
                    ? 'border-lab-400/50 bg-lab-400/15 text-lab-100'
                    : 'border-white/10 bg-white/5 text-lab-300',
                )}
              >
                Toggle flow
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-lab-300">
            <SlidersHorizontal size={12} /> Experiment
          </p>
          <SettingRow title="Auto-stop at endpoint" detail="Close the stopcock automatically at the first pink.">
            <Toggle checked={settings.autoStopAtEndpoint} onChange={settings.setAutoStop} label="Auto-stop at endpoint" />
          </SettingRow>
          <SettingRow title="Reduced motion" detail="Disable pulsing and transitional animations.">
            <Toggle checked={settings.reducedMotion} onChange={settings.setReducedMotion} label="Reduced motion" />
          </SettingRow>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
          <ActionButton tone="ghost" onClick={settings.resetSettings} className="flex-1">
            <RotateCcw size={12} /> Reset defaults
          </ActionButton>
          <Pill tone="neutral">saved locally</Pill>
        </div>
      </div>
    </>
  );
}
