export const formatMl = (value: number, digits = 2): string =>
  `${value.toFixed(digits)} mL`;

export const formatReading = (value: number | null): string =>
  value === null || !Number.isFinite(value) ? '—' : value.toFixed(2);

export const formatPh = (value: number): string => value.toFixed(2);

export const formatConcentration = (value: number): string => `${value.toFixed(4)} mol dm⁻³`;

export const formatPercent = (value: number, digits = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;

export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};

export const titleCase = (value: string): string =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());
