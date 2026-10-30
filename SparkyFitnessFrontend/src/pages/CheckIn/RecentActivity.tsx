import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { Trash2, ClipboardList, Pencil } from 'lucide-react';

import { Timer, Activity } from 'lucide-react';
import {
  MeasurementUnit,
  usePreferences,
  WeightUnit,
} from '@/contexts/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { CombinedMeasurement } from '@/types/checkin';
import { fmtTr, formatWeight, formatHeight } from '@/utils/numberFormatting';
import { formatDayTr } from '@/utils/formatDay';
import { healthMetricLabel } from '@/utils/healthMetricLabels';

/** Turkish names for the standard check-in rows (stored as English keys). */
const STANDARD_NAMES: Record<string, string> = {
  Weight: 'Kilo',
  Neck: 'Boyun',
  Waist: 'Bel',
  Hips: 'Kalça',
  Height: 'Boy',
  Steps: 'Adım',
  'Body Fat %': 'Vücut yağı',
};

const UNIT_NAMES: Record<string, string> = { steps: 'adım' };

/** A number the Turkish way ("23,7"); text values pass through. */
const formatPlain = (raw: string | number, decimals: number): string => {
  const num = Number(raw);
  return raw === '' || Number.isNaN(num) ? String(raw) : fmtTr(num, decimals);
};

interface RecentActivityProps {
  convertMeasurement: (
    value: number,
    fromUnit: MeasurementUnit,
    toUnit: MeasurementUnit
  ) => number;
  convertWeight: (
    value: number,
    fromUnit: WeightUnit,
    toUnit: WeightUnit
  ) => number;
  handleDeleteMeasurementClick: (
    measurement: CombinedMeasurement
  ) => Promise<void>;
  recentMeasurements: CombinedMeasurement[];
  shouldConvertCustomMeasurement: (unit: string) => boolean;
  handleEditFastClick?: (measurement: CombinedMeasurement) => void;
  title?: string;
  description?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  handleDeleteMeasurementClick,
  recentMeasurements,
  shouldConvertCustomMeasurement,
  handleEditFastClick,
  title,
  description,
}) => {
  const {
    weightUnit: defaultWeightUnit,
    measurementUnit: defaultMeasurementUnit,
    measurementDecimalPlaces,
    formatDateInUserTimezone,
    formatTime,
  } = usePreferences();
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] =
    useState<CombinedMeasurement | null>(null);

  return (
    <>
      <Card className="border-t shadow-sm">
        <CardHeader className="bg-muted/10">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {title || t('checkIn.recentMeasurements', 'Recent Activity')}
          </CardTitle>
          <CardDescription>
            {description ||
              t(
                'checkIn.recentMeasurementsDescription',
                'Your latest logs including measurements, completed fasts, and synced health data.'
              )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentMeasurements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {t('checkIn.noRecentActivity', 'No recent activity found.')}
              </div>
            ) : (
              recentMeasurements.map((measurement) => {
                let displayString: string;
                let measurementName = measurement.display_name;

                if (
                  measurement.type === 'custom' &&
                  measurement.custom_categories
                ) {
                  measurementName = healthMetricLabel(
                    measurement.custom_categories.name,
                    measurement.custom_categories.display_name,
                    t
                  );
                  const isConvertible = shouldConvertCustomMeasurement(
                    measurement.custom_categories.measurement_type
                  );
                  if (isConvertible) {
                    const isWeight =
                      measurement.custom_categories.measurement_type === 'kg' ||
                      measurement.custom_categories.measurement_type ===
                        'lbs' ||
                      measurement.custom_categories.measurement_type ===
                        'st_lbs';
                    displayString = isWeight
                      ? formatWeight(
                          Number(measurement.value),
                          defaultWeightUnit
                        )
                      : formatHeight(
                          Number(measurement.value),
                          defaultMeasurementUnit
                        );
                  } else {
                    const unit =
                      measurement.custom_categories.measurement_type === 'N/A'
                        ? ''
                        : measurement.custom_categories.measurement_type;
                    const val = formatPlain(
                      measurement.value,
                      measurementDecimalPlaces
                    );
                    displayString = `${val} ${unit}`.trim();
                  }
                } else if (measurement.type === 'standard') {
                  measurementName =
                    STANDARD_NAMES[measurement.display_name] ??
                    measurement.display_name;
                  if (measurement.display_name === 'Weight') {
                    displayString = formatWeight(
                      Number(measurement.value),
                      defaultWeightUnit
                    );
                  } else if (
                    ['Neck', 'Waist', 'Hips', 'Height'].includes(
                      measurement.display_name
                    )
                  ) {
                    displayString = formatHeight(
                      Number(measurement.value),
                      defaultMeasurementUnit
                    );
                  } else {
                    const rawUnit =
                      measurement.display_unit === 'N/A'
                        ? ''
                        : measurement.display_unit || '';
                    const unit = UNIT_NAMES[rawUnit] ?? rawUnit;
                    const val = formatPlain(
                      measurement.value,
                      measurementDecimalPlaces
                    );
                    displayString = `${val} ${unit}`.trim();
                  }
                } else if (measurement.type === 'stress') {
                  measurementName = t('checkIn.stressLevel', 'Stress Level');
                  displayString = `${measurement.value} ${t('checkIn.level', 'level')}`;
                } else if (measurement.type === 'exercise') {
                  measurementName =
                    measurement.exercise_name ||
                    t('checkIn.exercise', 'Exercise');
                  displayString = `${measurement.duration_minutes?.toFixed(0) || 0} min / ${measurement.calories_burned?.toFixed(0) || 0} kcal`;
                } else if (measurement.type === 'fasting') {
                  displayString = measurement.duration_minutes
                    ? `${Math.floor(measurement.duration_minutes / 60)}h ${measurement.duration_minutes % 60}m`
                    : '0h 0m';
                } else {
                  const unit =
                    measurement.display_unit === 'N/A'
                      ? ''
                      : measurement.display_unit || '';
                  const val = formatPlain(measurement.value, 0);
                  displayString = `${val} ${unit}`.trim();
                }

                // The saved time only belongs to the row when it was saved
                // on the measured day; an edit made later would mislead.
                const day = String(measurement.entry_date).slice(0, 10);
                const showTime =
                  !!measurement.entry_timestamp &&
                  formatDateInUserTimezone(
                    measurement.entry_timestamp,
                    'yyyy-MM-dd'
                  ) === day;

                return (
                  <div
                    key={measurement.id}
                    className="flex items-center justify-between gap-2 py-2 pl-4 pr-2 hover:bg-muted/5 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${measurement.type === 'fasting' ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'}`}
                      >
                        {measurement.type === 'fasting' ? (
                          <Timer className="w-4 h-4" />
                        ) : (
                          <ClipboardList className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {measurement.type === 'fasting'
                            ? measurement.fasting_type
                            : measurementName}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDayTr(day)}
                          {showTime
                            ? ` ${formatTime(measurement.entry_timestamp)}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-semibold tabular-nums text-right">
                      {measurement.type === 'fasting' ? (
                        <span className="text-orange-600">{displayString}</span>
                      ) : (
                        <span>{displayString}</span>
                      )}
                      {(measurement.type === 'custom' ||
                        measurement.type === 'standard' ||
                        measurement.type === 'stress' ||
                        measurement.type === 'exercise') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${measurementName} kaydını sil`}
                          className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDelete(measurement)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {measurement.type === 'fasting' && (
                        <>
                          {handleEditFastClick && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Düzenle"
                              className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditFastClick(measurement)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Sil"
                            className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDelete(measurement)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Bu kayıt silinsin mi?"
        description="Silinen ölçüm geri alınamaz."
        variant="destructive"
        confirmLabel="Sil"
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void handleDeleteMeasurementClick(target);
        }}
      />
    </>
  );
};
