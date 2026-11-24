import { describe, expect, it } from 'vitest';
import {
  CONTAINER_IDS,
  addIndicator,
  addDistilledWater,
  conservationSnapshot,
  createInitialContainers,
  dispenseTitrant,
  fillBurette,
  isConserved,
  pipetteAliquot,
  totalVolumeMl,
  transferVolume,
  unknownConcentrationInRange,
} from '../domain/containers';
import { mulberry32 } from '../domain/titration';

const lab = () => createInitialContainers({ unknownAcidConcentrationM: 0.1 });

describe('liquid container conservation', () => {
  it('creates the expected starting stock', () => {
    const containers = lab();
    expect(containers.acidStock.volumeMl).toBe(250);
    expect(containers.acidStock.hclMoles).toBeCloseTo(0.025, 9);
    expect(containers.naohStock.volumeMl).toBe(500);
    expect(containers.naohStock.naohMoles).toBeCloseTo(0.05, 9);
    expect(containers.indicatorStock.volumeMl).toBe(30);
    expect(containers.washBottle.volumeMl).toBe(500);
    expect(totalVolumeMl(containers)).toBeCloseTo(1280, 9);
    expect(unknownConcentrationInRange(0.1)).toBe(true);
    expect(unknownConcentrationInRange(0.2)).toBe(false);
  });

  it('fills the burette and preserves totals', () => {
    const before = conservationSnapshot(lab());
    const result = fillBurette(lab());
    expect(result.movedMl).toBe(50);
    expect(result.containers.burette.volumeMl).toBe(50);
    expect(result.containers.naohStock.volumeMl).toBe(450);
    expect(isConserved(before, conservationSnapshot(result.containers))).toBe(true);
  });

  it('dispenses from burette to flask without loss', () => {
    const filled = fillBurette(lab()).containers;
    const before = conservationSnapshot(filled);
    const result = dispenseTitrant(filled, 10.25);
    expect(result.movedMl).toBeCloseTo(10.25, 9);
    expect(result.containers.flask.volumeMl).toBeCloseTo(10.25, 9);
    expect(result.containers.burette.volumeMl).toBeCloseTo(39.75, 9);
    expect(result.containers.flask.naohMoles).toBeCloseTo(0.001025, 9);
    expect(isConserved(before, conservationSnapshot(result.containers))).toBe(true);
  });

  it('pipettes an aliquot and adds indicator in proportion', () => {
    const pipetted = pipetteAliquot(lab(), 25);
    expect(pipetted.containers.flask.volumeMl).toBe(25);
    expect(pipetted.containers.flask.hclMoles).toBeCloseTo(0.0025, 9);
    const withIndicator = addIndicator(pipetted.containers, 0.15);
    expect(withIndicator.containers.flask.volumeMl).toBeCloseTo(25.15, 9);
    expect(withIndicator.containers.flask.indicatorMl).toBeCloseTo(0.15, 9);
    expect(withIndicator.containers.indicatorStock.volumeMl).toBeCloseTo(29.85, 9);
    const water = addDistilledWater(withIndicator.containers, 10);
    expect(water.containers.flask.volumeMl).toBeCloseTo(35.15, 9);
    expect(water.containers.flask.hclMoles).toBeCloseTo(0.0025, 9);
  });

  it('clamps to source volume and target capacity', () => {
    const fromWash = transferVolume(lab(), 'washBottle', 'flask', 1000);
    expect(fromWash.movedMl).toBe(250); // flask capacity
    expect(fromWash.limit).toBe('target-full');
    const again = transferVolume(fromWash.containers, 'washBottle', 'flask', 1);
    expect(again.movedMl).toBe(0);
    expect(again.limit).toBe('target-full');
  });

  it('rejects invalid transfers without mutating state', () => {
    const containers = lab();
    expect(transferVolume(containers, 'flask', 'flask', 10).movedMl).toBe(0);
    expect(transferVolume(containers, 'flask', 'beaker', 10).movedMl).toBe(0);
    expect(transferVolume(containers, 'washBottle', 'beaker', -5).movedMl).toBe(0);
    expect(totalVolumeMl(containers)).toBe(1280);
  });

  it('conserves volume and moles over a long randomised transfer sequence', () => {
    const random = mulberry32(20261104);
    let containers = lab();
    const initial = conservationSnapshot(containers);
    for (let step = 0; step < 400; step += 1) {
      const from = CONTAINER_IDS[Math.floor(random() * CONTAINER_IDS.length)];
      let to = CONTAINER_IDS[Math.floor(random() * CONTAINER_IDS.length)];
      if (from === to) to = from === 'flask' ? 'beaker' : 'flask';
      const requested = random() * 30;
      containers = transferVolume(containers, from, to, requested).containers;
      for (const id of CONTAINER_IDS) {
        expect(containers[id].volumeMl).toBeGreaterThanOrEqual(0);
        expect(containers[id].hclMoles).toBeGreaterThanOrEqual(0);
        expect(containers[id].naohMoles).toBeGreaterThanOrEqual(0);
      }
      expect(isConserved(initial, conservationSnapshot(containers), 1e-6)).toBe(true);
    }
  });
});
