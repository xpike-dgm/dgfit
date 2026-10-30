import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Check,
  ChevronDown,
  Sparkles,
  Clock,
  CalendarDays,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { mealTypeLabel } from '@/pages/Diary/mealTypeLabel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/TimeInput';
import { NumericInput } from '@/components/NumericInput';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePreferences } from '@/contexts/PreferencesContext';
import { debug, info, warn, error } from '@/utils/logging';
import type { Food, FoodVariant } from '@/types/food';
import { useQueryClient } from '@tanstack/react-query';
import {
  foodVariantsOptions,
  useCreateFoodVariantMutation,
} from '@/hooks/Foods/useFoodVariants';
import {
  canAutoConvertToUnit,
  useUnitConversion,
} from '@/hooks/Foods/useUnitConversion';
import { useActiveAIService } from '@/hooks/AI/useAIServiceSettings';
import { useUserAiConfigAllowed } from '@/hooks/AI/useUserAiConfigAllowed';
import {
  CONFIDENCE_TONES,
  aiConfidenceSchema,
  shouldOfferAiConversion,
  userHourMinute,
  defaultMealTypeForTime,
  toHourMinute,
  type AiConfidence,
  type ConfidenceTone,
} from '@workspace/shared';
import {
  unitLabelTr,
  variantChipLabel,
  variantUnitLabel,
} from '@/utils/foodServing';
import {
  getAiConfidenceLabel,
  getAiEstimateLabel,
} from '@/utils/aiConfidenceLabels';

// Confidence tone classes for the saved-AI-variant indicator in the picker dropdown.
const AI_PICKER_ICON_TONE_CLASSES: Record<ConfidenceTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-rose-600 dark:text-rose-400',
};

// Filled-pill version of the same tones for the inline post-estimate badge.
const AI_ESTIMATE_BADGE_TONE_CLASSES: Record<ConfidenceTone, string> = {
  success: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

// Units offered for conversion in the amount picker (see `offeredUnits`).
const OFFERED_CONVERSION_UNITS = new Set([
  'g',
  'kg',
  'ml',
  'piece',
  'serving',
  'slice',
  'tbsp',
  'tsp',
  'cup',
]);

const getValidAiConfidence = (
  confidence: FoodVariant['ai_confidence']
): AiConfidence | null => {
  const result = aiConfidenceSchema.safeParse(confidence);
  return result.success ? result.data : null;
};

import { AiEstimateSection } from '@/components/FoodUnitSelector/AiEstimateSection';
import FavoriteStarButton from '@/components/FavoriteStarButton';
import { MarkdownView } from '@/components/ui/MarkdownView';
import { usableFoodImages } from '@/utils/foodImages';

interface FoodUnitSelectorProps {
  food: Food;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    food: Food,
    quantity: number,
    unit: string,
    selectedVariant: FoodVariant,
    entryTime?: string | null,
    mealType?: string | null,
    notes?: string | null
  ) => void;
  showUnitSelector?: boolean;
  initialQuantity?: number;
  initialUnit?: string;
  initialVariantId?: string;
  showTimeInput?: boolean;
  initialTime?: string;
  defaultMealTime?: string | null;
  /** Shown as "Öğüne ekle: <name>" under the food name. */
  mealLabel?: string;
  showMealTypeSelect?: boolean;
  availableMealTypes?: Array<{
    id: string;
    name: string;
    default_time?: string | null;
  }>;
}

const FoodUnitSelector = ({
  food,
  open,
  onOpenChange,
  onSelect,
  showUnitSelector,
  initialQuantity,
  initialUnit,
  initialVariantId,
  showTimeInput,
  initialTime,
  defaultMealTime,
  mealLabel,
  showMealTypeSelect,
  availableMealTypes,
}: FoodUnitSelectorProps) => {
  const { t } = useTranslation();
  const {
    loggingLevel,
    energyUnit,
    convertEnergy,
    aiAssistedConversions,
    timezone,
  } = usePreferences();
  debug(loggingLevel, 'FoodUnitSelector component rendered.', { food, open });

  // AI gate re-checked each render so toggling preferences mid-dialog takes effect live.
  const userAiConfigAllowedQuery = useUserAiConfigAllowed();
  const userAiConfigAllowed = userAiConfigAllowedQuery.data === true;
  const activeAiServiceQuery = useActiveAIService(open && userAiConfigAllowed);
  const aiEstimatesAvailable =
    aiAssistedConversions === true &&
    userAiConfigAllowed &&
    !!activeAiServiceQuery.data;

  const getEnergyUnitString = (unit: 'kcal' | 'kJ'): string => {
    return unit === 'kcal' ? 'kcal' : 'kJ';
  };

  const [variants, setVariants] = useState<FoodVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<FoodVariant | null>(
    null
  );
  const [quantity, setQuantity] = useState<number | undefined>(1);
  const [entryTime, setEntryTime] = useState('');
  // The note for THIS diary entry. Separate from the food's own note, which is
  // shown read-only above and never copied into the entry.
  const [entryNotes, setEntryNotes] = useState('');
  const [mealType, setMealType] = useState('');
  const [loading, setLoading] = useState(false);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (initialTime !== undefined) {
        setEntryTime(initialTime || '');
      } else {
        const { hour, minute } = userHourMinute(timezone);
        setEntryTime(
          `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        );
      }

      // The dialog is not unmounted between foods (Diary only toggles `open`
      // and never clears `selectedFood`), so a note typed for one food would
      // otherwise still be in the box when the next one is logged.
      setEntryNotes('');

      if (
        showMealTypeSelect &&
        availableMealTypes &&
        availableMealTypes.length > 0
      ) {
        const nowTime = userHourMinute(timezone);
        const matched = defaultMealTypeForTime(availableMealTypes, nowTime);
        setMealType(matched);
      }
    }
    wasOpenRef.current = open;
    // Initialization must only run on the open transition; initialTime and the
    // other inputs are snapshotted then (a minute-boundary initialTime change
    // while open must not re-trigger).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resolvedDefaultMealTime = (() => {
    if (showMealTypeSelect && availableMealTypes) {
      return (
        availableMealTypes.find(
          (t) => t.name.toLowerCase() === mealType.toLowerCase()
        )?.default_time || null
      );
    }
    return defaultMealTime;
  })();

  const handleSetCurrentTime = () => {
    const { hour, minute } = userHourMinute(timezone);
    setEntryTime(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    );
  };

  const handleSetDefaultTime = () => {
    if (resolvedDefaultMealTime) {
      setEntryTime(toHourMinute(resolvedDefaultMealTime) || '');
    }
  };

  const queryClient = useQueryClient();
  const createFoodVariantMutation = useCreateFoodVariantMutation();
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const {
    pendingUnit,
    setPendingUnit,
    pendingUnitIsCustom,
    conversionFactor,
    setConversionFactor,
    autoConversionFactor,
    conversionBaseVariant,
    conversionError,
    setConversionError,
    aiEstimateData,
    setAiEstimateData,
    isConverting,
    convertibleUnits,
    dropdownValue,
    buildConvertedVariant,
    handleUnitChange,
    cancelConversion,
    resetConversionState,
  } = useUnitConversion({
    variants,
    selectedVariant,
    onVariantSelect: (_variantId, variant) => {
      setSelectedVariant(variant);
      setQuantity(variant.serving_size);
    },
  });
  const selectedAiConfidence = getValidAiConfidence(
    selectedVariant?.ai_confidence
  );

  const loadVariantsData = useCallback(async () => {
    debug(loggingLevel, 'Loading food variants for food ID:', food?.id);
    setLoading(true);
    try {
      const data = await queryClient.fetchQuery(foodVariantsOptions(food.id));

      const primaryUnit: FoodVariant = {
        id: food.default_variant?.id || food.id,
        serving_size: food.default_variant?.serving_size || 100,
        serving_unit: food.default_variant?.serving_unit || 'g',
        serving_description: food.default_variant?.serving_description,
        calories: food.default_variant?.calories || 0,
        protein: food.default_variant?.protein || 0,
        carbs: food.default_variant?.carbs || 0,
        fat: food.default_variant?.fat || 0,
        saturated_fat: food.default_variant?.saturated_fat || 0,
        polyunsaturated_fat: food.default_variant?.polyunsaturated_fat || 0,
        monounsaturated_fat: food.default_variant?.monounsaturated_fat || 0,
        trans_fat: food.default_variant?.trans_fat || 0,
        cholesterol: food.default_variant?.cholesterol || 0,
        sodium: food.default_variant?.sodium || 0,
        potassium: food.default_variant?.potassium || 0,
        dietary_fiber: food.default_variant?.dietary_fiber || 0,
        sugars: food.default_variant?.sugars || 0,
        vitamin_a: food.default_variant?.vitamin_a || 0,
        vitamin_c: food.default_variant?.vitamin_c || 0,
        calcium: food.default_variant?.calcium || 0,
        iron: food.default_variant?.iron || 0,
        caffeine_mg: food.default_variant?.caffeine_mg || 0,
        water_ml: food.default_variant?.water_ml || 0,
        alcohol_g: food.default_variant?.alcohol_g || 0,
        abv_percent: food.default_variant?.abv_percent,
        custom_nutrients: food.default_variant?.custom_nutrients,
        source: food.default_variant?.source,
        ai_confidence: food.default_variant?.ai_confidence,
      };

      let combinedVariants: FoodVariant[] = [primaryUnit];

      if (data && data.length > 0) {
        info(loggingLevel, 'Food variants loaded successfully:', data);
        const variantsFromDb = data.map((variant) => ({
          id: variant.id,
          serving_size: variant.serving_size,
          serving_unit: variant.serving_unit,
          serving_description: variant.serving_description,
          calories: variant.calories || 0,
          protein: variant.protein || 0,
          carbs: variant.carbs || 0,
          fat: variant.fat || 0,
          saturated_fat: variant.saturated_fat || 0,
          polyunsaturated_fat: variant.polyunsaturated_fat || 0,
          monounsaturated_fat: variant.monounsaturated_fat || 0,
          trans_fat: variant.trans_fat || 0,
          cholesterol: variant.cholesterol || 0,
          sodium: variant.sodium || 0,
          potassium: variant.potassium || 0,
          dietary_fiber: variant.dietary_fiber || 0,
          sugars: variant.sugars || 0,
          vitamin_a: variant.vitamin_a || 0,
          vitamin_c: variant.vitamin_c || 0,
          calcium: variant.calcium || 0,
          iron: variant.iron || 0,
          caffeine_mg: variant.caffeine_mg || 0,
          water_ml: variant.water_ml || 0,
          alcohol_g: variant.alcohol_g || 0,
          abv_percent: variant.abv_percent,
          custom_nutrients: variant.custom_nutrients,
          // Preserve AI provenance so the dropdown can badge AI-source variants.
          source: variant.source,
          ai_confidence: variant.ai_confidence,
        }));

        const otherVariants = variantsFromDb.filter(
          (variant) => variant.id !== primaryUnit.id
        );
        combinedVariants = [primaryUnit, ...otherVariants];
      } else {
        info(
          loggingLevel,
          'No additional variants found, using primary food unit only.'
        );
      }

      setVariants(combinedVariants);
      const firstCombinedVariant = combinedVariants[0];
      if (initialVariantId && firstCombinedVariant) {
        const variantToSelect = combinedVariants.find(
          (v) => v.id === initialVariantId
        );
        setSelectedVariant(variantToSelect || firstCombinedVariant);
      } else if (firstCombinedVariant) {
        setSelectedVariant(firstCombinedVariant);
      }
    } catch (err) {
      error(loggingLevel, 'Error loading variants:', err);
      const primaryUnit: FoodVariant = {
        id: food.default_variant?.id || food.id,
        serving_size: food.default_variant?.serving_size || 100,
        serving_unit: food.default_variant?.serving_unit || 'g',
        serving_description: food.default_variant?.serving_description,
        calories: food.default_variant?.calories || 0,
        protein: food.default_variant?.protein || 0,
        carbs: food.default_variant?.carbs || 0,
        fat: food.default_variant?.fat || 0,
        saturated_fat: food.default_variant?.saturated_fat || 0,
        polyunsaturated_fat: food.default_variant?.polyunsaturated_fat || 0,
        monounsaturated_fat: food.default_variant?.monounsaturated_fat || 0,
        trans_fat: food.default_variant?.trans_fat || 0,
        cholesterol: food.default_variant?.cholesterol || 0,
        sodium: food.default_variant?.sodium || 0,
        potassium: food.default_variant?.potassium || 0,
        dietary_fiber: food.default_variant?.dietary_fiber || 0,
        sugars: food.default_variant?.sugars || 0,
        vitamin_a: food.default_variant?.vitamin_a || 0,
        vitamin_c: food.default_variant?.vitamin_c || 0,
        calcium: food.default_variant?.calcium || 0,
        iron: food.default_variant?.iron || 0,
        caffeine_mg: food.default_variant?.caffeine_mg || 0,
        water_ml: food.default_variant?.water_ml || 0,
        alcohol_g: food.default_variant?.alcohol_g || 0,
        abv_percent: food.default_variant?.abv_percent,
        custom_nutrients: food.default_variant?.custom_nutrients,
        source: food.default_variant?.source,
        ai_confidence: food.default_variant?.ai_confidence,
      };
      setVariants([primaryUnit]);
      setSelectedVariant(primaryUnit);
    } finally {
      setLoading(false);
    }
  }, [food, queryClient, loggingLevel, initialVariantId]);

  useEffect(() => {
    debug(loggingLevel, 'FoodUnitSelector open/food useEffect triggered.', {
      open,
      food,
      initialQuantity,
      initialUnit,
      initialVariantId,
    });
    if (open && food) {
      if (food.id && !food.id.startsWith('temp-')) {
        loadVariantsData();
      } else {
        const primaryUnit: FoodVariant = {
          id: food.default_variant?.id || 'default',
          serving_size: food.default_variant?.serving_size || 100,
          serving_unit: food.default_variant?.serving_unit || 'g',
          serving_description: food.default_variant?.serving_description,
          calories: food.default_variant?.calories || 0,
          protein: food.default_variant?.protein || 0,
          carbs: food.default_variant?.carbs || 0,
          fat: food.default_variant?.fat || 0,
          saturated_fat: food.default_variant?.saturated_fat || 0,
          polyunsaturated_fat: food.default_variant?.polyunsaturated_fat || 0,
          monounsaturated_fat: food.default_variant?.monounsaturated_fat || 0,
          trans_fat: food.default_variant?.trans_fat || 0,
          cholesterol: food.default_variant?.cholesterol || 0,
          sodium: food.default_variant?.sodium || 0,
          potassium: food.default_variant?.potassium || 0,
          dietary_fiber: food.default_variant?.dietary_fiber || 0,
          sugars: food.default_variant?.sugars || 0,
          vitamin_a: food.default_variant?.vitamin_a || 0,
          vitamin_c: food.default_variant?.vitamin_c || 0,
          calcium: food.default_variant?.calcium || 0,
          iron: food.default_variant?.iron || 0,
          caffeine_mg: food.default_variant?.caffeine_mg || 0,
          water_ml: food.default_variant?.water_ml || 0,
          alcohol_g: food.default_variant?.alcohol_g || 0,
          abv_percent: food.default_variant?.abv_percent,
          custom_nutrients: food.default_variant?.custom_nutrients,
          source: food.default_variant?.source,
          ai_confidence: food.default_variant?.ai_confidence,
        };
        const allVariants =
          food.variants && food.variants.length > 0
            ? food.variants
            : [primaryUnit];
        setVariants(allVariants);
        const selected =
          (initialVariantId &&
            allVariants.find((v) => v.id === initialVariantId)) ||
          allVariants[0] ||
          null;
        setSelectedVariant(selected);
      }
      setQuantity(
        initialQuantity !== undefined
          ? initialQuantity
          : food.default_variant?.serving_size || 1
      );
      resetConversionState();
    }
  }, [
    open,
    food,
    initialQuantity,
    initialUnit,
    initialVariantId,
    initialTime,
    loadVariantsData,
    loggingLevel,
    resetConversionState,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    debug(loggingLevel, 'Handling submit.');

    if (quantity === undefined) return;

    if (isConverting) {
      const convertedVariant = buildConvertedVariant();
      if (!convertedVariant) {
        setConversionError('Geçerli bir birim adı ve çevirme oranı gir.');
        return;
      }
      setConversionError('');
      try {
        const savedVariant = await createFoodVariantMutation.mutateAsync({
          foodId: food.id,
          variant: convertedVariant,
        });
        info(loggingLevel, 'Created converted variant:', savedVariant);
        const variantWithId: FoodVariant = {
          ...convertedVariant,
          ...savedVariant,
        };
        onSelect(
          food,
          quantity,
          variantWithId.serving_unit,
          variantWithId,
          entryTime || null,
          showMealTypeSelect ? mealType : null,
          entryNotes.trim() || null
        );
        onOpenChange(false);
        setQuantity(1);
      } catch (err) {
        error(loggingLevel, 'Error creating converted variant:', err);
        setConversionError('Yeni birim kaydedilemedi. Tekrar dene.');
      }
      return;
    }

    if (selectedVariant) {
      info(loggingLevel, 'Submitting food selection:', {
        food,
        quantity,
        unit: selectedVariant.serving_unit,
        variantId: selectedVariant.id || undefined,
      });
      onSelect(
        food,
        quantity,
        selectedVariant.serving_unit,
        selectedVariant,
        entryTime || null,
        showMealTypeSelect ? mealType : null,
        entryNotes.trim() || null
      );
      onOpenChange(false);
      setQuantity(1);
    } else {
      warn(loggingLevel, 'Submit called with no selected variant.');
    }
  };

  // The active variant used for nutrition display
  const activeVariant = isConverting
    ? buildConvertedVariant()
    : selectedVariant;

  // Photos of the food being logged, offered to the note editor. Already
  // resolved to a usable src, which is the form written into the markdown.
  const foodImagePaths = useMemo(
    () => usableFoodImages(food?.images),
    [food?.images]
  );
  const nutrition = (() => {
    if (!activeVariant || quantity === undefined) return null;
    const ratio = quantity / (activeVariant.serving_size || 1);
    return {
      calories: (activeVariant.calories || 0) * ratio,
      protein: (activeVariant.protein || 0) * ratio,
      carbs: (activeVariant.carbs || 0) * ratio,
      fat: (activeVariant.fat || 0) * ratio,
    };
  })();

  useEffect(() => {
    if (open && quantityInputRef.current) {
      const timeoutId = setTimeout(() => {
        if (quantityInputRef.current) {
          quantityInputRef.current.focus();
          quantityInputRef.current.select();
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open, loading]);

  // Ready-made amounts: each saved serving (100 g, 1 porsiyon (250 g), ...)
  // plus 100 g / 100 ml when the base unit is weight or volume, so the common
  // case is one tap instead of typing.
  const quickAmounts = useMemo(() => {
    const chips: {
      key: string;
      variantId: string;
      amount: number;
      label: string;
    }[] = [];
    const seen = new Set<string>();
    const push = (variant: FoodVariant, amount: number) => {
      if (!variant.id) return;
      const label =
        amount === variant.serving_size
          ? variantChipLabel(variant)
          : `${amount.toLocaleString('tr-TR')} ${unitLabelTr(variant.serving_unit)}`;
      if (seen.has(label)) return;
      seen.add(label);
      chips.push({
        key: `${variant.id}-${amount}`,
        variantId: variant.id,
        amount,
        label,
      });
    };
    for (const variant of variants) {
      const unit = variant.serving_unit?.toLowerCase();
      if ((unit === 'g' || unit === 'ml') && variant.serving_size !== 100) {
        push(variant, 100);
      }
      push(variant, variant.serving_size || 1);
    }
    return chips.slice(0, 4);
  }, [variants]);

  // The full conversion table is long (kg, mg, oz, lb, lbs, ...); a Turkish
  // kitchen needs a handful. Anything else stays reachable via "Özel birim".
  const offeredUnits = convertibleUnits.filter((u) =>
    OFFERED_CONVERSION_UNITS.has(u.toLowerCase())
  );

  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    if (open) setShowMore(false);
  }, [open]);

  const fmt1 = (value: number) =>
    value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });

  return (
    <Dialog
      open={open && (showUnitSelector ?? true)}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="min-w-0 break-words">{food?.name}</span>
            {/* Only persisted local/saved foods can be favorited (external
                provider search results are not saved yet, so they have no
                stable id to star). */}
            {food?.id && (food?.is_custom || food?.user_id) && (
              <FavoriteStarButton type="food" id={food.id} />
            )}
          </DialogTitle>
          <DialogDescription>
            {mealLabel
              ? `Öğüne ekle: ${mealLabel}`
              : initialQuantity
                ? 'Miktarı düzenle'
                : 'Ne kadar yedin?'}
            {food?.brand ? ` · ${food.brand}` : ''}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div>{t('foodUnitSelector.loadingUnits', 'Loading units...')}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Miktar</Label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    allowExpressions
                    ref={quantityInputRef}
                    id="quantity"
                    step="any"
                    min="0.01"
                    decimals={3}
                    required
                    className="h-11 min-w-0 flex-1 text-base"
                    value={quantity}
                    onValueChange={(newQuantity) => {
                      debug(loggingLevel, 'Quantity changed:', newQuantity);
                      setQuantity(newQuantity);
                    }}
                  />
                  <Select
                    value={dropdownValue}
                    onValueChange={handleUnitChange}
                  >
                    <SelectTrigger
                      id="unit"
                      aria-label={t('foodUnitSelector.unit', 'Unit')}
                      className="h-11 w-[44%] max-w-[11rem] shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => {
                        const aiConfidence = getValidAiConfidence(
                          variant.ai_confidence
                        );

                        return (
                          variant.id && (
                            <SelectItem key={variant.id} value={variant.id}>
                              <span className="flex items-center gap-1.5">
                                {variantUnitLabel(variant)}
                                {variant.source === 'ai_estimate' &&
                                  aiConfidence && (
                                    <Sparkles
                                      className={`h-3 w-3 ${AI_PICKER_ICON_TONE_CLASSES[CONFIDENCE_TONES[aiConfidence]]}`}
                                      aria-label={getAiEstimateLabel(
                                        t,
                                        'foodUnitSelector',
                                        aiConfidence
                                      )}
                                    />
                                  )}
                              </span>
                            </SelectItem>
                          )
                        );
                      })}
                      {offeredUnits.length > 0 && (
                        <>
                          <SelectSeparator />
                          {offeredUnits.map((u) => {
                            const compatible = canAutoConvertToUnit(
                              variants,
                              selectedVariant,
                              u
                            );
                            return (
                              <SelectItem key={u} value={u}>
                                <span className="flex items-center gap-1.5">
                                  {unitLabelTr(u)}
                                  {compatible && (
                                    <Check className="h-3 w-3 text-green-500" />
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </>
                      )}
                      <SelectSeparator />
                      <SelectItem value="__custom__">
                        {t('foodUnitSelector.customUnit', 'Custom unit...')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedVariant?.source === 'ai_estimate' &&
                    selectedAiConfidence && (
                      <Sparkles
                        className={`h-4 w-4 shrink-0 ${AI_PICKER_ICON_TONE_CLASSES[CONFIDENCE_TONES[selectedAiConfidence]]}`}
                        aria-label={getAiEstimateLabel(
                          t,
                          'foodUnitSelector',
                          selectedAiConfidence
                        )}
                      />
                    )}
                </div>
                {quickAmounts.length > 1 && (
                  <div
                    className="flex flex-wrap gap-2 pt-1"
                    aria-label="Hazır miktarlar"
                  >
                    {quickAmounts.map((chip) => {
                      const active =
                        !isConverting &&
                        selectedVariant?.id === chip.variantId &&
                        quantity === chip.amount;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            handleUnitChange(chip.variantId);
                            setQuantity(chip.amount);
                          }}
                          className={cn(
                            'min-h-9 rounded-full border px-3 text-sm font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-secondary text-foreground hover:bg-accent'
                          )}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {nutrition && (
                <div className="flex items-baseline justify-between gap-3 rounded-xl bg-muted px-3 py-2.5">
                  <span className="text-lg font-bold tabular-nums">
                    {Math.round(
                      convertEnergy(nutrition.calories, 'kcal', energyUnit)
                    ).toLocaleString('tr-TR')}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      {getEnergyUnitString(energyUnit)}
                    </span>
                  </span>
                  <span className="text-right text-sm text-muted-foreground tabular-nums">
                    <span className="font-medium text-foreground">P</span>{' '}
                    {fmt1(nutrition.protein)} g ·{' '}
                    <span className="font-medium text-foreground">K</span>{' '}
                    {fmt1(nutrition.carbs)} g ·{' '}
                    <span className="font-medium text-foreground">Y</span> {fmt1(nutrition.fat)} g
                  </span>
                </div>
              )}

              {showMealTypeSelect &&
                availableMealTypes &&
                availableMealTypes.length > 1 && (
                  <div className="space-y-1">
                    <Label htmlFor="mealType">
                      {t('foodUnitSelector.meal', 'Meal')}
                    </Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger id="mealType" className="h-11 w-full">
                        <SelectValue
                          placeholder={t(
                            'foodUnitSelector.selectMeal',
                            'Select meal'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMealTypes.map((t) => (
                          <SelectItem key={t.id} value={t.name}>
                            {mealTypeLabel(t.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              {/* Custom unit name input */}
              {pendingUnitIsCustom && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
                  <div>
                    <Label htmlFor="customUnitName">
                      {t('foodUnitSelector.unitName', 'Unit name')}
                    </Label>
                    <Input
                      id="customUnitName"
                      type="text"
                      placeholder={t(
                        'foodUnitSelector.unitNamePlaceholder',
                        'e.g. slice, bar, scoop'
                      )}
                      value={pendingUnit}
                      onChange={(e) => {
                        setPendingUnit(e.target.value);
                        setConversionError('');
                      }}
                    />
                  </div>
                  {pendingUnit.trim() && (
                    <div>
                      <Label htmlFor="conversionFactor">
                        1 {pendingUnit.trim()} ={' '}
                        <span>{conversionBaseVariant?.serving_unit}</span>
                      </Label>
                      <Input
                        id="conversionFactor"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={t(
                          'foodUnitSelector.numberPlaceholder',
                          'e.g. 1'
                        )}
                        value={conversionFactor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConversionFactor(val === '' ? '' : Number(val));
                          setConversionError('');
                        }}
                      />
                    </div>
                  )}
                  {conversionError && (
                    <p className="text-sm text-destructive">
                      {conversionError}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelConversion}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                </div>
              )}

              {/* Manual factor needed for incompatible standard units */}
              {pendingUnit &&
                !pendingUnitIsCustom &&
                autoConversionFactor === null && (
                  <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      {t('foodUnitSelector.manualConversion', {
                        defaultValue:
                          "These units can't be converted automatically — enter how many {{baseUnit}} are in 1 {{unit}}.",
                        baseUnit: conversionBaseVariant?.serving_unit,
                        unit: pendingUnit,
                      })}
                    </p>

                    {/* AI estimate path: shown only when both units are
                        standard weight/volume AND AI is configured AND
                        preference is on AND no estimate has been auto-applied
                        yet. Auto-apply mode fires onAccept immediately, so
                        after success this whole block hides — the badge below
                        the label takes over as the AI indicator. */}
                    {aiEstimatesAvailable &&
                      conversionBaseVariant?.serving_unit &&
                      shouldOfferAiConversion(
                        conversionBaseVariant.serving_unit,
                        pendingUnit
                      ) &&
                      aiEstimateData === null && (
                        <AiEstimateSection
                          food={{
                            id: food.id,
                            name: food.name,
                            brand: food.brand,
                          }}
                          fromUnit={pendingUnit}
                          toUnit={conversionBaseVariant.serving_unit}
                          knownVariants={variants.map((v) => ({
                            amount: v.serving_size,
                            unit: v.serving_unit,
                          }))}
                          mode="auto-apply"
                          onAccept={setAiEstimateData}
                          onEdit={() => setAiEstimateData(null)}
                        />
                      )}

                    <div>
                      <Label
                        htmlFor="conversionFactor"
                        className="flex items-center gap-2"
                      >
                        <span>
                          1 {pendingUnit} = ?{' '}
                          <span>{conversionBaseVariant?.serving_unit}</span>
                        </span>
                        {aiEstimateData !== null && (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${AI_ESTIMATE_BADGE_TONE_CLASSES[CONFIDENCE_TONES[aiEstimateData.confidence]]}`}
                            aria-label={getAiEstimateLabel(
                              t,
                              'foodUnitSelector',
                              aiEstimateData.confidence
                            )}
                          >
                            {t('foodUnitSelector.confidenceEstimate', {
                              defaultValue: '{{confidence}} estimate',
                              confidence: getAiConfidenceLabel(
                                t,
                                'foodUnitSelector',
                                aiEstimateData.confidence
                              ),
                            })}
                          </span>
                        )}
                      </Label>
                      <Input
                        id="conversionFactor"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={t(
                          'foodUnitSelector.numberPlaceholder',
                          'e.g. 1'
                        )}
                        value={conversionFactor}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConversionFactor(val === '' ? '' : Number(val));
                          setConversionError('');
                          // Editing the factor manually invalidates the AI
                          // provenance tag — the user is overriding the AI.
                          if (aiEstimateData !== null) {
                            setAiEstimateData(null);
                          }
                        }}
                      />
                    </div>
                    {conversionError && (
                      <p className="text-sm text-destructive">
                        {conversionError}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cancelConversion}
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                )}

              {/* Time and notes are rarely changed: tucked away so the
                  amount and the Add button fit one phone screen. */}
              <Collapsible open={showMore} onOpenChange={setShowMore}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between rounded-xl px-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <span>
                      Daha fazla
                      {showTimeInput && entryTime ? ` · Saat ${entryTime}` : ''}
                      {entryNotes.trim() ? ' · Not var' : ''}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        showMore && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {showTimeInput && (
                    <div className="space-y-1">
                      <Label id="entryTime-label">Saat</Label>
                      <div className="flex items-center gap-2">
                        <TimeInput
                          id="entryTime"
                          aria-labelledby="entryTime-label"
                          value={entryTime}
                          onChange={setEntryTime}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 shrink-0"
                          onClick={handleSetCurrentTime}
                          title={t(
                            'foodUnitSelector.setCurrentTime',
                            'Set to current local time'
                          )}
                        >
                          <Clock className="h-4 w-4" />
                          Şimdi
                        </Button>
                        {resolvedDefaultMealTime && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-11 shrink-0 px-2"
                            onClick={handleSetDefaultTime}
                            title={t('foodUnitSelector.setMealDefault', {
                              time: toHourMinute(resolvedDefaultMealTime),
                              defaultValue: `Set to meal default (${toHourMinute(resolvedDefaultMealTime)})`,
                            })}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                        )}
                        {entryTime && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-11 w-11 shrink-0 p-0"
                            onClick={() => setEntryTime('')}
                            aria-label={t(
                              'foodUnitSelector.clearTime',
                              'Clear time'
                            )}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/*
                    Not gated on `showTimeInput`: a per-occasion note has
                    nothing to do with whether the time picker is shown.
                  */}
                  <div className="space-y-1">
                    <Label htmlFor="entryNotes">Not (isteğe bağlı)</Label>
                    <Textarea
                      id="entryNotes"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      rows={2}
                      placeholder="Örn. yarım porsiyon, az yağlı"
                    />
                  </div>

                  {food?.notes ? (
                    <div className="space-y-1">
                      <Label>Bu yiyecek hakkında</Label>
                      <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 px-3 py-2 text-sm">
                        <MarkdownView images={foodImagePaths}>
                          {food.notes}
                        </MarkdownView>
                      </div>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  createFoodVariantMutation.isPending ||
                  (!isConverting && !selectedVariant) ||
                  (isConverting &&
                    (!pendingUnit.trim() ||
                      (autoConversionFactor === null &&
                        (!conversionFactor || conversionFactor <= 0))))
                }
              >
                {createFoodVariantMutation.isPending
                  ? t('common.saving', 'Saving...')
                  : initialQuantity
                    ? 'Kaydet'
                    : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FoodUnitSelector;
