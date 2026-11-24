import { beforeEach, describe, expect, it } from 'vitest';
import { conservationSnapshot, isConserved } from '../domain/containers';
import { getProgress, useLabStore } from '../store/labStore';
import { runPrimaryAction } from '../interaction/actions';

const store = () => useLabStore.getState();

const arrange = () => {
  store().selectApparatus('burette');
  store().snapSelectedToHome();
  store().selectApparatus('flask');
  store().snapSelectedToHome();
};

const prepare = () => {
  arrange();
  store().actionPipette();
  store().actionIndicator();
  store().actionFillBurette();
};

describe('lab workflow and fallbacks', () => {
  beforeEach(() => {
    useLabStore.getState().reset(4242);
  });

  it('resets to a fresh, deterministic unknown sample', () => {
    const first = store();
    const concentration = first.experiment.unknownAcidConcentrationM;
    expect(concentration).toBeGreaterThanOrEqual(0.08);
    expect(concentration).toBeLessThanOrEqual(0.16);
    expect(first.containers.flask.volumeMl).toBe(0);
    expect(first.flow).toBe('off');
    expect(first.experiment.readings.initialMl).toBeNull();
    useLabStore.getState().reset(4242);
    expect(store().experiment.unknownAcidConcentrationM).toBe(concentration);
  });

  it('refuses to fill an unclamped burette', () => {
    const ok = store().actionFillBurette();
    expect(ok).toBe(false);
    expect(store().experiment.buretteFilled).toBe(false);
    expect(store().containers.burette.volumeMl).toBe(0);
  });

  it('arranges with snap-home and enables the next step', () => {
    arrange();
    expect(store().placements.burette.snappedTo).toBe('buretteClamp');
    expect(store().placements.flask.snappedTo).toBe('flaskBay');
    const progress = getProgress(store());
    expect(progress.steps.arrange).toBe(true);
    expect(progress.currentStep).toBe('pipette');
  });

  it('pipettes, indicators and fills in order while conserving liquid', () => {
    const before = conservationSnapshot(store().containers);
    arrange();
    expect(store().actionPipette()).toBe(true);
    expect(store().containers.flask.volumeMl).toBeCloseTo(25, 6);
    expect(getProgress(store()).steps.pipette).toBe(true);
    expect(store().actionIndicator()).toBe(true);
    expect(store().containers.flask.indicatorMl).toBeCloseTo(0.15, 9);
    expect(getProgress(store()).steps.indicator).toBe(true);
    expect(store().actionFillBurette()).toBe(true);
    expect(store().buretteStartVolumeMl).toBe(50);
    expect(store().experiment.readings.initialMl).toBe(0);
    expect(getProgress(store()).steps.fill).toBe(true);
    expect(isConserved(before, conservationSnapshot(store().containers), 1e-6)).toBe(true);
  });

  it('moves and rotates apparatus with keyboard actions', () => {
    store().selectApparatus('burette');
    expect(store().beginGrab('burette', 'keyboard')).toBe(true);
    store().dragTo([-0.62, 0.8, -0.06]);
    store().endGrab();
    expect(store().placements.burette.snappedTo).toBe('buretteClamp');

    store().selectApparatus('flask');
    store().beginGrab('flask', 'keyboard');
    store().dragTo([0.2, 0.8, 0.1]);
    store().endGrab();
    expect(store().placements.flask.snappedTo).toBeNull();
    expect(store().placements.flask.position[0]).toBeCloseTo(0.2, 6);

    store().rotateSelected(Math.PI / 2);
    expect(store().placements.flask.rotation[1]).toBeCloseTo(Math.PI / 2, 6);
  });

  it('cancels a grab and restores the original placement', () => {
    const original = store().placements.burette;
    store().beginGrab('burette', 'keyboard');
    store().dragTo([0.1, 0.8, 0.2]);
    store().cancelGrab();
    expect(store().placements.burette.position).toEqual(original.position);
    expect(store().placements.burette.snappedTo).toBe('buretteRest');
  });

  it('nudges a selected apparatus by grabbing automatically', () => {
    store().selectApparatus('flask');
    const before = store().placements.flask.position[0];
    expect(store().nudgeSelected(0.05, 0.02)).toBe(true);
    expect(store().placements.flask.position[0]).toBeCloseTo(before + 0.05, 6);
    store().endGrab();
  });

  it('runs the entire titration with mouse/keyboard actions and conserves volume', () => {
    const initial = conservationSnapshot(store().containers);
    prepare();

    expect(store().setFlow('stream')).toBe(true);
    expect(store().flow).toBe('stream');

    let guard = 0;
    while (!store().experiment.endpointReached && guard < 600) {
      store().tickFlow(0.05, false);
      guard += 1;
      expect(isConserved(initial, conservationSnapshot(store().containers), 1e-6)).toBe(true);
    }
    expect(store().experiment.endpointReached).toBe(true);
    expect(store().experiment.endpointDeliveredMl).not.toBeNull();
    store().setFlow('off');
    expect(getProgress(store()).steps.titrate).toBe(true);
    expect(store().recordReading()).toBe(true);
    const finalReading = store().experiment.readings.finalMl;
    expect(finalReading).not.toBeNull();
    expect(finalReading!).toBeGreaterThan(0);
    expect(getProgress(store()).steps.record).toBe(true);

    expect(store().calculate()).toBe(true);
    const result = store().experiment.result;
    expect(result).not.toBeNull();
    expect(result!.titreMl).toBeCloseTo(finalReading!, 9);
    expect(result!.acidConcentrationM).toBeCloseTo(0.1 * result!.titreMl / 25, 9);
    expect(Math.abs(result!.errorPercent)).toBeLessThan(3);
    expect(getProgress(store()).completedCount).toBe(7);
    expect(isConserved(initial, conservationSnapshot(store().containers), 1e-6)).toBe(true);
  });

  it('auto-stops at the endpoint when requested', () => {
    prepare();
    expect(store().setFlow('stream')).toBe(true);
    let guard = 0;
    while (store().flow !== 'off' && guard < 600) {
      store().tickFlow(0.05, true);
      guard += 1;
    }
    expect(store().flow).toBe('off');
    expect(store().experiment.endpointReached).toBe(true);
    expect(getProgress(store()).steps.titrate).toBe(true);
  });

  it('refuses readings before the endpoint and calculation before readings', () => {
    prepare();
    expect(store().recordReading()).toBe(false);
    expect(store().calculate()).toBe(false);
    expect(store().experiment.result).toBeNull();
  });

  it('runs the contextual primary action (Space) through arrangement and pipetting', () => {
    runPrimaryAction();
    expect(store().placements.burette.snappedTo).toBe('buretteClamp');
    runPrimaryAction();
    expect(store().placements.flask.snappedTo).toBe('flaskBay');
    expect(getProgress(store()).steps.arrange).toBe(true);
    runPrimaryAction();
    expect(store().containers.flask.volumeMl).toBeCloseTo(25, 6);
  });

  it('stops flow if the apparatus is moved away', () => {
    prepare();
    store().setFlow('drop');
    expect(store().flow).toBe('drop');
    store().beginGrab('flask', 'pointer');
    store().dragTo([0.2, 0.8, 0.2]);
    store().tickFlow(0.05, false);
    expect(store().flow).toBe('off');
  });
});
