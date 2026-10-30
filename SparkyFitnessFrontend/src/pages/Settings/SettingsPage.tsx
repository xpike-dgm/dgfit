import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon,
  ListChecks,
  Tag,
  Cloud,
  Sparkles,
  UtensilsCrossed,
  ShieldAlert,
  Target,
  Database,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { SETTINGS_CARD, SettingsGroupToggle } from './SettingsGroupToggle';
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
// DG FIT: one flat list. "Gelişmiş ayarlar" (closed) keeps the few extras a
// friend may want (heart-rate zones, allergens, diary download); the expert
// tools (imports, synced-data delete, nutrient and calculation tuning, custom
// categories and meal types) sit one level deeper under "Uzman ayarları", and
// admin-only integrations under "Geliştirici".
const ADVANCED_SECTIONS = new Set([
  'heart-rate-zones',
  'allergen-preferences',
  'data-export',
]);
const EXPERT_SECTIONS = new Set([
  'data-management',
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

const CARD = SETTINGS_CARD;
const TRIGGER = 'flex items-center gap-2 p-4 hover:no-underline';

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
  const openExpert = !!section && EXPERT_SECTIONS.has(section);

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

      <Collapsible
        defaultOpen={
          !!section && (ADVANCED_SECTIONS.has(section) || openExpert)
        }
      >
        <SettingsGroupToggle
          label="Gelişmiş ayarlar"
          hint="Nabız bölgeleri, alerjenler, verilerini indir"
        />
        <CollapsibleContent>
          <Accordion
            type="multiple"
            className="w-full"
            defaultValue={defaultExpanded}
          >
            <AccordionItem value="heart-rate-zones" className={CARD}>
              <HeartRateZoneSettings />
            </AccordionItem>
            <AccordionItem value="allergen-preferences" className={CARD}>
              <AccordionTrigger
                className={TRIGGER}
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
            <AccordionItem value="data-export" className={CARD}>
              <AccordionTrigger
                className={TRIGGER}
                description="Yemek günlüğünü CSV dosyası olarak indir"
              >
                <Download className="h-5 w-5" />
                Verilerini indir
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <DataManagementSettings parts="export" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Collapsible defaultOpen={openExpert}>
            <SettingsGroupToggle
              label="Uzman ayarları"
              hint="İçe aktarma, öğün türleri, besin ve kalori hesaplama ayarları. Çoğu kişinin değiştirmesi gerekmez."
            />
            <CollapsibleContent>
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={defaultExpanded}
              >
                <AccordionItem value="custom-meals" className={CARD}>
                  <AccordionTrigger
                    className={TRIGGER}
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
                <AccordionItem value="data-management" className={CARD}>
                  <AccordionTrigger
                    className={TRIGGER}
                    description="CSV/FIT içe aktarma ve senkronize verileri silme"
                  >
                    <Database className="h-5 w-5" />
                    {t(
                      'settings.dataManagement.sectionTitle',
                      'Data Management'
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6 p-4 pt-0">
                    <DataImportSettings />
                    <div className="border-t pt-6">
                      <DataManagementSettings parts="synced" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="custom-nutrients" className={CARD}>
                  <AccordionTrigger
                    className={TRIGGER}
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
                    className={TRIGGER}
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
                    className={TRIGGER}
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
                <AccordionItem value="calculation-settings" className={CARD}>
                  <AccordionTrigger
                    className={TRIGGER}
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
                  <AccordionContent className="space-y-4 p-4 pt-0">
                    <CalculationSettings />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="custom-categories" className={CARD}>
                  <AccordionTrigger
                    className={TRIGGER}
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
        </CollapsibleContent>
      </Collapsible>

      {user?.role === 'admin' && (
        <Collapsible defaultOpen={!!section && DEVELOPER_SECTIONS.has(section)}>
          <SettingsGroupToggle
            label="Geliştirici (yalnızca yönetici)"
            hint="Veri sağlayıcıları, API anahtarları, kişisel AI ayarları"
          />
          <CollapsibleContent>
            <TooltipWarning
              warningMsg={t(
                'settings.foodExerciseDataProviders.invalidKeyLengthWarning',
                'If you encounter an "Invalid key length" error, ensure your encryption key in the server\'s env variables are 64 hex.'
              )}
            />
            <div className="mb-3" />
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
                  className={TRIGGER}
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
                <AccordionContent className="min-w-0 space-y-4 p-4 pt-0">
                  <ExternalProviderSettings />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ai-service" className={CARD}>
                <AccordionTrigger
                  className={TRIGGER}
                  description="Ses girişi, sohbet geçmişi ve kişisel AI hizmetleri"
                >
                  <Sparkles className="h-5 w-5" />
                  Kişisel AI ayarları
                </AccordionTrigger>
                <AccordionContent className="min-w-0 space-y-4 p-4 pt-0">
                  <div className="flex flex-col gap-3 rounded-xl bg-accent p-3 text-sm">
                    <p className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        PT AI'nın herkes için ortak Claude anahtarı burada
                        değil, Yönetim'de ayarlanır.
                      </span>
                    </p>
                    <Button asChild variant="outline" className="h-11">
                      <Link to="/admin">Yönetim'e git</Link>
                    </Button>
                  </div>
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
