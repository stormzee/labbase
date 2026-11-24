import {
  ALIQUOT_ML,
  ENDPOINT_PH,
  FLOW_RATE_ML_PER_S,
  INDICATOR_ML_PER_ACTION,
  NAOH_CONCENTRATION_M,
  STEP_ORDER,
  UNKNOWN_ACID_MAX_M,
  UNKNOWN_ACID_MIN_M,
} from './constants';
import { analyseSolution, computePh } from './chemistry';
import type {
  Container,
  FlowMode,
  Grade,
  Readings,
  StepId,
  TitrationResult,
} from './types';

/** Deterministic PRNG so a seed reproduces an experiment exactly. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export function createUnknownConcentration(seed: number): number {
  const random = mulberry32(seed)();
  const raw = UNKNOWN_ACID_MIN_M + random * (UNKNOWN_ACID_MAX_M - UNKNOWN_ACID_MIN_M);
  return Math.round(raw * 1000) / 1000;
}

export interface TitrationExperiment {
  seed: number;
  unknownAcidConcentrationM: number;
  aliquotTransferred: boolean;
  indicatorAdded: boolean;
  buretteFilled: boolean;
  endpointDeliveredMl: number | null;
  endpointReached: boolean;
  overshot: boolean;
  readings: Readings;
  result: TitrationResult | null;
}

export function createExperiment(seed: number): TitrationExperiment {
  return {
    seed,
    unknownAcidConcentrationM: createUnknownConcentration(seed),
    aliquotTransferred: false,
    indicatorAdded: false,
    buretteFilled: false,
    endpointDeliveredMl: null,
    endpointReached: false,
    overshot: false,
    readings: { initialMl: null, finalMl: null },
    result: null,
  };
}

export interface CalculationInput {
  initialReadingMl: number;
  finalReadingMl: number;
  aliquotMl: number;
  titrantConcentrationM: number;
  trueAcidConcentrationM: number;
}

export function gradeForError(percentError: number): Grade {
  const magnitude = Math.abs(percentError);
  if (magnitude <= 0.5) return 'excellent';
  if (magnitude <= 1.5) return 'good';
  return 'repeat';
}

/** Authoritative titre → concentration workup. Throws on impossible readings. */
export function calculateTitrationResult(input: CalculationInput): TitrationResult {
  const { initialReadingMl, finalReadingMl, aliquotMl, titrantConcentrationM, trueAcidConcentrationM } = input;
  if (!Number.isFinite(initialReadingMl) || !Number.isFinite(finalReadingMl)) {
    throw new RangeError('Readings must be finite numbers.');
  }
  if (finalReadingMl < initialReadingMl) {
    throw new RangeError('Final reading cannot be below the initial reading.');
  }
  if (!(aliquotMl > 0)) throw new RangeError('Aliquot volume must be positive.');
  if (!(titrantConcentrationM > 0)) throw new RangeError('Titrant concentration must be positive.');

  const titreMl = finalReadingMl - initialReadingMl;
  const baseMoles = titrantConcentrationM * (titreMl / 1000);
  const acidMoles = baseMoles; // 1:1 HCl + NaOH → NaCl + H2O
  const acidConcentrationM = acidMoles / (aliquotMl / 1000);
  const trueTitreMl = (trueAcidConcentrationM * (aliquotMl / 1000) * 1000) / titrantConcentrationM;
  const errorMl = titreMl - trueTitreMl;
  const errorPercent = (acidConcentrationM - trueAcidConcentrationM) / trueAcidConcentrationM * 100;

  return {
    titreMl,
    acidConcentrationM,
    trueConcentrationM: trueAcidConcentrationM,
    trueTitreMl,
    errorMl,
    errorPercent,
    grade: gradeForError(errorPercent),
    baseMoles,
    acidMoles,
    aliquotMl,
  };
}

export interface ProgressInput {
  buretteSnappedTo: string | null;
  flaskSnappedTo: string | null;
  aliquotTransferred: boolean;
  flaskIndicatorMl: number;
  buretteFilled: boolean;
  endpointReached: boolean;
  flow: FlowMode;
  readings: Readings;
  result: TitrationResult | null;
}

export interface Progress {
  steps: Record<StepId, boolean>;
  currentStep: StepId | null;
  completedCount: number;
  ratio: number;
}

export function deriveProgress(input: ProgressInput): Progress {
  const steps: Record<StepId, boolean> = {
    arrange: input.buretteSnappedTo === 'buretteClamp' && input.flaskSnappedTo === 'flaskBay',
    pipette: input.aliquotTransferred,
    indicator: input.flaskIndicatorMl >= INDICATOR_ML_PER_ACTION - 1e-9,
    fill: input.buretteFilled,
    titrate: input.endpointReached && input.flow === 'off',
    record: input.readings.finalMl !== null,
    calculate: input.result !== null,
  };
  const currentStep = STEP_ORDER.find((step) => !steps[step]) ?? null;
  const completedCount = STEP_ORDER.filter((step) => steps[step]).length;
  return { steps, currentStep, completedCount, ratio: completedCount / STEP_ORDER.length };
}

/** Compute the analysis after each flow tick and report first-endpoint / overshoot transitions. */
export function evaluateFlaskAfterDelivery(
  flask: Container,
  deliveredMl: number,
  previousEndpointDeliveredMl: number | null,
): { endpointReached: boolean; endpointDeliveredMl: number | null; overshot: boolean; ph: number } {
  const analysis = analyseSolution(flask);
  const endpoint = analysis.endpoint;
  const endpointDeliveredMl =
    endpoint && previousEndpointDeliveredMl === null ? deliveredMl : previousEndpointDeliveredMl;
  return {
    endpointReached: endpoint || previousEndpointDeliveredMl !== null,
    endpointDeliveredMl,
    overshot: analysis.ph >= 10.4 && analysis.indicator.strength > 0.75,
    ph: analysis.ph,
  };
}

/**
 * Predicted pH at a given delivered volume, used by the in-app "why" explainer and tests.
 * Dilution by the aliquot plus delivered titrant is included.
 */
export function predictPh(params: {
  unknownAcidConcentrationM: number;
  aliquotMl: number;
  deliveredMl: number;
}): number {
  const { unknownAcidConcentrationM, aliquotMl, deliveredMl } = params;
  const hclMoles = unknownAcidConcentrationM * (aliquotMl / 1000);
  const naohMoles = NAOH_CONCENTRATION_M * (deliveredMl / 1000);
  return computePh(hclMoles, naohMoles, aliquotMl + deliveredMl);
}

export { ENDPOINT_PH, FLOW_RATE_ML_PER_S, ALIQUOT_ML };
