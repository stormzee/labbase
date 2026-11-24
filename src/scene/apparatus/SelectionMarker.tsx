import { Html } from '@react-three/drei';
import { useLabStore } from '../../store/labStore';
import { APPARATUS_CATALOGUE } from '../../domain/catalogue';
import { BENCH_TOP_Y } from '../../domain/constants';
import type { ApparatusId } from '../../domain/types';

const HALO_RADIUS: Record<ApparatusId, number> = {
  burette: 0.09,
  flask: 0.1,
  pipette: 0.12,
  beaker: 0.1,
  cylinder: 0.08,
  washBottle: 0.1,
  retortStand: 0.18,
  hclBottle: 0.06,
  naohBottle: 0.06,
  indicator: 0.045,
};

interface SelectionMarkerProps {
  id: ApparatusId;
  labelHeight: number;
}

/** Hover/selection halo and floating label, anchored in world space so it stays flat. */
export function SelectionMarker({ id, labelHeight }: SelectionMarkerProps) {
  const placement = useLabStore((state) => state.placements[id]);
  const hovered = useLabStore((state) => state.interaction.hoveredId === id);
  const selected = useLabStore((state) => state.interaction.selectedId === id);
  const grabbed = useLabStore((state) => state.interaction.grabbedId === id);
  const info = APPARATUS_CATALOGUE[id];
  const radius = HALO_RADIUS[id];
  if (!hovered && !selected) return null;
  const color = selected || grabbed ? '#f2b84b' : '#74b9ae';
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[placement.position[0], BENCH_TOP_Y + 0.008, placement.position[2]]}>
        <ringGeometry args={[radius, radius + 0.008, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <Html
        position={[placement.position[0], placement.position[1] + labelHeight + 0.06, placement.position[2]]}
        center
        zIndexRange={[30, 10]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-none flex -translate-y-2 flex-col items-center gap-1 whitespace-nowrap rounded-lg border border-lab-400/30 bg-lab-950/90 px-2.5 py-1.5 text-center shadow-panel backdrop-blur">
          <span className="text-[11px] font-semibold tracking-wide text-lab-100">{info.name}</span>
          <span className="text-[9px] uppercase tracking-[0.14em] text-lab-300">
            {grabbed ? 'Dragging' : info.movable ? 'Pinch / drag to move' : 'Fixed equipment'}
          </span>
        </div>
      </Html>
    </>
  );
}

/** Small invisible mesh that makes sub-parts raycastable without drawing anything. */
export function HitBox({
  size,
  position = [0, 0, 0],
  partId,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  partId: string;
}) {
  return (
    <mesh visible={false} position={position} userData={{ partId }}>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function HitSphere({
  radius,
  position,
  partId,
}: {
  radius: number;
  position: [number, number, number];
  partId: string;
}) {
  return (
    <mesh visible={false} position={position} userData={{ partId }}>
      <sphereGeometry args={[radius, 10, 8]} />
    </mesh>
  );
}
