import { ENDPOINT_PH } from './constants';
import type { Container, IndicatorVisual, SolutionAnalysis } from './types';

/**
 * Chemistry engine — authoritative for solution composition, pH and indicator response.
 * It has no knowledge of volumes being animated, meshes, gestures or React.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function mixHex(from: string, to: string, t: number): string {
  const amount = clamp(t, 0, 1);
  const parse = (hex: string) => {
    const clean = hex.replace('#', '');
    return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16));
  };
  const a = parse(from);
  const b = parse(to);
  const mixed = a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Phenolphthalein is colourless below pH 8.2 and magenta above it.
 * Strength ramps over ~2.2 pH units so the first drop is a pale pink, not an instant block of colour.
 */
export function indicatorVisual(ph: number, indicatorMl: number): IndicatorVisual {
  const present = indicatorMl > 1e-6;
  const strength = present ? clamp((ph - ENDPOINT_PH) / 2.2, 0, 1) : 0;
  return {
    color: mixHex('#cdeee9', '#e0459e', strength),
    opacity: 0.34 + 0.38 * strength,
    strength,
    endpoint: present && ph >= ENDPOINT_PH,
  };
}

/** Analytical pH of a strong acid / strong base mixture. */
export function computePh(hclMoles: number, naohMoles: number, volumeMl: number): number {
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) return 7;
  const excess = hclMoles - naohMoles;
  const volumeL = volumeMl / 1000;
  if (Math.abs(excess) < 1e-12) return 7;
  if (excess > 0) {
    const concentration = excess / volumeL;
    return clamp(-Math.log10(Math.max(concentration, 1e-14)), 0, 7);
  }
  const hydroxide = -excess / volumeL;
  const poh = clamp(-Math.log10(Math.max(hydroxide, 1e-14)), 0, 14);
  return clamp(14 - poh, 7, 14);
}

export function analyseSolution(container: Container): SolutionAnalysis {
  const ph = computePh(container.hclMoles, container.naohMoles, container.volumeMl);
  const excess = container.hclMoles - container.naohMoles;
  const indicator = indicatorVisual(ph, container.indicatorMl);
  return {
    volumeMl: container.volumeMl,
    hclMoles: container.hclMoles,
    naohMoles: container.naohMoles,
    excessMoles: excess,
    excess: Math.abs(excess) < 1e-12 ? 'neutral' : excess > 0 ? 'acid' : 'base',
    ph,
    concentrationHcl: container.volumeMl > 0 ? container.hclMoles / (container.volumeMl / 1000) : 0,
    indicator,
    endpoint: indicator.endpoint,
  };
}

export const isEndpoint = (container: Container): boolean => analyseSolution(container).endpoint;

/** Moles of HCl delivered by a volume of titrant. */
export const molesOf = (concentrationM: number, volumeMl: number): number =>
  concentrationM * (volumeMl / 1000);
