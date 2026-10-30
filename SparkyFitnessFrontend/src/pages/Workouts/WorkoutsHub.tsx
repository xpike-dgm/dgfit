import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  ListChecks,
  Moon,
  Play,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import { formatDateToYYYYMMDD } from '@/lib/utils';
import { useExerciseEntriesForDates } from '@/hooks/Exercises/useExerciseEntries';
import {
  useUpdateWorkoutPlanTemplateMutation,
  useWorkoutPlanTemplates,
} from '@/hooks/Exercises/useWorkoutPlans';
import { useWorkoutPresets } from '@/hooks/Exercises/useWorkoutPresets';
import { useStartPlanSession } from '@/hooks/Exercises/useStartPlanSession';
import { createWorkoutPlaybackRouteState } from '@/utils/workoutPlayback';
import type {
  WorkoutPlanAssignment,
  WorkoutPlanTemplate,
  WorkoutPreset,
} from '@/types/workout';

// Monday-first week; values are JS getDay() numbers, as plans store them.
const WEEK = [
  { dow: 1, short: 'Pzt', long: 'Pazartesi' },
  { dow: 2, short: 'Sal', long: 'Salı' },
  { dow: 3, short: 'Çar', long: 'Çarşamba' },
  { dow: 4, short: 'Per', long: 'Perşembe' },
  { dow: 5, short: 'Cum', long: 'Cuma' },
  { dow: 6, short: 'Cmt', long: 'Cumartesi' },
  { dow: 0, short: 'Paz', long: 'Pazar' },
];

const mondayOf = (date: Date) => {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};

const sessionLabel = (assignments: WorkoutPlanAssignment[]) => {
  const first = assignments[0];
  if (!first) return '';
  const names = new Set(
    assignments
      .map((a) => a.session_name || a.workout_preset_name || a.exercise_name)
      .filter(Boolean)
  );
  return [...names].join(' + ');
};

const WorkoutsHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeUserId } = useActiveUser();
  const currentUserId = activeUserId || user?.id;
  const today = formatDateToYYYYMMDD(new Date());
  const todayDow = new Date().getDay();
  const startPlanSession = useStartPlanSession(today, currentUserId);

  const { data: plans = [] } = useWorkoutPlanTemplates(currentUserId);
  const { data: presetData } = useWorkoutPresets(currentUserId);
  const presets = presetData?.presets ?? [];
  const updatePlan = useUpdateWorkoutPlanTemplateMutation();

  const weeklyPlans = (plans as WorkoutPlanTemplate[]).filter(
    (p) => (p.schedule_type ?? 'weekly') === 'weekly'
  );
  const activePlan =
    weeklyPlans.find((p) => p.is_active) ?? weeklyPlans[0] ?? null;

  const [selectedDow, setSelectedDow] = useState<number>(todayDow);

  const weekDates = useMemo(() => {
    const monday = mondayOf(new Date());
    return WEEK.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return formatDateToYYYYMMDD(d);
    });
  }, []);

  const weekEntries = useExerciseEntriesForDates(
    weekDates,
    currentUserId,
    today
  );

  const todayIndex = WEEK.findIndex((d) => d.dow === todayDow);
  const todayDone = (weekEntries[todayIndex]?.data?.length ?? 0) > 0;

  const assignmentsFor = (dow: number) =>
    (activePlan?.assignments ?? []).filter((a) => a.day_of_week === dow);

  const selectedAssignments = assignmentsFor(selectedDow);
  const selectedDay = WEEK.find((d) => d.dow === selectedDow)!;

  const startPreset = (preset: WorkoutPreset) => {
    if (!preset.exercises?.length) {
      toast({
        title: 'Bu antrenmanda hareket yok',
        description: 'Önce antrenmana hareket ekleyin.',
        variant: 'destructive',
      });
      return;
    }
    navigate(`/workout-playback?date=${today}`, {
      state: createWorkoutPlaybackRouteState(preset, today, '/antrenman'),
    });
  };

  const activatePlan = (planId: string) => {
    for (const plan of weeklyPlans) {
      const shouldBeActive = String(plan.id) === planId;
      if (!!plan.is_active !== shouldBeActive) {
        updatePlan.mutate({
          id: plan.id,
          data: { is_active: shouldBeActive },
        });
      }
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold tracking-tight">Antrenman</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/exercises?bolum=antrenmanlar')}
        >
          <Settings2 className="mr-1 h-4 w-4" />
          Düzenle
        </Button>
      </div>

      {/* Weekly program */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Haftalık Program
          </CardTitle>
          {weeklyPlans.length > 0 && (
            <Select
              value={activePlan ? String(activePlan.id) : undefined}
              onValueChange={activatePlan}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Program seçin" />
              </SelectTrigger>
              <SelectContent>
                {weeklyPlans.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.plan_name}
                    {plan.is_active ? ' · Aktif' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!activePlan ? (
            <div className="space-y-3 text-center text-sm text-muted-foreground">
              <p>
                Henüz haftalık programınız yok. Günlere antrenman atayarak bir
                program oluşturun.
              </p>
              <Button onClick={() => navigate('/exercises?bolum=programlar')}>
                Program oluştur
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEK.map((day, i) => {
                  const hasWorkout = assignmentsFor(day.dow).length > 0;
                  const done = (weekEntries[i]?.data?.length ?? 0) > 0;
                  const isToday = day.dow === todayDow;
                  const isSelected = day.dow === selectedDow;
                  return (
                    <button
                      key={day.dow}
                      type="button"
                      onClick={() => setSelectedDow(day.dow)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/15'
                          : 'border-border bg-card hover:bg-muted'
                      }`}
                    >
                      <span
                        className={`font-semibold ${isToday ? 'text-primary' : ''}`}
                      >
                        {day.short}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          done
                            ? 'bg-emerald-500 text-white'
                            : hasWorkout
                              ? 'bg-primary/20 text-primary'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : hasWorkout ? (
                          <Dumbbell className="h-3.5 w-3.5" />
                        ) : (
                          <Moon className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-raised p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {selectedDay.long}
                  {selectedDow === todayDow ? ' · bugün' : ''}
                </div>
                {selectedAssignments.length === 0 ? (
                  <div className="mt-1 font-semibold">Dinlenme günü</div>
                ) : (
                  <>
                    <div className="mt-1 text-lg font-bold">
                      {sessionLabel(selectedAssignments)}
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {selectedAssignments.flatMap((a) => {
                        const preset = presets.find(
                          (p) => String(p.id) === String(a.workout_preset_id)
                        );
                        return preset
                          ? preset.exercises.map((ex) => (
                              <li key={`${a.id}-${ex.id}`}>
                                {ex.exercise_name}
                                <span className="text-xs">
                                  {' '}
                                  · {ex.sets.length} set
                                </span>
                              </li>
                            ))
                          : a.exercise_name
                            ? [<li key={a.id}>{a.exercise_name}</li>]
                            : [];
                      })}
                    </ul>
                    {selectedDow === todayDow && todayDone ? (
                      <>
                        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/12 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-5 w-5" /> Bugünkü antrenman
                          tamamlandı
                        </div>
                        <Button
                          variant="ghost"
                          className="mt-2 w-full text-primary"
                          onClick={() =>
                            startPlanSession(
                              activePlan,
                              selectedAssignments[0]!
                            )
                          }
                        >
                          <Play className="h-4 w-4" />
                          Tekrar yap
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="mt-4 h-12 w-full text-base font-semibold"
                        onClick={() =>
                          startPlanSession(activePlan, selectedAssignments[0]!)
                        }
                      >
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        {selectedDow === todayDow
                          ? 'Antrenmanı başlat'
                          : `${selectedDay.long} antrenmanını bugün yap`}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Saved workouts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-5 w-5 text-primary" />
            Antrenmanlarım
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {presets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Kayıtlı antrenmanınız yok. Hareketler sayfasından bir antrenman
              oluşturun.
            </p>
          ) : (
            presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => startPreset(preset)}
                className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 text-left hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {preset.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {preset.exercises.length} hareket ·{' '}
                    {preset.exercises
                      .slice(0, 3)
                      .map((e) => e.exercise_name)
                      .join(', ')}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutsHub;
