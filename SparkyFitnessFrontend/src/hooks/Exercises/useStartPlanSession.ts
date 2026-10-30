import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { isCardioModality, resolveExerciseModality } from '@workspace/shared';
import { toast } from '@/hooks/use-toast';
import { usePreferences } from '@/contexts/PreferencesContext';
import { error } from '@/utils/logging';
import { defaultSetForModality } from '@/constants/exercises';
import { generateClientId } from '@/utils/generateClientId';
import { exerciseByIdOptions } from '@/hooks/Exercises/useExercises';
import {
  useWorkoutPresets,
  workoutPresetByIdOptions,
} from '@/hooks/Exercises/useWorkoutPresets';
import { createWorkoutPlaybackRouteState } from '@/utils/workoutPlayback';
import type {
  WorkoutPlanAssignment,
  WorkoutPlanTemplate,
  WorkoutPreset,
  WorkoutPresetExercise,
  WorkoutPresetSet,
} from '@/types/workout';

/**
 * Builds the workout of one plan session (a weekday, or a sequential session)
 * and opens it in the workout player, logging to `selectedDate`. Shared by the
 * Diary exercise card and the DG FIT workout hub.
 */
export const useStartPlanSession = (
  selectedDate: string,
  currentUserId: string | undefined
) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { loggingLevel } = usePreferences();
  const { data: presetData } = useWorkoutPresets(currentUserId);
  const workoutPresets = presetData?.presets ?? [];

  return async (
    targetPlan: WorkoutPlanTemplate,
    assignment: WorkoutPlanAssignment
  ): Promise<void> => {
    if (!targetPlan) return;

    // Collect all assignments in this session
    const isSequential = targetPlan.schedule_type === 'sequential';
    const sessionAssignments = isSequential
      ? targetPlan.assignments?.filter(
          (a: WorkoutPlanAssignment) =>
            (a.session_index ?? 1) === (assignment.session_index ?? 1)
        ) || [assignment]
      : targetPlan.assignments?.filter(
          (a: WorkoutPlanAssignment) => a.day_of_week === assignment.day_of_week
        ) || [assignment];

    const combinedExercises: WorkoutPresetExercise[] = [];

    for (const a of sessionAssignments) {
      if (a.workout_preset_id) {
        let preset = workoutPresets.find(
          (p) => String(p.id) === String(a.workout_preset_id)
        );
        if (!preset) {
          try {
            preset = await queryClient.fetchQuery(
              workoutPresetByIdOptions(a.workout_preset_id)
            );
          } catch (err) {
            error(
              loggingLevel,
              `Failed to fetch preset for session: ${a.workout_preset_id}`,
              err
            );
          }
        }
        if (preset && preset.exercises && preset.exercises.length > 0) {
          combinedExercises.push(
            ...preset.exercises.map((ex) => ({
              ...ex,
              workout_plan_assignment_id: a.id ?? null,
            }))
          );
        }
      } else if (a.exercise_id) {
        try {
          const fullExercise = await queryClient.fetchQuery(
            exerciseByIdOptions(a.exercise_id)
          );
          const modality = resolveExerciseModality(
            fullExercise.modality,
            fullExercise.category
          );
          combinedExercises.push({
            id: String(a.id || generateClientId()),
            exercise_id: fullExercise.id,
            exercise_name: fullExercise.name,
            exercise: fullExercise,
            category: fullExercise.category ?? undefined,
            modality,
            superset_group: null,
            workout_plan_assignment_id: a.id ?? null,
            sets:
              a.sets && a.sets.length > 0
                ? a.sets.map((set: WorkoutPresetSet, sIdx: number) => ({
                    set_number: sIdx + 1,
                    set_type: set.set_type ?? 'normal',
                    reps: set.reps ?? null,
                    weight: set.weight ?? null,
                    duration: set.duration ?? null,
                    distance: isCardioModality(modality)
                      ? (set.distance ?? null)
                      : null,
                    rest_time: isCardioModality(modality)
                      ? 0
                      : (set.rest_time ?? null),
                    notes: set.notes ?? null,
                    rpe: null,
                    completed_at: null,
                  }))
                : [defaultSetForModality(modality)],
          });
        } catch (err) {
          error(
            loggingLevel,
            `Failed to fetch exercise for session: ${a.exercise_id}`,
            err
          );
        }
      }
    }

    if (combinedExercises.length === 0) {
      toast({
        title: t('common.error', 'Error'),
        description: t(
          'exerciseCard.noExercisesInPlanSession',
          'No exercises found in this session.'
        ),
        variant: 'destructive',
      });
      return;
    }

    const sessionName =
      assignment.session_name ||
      targetPlan.sequence_position?.session_name ||
      assignment.workout_preset_name ||
      assignment.exercise_name ||
      targetPlan.plan_name;

    const sessionPreset: WorkoutPreset = {
      id: `plan-${targetPlan.id}-session-${assignment.session_index ?? assignment.day_of_week ?? 1}`,
      user_id: currentUserId || '',
      name: sessionName,
      description:
        targetPlan.description ||
        t('diary.exerciseCard.session', '{{plan_name}} session', {
          plan_name: targetPlan.plan_name,
        }),
      exercises: combinedExercises,
    };

    const routeState = createWorkoutPlaybackRouteState(
      sessionPreset,
      selectedDate,
      `${window.location.pathname}${window.location.search}`
    );

    navigate(`/workout-playback?date=${selectedDate}`, {
      state: routeState,
    });
  };
};
