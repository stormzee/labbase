import {
  Calculator,
  Check,
  ClipboardCheck,
  Droplet,
  Droplets,
  FlaskConical,
  Move3d,
  Pipette,
  Play,
  SprayCan,
  Square,
  Waves,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { APPARATUS_CATALOGUE } from '../domain/catalogue';
import { zoneById } from '../domain/placement';
import { primaryActionLabel, runPrimaryAction } from '../interaction/actions';
import { useLabStore } from '../store/labStore';
import { useProgress } from './useLabData';
import { ActionButton, Kbd, cn } from './primitives';

const STEP_ICONS = {
  arrange: <Move3d size={15} />,
  pipette: <Pipette size={15} />,
  indicator: <Droplets size={15} />,
  fill: <FlaskConical size={15} />,
  titrate: <Play size={15} />,
  record: <ClipboardCheck size={15} />,
  calculate: <Calculator size={15} />,
  done: <Check size={15} />,
} as const;

export function ActionDock() {
  const progress = useProgress();
  const flow = useLabStore((state) => state.flow);
  const selectedId = useLabStore((state) => state.interaction.selectedId);
  const grabbed = useLabStore((state) => Boolean(state.interaction.grabbedId));
  const experiment = useLabStore((state) => state.experiment);
  const setFlow = useLabStore((state) => state.setFlow);
  const toggleStopcock = useLabStore((state) => state.toggleStopcock);
  const pipette = useLabStore((state) => state.actionPipette);
  const indicator = useLabStore((state) => state.actionIndicator);
  const water = useLabStore((state) => state.actionWater);
  const fill = useLabStore((state) => state.actionFillBurette);
  const record = useLabStore((state) => state.recordReading);
  const calculate = useLabStore((state) => state.calculate);
  const snapHome = useLabStore((state) => state.snapSelectedToHome);
  const beginGrab = useLabStore((state) => state.beginGrab);
  const endGrab = useLabStore((state) => state.endGrab);

  const step = progress.currentStep ?? 'done';
  const label = primaryActionLabel();
  const selectedInfo = selectedId ? APPARATUS_CATALOGUE[selectedId] : null;
  const selectedPlacement = useLabStore((state) => (selectedId ? state.placements[selectedId] : null));
  const selectedSnapLabel = selectedPlacement?.snappedTo ? zoneById(selectedPlacement.snappedTo)?.label : null;
  const flowOn = flow !== 'off';

  return (
    <div
      data-gesture-ui
      className="pointer-events-auto fixed bottom-[60px] left-1/2 z-40 w-[min(94vw,590px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-lab-950/88 p-2 shadow-panel backdrop-blur-xl lg:bottom-4 lg:w-[min(calc(100vw-640px),590px)]"
    >
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-[10px] text-lab-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
          {selectedInfo ? (
            <span className="truncate">
              <span className="font-semibold text-lab-200">{selectedInfo.short}</span>
              {selectedSnapLabel ? ` · ${selectedSnapLabel}` : selectedPlacement?.snappedTo === null ? ' · on bench' : ''}
            </span>
          ) : (
            'Select equipment in the scene or list'
          )}
        </span>
        <span className="ml-auto hidden items-center gap-1 text-[9px] text-lab-500 sm:flex">
          <Kbd>Space</Kbd> primary action
          <span className="hidden xl:inline">· dropwise near endpoint</span>
        </span>
      </div>

      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          data-gesture-target
          onClick={runPrimaryAction}
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/90 px-3 py-2.5 text-left text-lab-950 shadow-[0_10px_30px_-12px_rgba(242,184,75,0.8)] transition hover:bg-amber-300',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200',
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lab-950/15">
            {STEP_ICONS[step]}
          </span>
          <span className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-lab-950/65">
              {step === 'done' ? 'Finished' : `Step ${progress.completedCount + 1} of 7`}
            </span>
            <span className="block truncate text-[12px] font-bold">{label}</span>
          </span>
        </button>
        <button
          type="button"
          data-gesture-target
          onClick={toggleStopcock}
          title="Open/close stopcock (B)"
          className={cn(
            'flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-[9px] font-semibold transition',
            flowOn
              ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
              : 'border-white/10 bg-white/5 text-lab-200 hover:bg-white/10',
          )}
        >
          {flowOn ? <Square size={15} /> : <Play size={15} />}
          {flowOn ? 'Stop' : 'Flow'}
          <span className="font-mono text-[8px] text-lab-400">B</span>
        </button>
        <button
          type="button"
          data-gesture-target
          onClick={() => (grabbed ? endGrab() : selectedId ? beginGrab(selectedId, 'pointer') : undefined)}
          title={grabbed ? 'Place the apparatus (G)' : 'Pick up selected apparatus (G)'}
          className={cn(
            'flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-[9px] font-semibold transition',
            grabbed
              ? 'border-lab-400/50 bg-lab-400/20 text-lab-100'
              : 'border-white/10 bg-white/5 text-lab-200 hover:bg-white/10',
          )}
        >
          <Move3d size={15} />
          {grabbed ? 'Place' : 'Grab'}
          <span className="font-mono text-[8px] text-lab-400">G</span>
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        <span className="mr-1 hidden text-[9px] uppercase tracking-wider text-lab-500 sm:inline">Flow</span>
        {(
          [
            { mode: 'off', label: 'Off', icon: <Square size={11} /> },
            { mode: 'drop', label: 'Drop', icon: <Droplet size={11} /> },
            { mode: 'stream', label: 'Stream', icon: <Waves size={11} /> },
          ] as const
        ).map((item) => (
          <button
            key={item.mode}
            type="button"
            data-gesture-target
            onClick={() => setFlow(item.mode)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[9px] font-semibold transition',
              flow === item.mode
                ? 'border-amber-400/50 bg-amber-400/15 text-amber-200'
                : 'border-white/8 bg-white/[0.03] text-lab-300 hover:bg-white/10',
            )}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-1">
        <DockAction label="Pipette" icon={<Pipette size={11} />} onClick={pipette} disabled={experiment.aliquotTransferred} />
        <DockAction label="Indicator" icon={<Droplets size={11} />} onClick={indicator} disabled={experiment.indicatorAdded} />
        <DockAction label="Fill" icon={<FlaskConical size={11} />} onClick={fill} disabled={experiment.buretteFilled} />
        <DockAction label="Wash" icon={<SprayCan size={11} />} onClick={water} />
      </div>
      <div className="mt-1 flex items-center gap-1">
        <DockAction label="Record" icon={<ClipboardCheck size={11} />} onClick={record} disabled={experiment.readings.finalMl !== null} />
        <DockAction label="Calculate" icon={<Calculator size={11} />} onClick={calculate} disabled={experiment.readings.finalMl === null} />
        <DockAction label="Snap home" icon={<Move3d size={11} />} onClick={snapHome} disabled={!selectedId} />
      </div>
    </div>
  );
}

function DockAction({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-gesture-target
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[9px] font-semibold transition',
        'border-white/8 bg-white/[0.03] text-lab-300 hover:bg-white/10',
        'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white/[0.03]',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}
