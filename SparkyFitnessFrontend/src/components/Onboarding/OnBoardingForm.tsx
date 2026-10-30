import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import ThemeToggle from '@/components/ThemeToggle';
import PersonalPlan from './PersonalPlan';
import { OnboardingSteps } from './OnBoardingSteps';
import { Profile } from '@/types/settings';
import { OnboardingData, Sex } from '@/types/onboarding';
import { RecentCheckInMeasurementsResponse } from '@workspace/shared';
import { useSkipOnboarding } from '@/hooks/Onboarding/useOnboarding';
import { useTranslation } from 'react-i18next';

interface OnBoardingProps {
  onOnboardingComplete: () => void;
}
interface OnBoardingFormProps extends OnBoardingProps {
  profileData?: Profile;
  weightData?: RecentCheckInMeasurementsResponse;
  heightData?: RecentCheckInMeasurementsResponse;
}

// DG FIT: no food-source (API key) step; the shared providers are enough.
const LAST_INPUT_STEP = 10;
const LOADING_STEP = 11;
const PLAN_STEP = 12;

export const OnBoardingForm = ({
  onOnboardingComplete,
  profileData,
  weightData,
  heightData,
}: OnBoardingFormProps) => {
  const { t } = useTranslation();
  const { dateFormat } = usePreferences();

  const skipOnboardingMutation = useSkipOnboarding();

  // State management
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<OnboardingData>(() => {
    let currentWeight: number | '' = '';
    if (weightData && weightData.weight) {
      currentWeight = Number(weightData.weight.toFixed(1));
    }

    let currentHeight: number | '' = '';
    if (heightData && heightData.height) {
      currentHeight = Number(heightData.height.toFixed(1));
    }

    return {
      sex: (profileData?.gender as Sex) || '',
      primaryGoal: '',
      currentWeight: currentWeight,
      height: currentHeight,
      birthDate: profileData?.date_of_birth || '',
      bodyFatRange: '',
      targetWeight: '',
      mealsPerDay: 3,
      activityLevel: '',
      addBurnedCalories: false,
    };
  });

  // DG FIT is metric-only, so onboarding does not offer lbs/inch toggles.
  const weightUnit = 'kg';
  const heightUnit = 'cm';
  const lastInputStep = LAST_INPUT_STEP;

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () =>
    setStep((prev) => {
      // Skip the auto-advancing loading screen when going back from the plan.
      if (prev === PLAN_STEP) return lastInputStep;
      return Math.max(1, prev - 1);
    });

  useEffect(() => {
    if (step === LOADING_STEP) {
      const timer = setTimeout(() => {
        setStep(PLAN_STEP);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const renderStepContent = () => {
    if (step === PLAN_STEP) {
      return (
        <PersonalPlan
          formData={formData}
          localDateFormat={dateFormat}
          heightUnit={heightUnit}
          weightUnit={weightUnit}
          onOnboardingComplete={onOnboardingComplete}
        />
      );
    }

    return (
      <OnboardingSteps
        step={step}
        formData={formData}
        setFormData={setFormData}
        nextStep={nextStep}
      />
    );
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ '--color-ring': 'hsl(var(--primary))' } as React.CSSProperties}
    >
      <div className="px-4 pt-6 pb-2 flex items-center sticky top-0 bg-background z-10">
        {(step > 1 && step <= lastInputStep) || step === PLAN_STEP ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={prevStep}
            className="mr-2 -ml-2"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        ) : (
          <div className="w-10"></div>
        )}

        {step <= lastInputStep && (
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(step / lastInputStep) * 100}%` }}
            />
          </div>
        )}

        {step <= lastInputStep && (
          <Button
            onClick={() => {
              skipOnboardingMutation.mutate(undefined, {
                onSettled: onOnboardingComplete,
              });
            }}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground font-semibold ml-2 w-16"
            disabled={skipOnboardingMutation.isPending}
          >
            {t('onboarding.skip', 'Skip')}
          </Button>
        )}

        <div className="ml-auto -mr-2">
          <ThemeToggle />
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col px-6 w-full py-4 ${step === PLAN_STEP ? 'max-w-7xl' : 'max-w-md'} mx-auto`}
      >
        {renderStepContent()}
      </div>
    </div>
  );
};
