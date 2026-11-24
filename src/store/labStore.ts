import { create } from 'zustand';
import { APPARATUS_CATALOGUE } from '../domain/catalogue';
import { analyseSolution } from '../domain/chemistry';
import {
  ALIQUOT_ML,
  BENCH_BOUNDS,
  BENCH_TOP_Y,
  FLOW_RATE_ML_PER_S,
  INDICATOR_ML_PER_ACTION,
  NAOH_CONCENTRATION_M,
} from '../domain/constants';
import {
  addDistilledWater,
  addIndicator,
  fillBurette as fillBuretteContainer,
  createInitialContainers,
  dispenseTitrant,
  pipetteAliquot,
  type TransferResult,
} from '../domain/containers';
import { INITIAL_PLACEMENTS, clonePlacements, resolvePlacement, zoneById } from '../domain/placement';
import {
  calculateTitrationResult,
  createExperiment,
  createSeed,
  deriveProgress,
  type Progress,
  type TitrationExperiment,
} from '../domain/titration';
import type { ApparatusId, Containers, FlowMode, Placement, SnapId, Vec3 } from '../domain/types';

const HOME_ZONE: Partial<Record<ApparatusId, SnapId>> = {
  burette: 'buretteClamp',
  flask: 'flaskBay',
  pipette: 'pipetteRack',
  beaker: 'beakerZone',
  cylinder: 'cylinderZone',
  washBottle: 'washBottleZone',
};
import {
  initialManipulationState,
  reduceManipulation,
  type ManipulationState,
} from '../interaction/machine';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  createdAt: number;
}

export type GrabSource = 'pointer' | 'gesture' | 'keyboard';

export interface LabData {
  seed: number;
  containers: Containers;
  placements: ReturnType<typeof clonePlacements>;
  experiment: TitrationExperiment;
  flow: FlowMode;
  lastFlowMode: Exclude<FlowMode, 'off'>;
  buretteStartVolumeMl: number | null;
  lastPh: number;
  interaction: ManipulationState;
  grabSource: GrabSource | null;
  toasts: Toast[];
  startedAt: number;
}

export interface LabActions {
  notify: (kind: ToastKind, title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  reset: (seed?: number) => void;
  hoverApparatus: (id: ApparatusId | null) => void;
  selectApparatus: (id: ApparatusId) => void;
  inspectPart: (id: ApparatusId, partId: string) => void;
  inspectApparatus: (id: ApparatusId) => void;
  closeInspector: () => void;
  deselect: () => void;
  beginGrab: (id: ApparatusId, source?: GrabSource) => boolean;
  dragTo: (position: Vec3) => void;
  endGrab: () => void;
  cancelGrab: () => void;
  nudgeSelected: (dx: number, dz: number) => boolean;
  rotateSelected: (deltaY: number) => boolean;
  snapSelectedToHome: () => boolean;
  actionFillBurette: () => boolean;
  actionPipette: () => boolean;
  actionIndicator: () => boolean;
  actionWater: () => boolean;
  setFlow: (mode: FlowMode) => boolean;
  toggleStopcock: () => boolean;
  tickFlow: (dtSeconds: number, autoStop?: boolean) => void;
  recordReading: () => boolean;
  calculate: () => boolean;
}

export type LabState = LabData & LabActions;

let toastCounter = 0;
const makeToast = (kind: ToastKind, title: string, message?: string): Toast => ({
  id: `toast-${++toastCounter}`,
  kind,
  title,
  message,
  createdAt: Date.now(),
});

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const tutorialSeed = (): number => createSeed();

export function createLabData(seed: number): LabData {
  const experiment = createExperiment(seed);
  return {
    seed,
    containers: createInitialContainers({
      unknownAcidConcentrationM: experiment.unknownAcidConcentrationM,
    }),
    placements: clonePlacements(INITIAL_PLACEMENTS),
    experiment,
    flow: 'off',
    lastFlowMode: 'stream',
    buretteStartVolumeMl: null,
    lastPh: 7,
    interaction: initialManipulationState,
    grabSource: null,
    toasts: [],
    startedAt: Date.now(),
  };
}

export const getDeliveredMl = (state: LabData): number | null => {
  if (state.buretteStartVolumeMl === null) return null;
  return Math.max(0, state.buretteStartVolumeMl - state.containers.burette.volumeMl);
};

export const getBuretteReading = (state: LabData): number | null => {
  const delivered = getDeliveredMl(state);
  if (delivered === null || state.experiment.readings.initialMl === null) return null;
  return state.experiment.readings.initialMl + delivered;
};

export const getProgress = (state: LabData): Progress =>
  deriveProgress({
    buretteSnappedTo: state.placements.burette.snappedTo,
    flaskSnappedTo: state.placements.flask.snappedTo,
    aliquotTransferred: state.experiment.aliquotTransferred,
    flaskIndicatorMl: state.containers.flask.indicatorMl,
    buretteFilled: state.experiment.buretteFilled,
    endpointReached: state.experiment.endpointReached,
    flow: state.flow,
    readings: state.experiment.readings,
    result: state.experiment.result,
  });

export const getFlaskAnalysis = (state: LabData) => analyseSolution(state.containers.flask);

const toProgress = (data: LabData, patch: Partial<LabData>): Progress =>
  getProgress({ ...data, ...patch });

const baseState = createLabData(tutorialSeed());

export const useLabStore = create<LabState>()((set, get) => ({
  ...baseState,

  notify: (kind, title, message) =>
    set((state) => ({ toasts: [...state.toasts, makeToast(kind, title, message)].slice(-4) })),

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  reset: (seed = createSeed()) =>
    set(() => ({
      ...createLabData(seed),
      toasts: [makeToast('info', 'Experiment reset', 'A fresh unknown HCl sample has been prepared.')],
    })),

  hoverApparatus: (id) =>
    set((state) => {
      if (state.interaction.grabbedId) return state;
      if (state.interaction.hoveredId === id) return state;
      return { interaction: reduceManipulation(state.interaction, { type: 'hover', apparatusId: id }) };
    }),

  selectApparatus: (id) =>
    set((state) => {
      if (state.interaction.grabbedId) return state;
      return {
        interaction: reduceManipulation(state.interaction, { type: 'select', apparatusId: id }),
      };
    }),

  inspectPart: (id, partId) =>
    set((state) => ({
      interaction: reduceManipulation(state.interaction, {
        type: 'inspect',
        apparatusId: id,
        partId,
      }),
    })),

  inspectApparatus: (id) => {
    const info = APPARATUS_CATALOGUE[id];
    get().inspectPart(id, info.parts[0]?.id ?? 'overview');
  },

  closeInspector: () =>
    set((state) => ({
      interaction: reduceManipulation(state.interaction, { type: 'close-inspect' }),
    })),

  deselect: () =>
    set((state) => ({
      interaction: reduceManipulation(state.interaction, { type: 'deselect' }),
      grabSource: null,
    })),

  beginGrab: (id, source = 'pointer') => {
    const state = get();
    if (state.interaction.grabbedId) return false;
    const info = APPARATUS_CATALOGUE[id];
    if (!info.movable) {
      get().selectApparatus(id);
      get().notify('info', `${info.name} is fixed`, 'This item is part of the lab setup and cannot be carried.');
      return false;
    }
    const origin = state.placements[id];
    const nextPlacement: Placement = {
      position: [origin.position[0], BENCH_TOP_Y, origin.position[2]],
      rotation: [0, 0, 0],
      snappedTo: null,
    };
    set({
      interaction: reduceManipulation(state.interaction, {
        type: 'grab',
        apparatusId: id,
        origin,
      }),
      placements: { ...state.placements, [id]: nextPlacement },
      grabSource: source,
      flow: 'off',
    });
    return true;
  },

  dragTo: (position) =>
    set((state) => {
      const grabbedId = state.interaction.grabbedId;
      if (!grabbedId) return state;
      const current = state.placements[grabbedId];
      const x = Math.min(BENCH_BOUNDS.maxX - 0.02, Math.max(BENCH_BOUNDS.minX + 0.02, position[0]));
      const z = Math.min(BENCH_BOUNDS.maxZ - 0.02, Math.max(BENCH_BOUNDS.minZ + 0.02, position[2]));
      if (
        Math.abs(current.position[0] - x) < 1e-4 &&
        Math.abs(current.position[2] - z) < 1e-4
      ) {
        return state;
      }
      return {
        placements: {
          ...state.placements,
          [grabbedId]: { ...current, position: [x, BENCH_TOP_Y, z] },
        },
        interaction: reduceManipulation(state.interaction, {
          type: 'move',
          position: [x, BENCH_TOP_Y, z],
        }),
      };
    }),

  endGrab: () => {
    let arranged = false;
    set((state) => {
      const grabbedId = state.interaction.grabbedId;
      if (!grabbedId) return state;
      const current = state.placements[grabbedId];
      const resolved = resolvePlacement({
        apparatusId: grabbedId,
        position: current.position,
        placements: state.placements,
      });
      const nextPlacements = { ...state.placements, [grabbedId]: resolved };
      const before = getProgress(state);
      const after = getProgress({ ...state, placements: nextPlacements });
      arranged = after.steps.arrange && !before.steps.arrange;
      const interaction = reduceManipulation(state.interaction, { type: 'release' });
      return {
        placements: nextPlacements,
        interaction,
        grabSource: null,
      };
    });
    if (arranged) {
      get().notify(
        'success',
        'Apparatus arranged',
        'Burette clamped and flask in the titration bay. You can pipette the aliquot.',
      );
    }
  },

  cancelGrab: () =>
    set((state) => {
      const { grabbedId, grabbedOrigin } = state.interaction;
      if (!grabbedId || !grabbedOrigin) return state;
      return {
        placements: { ...state.placements, [grabbedId]: grabbedOrigin },
        interaction: reduceManipulation(state.interaction, { type: 'cancel' }),
        grabSource: null,
      };
    }),

  nudgeSelected: (dx, dz) => {
    let state = get();
    const selected = state.interaction.selectedId;
    if (!selected) return false;
    if (!state.interaction.grabbedId) {
      if (!get().beginGrab(selected, 'keyboard')) return false;
      state = get();
    }
    const placement = state.placements[selected];
    get().dragTo([placement.position[0] + dx, BENCH_TOP_Y, placement.position[2] + dz]);
    return true;
  },

  rotateSelected: (deltaY) => {
    const state = get();
    const target = state.interaction.grabbedId ?? state.interaction.selectedId;
    if (!target || !Number.isFinite(deltaY)) return false;
    const placement = state.placements[target];
    set({
      placements: {
        ...state.placements,
        [target]: {
          ...placement,
          rotation: [placement.rotation[0], placement.rotation[1] + deltaY, placement.rotation[2]],
        },
      },
    });
    return true;
  },

  snapSelectedToHome: () => {
    const state = get();
    const selected = state.interaction.selectedId;
    if (!selected) {
      get().notify('info', 'Nothing selected', 'Select a piece of equipment first, then place it.');
      return false;
    }
    const zoneId = HOME_ZONE[selected];
    const zone = zoneId ? zoneById(zoneId) : undefined;
    if (!zone) {
      get().notify('info', 'No home position', 'This equipment is fixed in place.');
      return false;
    }
    const before = getProgress(state);
    const placement: Placement = {
      position: [...zone.position],
      rotation: [...zone.rotation],
      snappedTo: zone.id,
    };
    set((current) => ({
      placements: { ...current.placements, [selected]: placement },
      interaction: current.interaction.grabbedId
        ? reduceManipulation(current.interaction, { type: 'release' })
        : current.interaction,
      grabSource: null,
      flow: 'off',
    }));
    const after = getProgress({ ...state, placements: { ...state.placements, [selected]: placement } });
    get().notify('success', `Placed: ${zone.label}`, zone.hint);
    if (after.steps.arrange && !before.steps.arrange) {
      get().notify(
        'success',
        'Apparatus arranged',
        'Burette clamped and flask in the titration bay. You can pipette the aliquot.',
      );
    }
    return true;
  },

  actionFillBurette: () => {
    const state = get();
    if (state.experiment.buretteFilled) {
      get().notify('info', 'Burette already filled', 'Reset the experiment to prepare a fresh burette.');
      return false;
    }
    if (state.placements.burette.snappedTo !== 'buretteClamp') {
      get().notify('warning', 'Clamp the burette first', 'The burette must sit in the retort clamp before filling.');
      return false;
    }
    const result = fillBuretteContainer(state.containers);
    if (result.movedMl <= 0) {
      get().notify('error', 'Could not fill the burette', 'Check that the NaOH stock bottle still contains titrant.');
      return false;
    }
    set({
      containers: result.containers,
      buretteStartVolumeMl: result.movedMl,
      flow: 'off',
      experiment: {
        ...state.experiment,
        buretteFilled: true,
        readings: { initialMl: 0, finalMl: null },
        result: null,
      },
    });
    get().notify(
      'success',
      'Burette filled',
      `${result.movedMl.toFixed(2)} mL of 0.1000 M NaOH loaded. Initial reading 0.00 mL.`,
    );
    return true;
  },

  actionPipette: () => {
    const state = get();
    if (state.experiment.aliquotTransferred) {
      get().notify('warning', 'Aliquot already delivered', 'One 25.00 mL aliquot is used per run.');
      return false;
    }
    const result: TransferResult = pipetteAliquot(state.containers, ALIQUOT_ML);
    if (result.movedMl <= 0) {
      get().notify('error', 'Pipette empty', 'The unknown HCl stock bottle is empty.');
      return false;
    }
    const complete = result.movedMl >= ALIQUOT_ML - 0.001;
    set({
      containers: result.containers,
      lastPh: analyseSolution(result.containers.flask).ph,
      experiment: {
        ...state.experiment,
        aliquotTransferred: complete,
        result: null,
      },
    });
    if (!complete) {
      get().notify(
        'warning',
        'Short aliquot delivered',
        `Only ${result.movedMl.toFixed(2)} mL was available. Reset for a fresh stock bottle.`,
      );
    } else {
      get().notify('success', '25.00 mL aliquot delivered', 'The unknown HCl is now in the conical flask.');
    }
    return complete;
  },

  actionIndicator: () => {
    const state = get();
    if (state.containers.flask.indicatorMl >= INDICATOR_ML_PER_ACTION - 1e-9) {
      get().notify('info', 'Indicator already added', 'Three drops are enough for this titration.');
      return false;
    }
    const result = addIndicator(state.containers, INDICATOR_ML_PER_ACTION);
    if (result.movedMl <= 0) {
      get().notify('error', 'Indicator bottle empty', 'Reset the experiment to refill the dropper.');
      return false;
    }
    const analysis = analyseSolution(result.containers.flask);
    const delivered = getDeliveredMl({ ...state, containers: result.containers });
    const endpointReached =
      state.experiment.endpointReached || (analysis.endpoint && delivered !== null);
    set({
      containers: result.containers,
      lastPh: analysis.ph,
      experiment: {
        ...state.experiment,
        indicatorAdded: true,
        endpointReached,
        endpointDeliveredMl:
          state.experiment.endpointDeliveredMl ?? (endpointReached ? delivered : null),
        overshot: state.experiment.overshot || analysis.ph >= 10.4,
      },
    });
    get().notify('success', 'Phenolphthalein added', '3 drops (0.15 mL). The acidic solution stays colourless.');
    if (analysis.endpoint && !state.experiment.endpointReached) {
      get().notify('success', 'Pink colour present', 'The solution is already alkaline — endpoint reached.');
    }
    return true;
  },

  actionWater: () => {
    const state = get();
    const result = addDistilledWater(state.containers, 10);
    if (result.movedMl <= 0) {
      get().notify('warning', 'Wash bottle empty', 'No distilled water left.');
      return false;
    }
    const analysis = analyseSolution(result.containers.flask);
    set({
      containers: result.containers,
      lastPh: analysis.ph,
      experiment: { ...state.experiment, result: state.experiment.result },
    });
    get().notify('info', 'Rinsed with distilled water', '10 mL added. Moles of acid and base are unchanged.');
    return true;
  },

  setFlow: (mode) => {
    const state = get();
    if (mode === 'off') {
      set({ flow: 'off' });
      return true;
    }
    if (!state.experiment.buretteFilled || state.buretteStartVolumeMl === null) {
      get().notify('warning', 'Fill the burette first', 'The stopcock has nothing to deliver yet.');
      return false;
    }
    if (state.placements.burette.snappedTo !== 'buretteClamp') {
      get().notify('warning', 'Clamp the burette', 'Titrant can only be delivered safely from the clamp.');
      return false;
    }
    if (state.placements.flask.snappedTo !== 'flaskBay') {
      get().notify('warning', 'Move the flask into the bay', 'The flask must sit under the burette tip.');
      return false;
    }
    if (state.containers.burette.volumeMl <= 1e-9) {
      get().notify('warning', 'Burette empty', 'Reset the experiment to refill the burette.');
      return false;
    }
    set({ flow: mode, lastFlowMode: mode });
    return true;
  },

  toggleStopcock: () => {
    const state = get();
    if (state.flow !== 'off') {
      get().setFlow('off');
      return true;
    }
    return get().setFlow(state.lastFlowMode);
  },

  tickFlow: (dtSeconds, autoStop = false) => {
    const state = get();
    if (state.flow === 'off') return;
    if (state.buretteStartVolumeMl === null) return;
    if (
      state.placements.burette.snappedTo !== 'buretteClamp' ||
      state.placements.flask.snappedTo !== 'flaskBay'
    ) {
      set({ flow: 'off' });
      get().notify('warning', 'Flow stopped', 'Keep the burette clamped and the flask in the bay while titrating.');
      return;
    }
    const rate = FLOW_RATE_ML_PER_S[state.flow];
    const dt = Math.min(0.5, Math.max(0, dtSeconds));
    if (dt <= 0) return;

    let containers = state.containers;
    let flow: FlowMode = state.flow;
    let endpointReached = state.experiment.endpointReached;
    let endpointDeliveredMl = state.experiment.endpointDeliveredMl;
    let overshot = state.experiment.overshot;
    let ph = state.lastPh;
    let becameEmpty = false;
    const endpointWasReached = endpointReached;
    const overshootWasSet = overshot;
    const chunkSeconds = autoStop ? 0.02 : 0.25;
    let remaining = dt;
    let newEndpoint = false;

    while (remaining > 1e-6) {
      const step = Math.min(chunkSeconds, remaining);
      remaining -= step;
      const result = dispenseTitrant(containers, rate * step);
      if (result.movedMl <= 0) {
        flow = 'off';
        becameEmpty = true;
        break;
      }
      containers = result.containers;
      const analysis = analyseSolution(containers.flask);
      ph = analysis.ph;
      const delivered = state.buretteStartVolumeMl - containers.burette.volumeMl;
      if (!endpointReached && analysis.endpoint) {
        endpointReached = true;
        endpointDeliveredMl = delivered;
        newEndpoint = true;
      }
      if (analysis.ph >= 10.4 && analysis.indicator.strength > 0.75) overshot = true;
      if (containers.burette.volumeMl <= 1e-9) {
        flow = 'off';
        becameEmpty = true;
        break;
      }
      if (autoStop && !endpointWasReached && endpointReached) {
        flow = 'off';
        break;
      }
    }

    set({
      containers,
      flow,
      lastPh: ph,
      experiment: {
        ...state.experiment,
        endpointReached,
        endpointDeliveredMl,
        overshot,
        readings:
          state.experiment.readings.finalMl !== null
            ? { initialMl: state.experiment.readings.initialMl, finalMl: null }
            : state.experiment.readings,
        result: state.experiment.readings.finalMl !== null ? null : state.experiment.result,
      },
    });

    if (newEndpoint) {
      get().notify(
        'success',
        'Endpoint reached',
        `First persistent pink at ${endpointDeliveredMl?.toFixed(2)} mL delivered. Close the stopcock.`,
      );
    }
    if (autoStop && endpointReached && !endpointWasReached) {
      get().notify('info', 'Auto-stopped at endpoint', 'Flow closed automatically. Record the burette reading.');
    }
    if (becameEmpty) {
      get().notify('warning', 'Burette empty', 'Refill by resetting, or record the final reading.');
    }
    if (overshot && !overshootWasSet) {
      get().notify(
        'warning',
        'Overshot the endpoint',
        'The pink is strong. The titre will be too high; reset and try dropwise near the endpoint.',
      );
    }
  },

  recordReading: () => {
    const state = get();
    const reading = getBuretteReading(state);
    if (reading === null) {
      get().notify('warning', 'Burette not filled', 'Fill the burette and titrate before recording.');
      return false;
    }
    if (state.flow !== 'off') {
      get().notify('warning', 'Close the stopcock first', 'A reading taken while liquid flows is not stable.');
      return false;
    }
    if (!state.experiment.endpointReached) {
      get().notify('warning', 'Endpoint not reached', 'Continue until a persistent pale-pink colour appears.');
      return false;
    }
    const finalMl = round2(reading);
    set({
      experiment: {
        ...state.experiment,
        readings: { initialMl: state.experiment.readings.initialMl, finalMl },
        result: null,
      },
    });
    get().notify('success', 'Final reading recorded', `${finalMl.toFixed(2)} mL. Now calculate the unknown concentration.`);
    return true;
  },

  calculate: () => {
    const state = get();
    const { readings, aliquotTransferred, unknownAcidConcentrationM } = state.experiment;
    if (!aliquotTransferred) {
      get().notify('warning', 'No aliquot', 'Pipette 25.00 mL of the unknown acid into the flask first.');
      return false;
    }
    if (readings.initialMl === null || readings.finalMl === null) {
      get().notify('warning', 'Readings missing', 'Record the final burette reading before calculating.');
      return false;
    }
    try {
      const result = calculateTitrationResult({
        initialReadingMl: readings.initialMl,
        finalReadingMl: readings.finalMl,
        aliquotMl: ALIQUOT_ML,
        titrantConcentrationM: NAOH_CONCENTRATION_M,
        trueAcidConcentrationM: unknownAcidConcentrationM,
      });
      set({ experiment: { ...state.experiment, result } });
      const label =
        result.grade === 'excellent'
          ? 'Excellent titration'
          : result.grade === 'good'
            ? 'Good titration'
            : 'Repeat recommended';
      get().notify(
        result.grade === 'repeat' ? 'warning' : 'success',
        label,
        `C(HCl) = ${result.acidConcentrationM.toFixed(4)} mol dm⁻³ · error ${result.errorPercent.toFixed(2)}%.`,
      );
      return true;
    } catch (error) {
      get().notify(
        'error',
        'Calculation failed',
        error instanceof Error ? error.message : 'Check the recorded readings.',
      );
      return false;
    }
  },
}));
