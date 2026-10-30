import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  Dumbbell,
  Minus,
  Moon,
  Play,
  Plus,
  Scale,
  Sparkles,
  Trophy,
  WifiOff,
} from 'lucide-react';
import {
  entryCaloriesCounted,
  todayInZone,
  type ExerciseSessionResponse,
} from '@workspace/shared';
import DatePill from '@/components/DatePill';
import { Button } from '@/components/ui/button';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import { useChatbotVisibility } from '@/contexts/ChatbotVisibilityContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useDailySummary } from '@/hooks/Diary/useDailyProgress';
import { useMealTypes } from '@/hooks/Diary/useMealTypes';
import { useFeed } from '@/hooks/Dgfit/useFriends';
import { useWorkoutPlanTemplates } from '@/hooks/Exercises/useWorkoutPlans';
import { useStartPlanSession } from '@/hooks/Exercises/useStartPlanSession';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/pages/Friends/UserAvatar';
import { useOnlineStatus } from '@/layouts/useOnlineStatus';
import { fmtTr, fmtTrUnit } from '@/utils/numberFormatting';
import { timeAgo } from '@/utils/timeAgo';
import type { WorkoutPlanTemplate } from '@/types/workout';
import {
  CalorieRingCard,
  MacroBar,
  ProgressRow,
  SparkyCard,
  SparkyCardHeader,
} from './DashboardCards';
import { useQuickWater } from '@/hooks/Dashboard/useQuickWater';

type Nutrient = 'protein' | 'carbs' | 'fat' | 'dietary_fiber';

const MACROS: { key: Nutrient; label: string; colorClass: string }[] = [
  { key: 'protein', label: 'Protein', colorClass: 'bg-protein' },
  { key: 'carbs', label: 'Karb.', colorClass: 'bg-carbs' },
  { key: 'fat', label: 'Yağ', colorClass: 'bg-fat' },
  { key: 'dietary_fiber', label: 'Lif', colorClass: 'bg-fiber' },
];

const sessionStats = (sessions: ExerciseSessionResponse[]) => {
  let minutes = 0;
  let calories = 0;
  for (const session of sessions) {
    if (session.type === 'preset') {
      minutes += session.total_duration_minutes;
      calories += session.exercises.reduce(
        (sum, e) => sum + entryCaloriesCounted(e),
        0
      );
    } else if (session.exercise_snapshot?.name !== 'Active Calories') {
      minutes += session.duration_minutes ?? 0;
      calories += entryCaloriesCounted(session);
    }
  }
  return { minutes, calories };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { timezone } = usePreferences();
  const { user } = useAuth();
  const { activeUserId } = useActiveUser();
  const userId = activeUserId || user?.id;
  const { openChat } = useChatbotVisibility();

  const today = todayInZone(timezone);
  const date = searchParams.get('date') ?? today;
  const setDate = (next: string) =>
    setSearchParams(next === today ? {} : { date: next });

  const { data: summary, isLoading } = useDailySummary(date);
  const { addDrinks, pressMl } = useQuickWater();
  const online = useOnlineStatus();
  const { data: mealTypes } = useMealTypes();
  // Brief "+250 ml" next to the total after a tap; the key restarts the fade.
  const [waterNote, setWaterNote] = useState<{ text: string; key: number }>();
  useEffect(() => {
    if (!waterNote) return;
    const timer = setTimeout(() => setWaterNote(undefined), 1200);
    return () => clearTimeout(timer);
  }, [waterNote]);
  const { data: plans = [] } = useWorkoutPlanTemplates(userId);
  const startPlanSession = useStartPlanSession(date, userId);
  const { data: feed } = useFeed();

  const totals = useMemo(() => {
    const sum: Record<Nutrient, number> = {
      protein: 0,
      carbs: 0,
      fat: 0,
      dietary_fiber: 0,
    };
    for (const entry of summary?.foodEntries ?? []) {
      const servingSize = Number(entry.serving_size) || 0;
      if (servingSize === 0) continue;
      const scale = (Number(entry.quantity) || 0) / servingSize;
      for (const key of Object.keys(sum) as Nutrient[]) {
        sum[key] += (Number(entry[key]) || 0) * scale;
      }
    }
    const supplements = summary?.supplementTotals;
    if (supplements) {
      for (const key of Object.keys(sum) as Nutrient[]) {
        sum[key] += Number(supplements[key]) || 0;
      }
    }
    return sum;
  }, [summary?.foodEntries, summary?.supplementTotals]);

  const dow = new Date(`${date}T12:00:00`).getDay();
  const activePlan =
    (plans as WorkoutPlanTemplate[]).find(
      (p) => (p.schedule_type ?? 'weekly') === 'weekly' && p.is_active
    ) ?? null;
  const dayAssignments = (activePlan?.assignments ?? []).filter(
    (a) => a.day_of_week === dow
  );
  const sessionName = [
    ...new Set(
      dayAssignments
        .map((a) => a.session_name || a.workout_preset_name || a.exercise_name)
        .filter(Boolean)
    ),
  ].join(' + ');

  if (isLoading || !summary) {
    return (
      <div className="space-y-3">
        <Header date={date} onDateChange={setDate} />
        {[180, 52, 150, 110].map((h) => (
          <div
            key={h}
            className="animate-pulse rounded-2xl bg-card"
            style={{ height: h }}
          />
        ))}
      </div>
    );
  }

  const { eaten, burned, remaining, progress } = summary.calorieBalance;
  const goals = summary.goals;
  const adjusted = summary.adjustedGoals;
  const macroGoals: Record<Nutrient, number> = {
    protein: adjusted?.protein ?? goals.protein ?? 0,
    carbs: adjusted?.carbs ?? goals.carbs ?? 0,
    fat: adjusted?.fat ?? goals.fat ?? 0,
    dietary_fiber: goals.dietary_fiber ?? 0,
  };
  const exercise = sessionStats(summary.exerciseSessions);
  const workoutDone = summary.exerciseSessions.length > 0;
  const waterGoal = adjusted?.water_goal_ml ?? goals.water_goal_ml ?? 2500;
  const waterMl = summary.waterIntake || 0;
  const diaryLink = `/gunluk${date === today ? '' : `?date=${date}`}`;
  const quickLogMeals = (mealTypes ?? []).filter(
    (mt) => mt.show_in_quick_log !== false
  );
  // DG FIT keeps one food list, so open its search straight away.
  const openFoodLog = () =>
    navigate(
      diaryLink,
      quickLogMeals.length === 1
        ? {
            state: {
              openFoodSearchForMeal: quickLogMeals[0]!.name.toLowerCase(),
            },
          }
        : undefined
    );

  const changeWater = (drinks: number) => {
    if (!userId) return;
    addDrinks(userId, date, drinks);
    setWaterNote({
      text: `${drinks > 0 ? '+' : '−'}${fmtTr(pressMl)} ml`,
      key: Date.now(),
    });
  };

  const usersById = new Map((feed?.users ?? []).map((u) => [u.id, u]));
  const feedItems = (feed?.items ?? []).slice(0, 3);

  return (
    <div>
      <Header date={date} onDateChange={setDate} />

      <CalorieRingCard
        eaten={eaten}
        burned={burned}
        remaining={remaining}
        progress={progress / 100}
        onAddFood={summary.foodEntries.length === 0 ? openFoodLog : undefined}
      />

      <button
        type="button"
        onClick={openChat}
        className="mb-3 flex w-full items-center rounded-xl bg-card px-4 py-3 text-left shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none"
      >
        <Sparkles className="h-[18px] w-[18px] text-primary" />
        <span className="ml-3 text-base text-caption">PT AI'ya sor…</span>
      </button>

      {summary.foodEntries.length > 0 ? (
        <SparkyCard>
          <SparkyCardHeader
            title="Besinler"
            onLink={() => navigate(diaryLink)}
          />
          <div className="-mx-1 flex flex-wrap justify-between">
            {MACROS.map((m) => (
              <MacroBar
                key={m.key}
                label={m.label}
                consumed={totals[m.key]}
                goal={macroGoals[m.key]}
                colorClass={m.colorClass}
              />
            ))}
          </div>
        </SparkyCard>
      ) : (
        <SparkyCard>
          <SparkyCardHeader title="Yemek" />
          <p className="mb-3 text-sm text-muted-foreground">
            {date === today
              ? 'Bugün henüz yemek eklemedin.'
              : 'Bu gün için yemek eklenmemiş.'}
          </p>
          <Button
            type="button"
            onClick={openFoodLog}
            className="h-11 w-full rounded-full text-base"
          >
            <Plus className="h-5 w-5" />
            Yemek ekle
          </Button>
        </SparkyCard>
      )}

      <SparkyCard>
        <SparkyCardHeader
          title="Antrenman"
          linkLabel="Program"
          onLink={() => navigate('/antrenman')}
        />
        {dayAssignments.length > 0 && activePlan ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              {workoutDone ? (
                <Check className="h-5 w-5" />
              ) : (
                <Dumbbell className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold text-foreground">
                {sessionName || 'Antrenman'}
              </div>
              <div className="text-sm text-muted-foreground">
                {workoutDone ? 'Tamamlandı' : activePlan.plan_name}
              </div>
            </div>
            {!workoutDone && (
              <Button
                className="h-11 rounded-full px-4"
                onClick={() => startPlanSession(activePlan, dayAssignments[0]!)}
              >
                <Play className="h-4 w-4 fill-current" />
                Başlat
              </Button>
            )}
          </div>
        ) : workoutDone ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Check className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-base font-semibold text-foreground">
              Bugün antrenman yaptın 💪
            </div>
          </div>
        ) : activePlan ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Moon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">
                Dinlenme günü
              </div>
              <div className="text-sm text-muted-foreground">
                Bugün programında antrenman yok
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold text-foreground">
                  Program seçilmedi
                </div>
                <div className="text-sm text-muted-foreground">
                  Haftalık bir program seç, her gün ne yapacağın burada
                  görünsün.
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/antrenman')}
              className="mt-3 h-11 w-full rounded-full text-base"
            >
              Program seç
            </Button>
          </div>
        )}
        {(exercise.minutes > 0 || exercise.calories > 0) && (
          <div className="mt-3">
            <ProgressRow
              label="Dakika"
              current={exercise.minutes}
              goal={goals.target_exercise_duration_minutes ?? 0}
              unit="dk"
              colorClass="bg-exercise"
            />
            {(exercise.calories >= 1 ||
              (goals.target_exercise_calories_burned ?? 0) > 0) && (
              <ProgressRow
                label="Kalori"
                current={exercise.calories}
                goal={goals.target_exercise_calories_burned ?? 0}
                unit="kcal"
                colorClass="bg-exercise"
              />
            )}
          </div>
        )}
      </SparkyCard>

      <SparkyCard>
        <SparkyCardHeader title="Su" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={`Su azalt (${fmtTr(pressMl)} ml)`}
            disabled={waterMl <= 0}
            onClick={() => changeWater(-1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary transition-transform active:scale-95 disabled:opacity-40"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="relative mb-2 flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-foreground">
                {fmtTr(Math.round(waterMl), 0)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {fmtTrUnit(Math.round(waterGoal), 'ml', 0)}
              </span>
              {waterNote && (
                <span
                  key={waterNote.key}
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-hydration/15 px-2 text-xs font-semibold text-foreground animate-in fade-in slide-in-from-bottom-1 duration-200"
                >
                  {waterNote.text}
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded bg-progress-track">
              <div
                className="h-full rounded bg-hydration transition-[width] duration-300"
                style={{
                  width: `${Math.min(waterGoal > 0 ? waterMl / waterGoal : 0, 1) * 100}%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            aria-label={`Su ekle (${fmtTr(pressMl)} ml)`}
            onClick={() => changeWater(1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <p
          className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground"
          aria-live="polite"
        >
          {online ? (
            `Her dokunuşta ${fmtTr(pressMl)} ml`
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Çevrimdışısın; su bağlanınca kaydedilir.
            </>
          )}
        </p>
      </SparkyCard>

      <SparkyCard>
        <SparkyCardHeader
          title="Arkadaşlar"
          linkLabel="Tümü"
          onLink={() => navigate('/arkadaslar')}
        />
        {feedItems.length === 0 ? (
          <div className="py-1">
            <p className="mb-3 text-sm text-muted-foreground">
              Henüz arkadaş etkinliği yok.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/arkadaslar')}
              className="h-11 w-full rounded-full text-base"
            >
              Arkadaşını ekle
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {feedItems.map((item) => {
              const friend = usersById.get(item.user_id);
              return (
                <button
                  key={`${item.type}-${item.user_id}-${item.at}`}
                  type="button"
                  onClick={() => navigate(`/arkadaslar/${item.user_id}`)}
                  className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left"
                >
                  <UserAvatar user={friend} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">
                      <span className="font-semibold">
                        {friend?.name ?? '—'}
                      </span>
                      {' · '}
                      {item.type === 'workout'
                        ? item.name
                        : `Kilo ${fmtTrUnit(Number(item.weight_kg), 'kg')}`}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.type === 'workout'
                        ? `${item.set_count} set · ${timeAgo(item.at)}`
                        : timeAgo(item.at)}
                    </div>
                  </div>
                  {item.type === 'workout' ? (
                    item.has_pr ? (
                      <Trophy className="h-4 w-4 text-pr" aria-label="Rekor" />
                    ) : (
                      <Dumbbell className="h-4 w-4 text-caption" />
                    )
                  ) : (
                    <Scale className="h-4 w-4 text-caption" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </SparkyCard>
    </div>
  );
};

const Header = ({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange: (date: string) => void;
}) => (
  <div className="mb-3 flex items-center justify-between">
    <h1 className="text-2xl font-bold text-foreground">Özet</h1>
    <DatePill date={date} onChange={onDateChange} />
  </div>
);

export default Dashboard;
