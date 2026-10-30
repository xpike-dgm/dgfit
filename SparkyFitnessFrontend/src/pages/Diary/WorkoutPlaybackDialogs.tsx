import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { WorkoutSetPointer } from '@/utils/workoutPlayback';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { formatRestTr } from '@/utils/workoutPlayback';

const REST_PRESETS = [30, 45, 60, 90, 120, 180, 300];
const MIN_REST_SECONDS = 15;
const MAX_REST_SECONDS = 900;

interface WorkoutPlaybackDialogsProps {
  restEditorPointer: WorkoutSetPointer | null;
  restEditorCustomValue: string;
  onCloseRestEditor: () => void;
  onUpdateRestForPointer: (seconds: number, applyToExercise?: boolean) => void;
  onSetRestEditorCustomValue: (value: string) => void;
  onSaveCustomRest: (applyToExercise?: boolean) => void;
  isDiscardDialogOpen: boolean;
  onDiscardDialogChange: (open: boolean) => void;
  onConfirmDiscard: () => void;
}

const WorkoutPlaybackDialogs = ({
  restEditorPointer,
  restEditorCustomValue,
  onCloseRestEditor,
  onUpdateRestForPointer,
  onSetRestEditorCustomValue,
  onSaveCustomRest,
  isDiscardDialogOpen,
  onDiscardDialogChange,
  onConfirmDiscard,
}: WorkoutPlaybackDialogsProps) => {
  const { t } = useTranslation();
  // Also set the rest for the exercise's remaining sets.
  const [applyToExercise, setApplyToExercise] = useState(true);

  return (
    <>
      <Dialog
        open={!!restEditorPointer}
        onOpenChange={(open) => !open && onCloseRestEditor()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('exercise.workoutPlaybackPage.restEditorTitle', 'Edit Rest')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'exercise.workoutPlaybackPage.restEditorDescription',
                'Pick a rest duration for this set.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {REST_PRESETS.map((seconds) => (
                <Button
                  key={seconds}
                  type="button"
                  variant="outline"
                  className="h-11 tabular-nums"
                  onClick={() =>
                    onUpdateRestForPointer(seconds, applyToExercise)
                  }
                >
                  {formatRestTr(seconds)}
                </Button>
              ))}
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <label htmlFor="rest-apply-all" className="text-sm">
                Bu hareketin kalan setlerine de uygula
              </label>
              <Switch
                id="rest-apply-all"
                checked={applyToExercise}
                onCheckedChange={setApplyToExercise}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="custom-rest-seconds"
              >
                {t(
                  'exercise.workoutPlaybackPage.customRest',
                  'Custom (seconds)'
                )}
              </label>
              <Input
                id="custom-rest-seconds"
                type="number"
                inputMode="numeric"
                className="h-11"
                min={MIN_REST_SECONDS}
                max={MAX_REST_SECONDS}
                step={5}
                value={restEditorCustomValue}
                onChange={(event) =>
                  onSetRestEditorCustomValue(event.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCloseRestEditor}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => onSaveCustomRest(applyToExercise)}
            >
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={isDiscardDialogOpen}
        onOpenChange={onDiscardDialogChange}
        onConfirm={onConfirmDiscard}
        title="Antrenman silinsin mi?"
        description={t(
          'exercise.workoutPlaybackDialog.discardConfirm',
          'Discard this in-progress workout? This cannot be undone.'
        )}
        variant="destructive"
        confirmLabel="Sil"
      />
    </>
  );
};

export default WorkoutPlaybackDialogs;
