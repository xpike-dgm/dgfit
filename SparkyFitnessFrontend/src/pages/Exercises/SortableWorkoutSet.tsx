import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/NumericInput';
import { UnitInput } from '@/components/ui/UnitInput';
import {
  GripVertical,
  Copy,
  Trash2,
  MoreHorizontal,
  MessageSquare,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  RIR_MAX,
  RIR_MIN,
  carryDistanceFromKm,
  carryDistanceToKm,
} from '@workspace/shared';
import { usePreferences } from '@/contexts/PreferencesContext';
import { SetFieldKey, SortableSetData } from '@/types/workout';
import SetTypeSelect from '@/components/Exercises/SetTypeSelect';
import {
  SET_TABLE_LAYOUT,
  SET_TYPE_SHORT_TR,
  SET_TYPE_STYLES,
  setRowGridClass,
  setTypeChoice,
  setTypeLabelTr,
  type SetMainField,
  type SetTableModality,
} from '@/constants/exercises';

interface SortableSetItemProps {
  id: string;
  set: SortableSetData;
  exerciseIndex: number;
  setIndex: number;
  onSetChange: (
    exerciseIndex: number,
    setIndex: number,
    field: SetFieldKey,
    value: string | number | null | undefined
  ) => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  weightUnit: string;
  modality: SetTableModality;
  /** Diary entries record RIR; presets don't, so they leave this off. */
  showRir?: boolean;
}

const fieldLabelClass = 'text-xs font-medium text-muted-foreground';

/**
 * One editable set. On a phone the row is "Set | Tekrar | kg | ⋯" with large
 * fields; type, RPE, RIR, duration, rest, note, copy and delete open under ⋯
 * (the old nine-column row was 589 px wide inside a 344 px dialog).
 */
export const SortableSetItem = React.memo(
  ({
    id,
    set,
    exerciseIndex,
    setIndex,
    onSetChange,
    onDuplicateSet,
    onRemoveSet,
    weightUnit,
    modality,
    showRir = false,
  }: SortableSetItemProps) => {
    const { t } = useTranslation();
    const { distanceUnit } = usePreferences();
    const [showMore, setShowMore] = useState(false);
    const [showNotes, setShowNotes] = useState(!!set.notes);
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({
        id,
      });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const layout = SET_TABLE_LAYOUT[modality];
    const { signedWeight } = layout;
    const setNumber = set.set_number ?? setIndex + 1;
    const typeChoice = setTypeChoice(set.set_type);
    const typeShort = SET_TYPE_SHORT_TR[typeChoice];
    // Isometric sets predating the duration column stored their hold in `reps`.
    const durationValue =
      set.duration ?? (modality === 'duration' ? (set.reps ?? null) : null);
    const durationIsMain = layout.main.includes('duration');

    const repsField = (className: string) => (
      <Input
        className={className}
        type="number"
        inputMode="numeric"
        placeholder="—"
        aria-label={`Set ${setNumber} ${t('workout.reps', 'Reps').toLowerCase()}`}
        value={set.reps ?? ''}
        onChange={(e) =>
          onSetChange(
            exerciseIndex,
            setIndex,
            'reps',
            e.target.value === '' ? undefined : Number(e.target.value)
          )
        }
      />
    );

    const durationField = (className: string) => (
      <NumericInput
        className={className}
        placeholder="—"
        decimals={0}
        step={1}
        aria-label={`Set ${setNumber} süre (sn)`}
        value={durationValue}
        onValueChange={(v) =>
          onSetChange(exerciseIndex, setIndex, 'duration', v ?? undefined)
        }
      />
    );

    const mainField = (field: SetMainField) => {
      const big = 'h-11 text-center text-base font-medium';
      switch (field) {
        case 'reps':
          return <div key={field}>{repsField(big)}</div>;
        case 'duration':
          return <div key={field}>{durationField(big)}</div>;
        case 'distance':
          return (
            <div key={field}>
              <NumericInput
                className={big}
                placeholder="—"
                decimals={1}
                step={1}
                aria-label={`Set ${setNumber} mesafe`}
                value={
                  set.distance != null
                    ? carryDistanceFromKm(set.distance, distanceUnit)
                    : null
                }
                onValueChange={(v) =>
                  onSetChange(
                    exerciseIndex,
                    setIndex,
                    'distance',
                    v == null ? undefined : carryDistanceToKm(v, distanceUnit)
                  )
                }
              />
            </div>
          );
        case 'weight':
          return (
            <div key={field} className="min-w-0">
              <UnitInput
                value={set.weight ?? ''}
                inputClassName={big}
                unit={weightUnit}
                type="weight"
                aria-label={`Set ${setNumber} ağırlık`}
                // Bodyweight: blank is body weight alone; + adds, − assists.
                placeholder={signedWeight ? '±0' : '—'}
                onChange={(v) =>
                  onSetChange(exerciseIndex, setIndex, 'weight', v)
                }
              />
            </div>
          );
      }
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex flex-col rounded-xl border border-border/60 bg-background"
        {...attributes}
      >
        <div className="flex items-center gap-1 px-1 py-1">
          {/* Drag handle */}
          <div
            {...listeners}
            className="flex h-11 w-5 shrink-0 cursor-grab items-center justify-center touch-none"
            aria-label="Sırayı değiştirmek için sürükle"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          </div>

          <div className={`${setRowGridClass(layout.main.length)} grow`}>
            <div
              className={cn(
                'flex h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold leading-none',
                typeShort
                  ? (SET_TYPE_STYLES[typeChoice] ?? 'bg-muted')
                  : 'bg-muted text-muted-foreground'
              )}
              title={setTypeLabelTr(typeChoice)}
            >
              {setNumber}
              {typeShort && (
                <span className="mt-0.5 text-[10px] font-bold">
                  {typeShort}
                </span>
              )}
            </div>

            {layout.main.map(mainField)}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-expanded={showMore}
              aria-label={`Set ${setNumber} seçenekleri`}
              onClick={() => setShowMore((open) => !open)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {showMore && (
          <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1 sm:col-span-1">
                <div className={fieldLabelClass}>Set türü</div>
                <SetTypeSelect
                  value={set.set_type}
                  ariaLabel={`Set ${setNumber} türü`}
                  onChange={(v) =>
                    onSetChange(exerciseIndex, setIndex, 'set_type', v)
                  }
                />
              </div>
              <label className="space-y-1">
                <span className={fieldLabelClass}>
                  {t('workout.rpe', 'RPE')} (1–10)
                </span>
                <Input
                  className="h-11"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  placeholder="—"
                  value={set.rpe ?? ''}
                  onChange={(e) =>
                    onSetChange(
                      exerciseIndex,
                      setIndex,
                      'rpe',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                />
              </label>
              {showRir && (
                <label className="space-y-1">
                  <span className={fieldLabelClass}>
                    {t('workout.rir', 'RIR')}
                  </span>
                  <Input
                    className="h-11"
                    type="number"
                    min={RIR_MIN}
                    max={RIR_MAX}
                    step="0.5"
                    placeholder="—"
                    aria-label={t('workout.rir', 'RIR')}
                    value={set.rir ?? ''}
                    onChange={(e) =>
                      onSetChange(
                        exerciseIndex,
                        setIndex,
                        'rir',
                        e.target.value === ''
                          ? null
                          : Math.min(
                              RIR_MAX,
                              Math.max(RIR_MIN, Number(e.target.value))
                            )
                      )
                    }
                  />
                </label>
              )}
              {!durationIsMain && (
                <div className="space-y-1">
                  <span className={fieldLabelClass}>Süre (sn)</span>
                  {durationField('h-11')}
                </div>
              )}
              <label className="space-y-1">
                <span className={fieldLabelClass}>Dinlenme (sn)</span>
                <Input
                  className="h-11"
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={set.rest_time ?? ''}
                  onChange={(e) =>
                    onSetChange(
                      exerciseIndex,
                      setIndex,
                      'rest_time',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-11 flex-1 gap-1.5',
                  (set.notes || showNotes) && 'border-primary'
                )}
                onClick={() => setShowNotes(!showNotes)}
              >
                <MessageSquare className="h-4 w-4" />
                Not
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 gap-1.5"
                onClick={() => onDuplicateSet(exerciseIndex, setIndex)}
              >
                <Copy className="h-4 w-4" />
                Kopyala
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 gap-1.5 text-destructive hover:text-destructive"
                aria-label={`Set ${setNumber} sil`}
                onClick={() => onRemoveSet(exerciseIndex, setIndex)}
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </Button>
            </div>
          </div>
        )}

        {/* Notes */}
        {showNotes && (
          <div className="px-3 pb-2">
            <Input
              className="h-11 text-sm"
              placeholder={t(
                'workout.notesPlaceholder',
                'Add a note for this set...'
              )}
              value={set.notes ?? ''}
              onChange={(e) =>
                onSetChange(exerciseIndex, setIndex, 'notes', e.target.value)
              }
            />
          </div>
        )}
      </div>
    );
  }
);
