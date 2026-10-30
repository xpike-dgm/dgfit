import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  LogOut,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/TimeInput';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  instantHourMinute,
  userHourMinute,
  WORKOUT_LOCATION_MAX_LENGTH,
} from '@workspace/shared';
import { useWorkoutLocations } from '@/hooks/Exercises/useExerciseEntries';
import {
  formatWorkoutDurationTr,
  type WorkoutPlaybackDraft,
  type WorkoutPlaybackStats,
} from '@/utils/workoutPlayback';
import { fmtTr } from '@/utils/numberFormatting';

interface WorkoutPlaybackSummaryProps {
  draft: WorkoutPlaybackDraft;
  elapsedSeconds: number;
  totalVolume: number;
  stats: WorkoutPlaybackStats | null;
  timezone: string;
  /** Unit label for the volume tile ("kg" / "lb"). */
  volumeUnit: string;
  onCloseKeepDraft: () => void;
  onDiscard: () => void;
  onSessionNotesChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
}

/**
 * Top of the live player: back (the draft stays on the phone), a ⋯ menu that
 * holds the destructive "delete this workout", three stat tiles with units and
 * the rarely needed start time / gym / note fields folded away so the first
 * set is near the top of the screen. Rest and Finish live in the sticky
 * bottom bar.
 */
const WorkoutPlaybackSummary = ({
  draft,
  elapsedSeconds,
  totalVolume,
  stats,
  timezone,
  volumeUnit,
  onCloseKeepDraft,
  onDiscard,
  onSessionNotesChange,
  onLocationChange,
  onStartTimeChange,
}: WorkoutPlaybackSummaryProps) => {
  const { t } = useTranslation();
  const { data: locationSuggestions = [] } = useWorkoutLocations();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const startTime = (() => {
    if (!draft.started_at) return '';
    try {
      const hm = instantHourMinute(draft.started_at, timezone);
      return `${String(hm.hour).padStart(2, '0')}:${String(hm.minute).padStart(2, '0')}`;
    } catch {
      return '';
    }
  })();

  const tiles = [
    {
      label: t('exercise.workoutPlaybackPage.elapsedTime', 'Duration'),
      value: formatWorkoutDurationTr(elapsedSeconds),
    },
    {
      label: t('exercise.workoutPlaybackPage.volume', 'Volume'),
      value: `${fmtTr(totalVolume, 1)} ${volumeUnit}`,
    },
    {
      label: t('exercise.workoutPlaybackPage.progress', 'Sets'),
      value: `${stats?.completedSets ?? 0}/${stats?.totalSets ?? 0}`,
    },
  ];

  const detailsSummary = [
    startTime ? `Başlangıç ${startTime}` : null,
    draft.location || null,
    draft.notes ? 'not var' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 gap-2 px-2"
          onClick={onCloseKeepDraft}
        >
          <ArrowLeft className="h-5 w-5" />
          {t('common.back', 'Back')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Antrenman seçenekleri"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[15rem]">
            <DropdownMenuItem className="py-3" onClick={onCloseKeepDraft}>
              <LogOut className="mr-2 h-4 w-4" />
              Çık, sonra devam et
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="py-3 text-destructive focus:text-destructive"
              onClick={onDiscard}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Antrenmanı sil (kaydetmeden)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h1 className="text-xl font-bold leading-tight">{draft.name}</h1>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex min-w-0 flex-col items-center justify-center rounded-xl bg-card px-1 py-2.5 text-center shadow-sm ring-1 ring-border/60"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {tile.label}
            </span>
            <span className="mt-0.5 truncate text-base font-semibold tabular-nums text-foreground">
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl ring-1 ring-border/60">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <span className="min-w-0">
            <span className="font-medium">Saat, salon ve not</span>
            {detailsSummary && (
              <span className="block truncate text-xs text-muted-foreground">
                {detailsSummary}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              detailsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {detailsOpen && (
          <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label id="startTime-label" className="text-sm">
                  {t('diary.workoutPlaybackSummary.startTime', 'Start Time')}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onStartTimeChange('')}
                    disabled={!startTime}
                    className="h-9 gap-1 text-muted-foreground"
                    title={t(
                      'diary.workoutPlaybackSummary.clearTime',
                      'Clear time'
                    )}
                  >
                    <X className="h-4 w-4" />
                    {t('diary.workoutPlaybackSummary.clear', 'Clear')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const { hour, minute } = userHourMinute(timezone);
                      onStartTimeChange(
                        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                      );
                    }}
                    className="h-9 gap-1"
                    title={t(
                      'diary.workoutPlaybackSummary.setToCurrentLocalTime',
                      'Set to current local time'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    {t('diary.workoutPlaybackSummary.now', 'Now')}
                  </Button>
                </div>
              </div>
              <TimeInput
                id="startTime"
                aria-labelledby="startTime-label"
                value={startTime}
                onChange={onStartTimeChange}
                className="h-11 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm">
                {t('exercise.workoutPlaybackDialog.location', 'Gym / Location')}
              </Label>
              <Input
                id="location"
                type="text"
                placeholder={t(
                  'exercise.workoutPlaybackDialog.locationPlaceholder',
                  'e.g., Downtown Equinox, Garage Gym'
                )}
                value={draft.location ?? ''}
                onChange={(e) => onLocationChange(e.target.value)}
                maxLength={WORKOUT_LOCATION_MAX_LENGTH}
                list="workout-location-suggestions"
                autoComplete="off"
                className="h-11 text-sm"
              />
              <datalist id="workout-location-suggestions">
                {locationSuggestions.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workout-notes" className="text-sm">
                {t('exercise.logExerciseEntryDialog.sessionNotes', 'Notes')}
              </Label>
              <Textarea
                id="workout-notes"
                value={draft.notes ?? ''}
                rows={2}
                className="resize-none text-sm"
                placeholder="Bu antrenmanla ilgili notların…"
                onChange={(event) => onSessionNotesChange(event.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutPlaybackSummary;
