import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtTr } from '@/utils/numberFormatting';
import { formatDayTr } from '@/utils/formatDay';
import { niceDomain } from '@/utils/chartUtils';

interface WeightTrendCardProps {
  /** One weight per day in kg, oldest first (last 30 days). */
  history: { date: string; weight: number }[];
}

const MONTHS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

/** "2026-10-31" -> "31 Eki". */
const shortDay = (day: string) => {
  const [, month, date] = day.split('-');
  return `${Number(date)} ${MONTHS[Number(month) - 1] ?? ''}`;
};

/** "−0,4 kg" with a real minus sign, "+0,7 kg", or "değişmedi". */
const signedKg = (diff: number) => {
  if (Math.abs(diff) < 0.05) return 'değişmedi';
  const sign = diff > 0 ? '+' : '−';
  return `${sign}${fmtTr(Math.abs(diff))} kg`;
};

/**
 * The last 30 days of weight on the Kilo & ölçüm page: the latest value, how
 * it moved since the previous weigh-in, and a small line once there are two
 * days to connect.
 */
export const WeightTrendCard = ({ history }: WeightTrendCardProps) => {
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const domain = useMemo(
    () => niceDomain(history.map((p) => p.weight)),
    [history]
  );

  if (!latest) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Kilo · son 30 gün</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {fmtTr(latest.weight)} kg
          </p>
          <p className="text-sm text-muted-foreground">
            {previous
              ? `Önceki ölçüme göre ${signedKg(latest.weight - previous.weight)} · ${formatDayTr(latest.date)}`
              : `İlk ölçümün · ${formatDayTr(latest.date)}`}
          </p>
        </div>
        {history.length >= 2 && domain && (
          <div className="h-40 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={history}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={domain.domain}
                  ticks={domain.ticks}
                  tickFormatter={(v: number) => fmtTr(v)}
                  fontSize={12}
                  width={44}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  trigger="click"
                  labelFormatter={(label) => formatDayTr(String(label))}
                  formatter={(value) => [`${fmtTr(Number(value))} kg`, 'Kilo']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
