import {
  MAX_MEASURED_BMR_KCAL,
  MIN_MEASURED_BMR_KCAL,
} from '@workspace/shared';
import { fmtTr } from '@/utils/numberFormatting';

/**
 * Plausible ranges for the check-in fields, in the stored (metric) unit.
 * A value outside them is not refused, only questioned: "785 kg" is almost
 * always a typo, but the person gets the last word.
 */
export const MEASUREMENT_RANGES = {
  weight: { min: 20, max: 300, unit: 'kg', label: 'Kilo' },
  height: { min: 100, max: 250, unit: 'cm', label: 'Boy' },
  bodyFat: { min: 2, max: 70, unit: '%', label: 'Vücut yağı' },
  neck: { min: 20, max: 70, unit: 'cm', label: 'Boyun' },
  waist: { min: 40, max: 200, unit: 'cm', label: 'Bel' },
  hips: { min: 50, max: 200, unit: 'cm', label: 'Kalça' },
  muscleMass: { min: 10, max: 150, unit: 'kg', label: 'Kas kütlesi' },
  boneMass: { min: 0.5, max: 10, unit: 'kg', label: 'Kemik kütlesi' },
  bodyWater: { min: 20, max: 80, unit: '%', label: 'Vücut suyu' },
  bmr: {
    min: MIN_MEASURED_BMR_KCAL,
    max: MAX_MEASURED_BMR_KCAL,
    unit: 'kcal',
    label: 'Dinlenme kalorisi',
  },
  steps: { min: 0, max: 100000, unit: 'adım', label: 'Adım' },
} as const;

export type MeasurementField = keyof typeof MEASUREMENT_RANGES;

/** The field's value when it is a number outside its plausible range. */
export const outOfRangeValue = (
  field: MeasurementField,
  raw: string
): number | null => {
  if (raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const { min, max } = MEASUREMENT_RANGES[field];
  return value < min || value > max ? value : null;
};

/** "Genelde 20–300 kg arasında olur." */
export const rangeHint = (field: MeasurementField): string => {
  const { min, max, unit } = MEASUREMENT_RANGES[field];
  return `Genelde ${fmtTr(min)}–${fmtTr(max)} ${unit} arasında olur.`;
};

/** "Kilo: 785 kg" for the confirmation list. */
export const describeValue = (field: MeasurementField, value: number) => {
  const { unit, label } = MEASUREMENT_RANGES[field];
  return `${label}: ${fmtTr(value, 2)} ${unit}`;
};
