import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Utensils } from 'lucide-react';
import { localDateToDay } from '@workspace/shared';
import { OptionButton } from './OptionButton';
import { useTranslation } from 'react-i18next';
import { OnboardingData } from '@/types/onboarding';
import { parseDecimalInput } from '@/utils/decimalInput';
import { fmtTr } from '@/utils/numberFormatting';
import { cn } from '@/lib/utils';

interface OnboardingStepsProps {
  step: number;
  formData: OnboardingData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  nextStep: () => void;
  /** Text under the loading animation; changes while the plan is "built". */
  loadingMessage?: string;
}

type NumberField = 'currentWeight' | 'height' | 'targetWeight';

/** Plausible ranges; outside them "Devam" stays off and a hint explains why. */
const RANGES: Record<NumberField, { min: number; max: number }> = {
  currentWeight: { min: 30, max: 300 },
  targetWeight: { min: 30, max: 300 },
  height: { min: 100, max: 250 },
};

const BODY_FAT_OPTIONS = [
  { value: 'Low (<15%)', title: 'Düşük', range: "%15'in altı", width: 6 },
  { value: 'Medium (15-25%)', title: 'Orta', range: '%15–25', width: 9 },
  { value: 'High (25-35%)', title: 'Yüksek', range: '%25–35', width: 12 },
  {
    value: 'Very High (>35%)',
    title: 'Çok yüksek',
    range: "%35'in üstü",
    width: 15,
  },
] as const;

/** A plain standing figure whose waist gets wider bucket by bucket. */
const BodyFigure = ({ width }: { width: number }) => (
  <svg viewBox="0 0 40 56" className="h-12 w-10" aria-hidden="true">
    <circle cx="20" cy="7" r="5" className="fill-current" />
    <rect
      x={20 - width / 2 - 2}
      y="14"
      width={width + 4}
      height="22"
      rx={Math.min(8, width / 2 + 2)}
      className="fill-current"
    />
    <rect x="15" y="34" width="4" height="20" rx="2" className="fill-current" />
    <rect x="21" y="34" width="4" height="20" rx="2" className="fill-current" />
  </svg>
);

/**
 * One big, full-width number field with its unit, focused on open so the
 * decimal keyboard is already up. Keeps the typed text ("78,") locally and
 * hands the parent a number while typing, so "Devam" works on the first tap.
 */
const BigNumberField = ({
  id,
  label,
  unit,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number | '';
  placeholder?: string;
  onChange: (value: number | '') => void;
}) => {
  const [text, setText] = useState(value === '' ? '' : String(value));
  return (
    <div className="relative w-full">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        autoFocus
        aria-label={label}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const parsed = parseDecimalInput(next);
          onChange(next.trim() === '' || Number.isNaN(parsed) ? '' : parsed);
        }}
        className="h-16 rounded-2xl bg-card pr-16 text-center text-3xl font-bold"
      />
      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
        {unit}
      </span>
    </div>
  );
};

export const OnboardingSteps = ({
  step,
  formData,
  setFormData,
  nextStep,
  loadingMessage,
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

  const setNumber = (field: NumberField, value: number | '') =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const numberStep = ({
    field,
    title,
    hint,
    unit,
    placeholder,
  }: {
    field: NumberField;
    title: string;
    hint: string;
    unit: string;
    placeholder?: string;
  }) => {
    const value = formData[field];
    const { min, max } = RANGES[field];
    const outOfRange = value !== '' && (value < min || value > max);
    const canContinue = value !== '' && !outOfRange;
    return (
      <form
        key={field}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) nextStep();
        }}
      >
        <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mb-8 text-muted-foreground">{hint}</p>
        <BigNumberField
          id={field}
          label={title}
          unit={unit}
          value={value}
          placeholder={placeholder}
          onChange={(next) => setNumber(field, next)}
        />
        <p
          className={cn(
            'mt-2 min-h-5 text-center text-sm',
            outOfRange ? 'text-danger-text' : 'text-muted-foreground'
          )}
          aria-live="polite"
        >
          {outOfRange
            ? `${fmtTr(min)} ile ${fmtTr(max)} ${unit} arasında bir değer yaz.`
            : 'Ondalık için virgül kullanabilirsin (ör. 78,5).'}
        </p>
        <Button
          type="submit"
          disabled={!canContinue}
          className="mt-8 h-14 w-full rounded-full text-lg"
        >
          {t('onboarding.continue', 'Continue')}
        </Button>
      </form>
    );
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
      return numberStep({
        field: 'currentWeight',
        title: t(
          'onboarding.currentWeightQuestion',
          'What is your current weight?'
        ),
        hint: 'Kilonu kg olarak yaz.',
        unit: 'kg',
        placeholder: '75',
      });
    case 4:
      return numberStep({
        field: 'height',
        title: t('onboarding.heightQuestion', 'What is your height?'),
        hint: 'Boyunu cm olarak yaz.',
        unit: 'cm',
        placeholder: '175',
      });
    case 5:
      return (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (formData.birthDate) nextStep();
          }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('onboarding.birthDateQuestion', 'When were you born?')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              'onboarding.birthDateDescription',
              'Age is a key factor in your metabolism.'
            )}
          </p>
          <Input
            type="date"
            lang="tr-TR"
            aria-label={t('onboarding.pickDate', 'Pick a date')}
            value={formData.birthDate}
            min="1900-01-01"
            max={today}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
            }
            className="h-16 w-full rounded-2xl bg-card text-center text-xl font-semibold"
          />
          <Button
            type="submit"
            disabled={!formData.birthDate}
            className="w-full mt-12 h-14 text-lg rounded-full"
          >
            {t('onboarding.continue', 'Continue')}
          </Button>
        </form>
      );
    case 6:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-2 text-balance">
            {t('onboarding.bodyFatQuestion', 'Estimate your body fat')}
          </h1>
          <p className="text-muted-foreground mb-6">
            İsteğe bağlı. Aynada gördüğüne en yakın olanı seç; bilmiyorsan
            atlayabilirsin.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {BODY_FAT_OPTIONS.map((option) => {
              const selected = formData.bodyFatRange === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleSelect('bodyFatRange', option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border-2 bg-card px-3 py-4 text-center transition-all duration-200',
                    selected
                      ? 'border-primary'
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  )}
                >
                  <span
                    className={
                      selected ? 'text-primary' : 'text-muted-foreground'
                    }
                  >
                    <BodyFigure width={option.width} />
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {option.title}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {option.range}
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData((prev) => ({ ...prev, bodyFatRange: '' }));
              nextStep();
            }}
            className="mt-6 h-14 w-full rounded-full text-base"
          >
            Bilmiyorum, atla
          </Button>
        </>
      );
    case 7:
      return numberStep({
        field: 'targetWeight',
        title: t(
          'onboarding.targetWeightQuestion',
          'What is your target weight?'
        ),
        hint: 'Ulaşmak istediğin kiloyu kg olarak yaz.',
        unit: 'kg',
        placeholder:
          formData.currentWeight === ''
            ? '70'
            : String(formData.currentWeight).replace('.', ','),
      });
    case 8:
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
    case 9:
      return (
        <>
          <h1 className="text-3xl font-bold text-foreground mb-3 text-balance">
            {t(
              'onboarding.addBurnedCaloriesTitle',
              'Add burned calories from exercise?'
            )}
          </h1>
          <p className="text-muted-foreground mb-8">
            Evet dersen spor yaptığın gün hakkın artar: antrenmanda 300 kcal
            yakarsan o gün 300 kcal daha fazla yiyebilirsin. Hayır dersen günlük
            hedefin sabit kalır; sporun zaten seçtiğin hareket seviyesinde
            hesaba katıldı.
          </p>
          <div className="flex w-full gap-3">
            {(
              [
                [false, t('common.no', 'No'), true],
                [true, t('common.yes', 'Yes'), false],
              ] as const
            ).map(([value, label, recommended]) => {
              const selected = formData.addBurnedCalories === value;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleSelect('addBurnedCalories', value)}
                  className={cn(
                    'relative flex min-h-16 flex-1 flex-col items-center justify-center rounded-2xl border-2 bg-card px-3 py-4 text-lg font-bold text-foreground transition-all',
                    selected
                      ? 'border-primary text-primary'
                      : 'border-input hover:border-primary/50 hover:shadow-sm'
                  )}
                >
                  {label}
                  {recommended && (
                    <span className="mt-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                      Önerilen
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      );
    case 10:
      return (
        <div className="flex flex-1 flex-col items-center justify-center pt-10 pb-16 animate-in fade-in duration-700">
          <div className="relative mb-10 flex h-32 w-32">
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
          <p
            className="mt-4 text-center text-muted-foreground"
            aria-live="polite"
          >
            {loadingMessage ??
              t(
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
