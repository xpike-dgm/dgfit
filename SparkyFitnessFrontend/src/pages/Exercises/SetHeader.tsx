import { useTranslation } from 'react-i18next';
import {
  SET_TABLE_LAYOUT,
  setRowGridClass,
  type SetMainField,
  type SetTableModality,
} from '@/constants/exercises';
import { usePreferences } from '@/contexts/PreferencesContext';
import { carryDistanceUnitLabel } from '@workspace/shared';

interface SetColumnHeadersProps {
  modality: SetTableModality;
  /** Kept for callers; RIR now lives in each set's ⋯ panel. */
  showRir?: boolean;
}

/** Column labels over the set rows: "Set | Tekrar | kg". */
export const SetColumnHeaders = ({ modality }: SetColumnHeadersProps) => {
  const { t } = useTranslation();
  const { distanceUnit, weightUnit } = usePreferences();
  const layout = SET_TABLE_LAYOUT[modality];
  const weightLabel = weightUnit === 'kg' ? 'kg' : 'lb';

  const label = (field: SetMainField): string => {
    switch (field) {
      case 'reps':
        return t('workout.reps', 'Reps');
      case 'weight':
        return layout.signedWeight ? `± ${weightLabel}` : weightLabel;
      case 'distance':
        return carryDistanceUnitLabel(distanceUnit);
      case 'duration':
        return t('workout.durationSec', 'Duration (s)');
    }
  };

  return (
    <div className="mb-0.5 flex items-center gap-1 px-1" aria-hidden="true">
      {/* spacer for the drag handle */}
      <div className="w-5 shrink-0" />
      <div
        className={`${setRowGridClass(layout.main.length)} grow text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`}
      >
        <div className="text-center">Set</div>
        {layout.main.map((field) => (
          <div key={field} className="truncate text-center">
            {label(field)}
          </div>
        ))}
        <div />
      </div>
    </div>
  );
};
