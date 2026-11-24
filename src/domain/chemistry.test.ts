import { describe, expect, it } from 'vitest';
import {
  analyseSolution,
  computePh,
  indicatorVisual,
  mixHex,
  molesOf,
} from '../domain/chemistry';
import { createContainer } from '../domain/containers';

describe('chemistry engine', () => {
  it('computes strong acid pH from excess moles and total volume', () => {
    expect(computePh(0.025, 0, 50)).toBeCloseTo(0.301, 3);
    expect(computePh(0.001, 0, 100)).toBeCloseTo(2, 3);
  });

  it('computes strong base pH after equivalence', () => {
    expect(computePh(0.0025, 0.0026, 50)).toBeCloseTo(11.301, 2);
    expect(computePh(0, 0.01, 100)).toBeCloseTo(13, 2);
  });

  it('is neutral at exact equivalence', () => {
    expect(computePh(0.0025, 0.0025, 50)).toBe(7);
    expect(computePh(0, 0, 0)).toBe(7);
  });

  it('clamps pH to the 0–14 scale', () => {
    expect(computePh(10, 0, 0.001)).toBe(0);
    expect(computePh(0, 10, 0.001)).toBe(14);
  });

  it('starts phenolphthalein colour above pH 8.2', () => {
    const acid = indicatorVisual(4, 0.15);
    expect(acid.endpoint).toBe(false);
    expect(acid.strength).toBe(0);
    const threshold = indicatorVisual(8.2, 0.15);
    expect(threshold.endpoint).toBe(true);
    expect(threshold.strength).toBeCloseTo(0, 5);
    const basic = indicatorVisual(10, 0.15);
    expect(basic.endpoint).toBe(true);
    expect(basic.strength).toBeGreaterThan(0.5);
    expect(basic.color).not.toBe(acid.color);
    expect(basic.opacity).toBeGreaterThan(acid.opacity);
  });

  it('does not show an endpoint without indicator', () => {
    const analysis = analyseSolution(createContainer('flask', { volumeMl: 40, naohMoles: 0.001 }));
    expect(analysis.ph).toBeGreaterThan(10);
    expect(analysis.indicator.endpoint).toBe(false);
    expect(analysis.endpoint).toBe(false);
  });

  it('analyses excess, neutral and base states', () => {
    const acid = analyseSolution(createContainer('flask', { volumeMl: 30, hclMoles: 0.003 }));
    expect(acid.excess).toBe('acid');
    expect(acid.ph).toBeLessThan(7);
    const neutral = analyseSolution(
      createContainer('flask', { volumeMl: 50, hclMoles: 0.0025, naohMoles: 0.0025 }),
    );
    expect(neutral.excess).toBe('neutral');
    expect(neutral.ph).toBe(7);
    const base = analyseSolution(createContainer('flask', { volumeMl: 50, naohMoles: 0.0026 }));
    expect(base.excess).toBe('base');
    expect(base.ph).toBeGreaterThan(7);
  });

  it('mixes colours and calculates moles', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#e0459e', '#cdeee9', 0)).toBe('#e0459e');
    expect(molesOf(0.1, 25)).toBeCloseTo(0.0025, 9);
  });
});
