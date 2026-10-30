import { useCallback, useRef, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Check, ChevronDown, Plus, Trophy } from 'lucide-react';
import {
  DEFAULT_DROP_SET_COUNT,
  DEFAULT_DROP_SET_PERCENT,
  findDropSetBaseIndex,
  isWarmupSetType,
  usesBarbell,
} from '@workspace/shared';
import type { WeightUnit } from '@/contexts/PreferencesContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { fmtTr } from '@/utils/numberFormatting';
import {
  WORKOUT_PLAYBACK_SET_GRID_CLASSES,
  WORKOUT_PLAYBACK_TIMED_SET_GRID_CLASSES,
  type WorkoutPlaybackExerciseDraft,
  type WorkoutSetEditableField,
  type WorkoutSetPointer,
  estimateOneRepMax,
  weightFromKg,
} from '@/utils/workoutPlayback';
import WorkoutPlaybackSetRow from './WorkoutPlaybackSetRow';
import { toast } from '@/hooks/use-toast';
import {
  useExercisesStats,
  type ExerciseStatsSet,
} from '@/hooks/Exercises/useExerciseEntries';
import AdaptiveSuggestionNotice from './AdaptiveSuggestionNotice';
import ImageLightbox from '@/components/ImageLightbox';
import { PlateCalculatorDialog } from '@/components/PlateCalculator/PlateCalculatorDialog';
import {
  filterValidExerciseImages,
  resolveExerciseImageSrc,
} from '@/utils/exercises';

interface WorkoutPlaybackExercisesListProps {
  exercises: WorkoutPlaybackExerciseDraft[];
  setNotesVisibility: Record<string, boolean>;
  onToggleSetNotesVisibility: (setKey: string) => void;
  onSelectSet: (pointer: WorkoutSetPointer) => void;
  onCompleteSet: (pointer: WorkoutSetPointer) => void;
  onUncompleteSet: (pointer: WorkoutSetPointer) => void;
  onSetFieldChange: (
    pointer: WorkoutSetPointer,
    field: WorkoutSetEditableField,
    value: number | string | null
  ) => void;
  onOpenRestEditor: (pointer: WorkoutSetPointer) => void;
  onRemoveSet: (pointer: WorkoutSetPointer) => void;
  onAddSet: (exerciseIndex: number) => void;
  onAddDropSets?: (exerciseIndex: number) => void;
  /** Swap the exercise for an alternative (issue #1560). */
  onReplaceExercise?: (exerciseIndex: number) => void;
  /** "Use my usual" / "Use the adjusted suggestion" (#1560). */
  onAdaptiveDeclined?: (exerciseIndex: number, declined: boolean) => void;
  weightUnit: WeightUnit;
}

const WorkoutPlaybackExercisesList = ({
  exercises,
  setNotesVisibility,
  onToggleSetNotesVisibility,
  onSelectSet,
  onCompleteSet,
  onUncompleteSet,
  onSetFieldChange,
  onOpenRestEditor,
  onRemoveSet,
  onAddSet,
  onAddDropSets,
  onReplaceExercise,
  onAdaptiveDeclined,
  weightUnit,
}: WorkoutPlaybackExercisesListProps) => {
  const { t } = useTranslation();
  const [expandedCompletedExercises, setExpandedCompletedExercises] = useState<
    Record<string, boolean>
  >({});
  // Full-screen exercise images (#1691), opened from a header thumbnail.
  const [imageViewer, setImageViewer] = useState<{
    images: string[];
    title: string;
  } | null>(null);
  // The set the plate calculator is open for.
  const [plateTarget, setPlateTarget] = useState<WorkoutSetPointer | null>(
    null
  );
  const plateExercise =
    plateTarget != null ? exercises[plateTarget.exerciseIndex] : undefined;

  // DG FIT: last session per set ("Önceki") and a live personal-record toast.
  const statsById = useExercisesStats(
    [...new Set(exercises.map((e) => e.exercise_id))].filter(Boolean)
  );
  const unitLabel = weightUnit === 'kg' ? 'kg' : 'lb';
  const formatSet = (set: ExerciseStatsSet) => {
    const weight = weightFromKg(Number(set.weight) || 0, weightUnit);
    return weight > 0
      ? `${fmtTr(weight, 2)} ${unitLabel} × ${set.reps ?? 0}`
      : `${set.reps ?? 0} tekrar`;
  };
  // Compact form for the set row's left column: "60×10" (kg is the header).
  const formatSetShort = (set: ExerciseStatsSet) => {
    const weight = weightFromKg(Number(set.weight) || 0, weightUnit);
    return weight > 0
      ? `${fmtTr(weight, 2)}×${set.reps ?? 0}`
      : `×${set.reps ?? 0}`;
  };
  const previousWorkingSets = (exerciseId: string) =>
    (statsById[exerciseId]?.recentSessions?.[0]?.sets ?? []).filter(
      (set) => !isWarmupSetType(set.setType)
    );
  const celebrated = useRef(new Set<string>());
  const handleCompleteSet = useCallback(
    (pointer: WorkoutSetPointer) => {
      onCompleteSet(pointer);
      const exercise = exercises[pointer.exerciseIndex];
      const set = exercise?.sets[pointer.setIndex];
      const best = exercise ? statsById[exercise.exercise_id]?.bestSet : null;
      if (!exercise || !set || !best || isWarmupSetType(set.set_type)) return;
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      const bestWeight = weightFromKg(Number(best.weight) || 0, weightUnit);
      const oneRm = estimateOneRepMax(weight, reps);
      const bestOneRm = estimateOneRepMax(bestWeight, Number(best.reps) || 0);
      const isRecord =
        weight > 0 &&
        reps > 0 &&
        (weight > bestWeight || oneRm > bestOneRm + 0.01);
      if (!isRecord || celebrated.current.has(exercise.exercise_id)) return;
      celebrated.current.add(exercise.exercise_id);
      toast({
        title: '🏆 Yeni kişisel rekor!',
        description: `${exercise.exercise_name}: ${fmtTr(weight, 2)} ${unitLabel} × ${reps} (tahmini 1RM ${fmtTr(Math.round(oneRm), 0)} ${unitLabel})`,
      });
    },
    [exercises, onCompleteSet, statsById, unitLabel, weightUnit]
  );

  return (
    <div className="space-y-2">
      {exercises.map((exercise, exerciseIndex) => {
        const isTimedExercise = exercise.modality
          ? exercise.modality === 'duration' ||
            exercise.modality === 'duration_distance'
          : exercise.sets.some(
              (set) => set.duration != null && set.reps == null
            );
        const completedSets = exercise.sets.filter(
          (set) => set.completed
        ).length;
        const totalSets = exercise.sets.length;
        const isComplete = totalSets > 0 && completedSets === totalSets;
        const exerciseKey = `${exercise.exercise_id}-${exerciseIndex}`;
        const isExpanded =
          !isComplete || expandedCompletedExercises[exerciseKey] === true;
        const exerciseImages = filterValidExerciseImages(
          exercise.images ?? (exercise.image_url ? [exercise.image_url] : [])
        ).map((image) => resolveExerciseImageSrc(image));
        const toggleLabel = isExpanded
          ? t('common.collapse', 'Collapse')
          : t('common.expand', 'Expand');
        const previousSets = previousWorkingSets(exercise.exercise_id);
        const hasPrevious = previousSets.length > 0;

        return (
          <Card
            key={`${exercise.exercise_id}-${exerciseIndex}`}
            className={`shadow-none ${
              isComplete
                ? 'border-emerald-500/40 dark:border-emerald-400/40'
                : 'border-border/70'
            }`}
          >
            <CardHeader className="px-3 py-2">
              <div className="flex items-start gap-3">
                {exerciseImages.length > 0 && (
                  <button
                    type="button"
                    className="shrink-0 overflow-hidden rounded-lg"
                    aria-label={t(
                      'exercise.workoutPlaybackPage.viewImages',
                      'View {{name}} images',
                      { name: exercise.exercise_name }
                    )}
                    onClick={() =>
                      setImageViewer({
                        images: exerciseImages,
                        title: exercise.exercise_name,
                      })
                    }
                  >
                    <img
                      src={exerciseImages[0]}
                      alt=""
                      className="h-12 w-12 object-cover"
                      loading="lazy"
                    />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug">
                    {exercise.exercise_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'exercise.workoutPlaybackPage.sets',
                      '{{completedSets}}/{{totalSets}} sets',
                      { completedSets, totalSets }
                    )}
                  </p>
                  {statsById[exercise.exercise_id]?.bestSet && (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                      <Trophy className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      <span>
                        En iyi:{' '}
                        {formatSet(statsById[exercise.exercise_id]!.bestSet!)}
                        {(() => {
                          const best =
                            statsById[exercise.exercise_id]!.bestSet!;
                          const oneRm = estimateOneRepMax(
                            weightFromKg(Number(best.weight) || 0, weightUnit),
                            Number(best.reps) || 0
                          );
                          return oneRm > 0
                            ? ` · 1RM ≈ ${fmtTr(Math.round(oneRm), 0)} ${unitLabel}`
                            : '';
                        })()}
                      </span>
                    </p>
                  )}
                </div>
                {isComplete && (
                  <button
                    type="button"
                    className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-emerald-600 hover:bg-muted dark:text-emerald-400"
                    aria-label={`${toggleLabel} ${exercise.exercise_name}`}
                    aria-expanded={isExpanded}
                    onClick={() =>
                      setExpandedCompletedExercises((current) => ({
                        ...current,
                        [exerciseKey]: !current[exerciseKey],
                      }))
                    }
                  >
                    <Check className="h-4 w-4" />
                    {t('exercise.workoutPlaybackPage.completed', 'Completed')}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
            </CardHeader>
            {(exercise.adaptive || exercise.suggest_variation) && (
              <div className="px-3 pb-2">
                <AdaptiveSuggestionNotice
                  adaptive={exercise.adaptive ?? null}
                  suggestVariation={exercise.suggest_variation === true}
                  onDeclinedChange={
                    onAdaptiveDeclined
                      ? (declined) =>
                          onAdaptiveDeclined(exerciseIndex, declined)
                      : undefined
                  }
                  onSeeAlternatives={
                    onReplaceExercise
                      ? () => onReplaceExercise(exerciseIndex)
                      : undefined
                  }
                />
              </div>
            )}
            {isExpanded && (
              <CardContent className="px-2 pb-3 pt-0 sm:px-3">
                <div className="space-y-1.5">
                  {/* Column labels stay visible on phones too. */}
                  <div
                    className={`px-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                      isTimedExercise
                        ? WORKOUT_PLAYBACK_TIMED_SET_GRID_CLASSES
                        : WORKOUT_PLAYBACK_SET_GRID_CLASSES
                    }`}
                    aria-hidden="true"
                  >
                    <div className="px-1 leading-tight">
                      {t('exercise.workoutPlaybackPage.columnSet', 'Set')}
                      {hasPrevious && (
                        <span className="block text-[10px] font-medium normal-case tracking-normal">
                          önceki
                        </span>
                      )}
                    </div>
                    {isTimedExercise ? (
                      <div className="text-center">
                        {t('workout.durationSec', 'Duration (s)')}
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          {t('exercise.workoutPlaybackPage.columnReps', 'Reps')}
                        </div>
                        <div className="text-center">{unitLabel}</div>
                      </>
                    )}
                    <div />
                  </div>

                  {exercise.sets.map((set, setIndex) => {
                    return (
                      <WorkoutPlaybackSetRow
                        key={`${exercise.exercise_id}-${exerciseIndex}-${setIndex}`}
                        exerciseName={exercise.exercise_name}
                        exerciseKey={exerciseKey}
                        exerciseIndex={exerciseIndex}
                        setIndex={setIndex}
                        setNumber={set.set_number}
                        setType={set.set_type}
                        isTimedExercise={isTimedExercise}
                        reps={set.reps}
                        weight={set.weight}
                        duration={set.duration}
                        timerStartedAtMs={set.timer_started_at_ms ?? null}
                        restTime={set.rest_time}
                        notes={set.notes}
                        completed={set.completed}
                        isNotesVisible={
                          setNotesVisibility[`${exerciseKey}-${setIndex}`] ??
                          false
                        }
                        onToggleNotesVisibility={onToggleSetNotesVisibility}
                        onSelectSet={onSelectSet}
                        onCompleteSet={handleCompleteSet}
                        onUncompleteSet={onUncompleteSet}
                        onSetFieldChange={onSetFieldChange}
                        onOpenRestEditor={onOpenRestEditor}
                        onRemoveSet={onRemoveSet}
                        canRemove={exercise.sets.length > 1}
                        weightUnit={weightUnit}
                        canCalculatePlates={usesBarbell(exercise.equipment)}
                        onOpenPlateCalculator={setPlateTarget}
                        previousLabel={(() => {
                          const workingIndex = exercise.sets
                            .slice(0, setIndex)
                            .filter((s) => !isWarmupSetType(s.set_type)).length;
                          const match = isWarmupSetType(set.set_type)
                            ? undefined
                            : previousSets[workingIndex];
                          return match ? formatSetShort(match) : null;
                        })()}
                      />
                    );
                  })}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={t(
                      'diary.workoutPlaybackExercisesList.addSetFor',
                      'Add set for {{exercise_name}}',
                      { exercise_name: exercise.exercise_name }
                    )}
                    className="h-11 flex-1 gap-1.5"
                    onClick={() => onAddSet(exerciseIndex)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('exercise.workoutPlaybackPage.addSet', 'Add Set')}
                  </Button>
                  {findDropSetBaseIndex(exercise.sets) >= 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={t(
                        'exercise.workoutPlaybackPage.addDropSetsFor',
                        'Add drop sets for {{name}}',
                        { name: exercise.exercise_name }
                      )}
                      className="h-11 flex-1 gap-1.5"
                      onClick={() => onAddDropSets?.(exerciseIndex)}
                    >
                      <Plus className="h-4 w-4" />
                      {t(
                        'exercise.workoutPlaybackPage.addDropSets',
                        'Add {{sets}} Drop Sets (-{{percent}}%)',
                        {
                          sets: DEFAULT_DROP_SET_COUNT,
                          percent: DEFAULT_DROP_SET_PERCENT,
                        }
                      )}
                    </Button>
                  )}
                  {onReplaceExercise && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 gap-1.5 text-muted-foreground"
                      title={t(
                        'exercise.workoutPlaybackPage.replaceExercise',
                        'Replace exercise'
                      )}
                      aria-label={t(
                        'exercise.workoutPlaybackPage.replaceExerciseNamed',
                        'Replace {{name}}',
                        { name: exercise.exercise_name }
                      )}
                      onClick={() => onReplaceExercise(exerciseIndex)}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Değiştir
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
      {plateTarget != null && (
        <PlateCalculatorDialog
          open
          onOpenChange={(open) => {
            if (!open) setPlateTarget(null);
          }}
          weightKg={plateExercise?.sets[plateTarget.setIndex]?.weight}
          weightUnit={weightUnit}
          equipment={plateExercise?.equipment}
        />
      )}
      <ImageLightbox
        images={imageViewer?.images ?? []}
        open={imageViewer != null}
        onOpenChange={(open) => {
          if (!open) setImageViewer(null);
        }}
        title={imageViewer?.title}
      />
    </div>
  );
};

export default memo(WorkoutPlaybackExercisesList);
