import type { ApparatusId, ContainerId, StepId } from './types';

/** Bench geometry in metres. The world uses metres throughout. */
export const BENCH_TOP_Y = 0.8;
export const BENCH_WIDTH = 2.4;
export const BENCH_DEPTH = 0.8;
export const BENCH_BOUNDS = {
  minX: -1.08,
  maxX: 1.08,
  minZ: -0.33,
  maxZ: 0.33,
} as const;

/** Container capacities in millilitres. */
export const CONTAINER_CAPACITY_ML: Record<ContainerId, number> = {
  acidStock: 250,
  naohStock: 500,
  indicatorStock: 30,
  burette: 50,
  flask: 250,
  beaker: 250,
  cylinder: 100,
  washBottle: 500,
  waste: 2000,
};

export const ALIQUOT_ML = 25;
export const BURETTE_CAPACITY_ML = 50;
export const NAOH_CONCENTRATION_M = 0.1;
export const DROP_ML = 0.05;
export const INDICATOR_DROPS_PER_ACTION = 3;
export const INDICATOR_ML_PER_ACTION = INDICATOR_DROPS_PER_ACTION * DROP_ML;
export const ENDPOINT_PH = 8.2;
export const INDICATOR_STRONG_PH = 9.8;
export const UNKNOWN_ACID_MIN_M = 0.08;
export const UNKNOWN_ACID_MAX_M = 0.16;

export const FLOW_RATE_ML_PER_S = {
  drop: 0.25,
  stream: 4.0,
} as const;

/** Visual capacity of the conical flask; the flask itself is rated to 250 mL. */
export const FLASK_VISUAL_CAPACITY_ML = 120;
export const BURETTE_TUBE_BOTTOM_M = 0.12;
export const BURETTE_TUBE_HEIGHT_M = 0.6;

export const PIPETTE_CAPACITY_ML = 25;

export const STEP_ORDER: readonly StepId[] = [
  'arrange',
  'pipette',
  'indicator',
  'fill',
  'titrate',
  'record',
  'calculate',
] as const;

export interface StepMeta {
  id: StepId;
  index: number;
  title: string;
  short: string;
  instruction: string;
  detail: string;
}

export const STEP_META: Record<StepId, StepMeta> = {
  arrange: {
    id: 'arrange',
    index: 0,
    title: 'Arrange the apparatus',
    short: 'Arrange',
    instruction: 'Clamp the burette to the retort stand and place the conical flask in the titration bay beneath it.',
    detail:
      'Pinch (or drag) the burette and release it near the clamp. Then place the flask on the marked bay so the burette tip sits inside its neck.',
  },
  pipette: {
    id: 'pipette',
    index: 1,
    title: 'Measure 25.00 mL of HCl',
    short: 'Pipette',
    instruction: 'Use the 25 mL volumetric pipette to transfer one aliquot of the unknown HCl into the flask.',
    detail:
      'Select the pipette and choose “Pipette 25.00 mL”, or pinch/point at the pipette and make a fist. The pipette is rinsed and filled to its calibration mark before delivery.',
  },
  indicator: {
    id: 'indicator',
    index: 2,
    title: 'Add phenolphthalein',
    short: 'Indicator',
    instruction: 'Add 3 drops of phenolphthalein indicator to the flask. The solution stays colourless in acid.',
    detail:
      'Select the phenolphthalein dropper and choose “Add 3 drops”, or make a fist while it is selected. The endpoint will be the first persistent pale-pink colour.',
  },
  fill: {
    id: 'fill',
    index: 3,
    title: 'Fill the burette',
    short: 'Fill',
    instruction: 'Fill the burette with 0.1000 M NaOH and set the initial reading to 0.00 mL.',
    detail:
      'With the burette clamped, choose “Fill burette” or select the burette and make a fist. It is filled above the zero mark and adjusted so the initial reading is 0.00 mL.',
  },
  titrate: {
    id: 'titrate',
    index: 4,
    title: 'Titrate to the endpoint',
    short: 'Titrate',
    instruction: 'Run NaOH in, swirling, until the first persistent pale-pink colour appears. Then close the stopcock.',
    detail:
      'Use the stream while the colour flashes and disappears, then switch to dropwise near the endpoint. A fist on the selected burette opens or closes the stopcock; close it at the first persistent pink.',
  },
  record: {
    id: 'record',
    index: 5,
    title: 'Record the final reading',
    short: 'Record',
    instruction: 'Read the burette at eye level and record the final reading. The titre is final − initial.',
    detail:
      'The burette is read to two decimal places. Select the flask and make a fist to record the reading, or use the button.',
  },
  calculate: {
    id: 'calculate',
    index: 6,
    title: 'Calculate the unknown concentration',
    short: 'Calculate',
    instruction: 'Use C(HCl) = C(NaOH) × V(titre) ÷ V(aliquot) to calculate the concentration of the unknown acid.',
    detail:
      'The calculation is checked against the true value and graded by percentage error. With the flask selected, a second fist calculates the result.',
  },
};

export const APPARATUS_NAMES: Record<ApparatusId, string> = {
  burette: 'Burette · 50 mL',
  flask: 'Conical flask · 250 mL',
  pipette: 'Volumetric pipette · 25 mL',
  beaker: 'Beaker · 250 mL',
  cylinder: 'Measuring cylinder · 100 mL',
  washBottle: 'Wash bottle · distilled water',
  retortStand: 'Retort stand & clamp',
  hclBottle: 'Unknown HCl · analyte',
  naohBottle: 'NaOH · 0.1000 M',
  indicator: 'Phenolphthalein dropper',
};

export const QUALITY_PRESETS = {
  high: {
    dpr: [1, 1.75] as [number, number],
    shadows: true,
    shadowMap: 1024,
    cameraWidth: 1280,
    cameraHeight: 720,
    frameSkip: 1,
  },
  balanced: {
    dpr: [1, 1.4] as [number, number],
    shadows: true,
    shadowMap: 768,
    cameraWidth: 960,
    cameraHeight: 540,
    frameSkip: 1,
  },
  performance: {
    dpr: [0.8, 1] as [number, number],
    shadows: false,
    shadowMap: 512,
    cameraWidth: 640,
    cameraHeight: 480,
    frameSkip: 2,
  },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
