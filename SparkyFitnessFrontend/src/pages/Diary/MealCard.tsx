import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Edit,
  Trash2,
  History,
  Plus,
  ClipboardCopy,
  PlusCircle,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useRef, useState } from 'react';
import EnhancedFoodSearch from '../../components/FoodSearch/FoodSearch';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { debug } from '@/utils/logging';
import {
  getNutrientMetadata,
  formatNutrientValue,
} from '@/utils/nutrientUtils';
import { useCopyFoodEntriesFromYesterdayMutation } from '@/hooks/Diary/useFoodEntries';
import type { Food, FoodEntry, GlycemicIndex } from '@/types/food';
import type { Meal, FoodEntryMeal } from '@/types/meal';
import { formatTimeOfDayString } from '@/utils/timeFormatters';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import { mealTypeLabel } from './mealTypeLabel';
import { unitLabelTr } from '@/utils/foodServing';
import { ChevronDown } from 'lucide-react';
interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary_fiber: number;
  sugars?: number;
  sodium?: number;
  cholesterol?: number;
  saturated_fat?: number;
  monounsaturated_fat?: number;
  polyunsaturated_fat?: number;
  trans_fat?: number;
  potassium?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  iron?: number;
  caffeine_mg?: number;
  water_ml?: number;
  alcohol_g?: number;
  calcium?: number;
  glycemic_index?: GlycemicIndex;
  custom_nutrients?: Record<string, number>;
}

import type { UserCustomNutrient } from '@/types/customNutrient';
import { DEFAULT_NUTRIENTS } from '@/constants/nutrients';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AllergenBadges from '@/components/AllergenBadges';
import { diaryEntryImages, usableFoodImages } from '@/utils/foodImages';
import { useImageLightbox } from '@/hooks/Foods/useImageLightbox';
import ImageLightbox from '@/components/ImageLightbox';

const MOBILE_ENTRY_NUTRIENT_LIMIT = 4;

const ZERO_HIDDEN_NUTRIENTS = new Set(['caffeine_mg', 'alcohol_g']);

const MOBILE_NUTRIENT_LABEL_OVERRIDES: Record<
  string,
  { label: string; defaultLabel: string }
> = {
  carbs: { label: 'nutrition.carbsShort', defaultLabel: 'Carbs' },
  dietary_fiber: { label: 'nutrition.fiber', defaultLabel: 'Fiber' },
};

interface MealCardProps {
  meal: {
    name: string;
    type: string;
    entries: (FoodEntry | FoodEntryMeal)[];
    targetCalories?: number;
    selectedDate: string;
  };
  totals: MealTotals;
  selectedDate: string;
  onFoodSelect: (item: Food | Meal, mealType: string) => void;
  onEditEntry: (entry: FoodEntry | FoodEntryMeal) => void;
  onRemoveEntry: (
    itemId: string,
    itemType: 'foodEntry' | 'foodEntryMeal',
    itemName?: string
  ) => Promise<void>;
  getEntryNutrition: (entry: FoodEntry | FoodEntryMeal) => MealTotals;
  onCopyClick: (mealType: string) => void;
  onCopyFamilyClick: (mealType: string) => void;
  onConvertToMealClick: (mealType: string) => void;
  energyUnit: 'kcal' | 'kJ';
  convertEnergy: (
    value: number,
    fromUnit: 'kcal' | 'kJ',
    toUnit: 'kcal' | 'kJ'
  ) => number;
  customNutrients?: UserCustomNutrient[]; // Add customNutrients prop
  shouldOpenFoodSearch?: boolean;
  onFoodSearchClose?: () => void;
  /** Bumped by the Diary after an entry is logged; closes the search sheet. */
  closeSearchSignal?: number;
}

const MealCard = ({
  meal,
  totals,
  onFoodSelect,
  onEditEntry,
  onRemoveEntry,
  getEntryNutrition,
  onCopyClick,
  onCopyFamilyClick,
  onConvertToMealClick,
  energyUnit,
  convertEnergy,
  shouldOpenFoodSearch,
  onFoodSearchClose,
  closeSearchSignal = 0,
  selectedDate,
  customNutrients = [], // Default to empty array
}: MealCardProps) => {
  const { t } = useTranslation();
  const {
    loggingLevel,
    nutrientDisplayPreferences,
    getDateRelationToToday,
    timeFormat,
  } = usePreferences();
  const isMobile = useIsMobile();
  const platform = isMobile ? 'mobile' : 'desktop';

  const selectedDateRelation = getDateRelationToToday(selectedDate);

  const [internalFoodSearchOpen, setInternalFoodSearchOpen] = useState(false);
  // One viewer for the whole card; the clicked row supplies its own images.
  const { lightboxProps, openLightbox } = useImageLightbox();

  // Check if food search is open to handle state changes
  const isFoodSearchOpen = shouldOpenFoodSearch || internalFoodSearchOpen;

  const handleFoodSearchOpenChange = (open: boolean) => {
    setInternalFoodSearchOpen(open);
    if (!open && onFoodSearchClose) {
      onFoodSearchClose();
    }
  };

  // Logging a food closes the whole add flow so the new row is visible at
  // once (the Diary toasts "<name> eklendi · N kcal").
  const lastCloseSignal = useRef(closeSearchSignal);
  useEffect(() => {
    if (closeSearchSignal === lastCloseSignal.current) return;
    lastCloseSignal.current = closeSearchSignal;
    if (isFoodSearchOpen) handleFoodSearchOpenChange(false);
    // Only the signal matters; the handler is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSearchSignal]);

  const { accessibleUsers } = useActiveUser();
  // Rows tapped open to show their macros and actions (phone).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    type: 'foodEntry' | 'foodEntryMeal';
    name: string;
  } | null>(null);
  const mealDisplayName = mealTypeLabel(meal.name);
  const [searchParams] = useSearchParams();
  const highlightFoodId = searchParams.get('highlight') ?? null;
  const { mutate: copyFoodEntriesFromYesterday } =
    useCopyFoodEntriesFromYesterdayMutation();
  const getEnergyUnitString = (unit: 'kcal' | 'kJ'): string => {
    return unit === 'kcal'
      ? t('common.kcalUnit', 'kcal')
      : t('common.kJUnit', 'kJ');
  };
  debug(loggingLevel, 'MealCard: Component rendered for meal:', meal.name);
  debug(loggingLevel, 'MealCard: meal.entries:', meal.entries);
  const [editingFood, setEditingFood] = useState<Food | null>(null); // Changed from editingFoodEntry to editingFood

  const quickInfoPreferences =
    nutrientDisplayPreferences.find(
      (p) => p.view_group === 'quick_info' && p.platform === platform
    ) ||
    nutrientDisplayPreferences.find(
      (p) => p.view_group === 'quick_info' && p.platform === 'desktop'
    );
  const foodDatabasePreferences =
    nutrientDisplayPreferences.find(
      (p) => p.view_group === 'food_database' && p.platform === platform
    ) ||
    nutrientDisplayPreferences.find(
      (p) => p.view_group === 'food_database' && p.platform === 'desktop'
    );

  // Create a base list of summable nutrients
  const baseSummableNutrients = [
    'calories',
    'protein',
    'carbs',
    'fat',
    'dietary_fiber',
    'sugars',
    'sodium',
    'cholesterol',
    'saturated_fat',
    'monounsaturated_fat',
    'polyunsaturated_fat',
    'trans_fat',
    'potassium',
    'vitamin_a',
    'vitamin_c',
    'iron',
    'calcium',
    'caffeine_mg',
    // Summable like the rest: a meal states the water it holds. The hydration
    // ring still owns the day total, which is computed from its own arm.
    'water_ml',
    'alcohol_g',
  ];

  // Add custom nutrient names to summable nutrients list if they exist
  const summableNutrients = [
    ...baseSummableNutrients,
    ...customNutrients
      .filter((cn) => !baseSummableNutrients.includes(cn.name))
      .map((cn) => cn.name),
  ];

  const quickInfoNutrients = quickInfoPreferences
    ? quickInfoPreferences.visible_nutrients
    : DEFAULT_NUTRIENTS;

  debug(loggingLevel, 'MealCard: isMobile:', isMobile);
  debug(loggingLevel, 'MealCard: platform:', platform);
  debug(loggingLevel, 'MealCard: quickInfoPreferences:', quickInfoPreferences);
  debug(
    loggingLevel,
    'MealCard: foodDatabasePreferences:',
    foodDatabasePreferences
  );

  const visibleNutrientsForGrid = quickInfoNutrients.filter((nutrient) =>
    summableNutrients.includes(nutrient)
  );

  const handleCopyFromYesterday = () => {
    copyFoodEntriesFromYesterday({
      mealType: meal.type,
      targetDate: selectedDate,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <CardTitle className="truncate text-lg">
                {mealDisplayName}
              </CardTitle>
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {Math.round(convertEnergy(totals.calories, 'kcal', energyUnit))}
                {!!meal.targetCalories && (
                  <span>{` / ${Math.round(
                    convertEnergy(meal.targetCalories, 'kcal', energyUnit)
                  )}`}</span>
                )}
                {` ${getEnergyUnitString(energyUnit)}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Dialog
                open={isFoodSearchOpen}
                onOpenChange={handleFoodSearchOpenChange}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-10 rounded-full px-4"
                    onClick={() =>
                      debug(
                        loggingLevel,
                        `MealCard: Add Food button clicked for ${meal.name}.`
                      )
                    }
                    title={t('mealCard.addFoodTo', 'Add Food to')}
                  >
                    <Plus className="h-4 w-4" />
                    Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-h-[85vh] sm:max-w-3xl sm:overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Öğüne ekle: {mealDisplayName}</DialogTitle>
                    <DialogDescription>
                      Yiyecek ara ya da son yediklerinden seç.
                      {selectedDateRelation !== 'today' && (
                        <span className="mt-1 block text-amber-600 dark:text-amber-400">
                          {selectedDateRelation === 'past'
                            ? 'Geçmiş bir güne ekliyorsun.'
                            : 'İleri bir güne ekliyorsun.'}
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <EnhancedFoodSearch
                    mealType={meal.type}
                    onFoodSelect={(item, type) => {
                      if (type === 'food') {
                        debug(
                          loggingLevel,
                          'MealCard: Food selected in search:',
                          item
                        );
                        onFoodSelect(item as Food, meal.type);
                      } else {
                        debug(
                          loggingLevel,
                          'MealCard: Meal selected in search:',
                          item
                        );
                        onFoodSelect(item as Meal, meal.type);
                      }
                    }}
                  />
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Diğer işlemler"
                    className="h-11 w-11 text-muted-foreground"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuItem
                    className="min-h-11 gap-3"
                    onSelect={handleCopyFromYesterday}
                  >
                    <History className="h-4 w-4 text-primary" />
                    Dünden kopyala
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11 gap-3"
                    onSelect={() => onCopyClick(meal.type)}
                  >
                    <ClipboardCopy className="h-4 w-4 text-primary" />
                    Başka güne kopyala
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11 gap-3"
                    onSelect={() => onConvertToMealClick(meal.type)}
                  >
                    <PlusCircle className="h-4 w-4 text-primary" />
                    Öğün olarak kaydet
                  </DropdownMenuItem>
                  {/* Family access (one person logging for another) is rare
                      in DG FIT; only offer it to people who have it. */}
                  {accessibleUsers.length > 0 && (
                    <DropdownMenuItem
                      className="min-h-11 gap-3"
                      onSelect={() => onCopyFamilyClick(meal.type)}
                    >
                      <Users className="h-4 w-4 text-primary" />
                      Başka profille kopyala
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {meal.entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Bu güne henüz yiyecek eklenmedi.
              </p>
              <Button
                variant="secondary"
                className="h-11 rounded-full px-5"
                onClick={() => handleFoodSearchOpenChange(true)}
              >
                <Plus className="h-4 w-4" />
                Yiyecek ekle
              </Button>
            </div>
          ) : (
            <div className={cn(isMobile ? '-mx-1 divide-y divide-border' : 'space-y-3')}>
              {meal.entries.map((item) => {
                // Changed entry to item
                const entryNutrition = getEntryNutrition(item);
                const isFoodEntryMeal = 'foods' in item && 'entry_date' in item; // More robust check for FoodEntryMeal
                const isFoodEntry = !isFoodEntryMeal;
                const isFromMealPlan =
                  isFoodEntry && (item as FoodEntry).meal_plan_template_id;
                const entryName = isFoodEntryMeal
                  ? (item as FoodEntryMeal).name
                  : (item as FoodEntry).food_name;
                const entryDescription = isFoodEntryMeal
                  ? (item as FoodEntryMeal).description
                  : (item as FoodEntry).brand_name;
                const quantity = (item as FoodEntry | FoodEntryMeal).quantity;
                const unit = (item as FoodEntry | FoodEntryMeal).unit;
                const servingLabel = [quantity, unit]
                  .filter((value) => value !== undefined && value !== null)
                  .join(' ');
                const entryIsHighlighted =
                  'food_id' in item &&
                  (item as FoodEntry).food_id === highlightFoodId;
                // Food entries: per-entry override, else the food's own image.
                // Logged meals: the meal template's image.
                const entryImages = isFoodEntry
                  ? diaryEntryImages(item as FoodEntry)
                  : (() => {
                      const override = usableFoodImages(
                        (item as FoodEntryMeal).images
                      );
                      return override.length > 0
                        ? override
                        : usableFoodImages((item as FoodEntryMeal).meal_images);
                    })();
                const entryImageSrc = entryImages[0] ?? null;

                // Determine glycemic index directly from the entryNutrition object
                const giValue: GlycemicIndex | undefined | null =
                  entryNutrition.glycemic_index ?? null;
                const validGiValues: GlycemicIndex[] = [
                  'Very Low',
                  'Low',
                  'Medium',
                  'High',
                  'Very High',
                ];

                debug(
                  loggingLevel,
                  `MealCard: Rendering item: ${
                    isFoodEntryMeal
                      ? (item as FoodEntryMeal).name
                      : (item as FoodEntry).food_name
                  }, GI Value: ${giValue}, quickInfoNutrients includes GI: ${quickInfoNutrients.includes(
                    'glycemic_index'
                  )}, giValue is valid: ${
                    giValue != null &&
                    validGiValues.includes(giValue as GlycemicIndex)
                  }`
                );

                const getNutrientDisplay = (nutrient: string) => {
                  const metadata = getNutrientMetadata(
                    nutrient,
                    customNutrients
                  );
                  const value =
                    (entryNutrition[nutrient as keyof MealTotals] as number) ??
                    entryNutrition.custom_nutrients?.[nutrient] ??
                    0;

                  const displayValue =
                    nutrient === 'calories'
                      ? Math.round(
                          convertEnergy(value, 'kcal', energyUnit)
                        ).toLocaleString('tr-TR')
                      : formatNutrientValue(nutrient, value, customNutrients);

                  const unitDisplay =
                    nutrient === 'calories'
                      ? getEnergyUnitString(energyUnit)
                      : metadata.unit;

                  return { metadata, displayValue, unitDisplay };
                };

                const mobileNutrients = visibleNutrientsForGrid
                  .filter((nutrient) => nutrient !== 'calories')
                  .slice(0, MOBILE_ENTRY_NUTRIENT_LIMIT);

                if (isMobile) {
                  // DESIGN.md's tight meal-card rows: one line with the name and
                  // kcal, the amount under it; macros and actions on tap.
                  const isExpanded = expandedId === item.id;
                  const kcal = getNutrientDisplay('calories');
                  const amountLabel = [
                    quantity !== undefined && quantity !== null
                      ? Number(quantity).toLocaleString('tr-TR', {
                          maximumFractionDigits: 2,
                        })
                      : null,
                    unit ? unitLabelTr(unit) : null,
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const macroLine = mobileNutrients
                    // Caffeine and alcohol only matter when there is some.
                    .filter(
                      (nutrient) =>
                        !ZERO_HIDDEN_NUTRIENTS.has(nutrient) ||
                        Number(entryNutrition[nutrient as keyof MealTotals]) >
                          0
                    )
                    .map((nutrient) => {
                      const { metadata, displayValue, unitDisplay } =
                        getNutrientDisplay(nutrient);
                      const labelOverride =
                        MOBILE_NUTRIENT_LABEL_OVERRIDES[nutrient];
                      const label = labelOverride
                        ? t(labelOverride.label, labelOverride.defaultLabel)
                        : t(metadata.label, metadata.defaultLabel);
                      return `${label} ${displayValue} ${unitDisplay}`.trim();
                    })
                    .join(' · ');
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'transition-colors duration-300',
                        entryIsHighlighted &&
                          'rounded-lg ring-2 ring-primary ring-inset'
                      )}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        className="flex min-h-[52px] w-full items-center gap-3 px-1 py-2 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-medium leading-tight text-card-foreground">
                            {entryName}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[
                              amountLabel,
                              item.entry_time
                                ? formatTimeOfDayString(
                                    item.entry_time,
                                    timeFormat
                                  )
                                : null,
                              isFromMealPlan
                                ? t('mealCard.fromPlan', 'From Plan')
                                : null,
                              isFoodEntryMeal ? 'Yemek' : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-foreground">
                          {kcal.displayValue}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {kcal.unitDisplay}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>
                      {isExpanded && (
                        <div className="space-y-2 px-1 pb-3">
                          {macroLine && (
                            <p className="text-sm text-muted-foreground">
                              {macroLine}
                            </p>
                          )}
                          {entryDescription && (
                            <p className="text-xs text-muted-foreground">
                              {entryDescription}
                            </p>
                          )}
                          {giValue &&
                            validGiValues.includes(giValue as GlycemicIndex) &&
                            quickInfoNutrients.includes('glycemic_index') && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-medium"
                              >
                                {t('diary.mealCard.gi', 'GI: {{giValue}}', {
                                  giValue,
                                })}
                              </Badge>
                            )}
                          {isFoodEntry && (
                            <AllergenBadges
                              allergens={(item as FoodEntry).allergens}
                              traces={(item as FoodEntry).traces}
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="h-11 flex-1"
                              onClick={() => {
                                debug(
                                  loggingLevel,
                                  'MealCard: Edit entry button clicked:',
                                  item.id
                                );
                                onEditEntry(item);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              Düzenle
                            </Button>
                            <Button
                              variant="outline"
                              className="h-11 flex-1 text-destructive hover:text-destructive"
                              onClick={() =>
                                setPendingDelete({
                                  id: item.id,
                                  type: isFoodEntryMeal
                                    ? 'foodEntryMeal'
                                    : 'foodEntry',
                                  name: entryName ?? '',
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id} // Use item.id directly
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg gap-4 transition-colors duration-300',
                      entryIsHighlighted && 'border-2 border-blue-500'
                    )}
                  >
                    {entryImageSrc && (
                      <button
                        type="button"
                        className="flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={() =>
                          openLightbox(entryImages, 0, entryName ?? undefined)
                        }
                        aria-label={t('food.viewImages', 'View images')}
                      >
                        <img
                          src={entryImageSrc}
                          alt={entryName ?? ''}
                          className="w-16 h-16 object-cover rounded-md cursor-zoom-in"
                          loading="lazy"
                          onError={(e) => {
                            // A dead provider link shouldn't leave a broken icon.
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </button>
                    )}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <span className="font-medium">{entryName}</span>
                        {entryDescription ? (
                          <Badge variant="secondary" className="text-xs w-fit">
                            {entryDescription}
                          </Badge>
                        ) : null}
                        <span className="text-sm text-gray-500">
                          {servingLabel}
                        </span>
                        {item.entry_time && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                            {formatTimeOfDayString(item.entry_time, timeFormat)}
                          </span>
                        )}
                        {isFromMealPlan && (
                          <Badge variant="outline" className="text-xs w-fit">
                            {t('mealCard.fromPlan', 'From Plan')}
                          </Badge>
                        )}
                        {giValue &&
                          validGiValues.includes(giValue as GlycemicIndex) &&
                          quickInfoNutrients.includes('glycemic_index') && (
                            <Badge
                              variant="secondary"
                              className="text-xs w-fit font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-transparent dark:text-purple-600"
                            >
                              {t('diary.mealCard.gi', 'GI: {{giValue}}', {
                                giValue,
                              })}
                            </Badge>
                          )}
                      </div>
                      <div
                        className="grid gap-x-4 gap-y-2 text-xs sm:text-sm mt-2 w-full"
                        style={{
                          gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '60px' : '80px'}, 1fr))`,
                        }}
                      >
                        {visibleNutrientsForGrid.map((nutrient) => {
                          const { metadata, displayValue, unitDisplay } =
                            getNutrientDisplay(nutrient);

                          return (
                            <div
                              key={nutrient}
                              className="text-center min-w-[60px]"
                            >
                              <div className={`font-medium ${metadata.color}`}>
                                {displayValue} {unitDisplay}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-500">
                                {t(metadata.label, metadata.defaultLabel)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {isFoodEntry && (
                        <AllergenBadges
                          allergens={(item as FoodEntry).allergens}
                          traces={(item as FoodEntry).traces}
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          debug(
                            loggingLevel,
                            'MealCard: Edit entry button clicked:',
                            item.id
                          );
                          onEditEntry(item); // Pass the item directly
                        }}
                        title={t('common.edit', 'Edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          debug(
                            loggingLevel,
                            'MealCard: Remove entry button clicked:',
                            item.id
                          );
                          setPendingDelete({
                            id: item.id,
                            type: isFoodEntryMeal
                              ? 'foodEntryMeal'
                              : 'foodEntry',
                            name: entryName ?? '',
                          });
                        }}
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {meal.entries.length > 1 && !isMobile && (
                <>
                  <Separator />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-4">
                    <span className="font-semibold dark:text-slate-300">
                      {t('mealCard.mealTotal', {
                        mealName: t(`common.${meal.type}`, meal.name),
                        defaultValue: `${meal.name} Total:`,
                      })}
                    </span>
                    <div
                      className="grid gap-x-2 gap-y-2 text-xs sm:text-sm w-full sm:w-[35%] sm:ml-auto"
                      style={{
                        gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '64px' : '60px'}, 1fr))`,
                      }}
                    >
                      {visibleNutrientsForGrid.map((nutrient) => {
                        const metadata = getNutrientMetadata(
                          nutrient,
                          customNutrients
                        );
                        const val = totals[nutrient as keyof MealTotals];
                        const value =
                          (typeof val === 'number' || typeof val === 'string'
                            ? val
                            : totals.custom_nutrients?.[nutrient]) ?? 0;

                        const displayValue =
                          nutrient === 'calories'
                            ? Math.round(
                                convertEnergy(Number(value), 'kcal', energyUnit)
                              ).toLocaleString('tr-TR')
                            : formatNutrientValue(
                                nutrient,
                                value,
                                customNutrients
                              );

                        const unitDisplay =
                          nutrient === 'calories'
                            ? getEnergyUnitString(energyUnit)
                            : metadata.unit;

                        return (
                          <div key={nutrient} className="min-w-0 text-center">
                            <div
                              className={`whitespace-nowrap font-bold ${metadata.color}`}
                            >
                              {displayValue} {unitDisplay}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {t(metadata.label, metadata.defaultLabel)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Food Database Dialog */}
      {editingFood && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && setEditingFood(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t('mealCard.editFoodDatabase', 'Edit Food Database')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'mealCard.editFoodDatabaseDescription',
                  'Edit the nutritional information for this food in your database.'
                )}
              </DialogDescription>
            </DialogHeader>
            <p className="text-red-500">
              {t(
                'mealCard.editingTemporarilyUnavailable',
                'Editing food details is temporarily unavailable due to schema changes.'
              )}
            </p>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Kayıt silinsin mi?"
        description={
          pendingDelete?.name
            ? `${pendingDelete.name} bu günden silinecek.`
            : 'Bu kayıt bu günden silinecek.'
        }
        variant="destructive"
        confirmLabel="Sil"
        onConfirm={() => {
          if (pendingDelete) {
            void onRemoveEntry(
              pendingDelete.id,
              pendingDelete.type,
              pendingDelete.name
            );
            if (expandedId === pendingDelete.id) setExpandedId(null);
          }
          setPendingDelete(null);
        }}
      />
      <ImageLightbox {...lightboxProps} />
    </>
  );
};

export default MealCard;
