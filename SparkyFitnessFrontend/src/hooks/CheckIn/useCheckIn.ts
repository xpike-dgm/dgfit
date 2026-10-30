import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import {
  loadCustomCategories,
  fetchRecentCustomMeasurements,
  fetchRecentStandardMeasurements,
  deleteCustomMeasurement,
  updateCheckInMeasurementField,
  loadLatestCheckInMeasurements,
  loadCheckInMeasurementsForDate,
  loadExistingCustomMeasurements,
  loadLatestManualCustomEntriesOnOrBefore,
  saveCheckInMeasurements,
  saveCustomMeasurement,
  getMostRecentMeasurement,
  createCustomCategory,
} from '@/api/CheckIn/checkInService';
import { checkInKeys } from '@/api/keys/checkin';
import { dailyProgressKeys } from '@/api/keys/diary';
import { reportKeys } from '@/api/keys/reports';
import { fmtTr } from '@/utils/numberFormatting';

const FIELD_NAMES: Record<string, string> = {
  weight: 'Kilo',
  neck: 'Boyun ölçüsü',
  waist: 'Bel ölçüsü',
  hips: 'Kalça ölçüsü',
  steps: 'Adım',
  height: 'Boy',
  body_fat_percentage: 'Vücut yağı',
};

/** "Kilo silindi" when a history row is cleared, else "Ölçüm güncellendi". */
const fieldChangeMessage = (
  variables: { field?: string; value?: unknown } | undefined
): string => {
  if (variables?.value === null) {
    return `${FIELD_NAMES[variables.field ?? ''] ?? 'Ölçüm'} silindi`;
  }
  return 'Ölçüm güncellendi';
};

/** "Kilo kaydedildi: 78,5 kg" when a weight was saved, else "Ölçümler kaydedildi". */
const checkInSavedMessage = (
  variables: { weight?: number | null } | undefined
): string =>
  typeof variables?.weight === 'number'
    ? `Kilo kaydedildi: ${fmtTr(variables.weight, 2)} kg`
    : 'Ölçümler kaydedildi';

export const useCustomCategories = (userId?: string | null) => {
  return useQuery({
    queryKey: checkInKeys.customCategories(userId!),
    queryFn: () => loadCustomCategories(userId!),
    enabled: !!userId,
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadCategories',
        'Failed to load custom categories.'
      ),
    },
  });
};

export const useRecentCustomMeasurements = () => {
  return useQuery({
    queryKey: checkInKeys.recentCustom(),
    queryFn: fetchRecentCustomMeasurements,
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadRecentCustom',
        'Failed to load recent custom measurements.'
      ),
    },
  });
};

export const useRecentStandardMeasurements = (
  startDate: string,
  endDate: string
) => {
  return useQuery({
    queryKey: checkInKeys.recentStandard(startDate, endDate),
    queryFn: () => fetchRecentStandardMeasurements(startDate, endDate),
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadRecentStandard',
        'Failed to load recent standard measurements.'
      ),
    },
  });
};

export const useLatestCheckInMeasurements = (date: string) => {
  return useQuery({
    queryKey: checkInKeys.latestCheckIn(date),
    queryFn: () => loadLatestCheckInMeasurements(date),
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadExistingCheckIn',
        'Failed to load existing check-in data.'
      ),
    },
  });
};

export const useCheckInMeasurementsForDate = (date: string) => {
  return useQuery({
    queryKey: checkInKeys.dayCheckIn(date),
    queryFn: () => loadCheckInMeasurementsForDate(date),
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadExistingCheckIn',
        'Failed to load existing check-in data.'
      ),
    },
  });
};

export const useExistingCustomMeasurements = (date: string) => {
  return useQuery({
    queryKey: checkInKeys.existingCustom(date),
    queryFn: () => loadExistingCustomMeasurements(date),
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadExistingCustom',
        'Failed to load existing custom measurements.'
      ),
    },
  });
};

/**
 * Previous manual value per custom category, used as the check-in's
 * previous-value hints.
 *
 * Kept separate from `useExistingCustomMeasurements`, which answers what was
 * recorded on the selected day: the form needs both so a suggestion is never
 * mistaken for an actual value.
 */
export const useLatestManualCustomEntriesOnOrBefore = (date: string) => {
  return useQuery({
    queryKey: checkInKeys.latestManualCustom(date),
    queryFn: () => loadLatestManualCustomEntriesOnOrBefore(date),
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadPreviousCustom',
        'Failed to load previous custom values.'
      ),
    },
  });
};

export const useMostRecentMeasurement = (type: string) => {
  return useQuery({
    queryKey: checkInKeys.mostRecent(type),
    queryFn: () => getMostRecentMeasurement(type),
    meta: {
      errorMessage: i18n.t(
        'checkIn.failedToLoadMostRecent',
        'Failed to load most recent measurement.'
      ),
    },
  });
};

export const useDeleteCustomMeasurementMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => deleteCustomMeasurement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyProgressKeys.all });
    },
    meta: {
      errorMessage: t(
        'checkIn.failedToDeleteMeasurement',
        'Failed to delete measurement.'
      ),
      successMessage: 'Ölçüm silindi',
    },
  });
};

export const useUpdateCheckInMeasurementFieldMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: updateCheckInMeasurementField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyProgressKeys.all });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
    meta: {
      errorMessage: t(
        'checkIn.failedToUpdateMeasurement',
        'Failed to update measurement.'
      ),
      // The history list clears a field to delete it, so say "silindi".
      successMessage: (_data, variables) =>
        fieldChangeMessage(
          variables as { field?: string; value?: unknown } | undefined
        ),
    },
  });
};

export const useSaveCheckInMeasurementsMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: saveCheckInMeasurements,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: dailyProgressKeys.all });
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
    meta: {
      errorMessage: t(
        'checkIn.failedToSaveCheckIn',
        'Failed to save check-in data.'
      ),
      successMessage: (_data, variables) =>
        checkInSavedMessage(variables as { weight?: number | null }),
    },
  });
};

export const useSaveCustomMeasurementMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: saveCustomMeasurement,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: checkInKeys.all });
    },
    meta: {
      errorMessage: t(
        'checkIn.failedToSaveCustomMeasurement',
        'Failed to save custom measurement.'
      ),
    },
  });
};

export const useCreateCustomCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: createCustomCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
    },
    meta: {
      errorMessage: t(
        'checkIn.failedToCreateCategory',
        'Failed to create category.'
      ),
    },
  });
};
