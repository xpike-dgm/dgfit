import { Input } from '@/components/ui/input';
import { ExpandedGoals } from '@/types/goals';
import { OnboardingData } from '@/types/onboarding';
import { BasePlan } from '@/utils/nutritionCalculations';
import { useTranslation } from 'react-i18next';

export interface PersonalPlanHeaderProps {
  formData: OnboardingData;
  editedPlan: ExpandedGoals | null;
  plan: BasePlan | null;
  setEditedPlan: React.Dispatch<React.SetStateAction<ExpandedGoals | null>>;
}

const fmt = (value: number | undefined) =>
  Math.round(value ?? 0).toLocaleString('tr-TR');

/** DG FIT plan summary: the editable daily kcal plus the macro and water targets. */
export const PersonalPlanHeader = ({
  editedPlan,
  plan,
  setEditedPlan,
  formData,
}: PersonalPlanHeaderProps) => {
  const { t } = useTranslation();
  const tiles = [
    {
      label: t('nutrition.protein', 'Protein'),
      value: editedPlan?.protein,
      unit: 'g',
      color: 'bg-protein',
    },
    {
      label: t('nutrition.carbsShort', 'Carbs'),
      value: editedPlan?.carbs,
      unit: 'g',
      color: 'bg-carbs',
    },
    {
      label: t('nutrition.fat', 'Fat'),
      value: editedPlan?.fat,
      unit: 'g',
      color: 'bg-fat',
    },
    {
      label: 'Su',
      value: editedPlan?.water_goal_ml,
      unit: 'ml',
      color: 'bg-hydration',
    },
  ];
  return (
    <div className="mb-4 rounded-2xl bg-card p-5 text-center shadow-[0_1px_3px_rgba(15,23,41,0.06)] dark:shadow-none">
      <p className="mb-1 text-sm font-semibold text-muted-foreground">
        {t('onboarding.plan.dailyCalorieBudget', 'Daily Calorie Budget')}
      </p>
      <div className="flex items-baseline justify-center gap-1">
        <Input
          type="text"
          inputMode="numeric"
          aria-label={t(
            'onboarding.plan.dailyCalorieBudget',
            'Daily Calorie Budget'
          )}
          value={editedPlan?.calories ? editedPlan.calories.toFixed(0) : ''}
          onChange={(e) =>
            setEditedPlan((prev) =>
              prev
                ? {
                    ...prev,
                    calories: Number(e.target.value.replace(/\D/g, '')),
                  }
                : null
            )
          }
          style={{
            width: `${Math.max(3, editedPlan?.calories?.toFixed(0).length ?? 3) + 0.5}ch`,
          }}
          className="h-auto border-none bg-transparent p-0 text-center text-5xl font-extrabold text-primary focus-visible:ring-0"
        />
        <span className="text-lg font-medium text-foreground">kcal</span>
      </div>
      <p className="mt-1 text-xs text-caption">
        Rakama dokunup değiştirebilirsin
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl bg-raised px-3 py-2 text-left"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${tile.color}`} />
              {tile.label}
            </div>
            <div className="text-lg font-bold text-foreground">
              {fmt(tile.value)} {tile.unit}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          {t('onboarding.plan.baseBmr', 'Base BMR:')} {fmt(plan?.bmr)} kcal
        </span>
        <span>
          {t('onboarding.plan.calorieBuyback', 'Calorie Buyback:')}{' '}
          {formData.addBurnedCalories
            ? t('onboarding.plan.on', 'ON')
            : t('onboarding.plan.off', 'OFF')}
        </span>
      </div>
    </div>
  );
};
