import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DailySummaryResponse } from '@workspace/shared';
import { updateWaterIntake } from '@/api/Diary/waterIntakteService';
import { dailyProgressKeys } from '@/api/keys/diary';
import { useWaterContainer } from '@/contexts/WaterContainerContext';
import { useDiaryInvalidation } from '@/hooks/useInvalidateKeys';
import type { WaterContainer } from '@/types/settings';

const QUICK_WATER_KEY = ['dgfit', 'quickWater'] as const;

/** Millilitres one press of the water button adds. */
export const containerMl = (container: WaterContainer | null | undefined) => {
  if (!container) return 250;
  const factor =
    container.unit === 'liter' ? 1000 : container.unit === 'oz' ? 29.5735 : 1;
  return Math.round(
    (container.volume * factor) /
      Math.max(1, container.servings_per_container || 1)
  );
};

interface QuickWaterVariables {
  userId: string;
  date: string;
  drinks: number;
}

/**
 * Water +/− for Özet and the + sheet: the day's total moves at once
 * (optimistic), there is no success toast (the caller shows a small "+250 ml"
 * instead), and taps made offline wait and are sent when the connection is
 * back. Uses the same endpoint as the Diary water card.
 */
export const useQuickWater = () => {
  const queryClient = useQueryClient();
  const invalidate = useDiaryInvalidation();
  const { activeContainer } = useWaterContainer();
  const pressMl = containerMl(activeContainer);

  const mutation = useMutation({
    mutationKey: QUICK_WATER_KEY,
    mutationFn: ({ userId, date, drinks }: QuickWaterVariables) =>
      updateWaterIntake({
        user_id: userId,
        entry_date: date,
        change_drinks: drinks,
        container_id: activeContainer?.id ?? null,
      }),
    onMutate: async ({ date, drinks }) => {
      const key = dailyProgressKeys.summary(date);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DailySummaryResponse>(key);
      if (previous) {
        queryClient.setQueryData<DailySummaryResponse>(key, {
          ...previous,
          waterIntake: Math.max(
            0,
            (Number(previous.waterIntake) || 0) + drinks * pressMl
          ),
        });
      }
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      // Refetch once the last of a quick series of taps has landed, so an
      // early refetch does not undo the later optimistic updates.
      if (queryClient.isMutating({ mutationKey: QUICK_WATER_KEY }) <= 1) {
        invalidate();
      }
    },
    meta: {
      errorMessage: 'Su kaydedilemedi. Tekrar dene.',
    },
  });

  const addDrinks = (userId: string, date: string, drinks: number) =>
    mutation.mutate({ userId, date, drinks });

  return { addDrinks, pressMl };
};
