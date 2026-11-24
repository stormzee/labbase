import type { ReactNode } from 'react';
import type { ApparatusId } from '../../domain/types';
import { useLabStore } from '../../store/labStore';
import { SelectionMarker } from '../apparatus/SelectionMarker';

interface FixedApparatusProps {
  id: ApparatusId;
  labelHeight: number;
  children: ReactNode;
}

/** Equipment that is part of the lab setup (retort stand, stock bottles). */
export function FixedApparatus({ id, labelHeight, children }: FixedApparatusProps) {
  const placement = useLabStore((state) => state.placements[id]);
  return (
    <>
      <group
        position={[...placement.position]}
        rotation={[...placement.rotation]}
        userData={{ apparatusId: id }}
      >
        {children}
      </group>
      <SelectionMarker id={id} labelHeight={labelHeight} />
    </>
  );
}
