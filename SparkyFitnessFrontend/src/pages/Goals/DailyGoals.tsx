import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/NumericInput';
import MealPercentageManager from '@/components/MealPercentageManager';
import { Separator } from '@/components/ui/separator';

import { NUTRIENT_CONFIG } from '@/constants/goals';
import { NON_GOAL_NUTRIENT_KEYS } from '@workspace/shared';
import { NutrientInput } from './NutrientInput';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { useSaveGoalsMutation } from '@/hooks/Goals/useGoals';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useMemo, useState } from 'react';
import { ExpandedGoals } from '@/types/goals';
import { WaterAndExerciseFields } from './WaterAndExerciseFields';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useCustomNutrients } from '@/hooks/Foods/useCustomNutrients';
import { useMealTypes } from '@/hooks/Diary/useMealTypes';
import { buildGoalsPayload, getMealPercentage } from '@/utils/goals';
import { SegmentedControl } from './SegmentedControl';
import { fmtTr } from '@/utils/numberFormatting';
import { useNutrientAutoCalculate } from '@/hooks/Goals/useNutrientAutoCalculate';
import { NutrientAutoCalculate } from './NutrientAutoCalculate';
import { AutoCalculateToolbar } from './AutoCalculateToolbar';

const calculateGrams = (
  calories: number,
  percentage: number,
  nutrient: 'protein' | 'carbs' | 'fat',
  dietaryFiber: number = 0
) => {
  const factor = nutrient === 'fat' ? 9 : 4;
  const adjustedCalories = Math.max(0, calories - dietaryFiber * 2);
  return Math.round((adjustedCalories * (percentage / 100)) / factor);
};

interface DailyGoalsProps {
  goals: ExpandedGoals;
  setGoals: React.Dispatch<React.SetStateAction<ExpandedGoals>>;
  visibleNutrients: string[];
  today: string;
}

export const DailyGoals = ({
  goals,
  setGoals,
  visibleNutrients,
  today,
}: DailyGoalsProps) => {
  const {
    energyUnit,
    convertEnergy,
    getEnergyUnitString,
    goalMode,
    goalModeCalculationMethod,
    saveAllPreferences,
  } = usePreferences();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: customNutrients } = useCustomNutrients();
  const { data: mealTypes = [] } = useMealTypes();

  const autoCalcCandidateKeys = useMemo(
    () =>
      visibleNutrients.filter(
        (key) => !['calories', 'protein', 'carbs', 'fat'].includes(key)
      ),
    [visibleNutrients]
  );
  const {
    algorithms,
    autoCalculateUserData,
    goalTypePreferences,
    eligibleIds: eligibleAutoCalcIds,
    selected: selectedForAutoCalc,
    toggleSelected,
    selectAll: selectAllForAutoCalc,
    selectNone: selectNoneForAutoCalc,
    applySelected,
  } = useNutrientAutoCalculate({
    calories: goals.calories,
    totalFatGrams: goals.fat,
    customNutrients,
    candidateKeys: autoCalcCandidateKeys,
  });

  const [initialCalories] = useState(goals.calories);

  const [autoCalcOpen, setAutoCalcOpen] = useState(false);
  const [macroInputType, setMacroInputType] = useState<'grams' | 'percentages'>(
    goals.protein_percentage !== null ? 'percentages' : 'grams'
  );

  const visibleMeals = useMemo(
    () => mealTypes.filter((m) => m.is_visible),
    [mealTypes]
  );

  const memoizedGoalsPercentages = useMemo(() => {
    const percentages: Record<string, number> = {};
    visibleMeals.forEach((meal) => {
      percentages[meal.name.toLowerCase()] = getMealPercentage(
        meal.name,
        goals
      );
    });
    return percentages;
  }, [goals, visibleMeals]);

  const currentMacroTotal = useMemo(() => {
    if (macroInputType === 'grams') return 100;
    return (
      (goals.protein_percentage || 0) +
      (goals.carbs_percentage || 0) +
      (goals.fat_percentage || 0)
    );
  }, [goals, macroInputType]);

  const isMacroValid = Math.round(currentMacroTotal) === 100;

  const handleApplySelected = () => {
    applySelected((updates) => setGoals((prev) => ({ ...prev, ...updates })));
  };

  const { mutateAsync: saveGoalsService, isPending: saving } =
    useSaveGoalsMutation();

  const handleSaveGoals = async () => {
    if (!user) return;
    // DG FIT logs into one meal type, which always gets the whole day.
    const finalGoals =
      visibleMeals.length === 1 && visibleMeals[0]
        ? {
            ...goals,
            ...buildGoalsPayload(
              { [visibleMeals[0].name.toLowerCase()]: 100 },
              goals
            ),
          }
        : { ...goals };
    if (macroInputType === 'percentages') {
      const cal = finalGoals.calories;
      const fiber = finalGoals.dietary_fiber || 0;
      const adjustedCal = Math.max(0, cal - fiber * 2);
      finalGoals.protein = Math.round(
        (adjustedCal * (finalGoals.protein_percentage || 0)) / 100 / 4
      );
      finalGoals.carbs = Math.round(
        (adjustedCal * (finalGoals.carbs_percentage || 0)) / 100 / 4
      );
      finalGoals.fat = Math.round(
        (adjustedCal * (finalGoals.fat_percentage || 0)) / 100 / 9
      );
    } else {
      finalGoals.protein_percentage = null;
      finalGoals.carbs_percentage = null;
      finalGoals.fat_percentage = null;
    }
    // Only a manual calorie edit overrides the adaptive/goal-mode setup;
    // changing macros alone must leave it intact.
    const caloriesEdited = finalGoals.calories !== initialCalories;
    if (
      caloriesEdited &&
      (goalModeCalculationMethod === 'adaptive' || goalMode !== 'maintain')
    ) {
      try {
        await saveAllPreferences({
          goalMode: 'maintain',
          goalModeCalculationMethod: 'manual',
        });
      } catch (err) {
        console.error('Failed to reset goal mode to maintain', err);
        return;
      }
    }
    await saveGoalsService({ date: today, goals: finalGoals, cascade: true });
  };

  const handleGoalsPercentagesChange = useCallback(
    (newPercentages: Record<string, number>) => {
      setGoals((prevGoals) => ({
        ...prevGoals,
        ...buildGoalsPayload(newPercentages, prevGoals),
      }));
    },
    [setGoals]
  );

  const isTotalPercentageValid = useMemo(() => {
    if (visibleMeals.length <= 1) return true;
    const total = visibleMeals.reduce(
      (sum, meal) => sum + getMealPercentage(meal.name, goals),
      0
    );
    return Math.round(total) === 100;
  }, [goals, visibleMeals]);

  const macroLabels = {
    protein: 'Protein',
    carbs: 'Karbonhidrat',
    fat: 'Yağ',
  } as const;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-col items-start gap-1">
            {t(
              'goals.goalsSettings.dailyNutritionGoals',
              'Daily Nutrition Goals'
            )}
            <span className="text-sm font-normal text-muted-foreground">
              {t(
                'goals.goalsSettings.changesCascadeInfo',
                '(Updates your daily goals for the next 6 months or until your next scheduled goal change)'
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="calories">
                {`${t('goals.goalsSettings.calories', 'Calories')} (${getEnergyUnitString(energyUnit)})`}
              </Label>
              <NumericInput
                id="calories"
                step={1}
                className="h-12 text-lg"
                value={Math.round(
                  convertEnergy(goals.calories, 'kcal', energyUnit)
                )}
                onValueChange={(val) =>
                  setGoals((prev) => ({
                    ...prev,
                    calories: convertEnergy(val ?? 0, energyUnit, 'kcal'),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>{t('goals.goalsSettings.macrosBy', 'Macros By')}</Label>
                <SegmentedControl
                  label={t('goals.goalsSettings.macrosBy', 'Macros By')}
                  className="w-44"
                  value={macroInputType}
                  onChange={setMacroInputType}
                  options={[
                    {
                      value: 'grams',
                      label: t('goals.goalsSettings.grams', 'Grams'),
                    },
                    {
                      value: 'percentages',
                      label: t(
                        'goals.goalsSettings.percentages',
                        'Percentages'
                      ),
                    },
                  ]}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {(['protein', 'carbs', 'fat'] as const).map((m) => (
                  <div key={m} className="min-w-0 space-y-1.5">
                    <Label htmlFor={`goal-${m}`} className="text-xs">
                      {macroLabels[m]}
                    </Label>
                    <div className="relative">
                      <NumericInput
                        id={`goal-${m}`}
                        className="h-11 pr-8"
                        step={0.1}
                        decimals={1}
                        min={0}
                        max={macroInputType === 'percentages' ? 100 : undefined}
                        value={
                          macroInputType === 'grams'
                            ? (goals[m] ?? 0)
                            : Number(
                                goals[
                                  `${m}_percentage` as keyof ExpandedGoals
                                ] ?? 0
                              )
                        }
                        onValueChange={(val) => {
                          setGoals((prev) => ({
                            ...prev,
                            [macroInputType === 'grams'
                              ? m
                              : `${m}_percentage`]: val ?? 0,
                          }));
                        }}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {macroInputType === 'grams' ? 'g' : '%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {macroInputType === 'percentages' && (
              <div className="space-y-2">
                <div
                  className={`text-sm font-medium text-right ${isMacroValid ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                >
                  {`Toplam: %${fmtTr(currentMacroTotal)}`}
                  {!isMacroValid && ' · kaydetmek için %100 olmalı'}
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-raised p-3 text-xs text-muted-foreground">
                  {(['protein', 'carbs', 'fat'] as const).map((m) => (
                    <span key={m}>
                      {`${macroLabels[m]}: ${fmtTr(
                        calculateGrams(
                          goals.calories,
                          Number(
                            goals[`${m}_percentage` as keyof ExpandedGoals] ?? 0
                          ),
                          m,
                          goals.dietary_fiber
                        ),
                        0
                      )} g`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <WaterAndExerciseFields
              state={goals}
              setState={(val) => setGoals(val)}
              show="water"
            />
          </div>

          <Separator className="my-5" />
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between py-1 text-left">
              <span>
                <span className="block text-base font-semibold text-foreground">
                  Hareket ve adım hedefleri
                </span>
                <span className="block text-sm text-muted-foreground">
                  Yakılan kalori, süre ve günlük adım
                </span>
              </span>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <WaterAndExerciseFields
                state={goals}
                setState={(val) => setGoals(val)}
                show="activity"
              />
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-5" />
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between py-1 text-left">
              <span>
                <span className="block text-base font-semibold text-foreground">
                  Diğer besinler
                </span>
                <span className="block text-sm text-muted-foreground">
                  Lif, şeker, vitamin ve mineral hedefleri
                </span>
              </span>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {eligibleAutoCalcIds.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  className="h-11 px-0"
                  onClick={() => setAutoCalcOpen((open) => !open)}
                >
                  {autoCalcOpen
                    ? 'Önerilen değerleri gizle'
                    : 'Önerilen değerleri göster'}
                </Button>
              )}
              {autoCalcOpen && (
                <AutoCalculateToolbar
                  eligibleCount={eligibleAutoCalcIds.length}
                  selectedCount={selectedForAutoCalc.size}
                  onSelectAll={selectAllForAutoCalc}
                  onSelectNone={selectNoneForAutoCalc}
                  onApplySelected={handleApplySelected}
                  disabled={!autoCalculateUserData}
                />
              )}

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {/* Loop directly over the ordered array from settings, excluding calories and macros */}
                {visibleNutrients
                  .filter(
                    (key) =>
                      !['calories', 'protein', 'carbs', 'fat'].includes(key)
                  )
                  .map((key) => {
                    // Validate standard or custom nutrient
                    const isStandard =
                      NUTRIENT_CONFIG.some((n) => n.id === key) &&
                      !(NON_GOAL_NUTRIENT_KEYS as readonly string[]).includes(
                        key
                      );
                    const isCustom = customNutrients?.some(
                      (cn) => cn.name === key
                    );

                    if (!isStandard && !isCustom) return null;

                    // Render nutrient input
                    const goalType = isCustom
                      ? (goalTypePreferences[key]?.goalType ?? 'minimum')
                      : undefined;
                    const customAliases = isCustom
                      ? customNutrients?.find((cn) => cn.name === key)?.aliases
                      : undefined;
                    return (
                      <div key={key} className="min-w-0">
                        <NutrientInput
                          nutrientId={key}
                          state={goals}
                          setState={setGoals}
                          visibleNutrients={visibleNutrients}
                          customNutrients={customNutrients}
                        />
                        {autoCalcOpen && (
                          <NutrientAutoCalculate
                            nutrientId={key}
                            customNutrientAliases={customAliases}
                            userData={autoCalculateUserData}
                            goalType={goalType}
                            algorithms={algorithms}
                            selected={selectedForAutoCalc.has(key)}
                            onToggleSelected={(checked) =>
                              toggleSelected(key, checked)
                            }
                            onApply={(value) =>
                              setGoals((prev) => ({ ...prev, [key]: value }))
                            }
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {visibleMeals.length > 1 && (
            <>
              <Separator className="my-6" />

              <h3 className="text-lg font-semibold mb-4">
                {t(
                  'goals.goalsSettings.mealCalorieDistribution',
                  'Meal Calorie Distribution'
                )}
              </h3>
              <MealPercentageManager
                initialPercentages={memoizedGoalsPercentages}
                totalCalories={goals.calories}
                onPercentagesChange={handleGoalsPercentagesChange}
              />
            </>
          )}

          <div className="mt-6">
            <Button
              onClick={handleSaveGoals}
              className="h-12 w-full"
              disabled={saving || !isTotalPercentageValid || !isMacroValid}
            >
              {saving
                ? t('goals.goalsSettings.saving', 'Saving...')
                : t('goals.goalsSettings.saveGoals', 'Save Goals')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
