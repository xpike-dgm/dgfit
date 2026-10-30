import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Utensils } from 'lucide-react';
import { localDateToDay } from '@workspace/shared';
import { OptionButton } from './OptionButton';
import { useTranslation } from 'react-i18next';
import { OnboardingData } from '@/types/onboarding';
import { UnitInput } from '@/components/ui/UnitInput';

interface OnboardingStepsProps {
  step: number;
  formData: OnboardingData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  nextStep: () => void;
}

export const OnboardingSteps = ({
  step,
  formData,
  setFormData,
  nextStep,
}: OnboardingStepsProps) => {
  const { t } = useTranslation();
  const today = localDateToDay(new Date());

  const handleSelect = (
    field: keyof OnboardingData,
    value: string | boolean | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => nextStep(), 250);
  };

  const handleInputChange = (
    field: 'currentWeight' | 'height' | 'targetWeight',
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? '' : parseFloat(value),
    }));
  };
  switch (step) {
    case 1:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('onboarding.sexQuestion', 'What is your sex?')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              'onboarding.sexDescription',
              'Used to calculate your base metabolic rate.'
            )}
          </p>
          <OptionButton
            label={t('onboarding.male', 'Male')}
            isSelected={formData.sex === 'male'}
            onClick={() => handleSelect('sex', 'male')}
          />
          <OptionButton
            label={t('onboarding.female', 'Female')}
            isSelected={formData.sex === 'female'}
            onClick={() => handleSelect('sex', 'female')}
          />
        </>
      );
    case 2:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-8">
            {t('onboarding.goalQuestion', 'What is your primary goal?')}
          </h1>
          <OptionButton
            label={t('onboarding.loseWeight', 'Lose weight')}
            isSelected={formData.primaryGoal === 'lose_weight'}
            onClick={() => handleSelect('primaryGoal', 'lose_weight')}
          />
          <OptionButton
            label={t('onboarding.maintainWeight', 'Maintain weight')}
            isSelected={formData.primaryGoal === 'maintain_weight'}
            onClick={() => handleSelect('primaryGoal', 'maintain_weight')}
          />
          <OptionButton
            label={t('onboarding.gainWeight', 'Gain weight')}
            isSelected={formData.primaryGoal === 'gain_weight'}
            onClick={() => handleSelect('primaryGoal', 'gain_weight')}
          />
        </>
      );
    case 3:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t(
              'onboarding.currentWeightQuestion',
              'What is your current weight?'
            )}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('onboarding.enterInUnit', 'Enter in {{unit}}.', {
              unit: 'kg',
            })}
          </p>

          <div className="flex items-center justify-center">
            <UnitInput
              id="current-weight"
              type="weight"
              unit="kg"
              value={formData.currentWeight}
              onChange={(val) =>
                handleInputChange(
                  'currentWeight',
                  val !== null ? val.toString() : ''
                )
              }
              className="w-64"
            />
          </div>
          <Button
            onClick={nextStep}
            disabled={!formData.currentWeight}
            className="w-full mt-12 h-14 text-lg rounded-full"
          >
            {t('onboarding.continue', 'Continue')}
          </Button>
        </>
      );
    case 4:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('onboarding.heightQuestion', 'What is your height?')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('onboarding.enterInUnit', 'Enter in {{unit}}.', {
              unit: 'cm',
            })}
          </p>

          <div className="flex items-center justify-center">
            <UnitInput
              id="height"
              type="height"
              unit="cm"
              value={formData.height}
              onChange={(val) =>
                handleInputChange('height', val !== null ? val.toString() : '')
              }
              className="w-64"
            />
          </div>
          <Button
            onClick={nextStep}
            disabled={!formData.height}
            className="w-full mt-12 h-14 text-lg rounded-full"
          >
            {t('onboarding.continue', 'Continue')}
          </Button>
        </>
      );
    case 5:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('onboarding.birthDateQuestion', 'When were you born?')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              'onboarding.birthDateDescription',
              'Age is a key factor in your metabolism.'
            )}
          </p>
          <div className="flex justify-center">
            <Input
              type="date"
              aria-label={t('onboarding.pickDate', 'Pick a date')}
              value={formData.birthDate}
              min="1900-01-01"
              max={today}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
              }
              className="h-14 w-64 text-lg"
            />
          </div>
          <Button
            onClick={nextStep}
            disabled={!formData.birthDate}
            className="w-full mt-12 h-14 text-lg rounded-full"
          >
            {t('onboarding.continue', 'Continue')}
          </Button>
        </>
      );
    case 6:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('onboarding.bodyFatQuestion', 'Estimate your body fat')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              'onboarding.bodyFatDescription',
              'A visual estimate is sufficient.'
            )}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ['Low (<15%)', 'bodyFatLow'],
                ['Medium (15-25%)', 'bodyFatMedium'],
                ['High (25-35%)', 'bodyFatHigh'],
                ['Very High (>35%)', 'bodyFatVeryHigh'],
              ] as const
            ).map(([range, key]) => (
              <button
                key={range}
                onClick={() => handleSelect('bodyFatRange', range)}
                className={`p-6 rounded-xl border-2 bg-card text-foreground font-semibold transition-all duration-200
                     ${
                       formData.bodyFatRange === range
                         ? 'border-primary'
                         : 'border-border hover:border-primary/50 hover:shadow-sm'
                     }`}
              >
                {t(`onboarding.${key}`, range)}
              </button>
            ))}
          </div>
        </>
      );
    case 7:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t(
              'onboarding.targetWeightQuestion',
              'What is your target weight?'
            )}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('onboarding.targetWeightDescription', 'Your ultimate goal.')}
          </p>
          <div className="flex items-center justify-center">
            <UnitInput
              id="target-weight"
              type="weight"
              unit="kg"
              value={formData.targetWeight}
              onChange={(val) =>
                handleInputChange(
                  'targetWeight',
                  val !== null ? val.toString() : ''
                )
              }
              className="w-64"
            />
          </div>
          <Button
            onClick={nextStep}
            disabled={!formData.targetWeight}
            className="w-full mt-12 h-14 text-lg rounded-full"
          >
            {t('onboarding.continue', 'Continue')}
          </Button>
        </>
      );
    case 8:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-8">
            {t(
              'onboarding.mealsQuestion',
              'How many meals do you eat in a typical day?'
            )}
          </h1>
          {[3, 4, 5, 6].map((num) => (
            <OptionButton
              key={num}
              label={t('onboarding.mealsPerDay', '{{number}} meals per day', {
                number: num,
              })}
              isSelected={formData.mealsPerDay === num}
              onClick={() => handleSelect('mealsPerDay', num)}
            />
          ))}
        </>
      );
    case 9:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-8">
            {t('onboarding.activityLevelTitle', 'How often do you exercise?')}
          </h1>
          <OptionButton
            label={t('onboarding.activityNotMuch', 'Not Much')}
            subLabel={t(
              'onboarding.activityNotMuchDesc',
              'Sedentary lifestyle, little to no exercise.'
            )}
            isSelected={formData.activityLevel === 'not_much'}
            onClick={() => handleSelect('activityLevel', 'not_much')}
          />
          <OptionButton
            label={t('onboarding.activityLight', 'Light (1-2 days/week)')}
            subLabel={t(
              'onboarding.activityLightDesc',
              'Light exercise or sports.'
            )}
            isSelected={formData.activityLevel === 'light'}
            onClick={() => handleSelect('activityLevel', 'light')}
          />
          <OptionButton
            label={t('onboarding.activityModerate', 'Moderate (3-5 days/week)')}
            subLabel={t(
              'onboarding.activityModerateDesc',
              'Moderate exercise or sports.'
            )}
            isSelected={formData.activityLevel === 'moderate'}
            onClick={() => handleSelect('activityLevel', 'moderate')}
          />
          <OptionButton
            label={t('onboarding.activityHeavy', 'Heavy (6-7 days/week)')}
            subLabel={t(
              'onboarding.activityHeavyDesc',
              'Hard exercise or sports.'
            )}
            isSelected={formData.activityLevel === 'heavy'}
            onClick={() => handleSelect('activityLevel', 'heavy')}
          />
        </>
      );
    case 10:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-8">
            {t(
              'onboarding.addBurnedCaloriesTitle',
              'Add burned calories from exercise?'
            )}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              'onboarding.addBurnedCaloriesDesc',
              'If you exercise, should we add those calories back to your daily budget?'
            )}
          </p>
          <div className="flex gap-4 w-full">
            <button
              onClick={() => handleSelect('addBurnedCalories', false)}
              className={`flex-1 p-6 rounded-full text-lg font-bold border-2 transition-all
                  ${
                    formData.addBurnedCalories === false
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-sm'
                  }
                `}
            >
              {t('common.no', 'No')}
            </button>
            <button
              onClick={() => handleSelect('addBurnedCalories', true)}
              className={`flex-1 p-6 rounded-full text-lg font-bold border-2 transition-all
                  ${
                    formData.addBurnedCalories === true
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50 hover:shadow-sm'
                  }
                `}
            >
              {t('common.yes', 'Yes')}
            </button>
          </div>
        </>
      );
    case 11:
      return (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-700">
          <div className="relative flex h-32 w-32 mb-8">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20"></span>
            <span className="relative inline-flex rounded-full h-32 w-32 bg-card items-center justify-center border-4 border-primary">
              <Utensils className="h-12 w-12 text-primary" />
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground text-center">
            {t(
              'onboarding.preparingPlan',
              'Preparing your personalized plan...'
            )}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t(
              'onboarding.preparingPlanDescription',
              'Crunching the numbers based on your unique profile.'
            )}
          </p>
        </div>
      );
    default:
      return null;
  }
};
