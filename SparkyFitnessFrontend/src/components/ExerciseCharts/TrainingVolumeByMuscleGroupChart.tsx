import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { localizeMuscle } from '@/utils/exerciseTaxonomy';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrainingVolumeByMuscleGroupChartProps {
  data: { muscle: string; volume: number }[];
  weightUnit: string;
}

export const TrainingVolumeByMuscleGroupChart = ({
  data,
  weightUnit,
}: TrainingVolumeByMuscleGroupChartProps) => {
  const { t } = useTranslation();
  const chartData = [...data]
    .sort((a, b) => b.volume - a.volume)
    .map((row) => ({ ...row, muscle: localizeMuscle(t, row.muscle) }));
  const height = Math.min(420, Math.max(180, chartData.length * 32));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t(
            'exerciseReportsDashboard.trainingVolumeByMuscleGroup',
            'Training Volume by Muscle Group'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
            debounce={100}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value: number) =>
                  Math.round(value).toLocaleString('tr-TR')
                }
              />
              <YAxis
                type="category"
                dataKey="muscle"
                width={88}
                interval={0}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                formatter={(value: unknown) => [
                  `${Math.round(Number(value) || 0).toLocaleString('tr-TR')} ${weightUnit}`,
                  t('exerciseReportsDashboard.volumeCurrent', 'Volume'),
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderRadius: 12,
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <Bar
                dataKey="volume"
                fill="hsl(var(--primary))"
                isAnimationActive={false}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
