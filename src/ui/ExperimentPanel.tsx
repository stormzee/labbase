import { Check, Clock3, FlaskConical, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { STEP_META, STEP_ORDER } from '../domain/constants';
import { formatDuration } from '../lib/format';
import { useLabStore } from '../store/labStore';
import { useElapsedSeconds, useProgress } from './useLabData';
import { ActionButton, Panel, Pill, ProgressBar, SectionLabel } from './primitives';

export function ExperimentPanel() {
  const progress = useProgress();
  const elapsed = useElapsedSeconds();
  const reset = useLabStore((state) => state.reset);
  const result = useLabStore((state) => state.experiment.result);
  const current = progress.currentStep ? STEP_META[progress.currentStep] : null;

  return (
    <Panel className="flex min-h-[460px] flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/5 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Experiment 01</SectionLabel>
          <Pill tone="amber">
            <FlaskConical size={11} /> Titration
          </Pill>
        </div>
        <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-white">
          Standardise the unknown acid
        </h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-lab-300">
          Find the concentration of HCl by titrating 25.00 mL of it with standardised 0.1000 M NaOH.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={progress.ratio} />
          <span className="w-9 text-right font-mono text-[10px] text-lab-200">
            {Math.round(progress.ratio * 100)}%
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-lab-400">
          <span className="flex items-center gap-1">
            <Clock3 size={11} /> {formatDuration(elapsed)}
          </span>
          <span>
            {progress.completedCount} / {STEP_ORDER.length} steps
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 lab-scroll">
        {current ? (
          <div className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-lab-500/5 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-[11px] font-bold text-amber-200">
                {current.index + 1}
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                Current step
              </p>
            </div>
            <h2 className="mt-2 text-sm font-semibold text-white">{current.title}</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-lab-200">{current.instruction}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-lab-400">{current.detail}</p>
            <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider text-lab-400">
              <Sparkles size={10} className="text-amber-300" />
              Pinch, click or press Space to act
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-200">
              <Check size={15} /> Experiment complete
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/80">
              Your titre and calculated HCl concentration are in the measurement panel. Reset to run another
              sample.
            </p>
          </div>
        )}

        <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5">
          <ShieldAlert size={11} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="text-[9px] leading-relaxed text-lab-400">
            Wear goggles. NaOH is corrosive. Read the burette at eye level; never fill it unclamped.
          </p>
        </div>

        {result && (
          <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Your result</SectionLabel>
              <Pill tone={result.grade === 'repeat' ? 'rose' : 'green'}>
                {result.grade === 'repeat' ? 'Repeat' : result.grade === 'good' ? 'Good' : 'Excellent'}
              </Pill>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-lab-400">Titre</p>
                <p className="font-mono text-base font-semibold text-white">{result.titreMl.toFixed(2)} mL</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] uppercase tracking-wider text-lab-400">C(HCl) / M</p>
                <p className="font-mono text-base font-semibold text-white">
                  {result.acidConcentrationM.toFixed(4)}
                </p>
              </div>
            </div>
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-emerald-100/60">
              error {result.errorPercent.toFixed(2)}% · equivalence {result.trueTitreMl.toFixed(2)} mL
            </p>
          </div>
        )}

        {!current && !result && (
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-[10px] leading-relaxed text-lab-400">
            The results panel will unlock after the final burette reading is recorded.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2.5">
        <ActionButton tone="ghost" onClick={() => reset()} className="flex-1" title="Reset with a fresh unknown sample">
          <RotateCcw size={13} /> Reset experiment
        </ActionButton>
        <Pill tone="neutral">v1.0</Pill>
      </div>
    </Panel>
  );
}
