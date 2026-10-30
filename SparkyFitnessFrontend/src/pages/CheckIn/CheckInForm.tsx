import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTranslation } from 'react-i18next';
import { UnitInput } from '@/components/ui/UnitInput';
import { CustomCategoriesResponse } from '@workspace/shared';
import { CheckInPlaceholders } from '@/types/checkin';
import { AlertTriangle, ChevronDown, History } from 'lucide-react';
import {
  healthMetricLabel,
  healthMetricUnitLabel,
} from '@/utils/healthMetricLabels';
import { fmtTr } from '@/utils/numberFormatting';
import {
  describeValue,
  outOfRangeValue,
  rangeHint,
  type MeasurementField as RangeField,
} from './measurementRanges';

interface UseLastButtonProps {
  value: string;
  // Text custom categories carry a non-numeric value, so this is not number-only.
  lastValue: number | string | null;
  onAdopt: (value: string) => void;
}

// Fills an empty field with the carried-forward value shown in its
// placeholder, turning it into a real entry for the selected day.
const UseLastButton: React.FC<UseLastButtonProps> = ({
  value,
  lastValue,
  onAdopt,
}) => {
  if (value !== '' || lastValue === null) return null;
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-8 gap-1.5 px-0 text-xs underline [&_svg]:size-3.5"
      onClick={() => onAdopt(lastValue.toString())}
    >
      <History />
      Sonuncuyu kullan
    </Button>
  );
};

interface MeasurementFieldProps {
  id: string;
  label: React.ReactNode;
  actions?: React.ReactNode;
  /** Shown under the control when the value looks like a typo. */
  warning?: string | null;
  children: React.ReactNode;
}

const MeasurementField = ({
  id,
  label,
  actions,
  warning,
  children,
}: MeasurementFieldProps) => (
  <div className="grid min-w-0 gap-1">
    <div className="flex min-h-8 min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <Label htmlFor={id} className="min-w-0 break-words leading-5">
        {label}
      </Label>
      {actions && (
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {actions}
        </div>
      )}
    </div>
    <div className="min-w-0">{children}</div>
    {warning && (
      <p
        role="status"
        className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
      >
        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
        {warning}
      </p>
    )}
  </div>
);

/** A plain number field with its unit inside the box, like UnitInput. */
const SuffixInput = ({
  id,
  unit,
  value,
  onChange,
  placeholder,
  step,
}: {
  id: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
}) => (
  <div className="relative">
    <Input
      id={id}
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 pr-14"
    />
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
      {unit}
    </span>
  </div>
);

interface FormSectionProps {
  title: string;
  summary: string;
  /** A section holding values for the day opens by itself. */
  hasValues: boolean;
  children: React.ReactNode;
}

const FormSection = ({
  title,
  summary,
  hasValues,
  children,
}: FormSectionProps) => {
  const [open, setOpen] = useState<boolean | null>(null);
  return (
    <Collapsible
      open={open ?? hasValues}
      onOpenChange={setOpen}
      className="border-t border-border/60"
    >
      <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left">
        <span className="min-w-0">
          <span className="block text-base font-semibold text-foreground">
            {title}
          </span>
          <span className="block text-sm text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid grid-cols-1 gap-4 pb-4 pt-1 md:grid-cols-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface CheckInFormProps {
  bodyFatPercentage: string;
  // Required, not optional: optional props plus `set...?.()` calls previously let
  // these render as permanently-empty inputs without failing typecheck.
  muscleMassKg: string;
  boneMassKg: string;
  bodyWaterPercentage: string;
  bmr: string;
  customCategories: CustomCategoriesResponse[];
  customNotes: Record<string, string>;
  customPlaceholders: Record<string, number | string | null>;
  customValues: Record<string, string>;
  handleCalculateBodyFat: () => Promise<void>;
  handleSubmit: (e?: React.SyntheticEvent) => Promise<void>;
  height: string;
  hips: string;
  loading: boolean;
  neck: string;
  placeholders: CheckInPlaceholders;
  setBodyFatPercentage: (value: string) => void;
  setMuscleMassKg: (value: string) => void;
  setBoneMassKg: (value: string) => void;
  setBodyWaterPercentage: (value: string) => void;
  setBmr: (value: string) => void;
  setCustomNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCustomValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeight: (value: string) => void;
  setHips: (value: string) => void;
  setNeck: (value: string) => void;
  setSteps: (value: string) => void;
  setUseMostRecentForCalculation: (value: boolean) => void;
  setWaist: (value: string) => void;
  setWeight: (value: string) => void;
  shouldConvertCustomMeasurement: (unit: string) => boolean;
  steps: string;
  useMostRecentForCalculation: boolean;
  waist: string;
  weight: string;
}

/**
 * Turkish placeholder for a metric field: the last value ("78,5") when there
 * is one, else an example. Imperial units keep UnitInput's own placeholder.
 */
const metricPlaceholder = (
  unit: string,
  last: number | null,
  example: string
): string | undefined => {
  if (unit !== 'kg' && unit !== 'cm') return undefined;
  return last != null ? fmtTr(last, 2) : example;
};

export const CheckInForm: React.FC<CheckInFormProps> = ({
  bodyFatPercentage,
  muscleMassKg,
  boneMassKg,
  bodyWaterPercentage,
  bmr,
  customNotes,
  customCategories,
  customPlaceholders,
  customValues,
  handleCalculateBodyFat,
  handleSubmit,
  height,
  hips,
  loading,
  neck,
  placeholders,
  setBodyFatPercentage,
  setMuscleMassKg,
  setBoneMassKg,
  setBodyWaterPercentage,
  setBmr,
  setCustomNotes,
  setCustomValues,
  setHeight,
  setHips,
  setNeck,
  setSteps,
  setUseMostRecentForCalculation,
  setWaist,
  setWeight,
  shouldConvertCustomMeasurement,
  steps,
  useMostRecentForCalculation,
  waist,
  weight,
}) => {
  const {
    weightUnit: defaultWeightUnit,
    measurementUnit: defaultMeasurementUnit,
  } = usePreferences();
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Range checks run on the stored metric values. Imperial users see their
  // own unit in the field, so the kg/cm hint only shows for metric units.
  const metricWeight = defaultWeightUnit === 'kg';
  const metricLength = defaultMeasurementUnit === 'cm';
  const fieldValues: [RangeField, string, boolean][] = [
    ['weight', weight, metricWeight],
    ['bodyFat', bodyFatPercentage, true],
    ['height', height, metricLength],
    ['neck', neck, metricLength],
    ['waist', waist, metricLength],
    ['hips', hips, metricLength],
    ['muscleMass', muscleMassKg, metricWeight],
    ['boneMass', boneMassKg, metricWeight],
    ['bodyWater', bodyWaterPercentage, true],
    ['bmr', bmr, true],
    ['steps', steps, true],
  ];
  const outOfRange = fieldValues.flatMap(([field, raw, metric]) => {
    const value = metric ? outOfRangeValue(field, raw) : null;
    return value === null ? [] : [{ field, value }];
  });
  const warningFor = (field: RangeField) =>
    outOfRange.some((item) => item.field === field)
      ? `Bu değer alışılmışın dışında. ${rangeHint(field)} Doğru mu?`
      : null;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (outOfRange.length > 0) {
      setConfirmOpen(true);
      return;
    }
    void handleSubmit(e);
  };

  const bodyValues = [height, neck, waist, hips].some((v) => v !== '');
  const compositionValues = [
    muscleMassKg,
    boneMassKg,
    bodyWaterPercentage,
    bmr,
  ].some((v) => v !== '');
  const otherValues =
    steps !== '' ||
    customCategories.some((c) => (customValues[c.id] ?? '') !== '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Ölçüm ekle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MeasurementField
              id="weight"
              label={t('checkIn.weight', 'Weight')}
              warning={warningFor('weight')}
              actions={
                <UseLastButton
                  value={weight}
                  lastValue={placeholders.weight}
                  onAdopt={setWeight}
                />
              }
            >
              <UnitInput
                id="weight"
                type="weight"
                unit={defaultWeightUnit}
                value={weight}
                placeholderValue={placeholders.weight}
                placeholder={metricPlaceholder(
                  defaultWeightUnit,
                  placeholders.weight,
                  'örn. 78,5'
                )}
                inputClassName="h-12 text-lg"
                onChange={(val) =>
                  setWeight(val !== null ? val.toString() : '')
                }
              />
            </MeasurementField>

            <MeasurementField
              id="bodyFat"
              label="Vücut yağı (isteğe bağlı)"
              warning={warningFor('bodyFat')}
              actions={
                <UseLastButton
                  value={bodyFatPercentage}
                  lastValue={placeholders.bodyFatPercentage}
                  onAdopt={setBodyFatPercentage}
                />
              }
            >
              <SuffixInput
                id="bodyFat"
                unit="%"
                step="0.1"
                value={bodyFatPercentage}
                onChange={setBodyFatPercentage}
                placeholder={
                  placeholders.bodyFatPercentage !== null
                    ? fmtTr(placeholders.bodyFatPercentage)
                    : 'örn. 18,5'
                }
              />
            </MeasurementField>
          </div>

          <div>
            <FormSection
              title="Vücut ölçüleri"
              summary="Boy, boyun, bel, kalça"
              hasValues={bodyValues}
            >
              <MeasurementField
                id="height"
                label={t('checkIn.height', 'Height')}
                warning={warningFor('height')}
                actions={
                  <UseLastButton
                    value={height}
                    lastValue={placeholders.height}
                    onAdopt={setHeight}
                  />
                }
              >
                <UnitInput
                  id="height"
                  type="height"
                  unit={defaultMeasurementUnit}
                  value={height}
                  placeholderValue={placeholders.height}
                  placeholder={metricPlaceholder(
                    defaultMeasurementUnit,
                    placeholders.height,
                    'örn. 175'
                  )}
                  inputClassName="h-11"
                  onChange={(val) =>
                    setHeight(val !== null ? val.toString() : '')
                  }
                />
              </MeasurementField>

              <MeasurementField
                id="neck"
                label={t('checkIn.neck', 'Neck')}
                warning={warningFor('neck')}
                actions={
                  <UseLastButton
                    value={neck}
                    lastValue={placeholders.neck}
                    onAdopt={setNeck}
                  />
                }
              >
                <UnitInput
                  id="neck"
                  type="measurement"
                  unit={defaultMeasurementUnit}
                  value={neck}
                  placeholderValue={placeholders.neck}
                  placeholder={metricPlaceholder(
                    defaultMeasurementUnit,
                    placeholders.neck,
                    'örn. 38'
                  )}
                  inputClassName="h-11"
                  onChange={(val) =>
                    setNeck(val !== null ? val.toString() : '')
                  }
                />
              </MeasurementField>

              <MeasurementField
                id="waist"
                label={t('checkIn.waist', 'Waist')}
                warning={warningFor('waist')}
                actions={
                  <UseLastButton
                    value={waist}
                    lastValue={placeholders.waist}
                    onAdopt={setWaist}
                  />
                }
              >
                <UnitInput
                  id="waist"
                  type="measurement"
                  unit={defaultMeasurementUnit}
                  value={waist}
                  placeholderValue={placeholders.waist}
                  placeholder={metricPlaceholder(
                    defaultMeasurementUnit,
                    placeholders.waist,
                    'örn. 85'
                  )}
                  inputClassName="h-11"
                  onChange={(val) =>
                    setWaist(val !== null ? val.toString() : '')
                  }
                />
              </MeasurementField>

              <MeasurementField
                id="hips"
                label={t('checkIn.hips', 'Hips')}
                warning={warningFor('hips')}
                actions={
                  <UseLastButton
                    value={hips}
                    lastValue={placeholders.hips}
                    onAdopt={setHips}
                  />
                }
              >
                <UnitInput
                  id="hips"
                  type="measurement"
                  unit={defaultMeasurementUnit}
                  value={hips}
                  placeholderValue={placeholders.hips}
                  placeholder={metricPlaceholder(
                    defaultMeasurementUnit,
                    placeholders.hips,
                    'örn. 98'
                  )}
                  inputClassName="h-11"
                  onChange={(val) =>
                    setHips(val !== null ? val.toString() : '')
                  }
                />
              </MeasurementField>

              <div className="space-y-2 rounded-xl bg-raised p-3 md:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Vücut yağını boy, bel, boyun ve kalça ölçülerinden hesapla.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-h-11 items-center gap-2">
                    <Switch
                      id="use-most-recent-toggle"
                      checked={useMostRecentForCalculation}
                      onCheckedChange={setUseMostRecentForCalculation}
                    />
                    <Label
                      htmlFor="use-most-recent-toggle"
                      className="leading-5"
                    >
                      Son kayıtlı ölçüleri kullan
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={handleCalculateBodyFat}
                  >
                    Vücut yağını hesapla
                  </Button>
                </div>
              </div>
            </FormSection>

            {/* Smart-scale composition. Masses go through UnitInput so they
                follow the weight-unit preference like weight does; state stays
                metric (kg). BMI is derived from weight and height where used. */}
            <FormSection
              title="Vücut kompozisyonu"
              summary="Akıllı tartı değerleri: kas, kemik, su, dinlenme kalorisi"
              hasValues={compositionValues}
            >
              <MeasurementField
                id="muscleMass"
                label={t('checkIn.muscleMass', 'Muscle Mass')}
                warning={warningFor('muscleMass')}
              >
                <UnitInput
                  id="muscleMass"
                  type="weight"
                  unit={defaultWeightUnit}
                  value={muscleMassKg}
                  placeholder={metricPlaceholder(
                    defaultWeightUnit,
                    null,
                    'örn. 32,5'
                  )}
                  inputClassName="h-11"
                  onChange={(val) =>
                    setMuscleMassKg(val !== null ? val.toString() : '')
                  }
                />
              </MeasurementField>

              <MeasurementField
                id="boneMass"
                label={t('checkIn.boneMass', 'Bone Mass')}
                warning={warningFor('boneMass')}
              >
                <UnitInput
                  id="boneMass"
                  type="weight"
                  unit={defaultWeightUnit}
                  value={boneMassKg}
                  placeholder={metricPlaceholder(
                    defaultWeightUnit,
                    null,
                    'örn. 3,2'
                  )}
                  inputClassName="h-11"
                  onChange={(val) =>
                    setBoneMassKg(val !== null ? val.toString() : '')
                  }
                />
              </MeasurementField>

              <MeasurementField
                id="bodyWater"
                label="Vücut suyu"
                warning={warningFor('bodyWater')}
              >
                <SuffixInput
                  id="bodyWater"
                  unit="%"
                  step="0.1"
                  value={bodyWaterPercentage}
                  onChange={setBodyWaterPercentage}
                  placeholder="örn. 55"
                />
              </MeasurementField>

              <MeasurementField
                id="bmr"
                label="Dinlenme kalorisi (BMH)"
                warning={warningFor('bmr')}
              >
                <SuffixInput
                  id="bmr"
                  unit="kcal"
                  step="1"
                  value={bmr}
                  onChange={setBmr}
                  placeholder={
                    placeholders.bmr ? fmtTr(placeholders.bmr, 0) : 'örn. 1.650'
                  }
                />
              </MeasurementField>
            </FormSection>

            <FormSection
              title="Diğer"
              summary={
                customCategories.length > 0
                  ? 'Adım ve kendi ölçülerin'
                  : 'Günlük adım'
              }
              hasValues={otherValues}
            >
              <MeasurementField
                id="steps"
                label={t('checkIn.steps', 'Steps')}
                warning={warningFor('steps')}
              >
                <SuffixInput
                  id="steps"
                  unit="adım"
                  step="1"
                  value={steps}
                  onChange={setSteps}
                  placeholder="örn. 8.000"
                />
              </MeasurementField>

              {customCategories.map((category) => {
                const categoryLabel = healthMetricLabel(
                  category.name,
                  category.display_name,
                  t
                );
                const isConvertible = shouldConvertCustomMeasurement(
                  category.measurement_type
                );
                const unitToUse = isConvertible
                  ? category.measurement_type === 'kg' ||
                    category.measurement_type === 'lbs' ||
                    category.measurement_type === 'st_lbs'
                    ? defaultWeightUnit
                    : defaultMeasurementUnit
                  : category.measurement_type;
                const displayUnit = healthMetricUnitLabel(unitToUse, t);
                const currentValue = customValues[category.id] || '';
                // Previous value for this category, offered only while the
                // field is empty. The server returns manual values only, so a
                // health sample can never be adopted here.
                const previousValue = customPlaceholders[category.id] ?? null;
                const offerPrevious =
                  currentValue === '' && previousValue !== null;
                const adoptPrevious = () =>
                  setCustomValues((prev) => ({
                    ...prev,
                    [category.id]: String(previousValue),
                  }));
                const isNumeric = category.data_type === 'numeric';

                return (
                  <MeasurementField
                    key={category.id}
                    id={`custom-${category.id}`}
                    label={`${categoryLabel} (${displayUnit})`}
                    actions={
                      <UseLastButton
                        value={currentValue}
                        lastValue={offerPrevious ? previousValue : null}
                        onAdopt={adoptPrevious}
                      />
                    }
                  >
                    {isConvertible && isNumeric ? (
                      <UnitInput
                        id={`custom-${category.id}`}
                        type={
                          category.measurement_type === 'kg' ||
                          category.measurement_type === 'lbs' ||
                          category.measurement_type === 'st_lbs'
                            ? 'weight'
                            : 'measurement'
                        }
                        unit={unitToUse}
                        value={currentValue}
                        placeholderValue={
                          offerPrevious ? Number(previousValue) : null
                        }
                        placeholder={
                          offerPrevious
                            ? metricPlaceholder(
                                unitToUse,
                                Number(previousValue),
                                ''
                              )
                            : undefined
                        }
                        inputClassName="h-11"
                        onChange={(val) => {
                          setCustomValues((prev) => ({
                            ...prev,
                            [category.id]: val !== null ? val.toString() : '',
                          }));
                        }}
                      />
                    ) : (
                      <Input
                        id={`custom-${category.id}`}
                        type={isNumeric ? 'number' : 'text'}
                        step={isNumeric ? '0.01' : undefined}
                        className="h-11"
                        value={currentValue}
                        onChange={(e) => {
                          setCustomValues((prev) => ({
                            ...prev,
                            [category.id]: e.target.value,
                          }));
                        }}
                        placeholder={
                          offerPrevious
                            ? isNumeric && !Number.isNaN(Number(previousValue))
                              ? fmtTr(Number(previousValue), 2)
                              : String(previousValue)
                            : `${categoryLabel} gir`
                        }
                      />
                    )}
                    <Input
                      id={`custom-notes-${category.id}`}
                      type="text"
                      value={customNotes[category.id] || ''}
                      onChange={(e) => {
                        setCustomNotes((prev) => ({
                          ...prev,
                          [category.id]: e.target.value,
                        }));
                      }}
                      placeholder="Not (isteğe bağlı)"
                      className="mt-2 h-11"
                    />
                  </MeasurementField>
                );
              })}
            </FormSection>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="h-12 w-full"
          >
            {loading ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </form>
      </CardContent>
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Bu değerler doğru mu?"
        description={
          <div className="space-y-2">
            <p>Şu değerler alışılmışın dışında görünüyor:</p>
            <ul className="list-disc space-y-1 pl-5 text-foreground">
              {outOfRange.map(({ field, value }) => (
                <li key={field}>
                  {describeValue(field, value)}{' '}
                  <span className="text-muted-foreground">
                    ({rangeHint(field)})
                  </span>
                </li>
              ))}
            </ul>
            <p>Yanlış yazdıysan geri dönüp düzelt.</p>
          </div>
        }
        confirmLabel="Yine de kaydet"
        onConfirm={() => {
          setConfirmOpen(false);
          void handleSubmit();
        }}
      />
    </Card>
  );
};
