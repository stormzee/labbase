import { Activity, AlertTriangle, CheckCircle2, Droplets, FlaskConical, Gauge, Lock } from 'lucide-react';
import { formatPh, formatReading } from '../lib/format';
import { useLabStore } from '../store/labStore';
import { useFlaskAnalysis, useProgress, useReading } from './useLabData';
import { Panel, Pill, SectionLabel, cn } from './primitives';

export function MeasurementPanel() {
  const experiment = useLabStore((state) => state.experiment);
  const flow = useLabStore((state) => state.flow);
  const buretteVolume = useLabStore((state) => state.containers.burette.volumeMl);
  const buretteStartVolume = useLabStore((state) => state.buretteStartVolumeMl);
  const flaskVolume = useLabStore((state) => state.containers.flask.volumeMl);
  const analysis = useFlaskAnalysis();
  const reading = useReading();
  const progress = useProgress();
  const result = experiment.result;
  const initial = experiment.readings.initialMl;
  const final = experiment.readings.finalMl;
  const titre = final !== null && initial !== null ? final - initial : null;
  const sampleId = (experiment.seed % 10000).toString().padStart(4, '0');
  const flowLabel = flow === 'off' ? 'Closed' : flow === 'drop' ? 'Dropwise' : 'Stream';

  return (
    <Panel className="shrink-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-3.5 py-2.5">
        <SectionLabel>Measurements</SectionLabel>
        <Pill tone={experiment.endpointReached ? 'green' : flow !== 'off' ? 'amber' : 'neutral'}>
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              flow !== 'off' ? 'animate-pulse bg-amber-300' : experiment.endpointReached ? 'bg-emerald-300' : 'bg-lab-500',
            )}
          />
          {flow !== 'off' ? `Flowing · ${flowLabel}` : experiment.endpointReached ? 'Endpoint reached' : 'Stopcock closed'}
        </Pill>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-lab-400">
              <Gauge size={10} /> Burette
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {reading === null ? '—' : formatReading(reading)}
              <span className="ml-1 text-[10px] font-normal text-lab-400">mL</span>
            </p>
            <p className="mt-0.5 text-[9px] text-lab-500">
              initial {formatReading(initial)} · final {formatReading(final)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-lab-400">
              <FlaskConical size={10} /> Flask
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {flaskVolume.toFixed(2)}
              <span className="ml-1 text-[10px] font-normal text-lab-400">mL</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-lab-500">
              <Droplets size={9} /> {experiment.indicatorAdded ? 'indicator added' : 'no indicator'}
            </p>
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-lab-400">
              <Activity size={10} /> pH (simulated probe)
            </p>
            <span className="font-mono text-xs font-semibold text-lab-100">{formatPh(analysis.ph)}</span>
          </div>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 via-emerald-400 to-indigo-500">
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-lab-950 shadow"
              style={{ left: `${Math.min(100, Math.max(0, (analysis.ph / 14) * 100))}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[8px] text-lab-500">
            <span>0</span>
            <span>7</span>
            <span>14</span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
            <p className="text-[8px] uppercase tracking-wider text-lab-500">Titre</p>
            <p className="font-mono text-sm font-semibold text-lab-100">
              {titre === null ? '—' : titre.toFixed(2)}
              <span className="ml-0.5 text-[8px] font-normal text-lab-400">mL</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
            <p className="text-[8px] uppercase tracking-wider text-lab-500">Delivered</p>
            <p className="font-mono text-sm font-semibold text-lab-100">
              {(buretteStartVolume !== null ? Math.max(0, buretteStartVolume - buretteVolume) : 0).toFixed(2)}
              <span className="ml-0.5 text-[8px] font-normal text-lab-400">mL</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
            <p className="text-[8px] uppercase tracking-wider text-lab-500">Sample</p>
            <p className="font-mono text-sm font-semibold text-lab-100">#{sampleId}</p>
          </div>
        </div>

        <div className="mt-2">
          {result ? (
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-200/80">
                    {result.grade === 'repeat' ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                    Unknown HCl concentration
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-white">
                    {result.acidConcentrationM.toFixed(4)}
                    <span className="ml-1 text-[9px] font-normal text-emerald-100/70">mol dm⁻³</span>
                  </p>
                </div>
                <Pill tone={result.grade === 'repeat' ? 'rose' : 'green'}>
                  {result.grade === 'repeat' ? 'Repeat' : result.grade === 'good' ? 'Good' : 'Excellent'}
                </Pill>
              </div>
              <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-emerald-100/70">
                C = 0.1000 × {result.titreMl.toFixed(2)} ÷ 25.00 · error {result.errorPercent.toFixed(2)}%
              </p>
              <p className="mt-1 text-[9px] text-emerald-100/50">
                True value: {result.trueConcentrationM.toFixed(3)} mol dm⁻³ · equivalence {result.trueTitreMl.toFixed(2)} mL
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-[10px] text-lab-400">
              <Lock size={12} className="shrink-0" />
              <p>
                {progress.currentStep === 'calculate'
                  ? 'Recorded. Calculate the concentration with the action button.'
                  : 'Record the initial and final readings to unlock the concentration calculation.'}
              </p>
            </div>
          )}
        </div>

        {experiment.overshot && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1.5 text-[9px] text-rose-200">
            <AlertTriangle size={11} /> Overshot — the pink is strong. The titre is too high.
          </div>
        )}
      </div>
    </Panel>
  );
}
