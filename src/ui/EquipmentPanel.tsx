import {
  Beaker,
  Droplets,
  Eye,
  FlaskConical,
  Gauge,
  Move3d,
  Pipette,
  Ruler,
  SprayCan,
  TestTube,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { APPARATUS_CATALOGUE, APPARATUS_ORDER } from '../domain/catalogue';
import { CONTAINER_CAPACITY_ML } from '../domain/constants';
import type { ApparatusId } from '../domain/types';
import { useLabStore } from '../store/labStore';
import { cn, Panel, Pill, SectionLabel } from './primitives';

const ICONS: Record<ApparatusId, ReactNode> = {
  burette: <Gauge size={14} />,
  flask: <FlaskConical size={14} />,
  pipette: <Pipette size={14} />,
  beaker: <Beaker size={14} />,
  cylinder: <Ruler size={14} />,
  washBottle: <SprayCan size={14} />,
  retortStand: <Move3d size={14} />,
  hclBottle: <TestTube size={14} />,
  naohBottle: <TestTube size={14} />,
  indicator: <Droplets size={14} />,
};

const STOCK: Partial<Record<ApparatusId, { container: keyof typeof CONTAINER_CAPACITY_ML; label: string }>> = {
  hclBottle: { container: 'acidStock', label: 'stock' },
  naohBottle: { container: 'naohStock', label: 'stock' },
  indicator: { container: 'indicatorStock', label: 'indicator' },
};

function locationLabel(id: ApparatusId, snappedTo: string | null, grabbed: boolean): string {
  if (grabbed) return 'In hand';
  if (!APPARATUS_CATALOGUE[id].movable) return 'Fixed';
  if (snappedTo === 'buretteClamp') return 'Clamped';
  if (snappedTo === 'buretteRest') return 'Bench rest';
  if (snappedTo === 'flaskBay') return 'Titration bay';
  if (snappedTo === 'pipetteRack') return 'Pipette rack';
  return 'On bench';
}

export function EquipmentPanel() {
  const placements = useLabStore((state) => state.placements);
  const selectedId = useLabStore((state) => state.interaction.selectedId);
  const hoveredId = useLabStore((state) => state.interaction.hoveredId);
  const grabbedId = useLabStore((state) => state.interaction.grabbedId);
  const containers = useLabStore((state) => state.containers);
  const selectApparatus = useLabStore((state) => state.selectApparatus);
  const hoverApparatus = useLabStore((state) => state.hoverApparatus);
  const inspectApparatus = useLabStore((state) => state.inspectApparatus);

  return (
    <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <SectionLabel>Equipment</SectionLabel>
        <Pill tone="neutral">{APPARATUS_ORDER.length} items</Pill>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 lab-scroll">
        {APPARATUS_ORDER.map((id) => {
          const info = APPARATUS_CATALOGUE[id];
          const placement = placements[id];
          const selected = selectedId === id;
          const hovered = hoveredId === id;
          const grabbed = grabbedId === id;
          const stock = STOCK[id];
          const stockVolume = stock ? containers[stock.container].volumeMl : null;
          const stockCapacity = stock ? CONTAINER_CAPACITY_ML[stock.container] : null;
          return (
            <div
              key={id}
              role="button"
              tabIndex={0}
              data-gesture-target
              aria-pressed={selected}
              aria-label={`Select ${info.name}`}
              onClick={() => selectApparatus(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectApparatus(id);
                }
              }}
              onMouseEnter={() => hoverApparatus(id)}
              onMouseLeave={() => hoverApparatus(null)}
              className={cn(
                'group mb-1 flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 transition',
                selected
                  ? 'border-amber-400/45 bg-amber-400/10'
                  : hovered
                    ? 'border-lab-400/30 bg-lab-400/10'
                    : 'border-transparent hover:border-white/10 hover:bg-white/5',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                  selected
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                    : 'border-white/10 bg-white/5 text-lab-300',
                )}
              >
                {ICONS[id]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[11px] font-semibold text-lab-100">{info.name}</p>
                  {grabbed && <span className="text-[9px] text-amber-300">moving</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[9px] text-lab-400">
                    {locationLabel(id, placement.snappedTo, grabbed)}
                    {info.capacity ? ` · ${info.capacity}` : ''}
                  </p>
                  {stock && stockVolume !== null && stockCapacity !== null && (
                    <span className="ml-auto flex shrink-0 items-center gap-1">
                      <span className="h-0.5 w-8 overflow-hidden rounded bg-white/10">
                        <span
                          className="block h-full rounded bg-lab-400"
                          style={{ width: `${Math.min(100, (stockVolume / stockCapacity) * 100)}%` }}
                        />
                      </span>
                      <span className="font-mono text-[8px] text-lab-500">{Math.round(stockVolume)} mL</span>
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Inspect ${info.name}`}
                data-gesture-target
                title="Inspect parts"
                onClick={(event) => {
                  event.stopPropagation();
                  inspectApparatus(id);
                }}
                className="rounded-md p-1 text-lab-500 opacity-0 transition hover:bg-white/10 hover:text-lab-100 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Eye size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/5 px-3 py-2 text-[9px] leading-relaxed text-lab-500">
        Click a row to select. Pinch or drag the equipment in the scene; double-click a component to inspect it.
      </div>
    </Panel>
  );
}
