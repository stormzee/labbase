import { Info, Move3d, MousePointer2, X } from 'lucide-react';
import { APPARATUS_CATALOGUE } from '../domain/catalogue';
import { useLabStore } from '../store/labStore';
import { ActionButton, Pill, SectionLabel, cn } from './primitives';

export function InspectorModal() {
  const inspected = useLabStore((state) => state.interaction.inspected);
  const placement = useLabStore((state) =>
    state.interaction.selectedId ? state.placements[state.interaction.selectedId] : null,
  );
  const inspectPart = useLabStore((state) => state.inspectPart);
  const close = useLabStore((state) => state.closeInspector);
  const beginGrab = useLabStore((state) => state.beginGrab);
  const snapHome = useLabStore((state) => state.snapSelectedToHome);
  const toggleStopcock = useLabStore((state) => state.toggleStopcock);
  const pipette = useLabStore((state) => state.actionPipette);
  const indicator = useLabStore((state) => state.actionIndicator);
  const water = useLabStore((state) => state.actionWater);

  if (!inspected) return null;
  const info = APPARATUS_CATALOGUE[inspected.apparatusId];
  const part = info.parts.find((item) => item.id === inspected.partId) ?? info.parts[0];

  const primaryAction = () => {
    if (inspected.apparatusId === 'burette') toggleStopcock();
    else if (inspected.apparatusId === 'pipette') pipette();
    else if (inspected.apparatusId === 'indicator') indicator();
    else if (inspected.apparatusId === 'washBottle') water();
    else if (info.movable) beginGrab(inspected.apparatusId, 'pointer');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" data-gesture-ui>
      <button
        type="button"
        aria-label="Close inspector"
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative z-10 max-h-[86vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-lab-950/95 text-lab-100 shadow-panel">
        <div className="flex items-start justify-between border-b border-white/5 px-5 py-4">
          <div>
            <SectionLabel>Equipment inspector</SectionLabel>
            <h2 className="mt-1 text-lg font-bold text-white">{info.name}</h2>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Pill tone={info.movable ? 'teal' : 'neutral'}>{info.movable ? 'Movable' : 'Fixed'}</Pill>
              {info.capacity && <Pill tone="neutral">{info.capacity}</Pill>}
              {placement?.snappedTo && <Pill tone="amber">{placement.snappedTo}</Pill>}
            </div>
          </div>
          <button
            type="button"
            data-gesture-target
            onClick={close}
            aria-label="Close"
            className="rounded-lg p-1.5 text-lab-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-5 py-4 lab-scroll">
          <p className="text-[12px] leading-relaxed text-lab-200">{info.description}</p>

          <SectionLabel className="mt-4">Components</SectionLabel>
          <div className="mt-2 grid gap-1.5">
            {info.parts.map((item) => {
              const active = item.id === part.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-gesture-target
                  onClick={() => inspectPart(inspected.apparatusId, item.id)}
                  className={cn(
                    'rounded-xl border p-2.5 text-left transition',
                    active
                      ? 'border-amber-400/35 bg-amber-400/10'
                      : 'border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/5',
                  )}
                >
                  <p className={cn('text-[11px] font-semibold', active ? 'text-amber-200' : 'text-lab-100')}>
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-lab-400">{item.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-[10px] text-lab-400">
            <Info size={13} className="mt-0.5 shrink-0 text-lab-300" />
            <p>
              Double-click any component in the 3D scene to inspect it directly. The burette stopcock can be
              pinched or clicked to start and stop the flow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/5 px-5 py-3">
          {info.movable && (
            <>
              <ActionButton
                tone="soft"
                onClick={() => {
                  beginGrab(inspected.apparatusId, 'pointer');
                  close();
                }}
              >
                <MousePointer2 size={13} /> Pick up
              </ActionButton>
              <ActionButton
                tone="ghost"
                onClick={() => {
                  snapHome();
                  close();
                }}
              >
                <Move3d size={13} /> Place home
              </ActionButton>
            </>
          )}
          {!info.movable && (
            <ActionButton
              tone="soft"
              onClick={() => {
                if (inspected.apparatusId === 'burette') toggleStopcock();
                else if (inspected.apparatusId === 'pipette') pipette();
                else if (inspected.apparatusId === 'indicator') indicator();
              }}
            >
              Operate
            </ActionButton>
          )}
          <ActionButton tone="primary" onClick={primaryAction} className="ml-auto">
            {info.movable ? 'Grab / operate' : 'Operate'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
