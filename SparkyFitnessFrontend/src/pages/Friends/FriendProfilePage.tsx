import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Dumbbell,
  Flame,
  Lock,
  Ruler,
  Scale,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCopyFriendProgram,
  useFriendExerciseHistory,
  useFriendProfile,
} from '@/hooks/Dgfit/useFriends';
import { UserAvatar } from './UserAvatar';

const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const shortDate = (date: string) =>
  format(new Date(date), 'd MMM', { locale: tr });

const Hidden = ({ label }: { label: string }) => (
  <p className="flex items-center gap-2 text-sm text-muted-foreground">
    <Lock className="h-4 w-4" /> {label} paylaşılmıyor.
  </p>
);

const ExerciseHistoryChart = ({
  userId,
  exerciseId,
}: {
  userId: string;
  exerciseId: string;
}) => {
  const { data = [] } = useFriendExerciseHistory(userId, exerciseId);
  if (data.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        Grafik için en az iki antrenman gerekli.
      </p>
    );
  }
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((d) => ({ ...d, label: shortDate(d.date) }))}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={32} domain={['auto', 'auto']} />
          <Tooltip
            formatter={(value, name) => [
              `${value} kg`,
              name === 'e1rm_kg' ? 'Tahmini 1RM' : 'Ağırlık',
            ]}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="weight_kg"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="e1rm_kg"
            stroke="#f59e0b"
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const FriendProfilePage = () => {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { data: profile, isLoading, error } = useFriendProfile(userId);
  const copyProgram = useCopyFriendProgram();
  const [openLift, setOpenLift] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  }
  if (error || !profile) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate('/arkadaslar')}>
          <ArrowLeft className="h-4 w-4" /> Arkadaşlar
        </Button>
        <p className="text-sm text-muted-foreground">
          Bu profili göremiyorsun.
        </p>
      </div>
    );
  }

  const { user, privacy } = profile;
  const weights = profile.weights ?? [];
  const latestWeight = weights.at(-1);
  // Compared with the first weigh-in of the 30 days before the latest one.
  const monthAgo = latestWeight
    ? weights.find(
        (w) =>
          new Date(w.date).getTime() >=
          new Date(latestWeight.date).getTime() - 30 * 86_400_000
      )
    : undefined;
  const change =
    latestWeight && monthAgo
      ? Math.round((latestWeight.weight_kg - monthAgo.weight_kg) * 10) / 10
      : null;
  const nutrition = profile.nutrition ?? [];
  const avgCalories = nutrition.length
    ? Math.round(
        nutrition.reduce((sum, d) => sum + d.calories, 0) / nutrition.length
      )
    : null;

  return (
    <div className="space-y-4 pb-4">
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() => navigate('/arkadaslar')}
      >
        <ArrowLeft className="h-4 w-4" /> Arkadaşlar
      </Button>

      <div className="flex items-center gap-4">
        <UserAvatar user={user} className="h-16 w-16 text-xl" />
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {user.name}
          </h2>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>

      {/* Weight */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5 text-primary" /> Kilo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!privacy.share_weight ? (
            <Hidden label="Kilo" />
          ) : weights.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kilo kaydı yok.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">
                  {latestWeight?.weight_kg} kg
                </span>
                {change !== null && (
                  <span
                    className={`text-sm ${change <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}
                  >
                    {change > 0 ? '+' : ''}
                    {change} kg / 30 gün
                  </span>
                )}
              </div>
              {weights.length > 1 && (
                <div className="mt-3 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weights.map((w) => ({
                        ...w,
                        label: shortDate(w.date),
                      }))}
                    >
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        width={32}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} kg`, 'Kilo']}
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight_kg"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
          {privacy.share_measurements && profile.measurements && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <Ruler className="h-4 w-4" />
              {profile.measurements.waist && (
                <span>Bel {Number(profile.measurements.waist)} cm</span>
              )}
              {profile.measurements.body_fat_percentage && (
                <span>
                  Yağ %{Number(profile.measurements.body_fat_percentage)}
                </span>
              )}
              {profile.measurements.muscle_mass_kg && (
                <span>
                  Kas {Number(profile.measurements.muscle_mass_kg)} kg
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-5 w-5 text-primary" /> Beslenme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!privacy.share_nutrition ? (
            <Hidden label="Beslenme" />
          ) : nutrition.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Son iki haftada kayıt yok.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Son {nutrition.length} gün ortalaması:{' '}
                <span className="font-semibold text-foreground">
                  {avgCalories} kcal
                </span>
              </p>
              {nutrition.slice(0, 5).map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                >
                  <span>{shortDate(day.date)}</span>
                  <span className="font-semibold">{day.calories} kcal</span>
                  <span className="text-xs text-muted-foreground">
                    P {day.protein} · K {day.carbs} · Y {day.fat}
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Best lifts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-amber-500" /> En iyi kaldırışlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!privacy.share_workouts ? (
            <Hidden label="Antrenmanlar" />
          ) : (profile.best_lifts ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
          ) : (
            profile.best_lifts!.map((lift) => (
              <div key={lift.exercise_id} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  onClick={() =>
                    setOpenLift(
                      openLift === lift.exercise_id ? null : lift.exercise_id
                    )
                  }
                >
                  <span className="min-w-0 flex-1 truncate">
                    {lift.exercise_name}
                  </span>
                  <span className="font-semibold">
                    {lift.weight_kg} kg × {lift.reps}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    1RM≈{lift.e1rm_kg}
                  </span>
                </button>
                {openLift === lift.exercise_id && (
                  <div className="px-3 pb-3">
                    <ExerciseHistoryChart
                      userId={userId}
                      exerciseId={lift.exercise_id}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent workouts */}
      {privacy.share_workouts && (profile.workouts ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="h-5 w-5 text-primary" /> Son antrenmanlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.workouts!.map((w, i) => (
              <div
                key={`${w.date}-${i}`}
                className="rounded-lg bg-muted/40 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{w.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {shortDate(w.date)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {w.set_count} set · {w.volume_kg.toLocaleString('tr-TR')} kg
                  {w.has_pr ? ' · 🏆 PR' : ''}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Programs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" /> Programları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!privacy.share_programs ? (
            <Hidden label="Programlar" />
          ) : (profile.programs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Programı yok.</p>
          ) : (
            profile.programs!.map((plan) => (
              <div key={plan.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">
                    {plan.plan_name}
                    {plan.is_active && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                        aktif
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={copyProgram.isPending}
                    onClick={() =>
                      copyProgram.mutate({ userId, planId: plan.id })
                    }
                  >
                    <Copy className="h-4 w-4" /> Kopyala
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {plan.days.map((day, i) => (
                    <span
                      key={`${day.day_of_week}-${i}`}
                      className="rounded-md bg-muted px-2 py-1 text-xs"
                    >
                      <span className="font-semibold">
                        {DAY_SHORT[day.day_of_week] ?? ''}
                      </span>{' '}
                      {day.name}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FriendProfilePage;
