import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ExpandedGoals } from '@/types/goals';
import { ChevronDown } from 'lucide-react';
import { useSaveGoalsMutation } from '@/hooks/Goals/useGoals';
import { calculateBasePlan } from '@/utils/nutritionCalculations';
import { usePreferences } from '@/contexts/PreferencesContext';
import type { ActivityLevel } from '@/contexts/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { useSubmitOnboarding } from '@/hooks/Onboarding/useOnboarding';
import { format } from 'date-fns';
import { useSaveCheckInMeasurementsMutation } from '@/hooks/CheckIn/useCheckIn';
import { DietApproach } from './DietApproach';
import { PersonalPlanHeader } from './PersonalPlanHeader';
import { createInitialPlan } from '@/utils/onboarding';
import { useUpdateProfileMutation } from '@/hooks/Settings/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingData } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface PersonalPlanProps {
  formData: OnboardingData;
  weightUnit: 'kg' | 'lbs' | 'st_lbs';
  heightUnit: 'cm' | 'inches' | 'ft_in';
  localDateFormat: string;
  onOnboardingComplete: () => void;
}

/** Midpoint of each onboarding body-fat bucket, or null if unanswered. */
const bodyFatFromRange = (range: string | undefined): number | null => {
  switch (range) {
    case 'Low (<15%)':
      return 12;
    case 'Medium (15-25%)':
      return 20;
    case 'High (25-35%)':
      return 30;
    case 'Very High (>35%)':
      return 38;
    default:
      return null;
  }
};

const PersonalPlan = ({
  formData,
  weightUnit,
  heightUnit,
  localDateFormat,
  onOnboardingComplete,
}: PersonalPlanProps) => {
  const {
    convertEnergy,
    saveAllPreferences,
    fatBreakdownAlgorithm,
    mineralCalculationAlgorithm,
    vitaminCalculationAlgorithm,
    sugarCalculationAlgorithm,
    calorieSafetyFloorMode,
    calorieSafetyFloorValue,
  } = usePreferences();
  const { t } = useTranslation();
  const { user } = useAuth();
  // The plan screen only offers the diet approach and meals per day; the
  // nutrient algorithms, micronutrients and meal split keep their defaults
  // and are edited later in Menü → Hedefler.
  const [showDietApproach, setShowDietApproach] = useState(true);
  const [mealsPerDay, setMealsPerDay] = useState<number>(
    formData.mealsPerDay || 3
  );
  const localFatBreakdownAlgorithm = fatBreakdownAlgorithm;
  const localMineralAlgorithm = mineralCalculationAlgorithm;
  const localVitaminAlgorithm = vitaminCalculationAlgorithm;
  const localSugarAlgorithm = sugarCalculationAlgorithm;
  // DG FIT always uses kcal.
  const localEnergyUnit = 'kcal' as const;
  const [localSelectedDiet, setLocalSelectedDiet] =
    useState<string>('balanced');
  const [customPercentages, setCustomPercentages] = useState({
    carbs: 40,
    protein: 30,
    fat: 30,
  });

  const [lockedMacros, setLockedMacros] = useState({
    carbs: false,
    protein: false,
    fat: false,
  });
  const [editedPlan, setEditedPlan] = useState<ExpandedGoals | null>(() => {
    return createInitialPlan(
      formData,
      localEnergyUnit,
      localSelectedDiet,
      customPercentages,
      localFatBreakdownAlgorithm,
      localMineralAlgorithm,
      localVitaminAlgorithm,
      localSugarAlgorithm,
      convertEnergy,
      { calorieSafetyFloorMode, calorieSafetyFloorValue }
    );
  });

  const { mutateAsync: submitOnboardingData, isPending: isSubmitting } =
    useSubmitOnboarding();
  const { mutateAsync: saveGoals } = useSaveGoalsMutation();
  const { mutateAsync: saveCheckInMeasurements } =
    useSaveCheckInMeasurementsMutation();
  const { mutateAsync: updateProfileData } = useUpdateProfileMutation(
    user?.activeUserId ?? ''
  );

  const handleDietChange = (newDiet: string) => {
    setLocalSelectedDiet(newDiet);

    const updatedPlan = createInitialPlan(
      formData,
      localEnergyUnit,
      newDiet,
      customPercentages,
      localFatBreakdownAlgorithm,
      localMineralAlgorithm,
      localVitaminAlgorithm,
      localSugarAlgorithm,
      convertEnergy,
      { calorieSafetyFloorMode, calorieSafetyFloorValue }
    );

    setEditedPlan((prev) => {
      if (!prev || !updatedPlan) return updatedPlan;
      return {
        ...updatedPlan,
        breakfast_percentage: prev.breakfast_percentage,
        lunch_percentage: prev.lunch_percentage,
        dinner_percentage: prev.dinner_percentage,
        snacks_percentage: prev.snacks_percentage,
      };
    });
  };

  const plan = useMemo(() => {
    return calculateBasePlan(formData, localSelectedDiet, customPercentages, {
      calorieSafetyFloorMode,
      calorieSafetyFloorValue,
    });
  }, [
    formData,
    localSelectedDiet,
    customPercentages,
    calorieSafetyFloorMode,
    calorieSafetyFloorValue,
  ]);

  const handleMacroValueChange = (
    changedMacro: keyof typeof customPercentages,
    newValue: number
  ) => {
    newValue = Math.max(0, Math.min(100, newValue));

    if (lockedMacros[changedMacro]) return;

    const newPercentages = { ...customPercentages };
    newPercentages[changedMacro] = newValue;

    const otherUnlockedMacros = (
      Object.keys(customPercentages) as Array<keyof typeof customPercentages>
    ).filter((m) => m !== changedMacro && !lockedMacros[m]);

    const fixedTotal = Object.keys(newPercentages).reduce((total, key) => {
      const macro = key as keyof typeof customPercentages;
      if (macro === changedMacro || lockedMacros[macro]) {
        return total + newPercentages[macro];
      }
      return total;
    }, 0);

    const remainingToDistribute = 100 - fixedTotal;

    if (otherUnlockedMacros.length > 0) {
      const totalOfOtherUnlocked = otherUnlockedMacros.reduce(
        (sum, m) => sum + customPercentages[m],
        0
      );

      if (totalOfOtherUnlocked > 0) {
        otherUnlockedMacros.forEach((macro) => {
          const ratio = customPercentages[macro] / totalOfOtherUnlocked;
          newPercentages[macro] = remainingToDistribute * ratio;
        });
      } else {
        otherUnlockedMacros.forEach((macro) => {
          newPercentages[macro] =
            remainingToDistribute / otherUnlockedMacros.length;
        });
      }
    }

    let total = 0;
    (
      Object.keys(newPercentages) as Array<keyof typeof customPercentages>
    ).forEach((key) => {
      newPercentages[key] = Math.round(newPercentages[key]);
      total += newPercentages[key];
    });

    const lastUnlocked = otherUnlockedMacros[otherUnlockedMacros.length - 1];
    if (total !== 100 && lastUnlocked) {
      newPercentages[lastUnlocked] += 100 - total;
    }

    (
      Object.keys(newPercentages) as Array<keyof typeof customPercentages>
    ).forEach((key) => {
      if (newPercentages[key] < 0) newPercentages[key] = 0;
    });

    setCustomPercentages(newPercentages);

    const updatedPlan = createInitialPlan(
      formData,
      localEnergyUnit,
      localSelectedDiet,
      newPercentages,
      localFatBreakdownAlgorithm,
      localMineralAlgorithm,
      localVitaminAlgorithm,
      localSugarAlgorithm,
      convertEnergy,
      { calorieSafetyFloorMode, calorieSafetyFloorValue }
    );
    setEditedPlan(updatedPlan);
  };

  const handleSubmit = async () => {
    if (!user?.activeUserId) {
      return;
    }

    // formData values are already in Metric (kg/cm) because they come from UnitInput
    const metricWeight = Number(formData.currentWeight) || 0;
    const metricHeight = Number(formData.height) || 0;
    const metricTargetWeight = Number(formData.targetWeight) || 0;

    const dataToSubmit: OnboardingData = {
      ...formData,
      currentWeight: metricWeight,
      height: metricHeight,
      targetWeight: metricTargetWeight,
      mealsPerDay,
    };

    // Update user preferences with selected units and algorithms.
    // activityLevel must be persisted here: the calorie engine reads
    // user_preferences, not onboarding_data, so without this a user who
    // answered "heavy" is silently treated as sedentary forever.
    //
    // The goal saved below in user_goals already represents the user's intended
    // daily calorie target (factoring in the primary goal calculation or any custom
    // edits made on the Personal Plan screen). Therefore, goalMode is persisted as
    // 'maintain' (0% further adjustment) and goalModeCalculationMethod as 'manual',
    // ensuring the target in user_goals is honored as-is and neither double-adjusted
    // nor overridden by BMR formula re-derivation.
    await saveAllPreferences({
      weightUnit: weightUnit,
      measurementUnit: heightUnit,
      energyUnit: localEnergyUnit,
      dateFormat: localDateFormat,
      fatBreakdownAlgorithm: localFatBreakdownAlgorithm,
      mineralCalculationAlgorithm: localMineralAlgorithm,
      vitaminCalculationAlgorithm: localVitaminAlgorithm,
      sugarCalculationAlgorithm: localSugarAlgorithm,
      selectedDiet: localSelectedDiet,
      // Empty when the step was skipped; the column is a plain string, so guard
      // here rather than persisting '' and relying on every read site's default.
      activityLevel: (formData.activityLevel || 'not_much') as ActivityLevel,
      calorieGoalAdjustmentMode: formData.addBurnedCalories
        ? 'dynamic'
        : 'fixed',
      goalMode: 'maintain',
      goalModeCalculationMethod: 'manual',
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    try {
      await updateProfileData({
        gender: formData.sex,
        date_of_birth: formData.birthDate,
      });
    } catch (e) {
      console.error('Failed to sync profile data', e);
    }

    try {
      await saveCheckInMeasurements({
        entry_date: todayStr,
        weight: metricWeight,
        height: metricHeight,
        // Midpoint of the selected bucket. Rough, but it lets the lean-mass BMR
        // algorithms (Katch-McArdle, Cunningham) work at all rather than
        // silently falling back to Mifflin-St Jeor.
        ...(bodyFatFromRange(formData.bodyFatRange) != null && {
          body_fat_percentage: bodyFatFromRange(formData.bodyFatRange),
        }),
      });
    } catch (e) {
      console.error('Failed to sync measurements', e);
    }

    try {
      if (editedPlan) {
        const storedCalories = convertEnergy(
          editedPlan.calories,
          localEnergyUnit,
          'kcal'
        );

        const fiber = editedPlan.dietary_fiber || 0;
        const macroCalories = Math.max(0, storedCalories - fiber * 2);
        const newGoals: ExpandedGoals = {
          ...editedPlan,
          calories: storedCalories,
          protein_percentage:
            macroCalories > 0
              ? Math.round(((editedPlan.protein * 4) / macroCalories) * 100)
              : 0,
          carbs_percentage:
            macroCalories > 0
              ? Math.round(((editedPlan.carbs * 4) / macroCalories) * 100)
              : 0,
          fat_percentage:
            macroCalories > 0
              ? Math.round(((editedPlan.fat * 9) / macroCalories) * 100)
              : 0,
          dietary_fiber: editedPlan.dietary_fiber,
          water_goal_ml: editedPlan.water_goal_ml,
          target_exercise_duration_minutes:
            editedPlan.target_exercise_duration_minutes,
          target_exercise_calories_burned:
            editedPlan.target_exercise_calories_burned,
        };

        if (newGoals) {
          await saveGoals({ date: todayStr, goals: newGoals, cascade: true });
        }
      }
    } catch (e) {
      console.error('Failed to sync goals', e);
    }
    try {
      await submitOnboardingData(dataToSubmit);
      onOnboardingComplete();
    } catch (error) {
      // The mutation hook handles showing an error toast.
      // We just need to reset the loading state if submission fails.
    }
  };

  if (!plan) return null;

  const startButton = (
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting}
      className="h-14 w-full rounded-full text-lg font-bold disabled:opacity-70"
    >
      {isSubmitting ? t('common.saving', 'Saving...') : 'Planı başlat'}
    </Button>
  );

  return (
    <div className="animate-in fade-in duration-300 pb-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Kişisel planın</h1>
        <p className="text-muted-foreground mt-2">
          {t(
            'onboarding.plan.goalDescription',
            'Ready to reach your goal of {{goal}}.',
            {
              goal: t(
                `onboarding.${formData.primaryGoal === 'lose_weight' ? 'loseWeight' : formData.primaryGoal === 'gain_weight' ? 'gainWeight' : 'maintainWeight'}`
              ),
            }
          )}
        </p>
      </div>

      <PersonalPlanHeader
        formData={formData}
        editedPlan={editedPlan}
        plan={plan}
        setEditedPlan={setEditedPlan}
      />

      {startButton}
      <p className="mt-2 mb-6 text-center text-sm text-muted-foreground">
        Mikro besinler ve öğün dağılımı önerilen değerlerle başlar. Hepsini
        sonra Menü → Hedefler'den değiştirebilirsin.
      </p>

      {/* Optional fine-tuning, closed by default. */}
      <Collapsible>
        <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left text-base font-semibold text-foreground">
          <span>
            Gelişmiş ayarlar
            <span className="block text-sm font-normal text-muted-foreground">
              Beslenme yaklaşımı ve öğün sayısı
            </span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <DietApproach
            customPercentages={customPercentages}
            handleMacroValueChange={handleMacroValueChange}
            localSelectedDiet={localSelectedDiet}
            lockedMacros={lockedMacros}
            setCustomPercentages={setCustomPercentages}
            setLocalSelectedDiet={handleDietChange}
            setLockedMacros={setLockedMacros}
            setShowDietApproach={setShowDietApproach}
            showDietApproach={showDietApproach}
          />

          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            <div
              id="meals-per-day-label"
              className="mb-1 font-semibold text-foreground"
            >
              {t(
                'onboarding.mealsQuestion',
                'How many meals do you eat in a typical day?'
              )}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Ara öğünler dahil. Sadece bilgi amaçlı; hedeflerini değiştirmez.
            </p>
            <div
              role="radiogroup"
              aria-labelledby="meals-per-day-label"
              className="flex rounded-xl bg-raised p-1"
            >
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  role="radio"
                  aria-checked={mealsPerDay === num}
                  onClick={() => setMealsPerDay(num)}
                  className={cn(
                    'h-11 flex-1 rounded-lg text-base font-semibold',
                    mealsPerDay === num
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {startButton}
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-6 text-center text-xs leading-snug text-muted-foreground">
        {t(
          'onboarding.plan.medicalDisclaimer',
          'This plan is for informational purposes only and should not replace professional medical advice. Please consult with your doctor or a certified nutritionist before making significant changes to your diet or exercise routine.'
        )}
      </p>
    </div>
  );
};

export default PersonalPlan;
