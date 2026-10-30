import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatWeight } from '@/utils/numberFormatting';
import { ExerciseDashboardData } from '@/types/reports';

interface KeyStatsWidgetProps {
  data: ExerciseDashboardData;
  weightUnit: string;
}

function formatWholeWeight(kg: number, unit: string): string {
  if (unit === 'kg') return `${Math.round(kg).toLocaleString('tr-TR')} kg`;
  return formatWeight(kg, unit).replace(/\d+\.\d+/g, (value) =>
    String(Math.round(Number(value)))
  );
}

export const KeyStatsWidget = ({ data, weightUnit }: KeyStatsWidgetProps) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t(
            'exerciseReportsDashboard.overallPerformanceSnapshot',
            'Overall Performance Snapshot'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
          <span className="text-xl font-bold text-foreground">
            {formatNumber(data.keyStats.totalWorkouts)}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            {t('exerciseReportsDashboard.totalWorkouts', 'Total Workouts')}
          </span>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
          <span className="text-xl font-bold text-foreground">
            {formatWholeWeight(data.keyStats.totalVolume, weightUnit)}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            {t('exerciseReportsDashboard.totalVolume', 'Total Volume')}
          </span>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
          <span className="text-xl font-bold text-foreground">
            {formatNumber(data.keyStats.totalReps)}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">
            {t('exerciseReportsDashboard.totalReps', 'Total Reps')}
          </span>
        </div>
        {data.consistencyData && (
          <>
            <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
              <span className="text-xl font-bold text-foreground">
                {data.consistencyData.currentStreak}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {t(
                  'exerciseReportsDashboard.currentStreakDays',
                  'Current Streak (days)'
                )}
              </span>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
              <span className="text-xl font-bold text-foreground">
                {data.consistencyData.longestStreak}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {t(
                  'exerciseReportsDashboard.longestStreakDays',
                  'Longest Streak (days)'
                )}
              </span>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
              <span className="text-xl font-bold text-foreground">
                {data.consistencyData.weeklyFrequency.toLocaleString('tr-TR', {
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {t(
                  'exerciseReportsDashboard.weeklyFrequency',
                  'Weekly Frequency'
                )}
              </span>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-raised px-3.5 py-3">
              <span className="text-xl font-bold text-foreground">
                {data.consistencyData.monthlyFrequency.toLocaleString('tr-TR', {
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {t(
                  'exerciseReportsDashboard.monthlyFrequency',
                  'Monthly Frequency'
                )}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
