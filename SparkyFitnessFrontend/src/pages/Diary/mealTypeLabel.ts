import i18n from '@/i18n';

const BUILT_IN_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snacks']);

/**
 * Display name of a meal type. The four built-in types are stored by their
 * English keys ("breakfast", ...); everything else (DG FIT's "Yemekler", a
 * person's own types) is shown as typed.
 */
export const mealTypeLabel = (name: string | null | undefined): string => {
  const raw = name?.trim() ?? '';
  const key = raw.toLowerCase();
  return BUILT_IN_MEAL_TYPES.has(key) ? i18n.t(`common.${key}`, raw) : raw;
};
