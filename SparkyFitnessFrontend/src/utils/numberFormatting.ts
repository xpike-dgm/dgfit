import {
  formatWeight as formatWeightInternal,
  formatHeight as formatHeightInternal,
  formatMeasurement as formatMeasurementInternal,
} from './unitConversions';

export const formatNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }
  if (num < 1000000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return (num / 1000000).toFixed(1) + 'M';
};

/**
 * Formats a weight value (in kg) based on the user's preferred unit.
 */
export const formatWeight = (
  kg: number | null | undefined,
  unit: string = 'kg'
): string => {
  return formatWeightInternal(kg, unit);
};

/**
 * Formats a height value (in cm) based on the user's preferred unit.
 */
export const formatHeight = (
  cm: number | null | undefined,
  unit: string = 'cm'
): string => {
  return formatHeightInternal(cm, unit);
};

/**
 * Formats a body measurement (waist, neck, hips, etc.) based on the user's preferred unit.
 */
export const formatMeasurement = (
  cm: number | null | undefined,
  unit: string = 'cm'
): string => {
  return formatMeasurementInternal(cm, unit);
};

/**
 * DG FIT's one number format: Turkish grouping and decimal comma
 * (1.234 · 12,5). Use it for every number shown to the person, with a space
 * before the unit ("55,7 g", "2.000 kcal").
 */
export const fmtTr = (
  value: number | null | undefined,
  maxFractionDigits = 1
): string =>
  value == null || Number.isNaN(value)
    ? '—'
    : value.toLocaleString('tr-TR', {
        maximumFractionDigits: maxFractionDigits,
      });

/** `fmtTr` plus a unit, e.g. fmtTrUnit(55.7, 'g') -> "55,7 g". */
export const fmtTrUnit = (
  value: number | null | undefined,
  unit: string,
  maxFractionDigits = 1
): string =>
  value == null || Number.isNaN(value)
    ? '—'
    : `${fmtTr(value, maxFractionDigits)} ${unit}`;
