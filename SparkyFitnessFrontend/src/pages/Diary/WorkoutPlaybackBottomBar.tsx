import { useTranslation } from 'react-i18next';
import { AlertTriangle, Flag, Pause, Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkoutPlaybackRestState } from '@/utils/workoutPlayback';
import { formatSecondsClock } from '@/utils/timeFormatters';

interface WorkoutPlaybackBottomBarProps {
  restState: WorkoutPlaybackRestState;
  restRemainingSeconds: number;
  restDurationSeconds: number;
  completedSets: number;
  totalSets: number;
  isSaving: boolean;
  saveError: string | null;
  onPauseResumeRest: () => void;
  onSkipRest: () => void;
  onAddRest: (seconds: number) => void;
  onFinishWorkout: () => void;
}

/**
 * Sticky bottom of the live player, above the phone tab bar: while resting a
 * big countdown with +15 sn / Atla, and always the "Antrenmanı bitir" button,
 * so neither scrolls away during a long workout.
 */
const WorkoutPlaybackBottomBar = ({
  restState,
  restRemainingSeconds,
  restDurationSeconds,
  completedSets,
  totalSets,
  isSaving,
  saveError,
  onPauseResumeRest,
  onSkipRest,
  onAddRest,
  onFinishWorkout,
}: WorkoutPlaybackBottomBarProps) => {
  const { t } = useTranslation();
  const isResting = restState !== 'idle';
  const progress =
    restDurationSeconds > 0
      ? Math.min(
          100,
          Math.max(0, (restRemainingSeconds / restDurationSeconds) * 100)
        )
      : 0;

  return (
    <div
      data-testid="workout-bottom-bar"
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 pb-6 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:bottom-0 sm:pb-3"
    >
      <div className="mx-auto w-full max-w-5xl space-y-2">
        {saveError && (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {isResting && (
          <div
            className="relative overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/30"
            role="timer"
            aria-label="Dinlenme"
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
            <div className="relative flex items-center gap-2 px-2 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label={
                  restState === 'running'
                    ? t('common.pause', 'Pause')
                    : t('common.resume', 'Resume')
                }
                onClick={onPauseResumeRest}
              >
                {restState === 'running' ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {restState === 'paused' ? 'Dinlenme duraklatıldı' : 'Dinlen'}
                </div>
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {formatSecondsClock(restRemainingSeconds)}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 px-3 tabular-nums"
                onClick={() => onAddRest(15)}
              >
                +15 sn
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 gap-1 px-3"
                aria-label={t('common.skip', 'Skip')}
                onClick={onSkipRest}
              >
                <SkipForward className="h-4 w-4" />
                Atla
              </Button>
            </div>
          </div>
        )}

        <Button
          type="button"
          className="h-12 w-full gap-2 text-base font-semibold"
          onClick={onFinishWorkout}
          disabled={isSaving}
          aria-label={
            isSaving
              ? t('exercise.workoutPlaybackDialog.finishing', 'Saving...')
              : t('exercise.workoutPlaybackDialog.finish', 'Finish Workout')
          }
        >
          <Flag className="h-5 w-5" />
          {isSaving
            ? t('exercise.workoutPlaybackDialog.finishing', 'Saving...')
            : t('exercise.workoutPlaybackDialog.finish', 'Finish Workout')}
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium tabular-nums">
            {completedSets}/{totalSets} set
          </span>
        </Button>
      </div>
    </div>
  );
};

export default WorkoutPlaybackBottomBar;
