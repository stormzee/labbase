import { describe, expect, it } from 'vitest';
import {
  calculateTitrationResult,
  createExperiment,
  createUnknownConcentration,
  deriveProgress,
  evaluateFlaskAfterDelivery,
  gradeForError,
  mulberry32,
  predictPh,
} from '../domain/titration';
import { createContainer } from '../domain/containers';

const baseInput = {
  initialReadingMl: 0,
  finalReadingMl: 24.8,
  aliquotMl: 25,
  titrantConcentrationM: 0.1,
  trueAcidConcentrationM: 0.1,
};

describe('titration chemistry', () => {
  it('is deterministic and inside the advertised unknown range', () => {
    expect(createUnknownConcentration(42)).toBe(createUnknownConcentration(42));
    for (let seed = 1; seed < 60; seed += 1) {
      const value = createUnknownConcentration(seed);
      expect(value).toBeGreaterThanOrEqual(0.08);
      expect(value).toBeLessThanOrEqual(0.16);
    }
  });

  it('creates a fresh experiment with no readings', () => {
    const experiment = createExperiment(7);
    expect(experiment.aliquotTransferred).toBe(false);
    expect(experiment.readings).toEqual({ initialMl: null, finalMl: null });
    expect(experiment.result).toBeNull();
    expect(experiment.endpointReached).toBe(false);
  });

  it('calculates the titre and unknown concentration from readings', () => {
    const result = calculateTitrationResult(baseInput);
    expect(result.titreMl).toBeCloseTo(24.8, 9);
    expect(result.baseMoles).toBeCloseTo(0.00248, 9);
    expect(result.acidMoles).toBeCloseTo(0.00248, 9);
    expect(result.acidConcentrationM).toBeCloseTo(0.0992, 9);
    expect(result.trueTitreMl).toBeCloseTo(25, 9);
    expect(result.errorPercent).toBeCloseTo(-0.8, 6);
    expect(result.grade).toBe('good');
  });

  it('grades by percentage error', () => {
    expect(gradeForError(0.2)).toBe('excellent');
    expect(gradeForError(-0.5)).toBe('excellent');
    expect(gradeForError(1.2)).toBe('good');
    expect(gradeForError(2)).toBe('repeat');
  });

  it('rejects impossible readings', () => {
    expect(() => calculateTitrationResult({ ...baseInput, finalReadingMl: -1 })).toThrow(RangeError);
    expect(() =>
      calculateTitrationResult({ ...baseInput, finalReadingMl: 20, initialReadingMl: 21 }),
    ).toThrow(RangeError);
    expect(() => calculateTitrationResult({ ...baseInput, aliquotMl: 0 })).toThrow(RangeError);
  });

  it('predicted pH crosses equivalence realistically', () => {
    expect(predictPh({ unknownAcidConcentrationM: 0.1, aliquotMl: 25, deliveredMl: 0 })).toBeLessThan(2);
    expect(predictPh({ unknownAcidConcentrationM: 0.1, aliquotMl: 25, deliveredMl: 25 })).toBeCloseTo(7, 6);
    expect(predictPh({ unknownAcidConcentrationM: 0.1, aliquotMl: 25, deliveredMl: 25.1 })).toBeGreaterThan(9);
  });

  it('derives progress only when conditions are met', () => {
    const incomplete = deriveProgress({
      buretteSnappedTo: 'buretteRest',
      flaskSnappedTo: null,
      aliquotTransferred: false,
      flaskIndicatorMl: 0,
      buretteFilled: false,
      endpointReached: false,
      flow: 'off',
      readings: { initialMl: null, finalMl: null },
      result: null,
    });
    expect(incomplete.currentStep).toBe('arrange');
    expect(incomplete.completedCount).toBe(0);

    const complete = deriveProgress({
      buretteSnappedTo: 'buretteClamp',
      flaskSnappedTo: 'flaskBay',
      aliquotTransferred: true,
      flaskIndicatorMl: 0.15,
      buretteFilled: true,
      endpointReached: true,
      flow: 'off',
      readings: { initialMl: 0, finalMl: 24.8 },
      result: calculateTitrationResult(baseInput),
    });
    expect(complete.completedCount).toBe(7);
    expect(complete.currentStep).toBeNull();
    expect(complete.ratio).toBe(1);
  });

  it('requires the stopcock to be closed for the titrate step', () => {
    const progress = deriveProgress({
      buretteSnappedTo: 'buretteClamp',
      flaskSnappedTo: 'flaskBay',
      aliquotTransferred: true,
      flaskIndicatorMl: 0.15,
      buretteFilled: true,
      endpointReached: true,
      flow: 'drop',
      readings: { initialMl: 0, finalMl: null },
      result: null,
    });
    expect(progress.steps.titrate).toBe(false);
    expect(progress.currentStep).toBe('titrate');
  });

  it('reports endpoint and overshoot transitions', () => {
    const flask = createContainer('flask', {
      volumeMl: 50,
      hclMoles: 0.0025,
      naohMoles: 0.00251,
      indicatorMl: 0.15,
    });
    const first = evaluateFlaskAfterDelivery(flask, 25.1, null);
    expect(first.endpointReached).toBe(true);
    expect(first.endpointDeliveredMl).toBe(25.1);
    const later = evaluateFlaskAfterDelivery(flask, 26, first.endpointDeliveredMl);
    expect(later.endpointDeliveredMl).toBe(25.1);
  });

  it('uses a seeded PRNG deterministically', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
