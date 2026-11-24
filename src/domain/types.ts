/** Shared domain vocabulary. Pure data — no Three.js or React imports. */

export interface Container {
  readonly id: ContainerId;
  /** Total liquid volume in millilitres. */
  readonly volumeMl: number;
  /** Amount of HCl in the container, in moles. */
  readonly hclMoles: number;
  /** Amount of NaOH in the container, in moles. */
  readonly naohMoles: number;
  /** Volume of phenolphthalein solution in the container, in millilitres. */
  readonly indicatorMl: number;
}

export type ContainerId =
  | 'acidStock'
  | 'naohStock'
  | 'indicatorStock'
  | 'burette'
  | 'flask'
  | 'beaker'
  | 'cylinder'
  | 'washBottle'
  | 'waste';

export type ApparatusId =
  | 'burette'
  | 'flask'
  | 'pipette'
  | 'beaker'
  | 'cylinder'
  | 'washBottle'
  | 'retortStand'
  | 'hclBottle'
  | 'naohBottle'
  | 'indicator';

export type SnapId =
  | 'buretteClamp'
  | 'buretteRest'
  | 'flaskBay'
  | 'pipetteRack'
  | 'beakerZone'
  | 'cylinderZone'
  | 'washBottleZone';

export type Vec3 = [number, number, number];

export interface Placement {
  position: Vec3;
  rotation: Vec3;
  snappedTo: SnapId | null;
}

export type ApparatusPlacements = Record<ApparatusId, Placement>;
export type Containers = Record<ContainerId, Container>;

export type FlowMode = 'off' | 'drop' | 'stream';

export type StepId =
  | 'arrange'
  | 'pipette'
  | 'indicator'
  | 'fill'
  | 'titrate'
  | 'record'
  | 'calculate';

export type Grade = 'excellent' | 'good' | 'repeat';

export interface Readings {
  initialMl: number | null;
  finalMl: number | null;
}

export interface TitrationResult {
  titreMl: number;
  acidConcentrationM: number;
  trueConcentrationM: number;
  trueTitreMl: number;
  errorMl: number;
  errorPercent: number;
  grade: Grade;
  baseMoles: number;
  acidMoles: number;
  aliquotMl: number;
}

export interface IndicatorVisual {
  /** CSS hex colour of the visualised flask liquid. */
  color: string;
  opacity: number;
  /** 0 = colourless, 1 = full magenta. */
  strength: number;
  endpoint: boolean;
}

export interface SolutionAnalysis {
  volumeMl: number;
  hclMoles: number;
  naohMoles: number;
  excessMoles: number;
  excess: 'acid' | 'base' | 'neutral';
  ph: number;
  concentrationHcl: number;
  indicator: IndicatorVisual;
  endpoint: boolean;
}
