import {
  BURETTE_CAPACITY_ML,
  CONTAINER_CAPACITY_ML,
  NAOH_CONCENTRATION_M,
  UNKNOWN_ACID_MAX_M,
  UNKNOWN_ACID_MIN_M,
} from './constants';
import type { Container, ContainerId, Containers } from './types';

/**
 * Container maths — the authoritative liquid bookkeeping for the lab.
 *
 * Every transfer preserves, to floating point tolerance:
 *   Σ volumeMl, Σ hclMoles, Σ naohMoles, Σ indicatorMl.
 * No caller may assign container volumes directly; transfers return a new map.
 */

const EPSILON_ML = 1e-9;

export const CONTAINER_IDS: readonly ContainerId[] = [
  'acidStock',
  'naohStock',
  'indicatorStock',
  'burette',
  'flask',
  'beaker',
  'cylinder',
  'washBottle',
  'waste',
];

export function createContainer(
  id: ContainerId,
  init: Partial<Pick<Container, 'volumeMl' | 'hclMoles' | 'naohMoles' | 'indicatorMl'>> = {},
): Container {
  return {
    id,
    volumeMl: init.volumeMl ?? 0,
    hclMoles: init.hclMoles ?? 0,
    naohMoles: init.naohMoles ?? 0,
    indicatorMl: init.indicatorMl ?? 0,
  };
}

export interface InitialLabOptions {
  unknownAcidConcentrationM: number;
  acidStockMl?: number;
  naohStockMl?: number;
}

export function createInitialContainers(options: InitialLabOptions): Containers {
  const { unknownAcidConcentrationM } = options;
  const acidStockMl = options.acidStockMl ?? 250;
  const naohStockMl = options.naohStockMl ?? 500;
  return {
    acidStock: createContainer('acidStock', {
      volumeMl: acidStockMl,
      hclMoles: unknownAcidConcentrationM * (acidStockMl / 1000),
    }),
    naohStock: createContainer('naohStock', {
      volumeMl: naohStockMl,
      naohMoles: NAOH_CONCENTRATION_M * (naohStockMl / 1000),
    }),
    indicatorStock: createContainer('indicatorStock', {
      volumeMl: 30,
      indicatorMl: 30,
    }),
    burette: createContainer('burette'),
    flask: createContainer('flask'),
    beaker: createContainer('beaker'),
    cylinder: createContainer('cylinder'),
    washBottle: createContainer('washBottle', { volumeMl: 500 }),
    waste: createContainer('waste'),
  };
}

export interface TransferResult {
  containers: Containers;
  movedMl: number;
  requestedMl: number;
  /** Why the transfer was reduced, when it was. */
  limit: 'none' | 'source-empty' | 'target-full' | 'invalid';
}

const emptyResult = (
  containers: Containers,
  requestedMl: number,
  limit: TransferResult['limit'],
): TransferResult => ({ containers, movedMl: 0, requestedMl, limit });

/**
 * Move up to `requestedMl` of liquid from one container to another.
 * Solutes travel in proportion to the volume moved, so mole counts are conserved.
 */
export function transferVolume(
  containers: Containers,
  from: ContainerId,
  to: ContainerId,
  requestedMl: number,
): TransferResult {
  if (!Number.isFinite(requestedMl) || requestedMl <= 0 || from === to) {
    return emptyResult(containers, Math.max(0, requestedMl || 0), 'invalid');
  }
  const source = containers[from];
  const target = containers[to];
  if (!source || !target) return emptyResult(containers, requestedMl, 'invalid');

  const targetFree = Math.max(0, CONTAINER_CAPACITY_ML[to] - target.volumeMl);
  if (source.volumeMl <= EPSILON_ML) return emptyResult(containers, requestedMl, 'source-empty');
  if (targetFree <= EPSILON_ML) return emptyResult(containers, requestedMl, 'target-full');

  const movedMl = Math.min(requestedMl, source.volumeMl, targetFree);
  if (movedMl <= EPSILON_ML) return emptyResult(containers, requestedMl, 'invalid');
  const fraction = movedMl / source.volumeMl;

  const nextSource: Container = {
    ...source,
    volumeMl: Math.max(0, source.volumeMl - movedMl),
    hclMoles: Math.max(0, source.hclMoles * (1 - fraction)),
    naohMoles: Math.max(0, source.naohMoles * (1 - fraction)),
    indicatorMl: Math.max(0, source.indicatorMl * (1 - fraction)),
  };
  const nextTarget: Container = {
    ...target,
    volumeMl: target.volumeMl + movedMl,
    hclMoles: target.hclMoles + source.hclMoles * fraction,
    naohMoles: target.naohMoles + source.naohMoles * fraction,
    indicatorMl: target.indicatorMl + source.indicatorMl * fraction,
  };

  const limit: TransferResult['limit'] =
    movedMl + EPSILON_ML < requestedMl ? (movedMl >= source.volumeMl - EPSILON_ML ? 'source-empty' : 'target-full') : 'none';

  return {
    containers: { ...containers, [from]: nextSource, [to]: nextTarget },
    movedMl,
    requestedMl,
    limit,
  };
}

/** Fill the burette from the NaOH stock and report the volume actually delivered. */
export const fillBurette = (containers: Containers) =>
  transferVolume(containers, 'naohStock', 'burette', BURETTE_CAPACITY_ML);

/** Deliver titrant from the burette into the conical flask. */
export const dispenseTitrant = (containers: Containers, requestedMl: number) =>
  transferVolume(containers, 'burette', 'flask', requestedMl);

/** Transfer a 25 mL aliquot of the unknown acid into the flask. */
export const pipetteAliquot = (containers: Containers, aliquotMl: number) =>
  transferVolume(containers, 'acidStock', 'flask', aliquotMl);

/** Add indicator drops from the stock dropper into the flask. */
export const addIndicator = (containers: Containers, ml: number) =>
  transferVolume(containers, 'indicatorStock', 'flask', ml);

/** Rinse with distilled water — adds volume but no acid or base. */
export const addDistilledWater = (containers: Containers, ml: number) =>
  transferVolume(containers, 'washBottle', 'flask', ml);

export const totalVolumeMl = (containers: Containers): number =>
  CONTAINER_IDS.reduce((sum, id) => sum + containers[id].volumeMl, 0);

export const totalHclMoles = (containers: Containers): number =>
  CONTAINER_IDS.reduce((sum, id) => sum + containers[id].hclMoles, 0);

export const totalNaohMoles = (containers: Containers): number =>
  CONTAINER_IDS.reduce((sum, id) => sum + containers[id].naohMoles, 0);

export const totalIndicatorMl = (containers: Containers): number =>
  CONTAINER_IDS.reduce((sum, id) => sum + containers[id].indicatorMl, 0);

export interface ConservationSnapshot {
  volumeMl: number;
  hclMoles: number;
  naohMoles: number;
  indicatorMl: number;
}

export const conservationSnapshot = (containers: Containers): ConservationSnapshot => ({
  volumeMl: totalVolumeMl(containers),
  hclMoles: totalHclMoles(containers),
  naohMoles: totalNaohMoles(containers),
  indicatorMl: totalIndicatorMl(containers),
});

export function isConserved(a: ConservationSnapshot, b: ConservationSnapshot, tolerance = 1e-7): boolean {
  return (
    Math.abs(a.volumeMl - b.volumeMl) <= tolerance &&
    Math.abs(a.hclMoles - b.hclMoles) <= tolerance &&
    Math.abs(a.naohMoles - b.naohMoles) <= tolerance &&
    Math.abs(a.indicatorMl - b.indicatorMl) <= tolerance
  );
}

export function unknownConcentrationInRange(value: number): boolean {
  return value >= UNKNOWN_ACID_MIN_M - 1e-9 && value <= UNKNOWN_ACID_MAX_M + 1e-9;
}

export function buretteReadingMl(initialReadingMl: number, deliveredMl: number): number {
  return initialReadingMl + deliveredMl;
}
