import { useState, useMemo } from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';

import type { ExpandedGoals, GoalPreset, WeeklyGoalPlan } from '@/types/goals';
import {
  useDeletePresetMutation,
  useDeleteWeeklyPlanMutation,
  useGoalPresets,
} from '@/hooks/Goals/useGoals';
import { WeeklyGoalPlanDialog } from './WeeklyGoalPlanDialog';
import { WeeklyGoalPlansSection } from './WeeklyGoalPlansSection';
import { GoalPresetsSection } from './GoalPresetsSection';
import { DailyGoals } from './DailyGoals';
import { GoalWeight } from './GoalWeight';
import { ResetOnboarding } from './ResetOnboarding';
import { GoalPresetDialog } from './GoalPresetDialog';
import { useCustomNutrients } from '@/hooks/Foods/useCustomNutrients';
import { DEFAULT_GOALS } from '@/constants/goals';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

export const GoalsContent = ({
  today,
  initialData,
}: {
  initialData: ExpandedGoals;
  today: string;
}) => {
  const { formatDateInUserTimezone, nutrientDisplayPreferences } =
    usePreferences();

  const [currentWeeklyPlan, setCurrentWeeklyPlan] =
    useState<WeeklyGoalPlan | null>(null);
  // State for Goal Presets
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState<GoalPreset | null>(null);
  const [goals, setGoals] = useState<ExpandedGoals>(initialData);
  // State for Weekly Goal Plans
  const [isWeeklyPlanDialogOpen, setIsWeeklyPlanDialogOpen] = useState(false);
  useState<WeeklyGoalPlan | null>(null);

  const { data: goalPresets = [] } = useGoalPresets();
  const { data: customNutrients = [] } = useCustomNutrients();

  // --- Goal Presets Mutations ---
  const { mutateAsync: deleteGoalPreset } = useDeletePresetMutation();

  // --- Weekly Goal Plans Mutations ---
  const { mutateAsync: deleteWeeklyGoalPlan } = useDeleteWeeklyPlanMutation();

  const handleCreatePresetClick = () => {
    setPresetToEdit(null);
    setIsPresetDialogOpen(true);
  };

  const handleEditPresetClick = (preset: GoalPreset) => {
    setPresetToEdit(preset);
    setIsPresetDialogOpen(true);
  };

  // Deletes wait for a confirmation sheet instead of the browser's confirm().
  const [pendingDelete, setPendingDelete] = useState<{
    kind: 'preset' | 'plan';
    id: string;
  } | null>(null);

  const handleDeletePreset = (presetId: string) =>
    setPendingDelete({ kind: 'preset', id: presetId });

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.kind === 'preset') await deleteGoalPreset(target.id);
    else await deleteWeeklyGoalPlan(target.id);
  };

  // Weekly Plan Functions

  const handleCreateWeeklyPlanClick = () => {
    setCurrentWeeklyPlan({
      plan_name: '',
      start_date: formatDateInUserTimezone(new Date(), 'yyyy-MM-dd'), // Changed
      end_date: null,
      is_active: true,
      monday_preset_id: null,
      tuesday_preset_id: null,
      wednesday_preset_id: null,
      thursday_preset_id: null,
      friday_preset_id: null,
      saturday_preset_id: null,
      sunday_preset_id: null,
    });
    setIsWeeklyPlanDialogOpen(true);
  };

  const handleEditWeeklyPlanClick = (plan: WeeklyGoalPlan) => {
    setCurrentWeeklyPlan({ ...plan });
    setIsWeeklyPlanDialogOpen(true);
  };

  const handleDeleteWeeklyPlan = (planId: string) =>
    setPendingDelete({ kind: 'plan', id: planId });

  const isMobile = useIsMobile();
  const platform = isMobile ? 'mobile' : 'desktop';
  const goalPreferences = nutrientDisplayPreferences.find(
    (p) => p.view_group === 'goal' && p.platform === platform
  );

  const visibleNutrients = useMemo(() => {
    const base = goalPreferences
      ? goalPreferences.visible_nutrients
      : Object.keys(DEFAULT_GOALS);

    const mustInclude = [
      'saturated_fat',
      'polyunsaturated_fat',
      'monounsaturated_fat',
      'trans_fat',
    ];

    // Combine arrays but use Set to deduplicate while preserving the FIRST occurrence.
    // This means `base` order is kept perfectly intact. Missing required or custom nutrients get added to the end.
    const allKeys = [
      ...base,
      ...mustInclude,
      ...customNutrients.map((cn) => cn.name),
    ];

    return Array.from(new Set(allKeys));
  }, [goalPreferences, customNutrients]);

  return (
    <div className="space-y-6">
      <h1 className="hidden text-2xl font-bold text-foreground sm:block">
        Hedefler
      </h1>

      {/* Daily goals first: calories, macros and water are what people
          come here to change. */}
      <DailyGoals
        today={today}
        goals={goals}
        setGoals={setGoals}
        visibleNutrients={visibleNutrients}
      />

      <GoalWeight />

      {/* Rarely used: ready-made goals, weekly plans and the onboarding reset. */}
      <Collapsible className="rounded-2xl border bg-card">
        <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <span>
            <span className="block text-base font-semibold text-foreground">
              Gelişmiş
            </span>
            <span className="block text-sm text-muted-foreground">
              Hazır hedefler, haftalık plan, başlangıç anketi
            </span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 px-2 pb-2 sm:px-4 sm:pb-4">
          <GoalPresetsSection
            goalPresets={goalPresets}
            handleCreatePresetClick={handleCreatePresetClick}
            handleDeletePreset={handleDeletePreset}
            handleEditPresetClick={handleEditPresetClick}
          />
          <WeeklyGoalPlansSection
            hasPresets={goalPresets.length > 0}
            handleCreatePresetClick={handleCreatePresetClick}
            handleCreateWeeklyPlanClick={handleCreateWeeklyPlanClick}
            handleDeleteWeeklyPlan={handleDeleteWeeklyPlan}
            handleEditWeeklyPlanClick={handleEditWeeklyPlanClick}
          />
          <ResetOnboarding />
        </CollapsibleContent>
      </Collapsible>

      <GoalPresetDialog
        key={presetToEdit?.id || (isPresetDialogOpen ? 'new' : 'closed')}
        open={isPresetDialogOpen}
        onOpenChange={setIsPresetDialogOpen}
        preset={presetToEdit}
        visibleNutrients={visibleNutrients}
      />
      <WeeklyGoalPlanDialog
        open={isWeeklyPlanDialogOpen}
        onOpenChange={setIsWeeklyPlanDialogOpen}
        goalPresets={goalPresets}
        plan={currentWeeklyPlan}
      />
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={
          pendingDelete?.kind === 'plan'
            ? 'Haftalık plan silinsin mi?'
            : 'Hazır hedef silinsin mi?'
        }
        description="Bu işlem geri alınamaz. Geçmiş günlerin hedefleri değişmez."
        variant="destructive"
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
};
