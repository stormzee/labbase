import type { RefObject } from 'react';
import type * as THREE from 'three';
import { useLabStore } from '../../store/labStore';
import { FixedApparatus } from '../physics/FixedApparatus';
import { PhysicsApparatus } from '../physics/PhysicsApparatus';
import { Burette } from './Burette';
import { Flask } from './Flask';
import { Beaker, MeasuringCylinder, WashBottle } from './Glassware';
import { Pipette, PipetteRack, SafetyGoggles } from './Pipette';
import { ReagentBottle } from './ReagentBottle';
import { RetortStand } from './RetortStand';

interface ApparatusLayerProps {
  interactiveRootRef: RefObject<THREE.Group | null>;
}

export function ApparatusLayer({ interactiveRootRef }: ApparatusLayerProps) {
  const seed = useLabStore((state) => state.seed);
  return (
    <group ref={interactiveRootRef} key={seed}>
      <FixedApparatus id="retortStand" labelHeight={0.92}>
        <RetortStand />
      </FixedApparatus>
      <PipetteRack />
      <SafetyGoggles />

      <PhysicsApparatus id="burette" collider={[0.04, 0.365, 0.04]} labelHeight={0.75}>
        <Burette />
      </PhysicsApparatus>
      <PhysicsApparatus id="flask" collider={[0.078, 0.081, 0.078]} labelHeight={0.2}>
        <Flask />
      </PhysicsApparatus>
      <PhysicsApparatus id="pipette" collider={[0.028, 0.235, 0.028]} labelHeight={0.48}>
        <Pipette />
      </PhysicsApparatus>
      <PhysicsApparatus id="beaker" collider={[0.05, 0.058, 0.05]} labelHeight={0.16}>
        <Beaker />
      </PhysicsApparatus>
      <PhysicsApparatus id="cylinder" collider={[0.03, 0.14, 0.03]} labelHeight={0.29}>
        <MeasuringCylinder />
      </PhysicsApparatus>
      <PhysicsApparatus id="washBottle" collider={[0.055, 0.12, 0.055]} labelHeight={0.27}>
        <WashBottle />
      </PhysicsApparatus>

      <FixedApparatus id="hclBottle" labelHeight={0.19}>
        <ReagentBottle
          id="hclBottle"
          containerId="acidStock"
          title="HCl"
          subtitle="unknown concentration"
          accent="#b65a2c"
        />
      </FixedApparatus>
      <FixedApparatus id="naohBottle" labelHeight={0.19}>
        <ReagentBottle
          id="naohBottle"
          containerId="naohStock"
          title="NaOH"
          subtitle="0.1000 mol dm⁻³"
          accent="#2c6f67"
        />
      </FixedApparatus>
      <FixedApparatus id="indicator" labelHeight={0.13}>
        <ReagentBottle
          id="indicator"
          containerId="indicatorStock"
          title="PHENOL"
          subtitle="phthalein"
          accent="#8a3f68"
          variant="dropper"
        />
      </FixedApparatus>
    </group>
  );
}
