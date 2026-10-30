import { useTranslation } from 'react-i18next';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { WeightUnit } from '@/contexts/PreferencesContext';
import {
  Check,
  Dumbbell,
  MessageSquare,
  MoreHorizontal,
  Play,
  Square,
  Timer,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UnitInput } from '@/components/ui/UnitInput';
import SetTypeSelect from '@/components/Exercises/SetTypeSelect';
import { cn } from '@/lib/utils';
import {
  SET_TYPE_SHORT_TR,
  SET_TYPE_STYLES,
  setTypeChoice,
  setTypeLabelTr,
} from '@/constants/exercises';
import {
  formatRestTr,
  WORKOUT_PLAYBACK_SET_GRID_CLASSES,
  WORKOUT_PLAYBACK_TIMED_SET_GRID_CLASSES,
  type WorkoutSetEditableField,
  type WorkoutSetPointer,
} from '@/utils/workoutPlayback';

function parseNullableInteger(raw: string): number | null {
  if (raw.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

interface WorkoutPlaybackSetRowProps {
  exerciseName: string;
  exerciseKey: string;
  exerciseIndex: number;
  setIndex: number;
  setNumber: number;
  setType: string | null | undefined;
  isTimedExercise: boolean;
  reps: number | null | undefined;
  weight: number | null | undefined;
  duration: number | null | undefined;
  /** Epoch ms the set's stopwatch started; null when not running. */
  timerStartedAtMs: number | null;
  restTime: number | null | undefined;
  notes: string | null | undefined;
  completed: boolean;
  isNotesVisible: boolean;
  onToggleNotesVisibility: (setKey: string) => void;
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
  canRemove: boolean;
  weightUnit: WeightUnit;
  /** Show the plate calculator action (barbell exercises). */
  canCalculatePlates?: boolean;
  /** What was done in this set last time, e.g. "60×10". */
  previousLabel?: string | null;
  onOpenPlateCalculator?: (pointer: WorkoutSetPointer) => void;
}

/**
 * One set in the live player, built for the gym floor: the whole left part
 * of the row (check circle, set number and last time's numbers) completes the
 * set in one tap, reps and weight are large fields under the exercise's
 * "Tekrar | kg" header, and the rarely used actions (type, rest, note, plate
 * calculator, delete) open under the ⋯ button.
 */
const WorkoutPlaybackSetRow = ({
  exerciseName,
  exerciseKey,
  exerciseIndex,
  setIndex,
  setNumber,
  setType,
  isTimedExercise,
  reps,
  weight,
  duration,
  timerStartedAtMs,
  restTime,
  notes,
  completed,
  isNotesVisible,
  onToggleNotesVisibility,
  onSelectSet,
  onCompleteSet,
  onUncompleteSet,
  onSetFieldChange,
  onOpenRestEditor,
  onRemoveSet,
  canRemove,
  weightUnit,
  canCalculatePlates = false,
  onOpenPlateCalculator,
  previousLabel = null,
}: WorkoutPlaybackSetRowProps) => {
  const { t } = useTranslation();
  const pointer: WorkoutSetPointer = useMemo(
    () => ({ exerciseIndex, setIndex }),
    [exerciseIndex, setIndex]
  );
  const notesKey = `${exerciseKey}-${setIndex}`;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const typeChoice = setTypeChoice(setType);
  const typeShort = SET_TYPE_SHORT_TR[typeChoice];

  // Timed/hold-set stopwatch. The start time lives on the draft (persisted),
  // so it survives re-renders and a reload; only the ticking display is local.
  const stopwatchStartedAt = timerStartedAtMs;
  const [stopwatchNowMs, setStopwatchNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (stopwatchStartedAt == null) return;
    const interval = window.setInterval(
      () => setStopwatchNowMs(Date.now()),
      500
    );
    return () => window.clearInterval(interval);
  }, [stopwatchStartedAt]);
  const stopwatchElapsedSec =
    stopwatchStartedAt != null
      ? Math.max(0, Math.floor((stopwatchNowMs - stopwatchStartedAt) / 1000))
      : 0;

  const handleToggleStopwatch = useCallback(() => {
    if (stopwatchStartedAt == null) {
      setStopwatchNowMs(Date.now());
      onSetFieldChange(pointer, 'timer_started_at_ms', Date.now());
      return;
    }
    const elapsed = Math.max(
      1,
      Math.floor((Date.now() - stopwatchStartedAt) / 1000)
    );
    onSetFieldChange(pointer, 'timer_started_at_ms', null);
    onSetFieldChange(pointer, 'duration', elapsed);
    // Hand the pre-filled cell back so the time can be corrected.
    window.setTimeout(() => {
      document
        .getElementById(`set-duration-${exerciseIndex}-${setIndex}`)
        ?.focus();
    }, 0);
  }, [stopwatchStartedAt, onSetFieldChange, pointer, exerciseIndex, setIndex]);

  const selectThisSet = () => onSelectSet(pointer);

  return (
    <div
      className={cn(
        'rounded-xl border px-1.5 py-1 transition-colors',
        completed
          ? 'border-emerald-500/50 bg-emerald-500/10 dark:border-emerald-400/50 dark:bg-emerald-400/15'
          : 'border-border/70 bg-background'
      )}
    >
      <div
        className={
          isTimedExercise
            ? WORKOUT_PLAYBACK_TIMED_SET_GRID_CLASSES
            : WORKOUT_PLAYBACK_SET_GRID_CLASSES
        }
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={t(
            'diary.workoutPlaybackSetRow.completeSet',
            'Complete set {{setNumber}}',
            { setNumber }
          )}
          onClick={() =>
            completed ? onUncompleteSet(pointer) : onCompleteSet(pointer)
          }
          className="flex h-12 min-w-0 items-center gap-2 rounded-lg px-1 text-left transition-colors hover:bg-muted/60 active:scale-[0.98]"
        >
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
              completed
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-primary/60 text-transparent'
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {setNumber}
              {typeShort && (
                <span
                  title={setTypeLabelTr(typeChoice)}
                  className={cn(
                    'rounded px-1 text-[10px] font-bold',
                    SET_TYPE_STYLES[typeChoice] ??
                      'bg-muted text-muted-foreground'
                  )}
                >
                  {typeShort}
                </span>
              )}
            </span>
            {previousLabel && (
              <span
                className="truncate text-[11px] text-muted-foreground"
                title="Geçen sefer"
              >
                {previousLabel}
              </span>
            )}
          </span>
        </button>

        {isTimedExercise ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Input
              id={`set-duration-${exerciseIndex}-${setIndex}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              aria-label={t(
                'workout.durationSet',
                'Duration set {{setNumber}}',
                { setNumber }
              )}
              value={
                stopwatchStartedAt != null
                  ? stopwatchElapsedSec
                  : (duration ?? '')
              }
              readOnly={stopwatchStartedAt != null}
              onFocus={selectThisSet}
              onChange={(event) =>
                onSetFieldChange(
                  pointer,
                  'duration',
                  parseNullableInteger(event.target.value)
                )
              }
              placeholder="sn"
              className="h-11 w-full text-center text-base"
            />
            {!completed && (
              <Button
                type="button"
                size="icon"
                variant={stopwatchStartedAt != null ? 'destructive' : 'outline'}
                className="h-11 w-11 shrink-0"
                onClick={handleToggleStopwatch}
                aria-label={
                  stopwatchStartedAt != null
                    ? t('workout.stopTimer', 'Stop stopwatch')
                    : t('workout.startTimer', 'Start stopwatch')
                }
              >
                {stopwatchStartedAt != null ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </Button>
            )}
          </div>
        ) : (
          <>
            <Input
              id={`set-reps-${exerciseIndex}-${setIndex}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              aria-label={t(
                'diary.workoutPlaybackSetRow.repsSet',
                'Reps set {{setNumber}}',
                { setNumber }
              )}
              value={reps ?? ''}
              onFocus={selectThisSet}
              onChange={(event) =>
                onSetFieldChange(
                  pointer,
                  'reps',
                  parseNullableInteger(event.target.value)
                )
              }
              placeholder="—"
              className="h-11 w-full text-center text-base font-medium"
            />
            <div className="min-w-0" onFocus={selectThisSet}>
              <UnitInput
                id={`set-weight-${exerciseIndex}-${setIndex}`}
                value={weight ?? ''}
                unit={weightUnit}
                type="weight"
                placeholder="—"
                onChange={(value) => onSetFieldChange(pointer, 'weight', value)}
                inputClassName="h-11 text-center text-base font-medium"
                aria-label={t(
                  'diary.workoutPlaybackSetRow.weightSet',
                  'Weight set {{setNumber}}',
                  { setNumber }
                )}
              />
            </div>
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          aria-expanded={optionsOpen}
          aria-label={`Set ${setNumber} seçenekleri`}
          onClick={() => setOptionsOpen((open) => !open)}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {optionsOpen && (
        <div className="grid grid-cols-2 gap-2 border-t border-border/60 px-1 pb-1 pt-2">
          <SetTypeSelect
            value={setType}
            ariaLabel={t(
              'diary.workoutPlaybackSetRow.typeSet',
              'Type set {{setNumber}}',
              { setNumber }
            )}
            onChange={(value) => onSetFieldChange(pointer, 'set_type', value)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-2 px-3 text-sm"
            aria-label={t(
              'diary.workoutPlaybackSetRow.editRestForSet',
              'Edit rest for set {{setNumber}}',
              { setNumber }
            )}
            onClick={() => onOpenRestEditor(pointer)}
          >
            <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{formatRestTr(restTime)}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-2 px-3 text-sm"
            aria-label={t(
              'diary.workoutPlaybackSetRow.toggleNotesForSet',
              'Toggle notes for set {{setNumber}}',
              { setNumber }
            )}
            onClick={() => onToggleNotesVisibility(notesKey)}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            {notes ? 'Notu düzenle' : 'Not ekle'}
          </Button>
          {canCalculatePlates && !isTimedExercise && (
            <Button
              type="button"
              variant="outline"
              className="h-11 justify-start gap-2 px-3 text-sm"
              aria-label={t(
                'plates.openForSet',
                'Plate calculator for set {{setNumber}}',
                { setNumber }
              )}
              onClick={() => onOpenPlateCalculator?.(pointer)}
            >
              <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" />
              Plaka hesabı
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 justify-start gap-2 px-3 text-sm text-destructive hover:text-destructive"
            disabled={!canRemove}
            aria-label={t(
              'diary.workoutPlaybackSetRow.removeSetFor',
              'Remove set {{setNumber}} for {{exerciseName}}',
              { setNumber, exerciseName }
            )}
            onClick={() => {
              setOptionsOpen(false);
              onRemoveSet(pointer);
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Seti sil
          </Button>
        </div>
      )}

      {isNotesVisible && (
        <Textarea
          aria-label={t(
            'diary.workoutPlaybackSetRow.setNotes',
            'Set notes {{setNumber}}',
            { setNumber }
          )}
          value={notes ?? ''}
          onChange={(event) =>
            onSetFieldChange(pointer, 'notes', event.target.value)
          }
          placeholder={t(
            'workout.notesPlaceholder',
            'Add a note for this set...'
          )}
          className="mt-1 min-h-16 resize-none text-sm"
        />
      )}
    </div>
  );
};

export default memo(WorkoutPlaybackSetRow);
