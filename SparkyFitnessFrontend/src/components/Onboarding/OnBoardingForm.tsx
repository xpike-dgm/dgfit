import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import PersonalPlan from './PersonalPlan';
import { OnboardingSteps } from './OnBoardingSteps';
import { Profile } from '@/types/settings';
import { OnboardingData, Sex } from '@/types/onboarding';
import { RecentCheckInMeasurementsResponse } from '@workspace/shared';
import { useSkipOnboarding } from '@/hooks/Onboarding/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
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
// Meals per day moved to the plan's "Gelişmiş ayarlar".
const LAST_INPUT_STEP = 9;
const LOADING_STEP = 10;
const PLAN_STEP = 11;

const LOADING_MESSAGES = [
  'Kalori ihtiyacın hesaplanıyor…',
  'Protein, karbonhidrat ve yağ ayarlanıyor…',
  'Su hedefin belirleniyor…',
];
const LOADING_MESSAGE_MS = 600;

interface OnboardingDraft {
  version: 1;
  step: number;
  formData: OnboardingData;
}

const draftKey = (userId: string | undefined) =>
  `dgfit-onboarding-draft:${userId ?? 'anon'}`;

/** Answers kept in this browser so a reload or app switch does not restart. */
const readDraft = (userId: string | undefined): OnboardingDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (
      draft.version !== 1 ||
      typeof draft.step !== 'number' ||
      !draft.formData
    ) {
      return null;
    }
    return draft as OnboardingDraft;
  } catch {
    return null;
  }
};

const writeDraft = (userId: string | undefined, draft: OnboardingDraft) => {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    // Private mode or full storage: answers just are not kept.
  }
};

const clearDraft = (userId: string | undefined) => {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    // Nothing to clean up.
  }
};

export const OnBoardingForm = ({
  onOnboardingComplete,
  profileData,
  weightData,
  heightData,
}: OnBoardingFormProps) => {
  const { t } = useTranslation();
  const { dateFormat } = usePreferences();
  const { user } = useAuth();
  const userId = user?.id;

  const skipOnboardingMutation = useSkipOnboarding();

  const [initialDraft] = useState(() => readDraft(userId));

  // State management
  const [step, setStep] = useState(() => {
    const saved = initialDraft?.step ?? 1;
    // The loading screen only makes sense right after the last answer.
    if (saved === LOADING_STEP) return PLAN_STEP;
    return Math.min(Math.max(1, saved), PLAN_STEP);
  });
  const [loadingIndex, setLoadingIndex] = useState(0);

  const [formData, setFormData] = useState<OnboardingData>(() => {
    if (initialDraft) return initialDraft.formData;

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
      // Unanswered until the person picks one; the plan treats it as "no".
      addBurnedCalories: undefined,
    };
  });

  useEffect(() => {
    writeDraft(userId, { version: 1, step, formData });
  }, [userId, step, formData]);

  const finish = () => {
    clearDraft(userId);
    onOnboardingComplete();
  };

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
    if (step !== LOADING_STEP) return;
    setLoadingIndex(0);
    const timers = LOADING_MESSAGES.map((_, index) =>
      setTimeout(() => setLoadingIndex(index), index * LOADING_MESSAGE_MS)
    );
    timers.push(
      setTimeout(
        () => setStep(PLAN_STEP),
        LOADING_MESSAGES.length * LOADING_MESSAGE_MS
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const renderStepContent = () => {
    if (step === PLAN_STEP) {
      return (
        <PersonalPlan
          formData={formData}
          localDateFormat={dateFormat}
          heightUnit={heightUnit}
          weightUnit={weightUnit}
          onOnboardingComplete={finish}
        />
      );
    }

    return (
      <OnboardingSteps
        step={step}
        formData={formData}
        setFormData={setFormData}
        nextStep={nextStep}
        loadingMessage={LOADING_MESSAGES[loadingIndex]}
      />
    );
  };

  const showBack = (step > 1 && step <= lastInputStep) || step === PLAN_STEP;
  const showProgress = step <= LOADING_STEP;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ '--color-ring': 'hsl(var(--primary))' } as React.CSSProperties}
    >
      <div className="px-4 pt-[max(env(safe-area-inset-top),16px)] pb-2 flex items-center gap-2 sticky top-0 bg-background z-10">
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Geri"
            onClick={prevStep}
            className="-ml-2 h-11 w-11 shrink-0"
          >
            <ChevronLeft className="!h-7 !w-7" />
          </Button>
        ) : (
          <div className="h-11 w-9 shrink-0" />
        )}

        {showProgress ? (
          <div
            className="flex-1 h-2 bg-muted rounded-full overflow-hidden"
            role="progressbar"
            aria-label="Kurulum ilerlemesi"
            aria-valuemin={0}
            aria-valuemax={lastInputStep}
            aria-valuenow={Math.min(step, lastInputStep)}
          >
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${(Math.min(step, lastInputStep) / lastInputStep) * 100}%`,
              }}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {step <= lastInputStep ? (
          <Button
            type="button"
            onClick={() => {
              skipOnboardingMutation.mutate(undefined, {
                onSettled: finish,
              });
            }}
            variant="ghost"
            className="-mr-2 h-11 min-w-16 shrink-0 font-semibold text-muted-foreground hover:text-foreground"
            disabled={skipOnboardingMutation.isPending}
          >
            {t('onboarding.skip', 'Skip')}
          </Button>
        ) : (
          <div className="h-11 w-9 shrink-0" />
        )}
      </div>

      <div
        className={`flex-1 flex flex-col px-6 w-full py-4 ${step === PLAN_STEP ? 'max-w-7xl' : 'max-w-md'} mx-auto`}
      >
        {renderStepContent()}
      </div>
    </div>
  );
};
