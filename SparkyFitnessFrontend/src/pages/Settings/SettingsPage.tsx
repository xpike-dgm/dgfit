import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  Settings as SettingsIcon,
  ListChecks,
  Tag,
  Cloud,
  Sparkles,
  UtensilsCrossed,
  ShieldAlert,
  Target,
  Database,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DgfitSocialSettings } from './DgfitSocialSettings';
import { DgfitNotificationSettings } from './DgfitNotificationSettings';
import { useAuth } from '@/hooks/useAuth';
import AIServiceSettings from './AIServiceSettings';
import CustomCategoryManager from './CustomCategoryManager';
import MealTypeManager from './MealTypeManager';
import ExternalProviderSettings from './ExternalProviderSettings';
import NutrientDisplaySettings from './NutrientDisplaySettings';
import NutrientGoalDirectionSettings from './NutrientGoalDirectionSettings';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'; // Import Accordion components
import CalculationSettings from './CalculationSettings';
import TooltipWarning from '@/components/TooltipWarning';
import CustomNutrientsSettings from '@/pages/Settings/CustomNutrientsSettings';
import AllergenSettings from '@/pages/Settings/AllergenSettings';
import { DeveloperResources } from './DevloperResources';
import { AccountSecurity } from './AccountSecurity';
import { ApiSettings } from './ApiSettings';
import { OAuthClientSettings } from './OAuthClientSettings';
import { WaterTrackingSettings } from './WaterTrackingSettings';
import { GuidedWorkoutSettings } from './GuidedWorkoutSettings';
import { PreferenceSettings } from './PreferenceSettings';
import { HeartRateZoneSettings } from './HeartRateZoneSettings';
import { ProfileInformation } from './ProfileInformation';
import { DataManagementSettings } from './DataManagementSettings';
import { DataImportSettings } from './DataImportSettings';

export interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
// DG FIT: one flat list. Rarely used sections live under "Gelişmiş ayarlar"
// (closed by default) and admin-only integrations under "Geliştirici".
const ADVANCED_SECTIONS = new Set([
  'heart-rate-zones',
  'data-management',
  'allergen-preferences',
  'custom-nutrients',
  'nutrient-display',
  'nutrient-goal-direction',
  'custom-meals',
  'calculation-settings',
  'custom-categories',
]);
const DEVELOPER_SECTIONS = new Set([
  'food-and-exercise-data-providers',
  'ai-service',
  'api-settings',
  'oauth-clients',
  'developer-resources',
]);

const CARD =
  'mb-3 rounded-2xl border-0 bg-card shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none';

const GroupToggle = ({ label }: { label: string }) => (
  <CollapsibleTrigger className="group mb-3 flex w-full items-center justify-between px-1 pt-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
    {label}
    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const section =
    queryParams.get('section') === 'integrations'
      ? 'food-and-exercise-data-providers'
      : (queryParams.get('section') ?? queryParams.get('tab'));
  const defaultExpanded = section ? [section] : [];

  return (
    <div className="w-full">
      <div>
        <Accordion
          type="multiple"
          className="w-full"
          defaultValue={defaultExpanded}
        >
          <AccordionItem value="profile-information" className={CARD}>
            <ProfileInformation />
          </AccordionItem>
          <AccordionItem value="user-preferences" className={CARD}>
            <PreferenceSettings />
          </AccordionItem>
          <AccordionItem value="dgfit-social" className={CARD}>
            <DgfitSocialSettings />
          </AccordionItem>
          <AccordionItem value="dgfit-notifications" className={CARD}>
            <DgfitNotificationSettings />
          </AccordionItem>
          <AccordionItem value="water-tracking" className={CARD}>
            <WaterTrackingSettings />
          </AccordionItem>
          <AccordionItem value="guided-workouts" className={CARD}>
            <GuidedWorkoutSettings />
          </AccordionItem>
          <AccountSecurity />
        </Accordion>
      </div>

      <Collapsible defaultOpen={!!section && ADVANCED_SECTIONS.has(section)}>
        <GroupToggle label="Gelişmiş ayarlar" />
        <CollapsibleContent>
          <Accordion
            type="multiple"
            className="w-full"
            defaultValue={defaultExpanded}
          >
            <AccordionItem value="heart-rate-zones" className={CARD}>
              <HeartRateZoneSettings />
            </AccordionItem>
            <AccordionItem value="data-management" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.dataManagement.subtitle',
                  'Import, export, or manage your data'
                )}
              >
                <Database className="h-5 w-5" />
                {t('settings.dataManagement.sectionTitle', 'Data Management')}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-6">
                <DataImportSettings />
                <DataManagementSettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="allergen-preferences" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.allergenPreferences.description',
                  'Track allergens you want to be warned about in foods'
                )}
              >
                <ShieldAlert className="h-5 w-5" />
                {t(
                  'settings.allergenPreferences.title',
                  'Allergen Preferences'
                )}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <AllergenSettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="custom-nutrients" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.customNutrients.subtitle',
                  'Manage your custom nutrient definitions'
                )}
              >
                <ListChecks className="h-5 w-5" />
                {t('settings.customNutrients.title', 'Custom Nutrients')}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <CustomNutrientsSettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nutrient-display" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.nutrientDisplay.description',
                  'Choose which nutrients to display in food and meal views'
                )}
              >
                <ListChecks className="h-5 w-5" />
                {t('settings.nutrientDisplay.title', 'Nutrient Display')}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <NutrientDisplaySettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nutrient-goal-direction" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.nutrientGoalDirection.description',
                  'Choose whether each nutrient goal is a minimum to reach, a maximum to stay under, or a target range to hit'
                )}
              >
                <Target className="h-5 w-5" />
                {t(
                  'settings.nutrientGoalDirection.title',
                  'Nutrient Goal Direction'
                )}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <NutrientGoalDirectionSettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="custom-meals" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.customMeals.subtitle',
                  'Create and manage custom meal types'
                )}
              >
                <UtensilsCrossed className="h-5 w-5" />
                {t('settings.customMeals.title', 'Custom Meals')}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <MealTypeManager />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="calculation-settings" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.calculationSettings.description',
                  'Manage BMR formulas, body fat algorithms, daily energy adjustments, goal deficit modes, and safety floors.'
                )}
              >
                <SettingsIcon className="h-5 w-5" />
                {t(
                  'settings.calculationSettings.title',
                  'Calculation Settings'
                )}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0 space-y-4">
                <CalculationSettings />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="custom-categories" className={CARD}>
              <AccordionTrigger
                className="flex items-center gap-2 p-4 hover:no-underline"
                description={t(
                  'settings.customCategories.description',
                  'Create and manage custom measurement categories'
                )}
              >
                <Tag className="h-5 w-5" />
                {t('settings.customCategories.title', 'Custom Categories')}
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <CustomCategoryManager />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CollapsibleContent>
      </Collapsible>

      {user?.role === 'admin' && (
        <Collapsible defaultOpen={!!section && DEVELOPER_SECTIONS.has(section)}>
          <GroupToggle label="Geliştirici (yalnızca yönetici)" />
          <CollapsibleContent>
            <Accordion
              type="multiple"
              className="w-full"
              defaultValue={defaultExpanded}
            >
              <AccordionItem
                value="food-and-exercise-data-providers"
                className={CARD}
              >
                <AccordionTrigger
                  className="flex items-center gap-2 p-4 hover:no-underline"
                  description={t(
                    'settings.foodExerciseDataProviders.description',
                    'Configure external food and exercise data sources and synchronize data with Garmin Connect'
                  )}
                >
                  <Cloud className="h-5 w-5" />
                  {t(
                    'settings.foodExerciseDataProviders.title',
                    'Food & Exercise Data Providers'
                  )}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-4">
                  <TooltipWarning
                    warningMsg={t(
                      'settings.foodExerciseDataProviders.invalidKeyLengthWarning',
                      'If you encounter an "Invalid key length" error, ensure your encryption key in the server\'s env variables are 64 hex.'
                    )}
                  />
                  <ExternalProviderSettings />
                  <Separator />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ai-service" className={CARD}>
                <AccordionTrigger
                  className="flex items-center gap-2 p-4 hover:no-underline"
                  description={t(
                    'settings.aiService.description',
                    'Manage settings for AI-powered features'
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                  {t('settings.aiService.title', 'AI Service')}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                  <TooltipWarning
                    warningMsg={t(
                      'settings.aiService.invalidKeyLengthWarning',
                      'If you encounter an "Invalid key length" error, ensure your encryption key in the server\'s env variables are 64 hex.'
                    )}
                  />
                  <AIServiceSettings />
                </AccordionContent>
              </AccordionItem>
              <ApiSettings />
              <OAuthClientSettings />
              <DeveloperResources />
            </Accordion>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default Settings;
