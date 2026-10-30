import type React from 'react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { debug, info, error } from '@/utils/logging';
import {
  Home,
  Activity,
  BarChart3,
  Utensils, // Used for Foods
  Settings as SettingsIcon,
  LogOut,
  Dumbbell, // Used for Exercises
  Pill, // Used for Medications
  Shield,
  Plus,
  X,
  Coffee, // Used for Breakfast
  Sandwich, // Used for Lunch
  Cookie, // Used for Snacks
  UtensilsCrossed, // Used for Dinner
  Salad, // Used for Food Log
  HeartPulse, // Used for the delegate-only Symptoms page
  Users,
  Menu,
  Scale,
  LayoutGrid,
  BookOpen,
  ChevronLeft,
  Sparkles,
  ChefHat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

import SparkyChat from '../pages/Chat/SparkyChat';
import InstallAppBanner from '@/components/InstallAppBanner';
import OfflineWorkoutSync from '@/components/OfflineWorkoutSync';
import { useChatbotVisibility } from '@/contexts/ChatbotVisibilityContext';
import AddComp from '@/layouts/AddComp';
import ThemeToggle from '@/components/ThemeToggle';
import GlobalSyncButton from '@/components/GlobalSyncButton';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import GlobalNotificationIcon from '@/components/GlobalNotificationIcon';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useMealTypes } from '@/hooks/Diary/useMealTypes';
import { useCurrentVersionQuery } from '@/hooks/useGeneralQueries';
import { cn } from '@/lib/utils';
import { getGridClassNormal } from '@/utils/layout';

interface AddCompItem {
  value: string;
  label: string;
  icon: LucideIcon;
  fullWidth?: boolean;
  tint?: string;
}

/** A tab stays highlighted on its own sub-pages (e.g. /exercises/training-programs). */
const isTabActive = (pathname: string, tab: string): boolean =>
  pathname === tab || (tab !== '/' && pathname.startsWith(`${tab}/`));

/**
 * Pages reached from the phone Menü. On a phone they get a back header like
 * a pushed screen in the SparkyFitness app, and keep the Menü tab selected.
 */
const MENU_PAGES: [string, string][] = [
  ['/arkadaslar/', 'Profil'],
  ['/arkadaslar', 'Arkadaşlar'],
  ['/tarifler', 'Tarifler'],
  ['/reports', 'Gelişim'],
  ['/checkin', 'Kilo & Ölçümler'],
  ['/exercises', 'Hareketler'],
  ['/foods', 'Yiyecekler'],
  ['/goals', 'Hedefler'],
  ['/settings', 'Ayarlar'],
  ['/admin', 'Yönetim'],
];

const menuPageTitle = (pathname: string): string | undefined =>
  MENU_PAGES.find(([path]) =>
    path.endsWith('/') ? pathname.startsWith(path) : isTabActive(pathname, path)
  )?.[1];

interface MainLayoutProps {
  onShowAboutDialog: () => void;
  onShowNewReleaseDialog: () => void;
  onStartOnboarding?: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  onShowAboutDialog,
  onStartOnboarding,
}) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { openChat } = useChatbotVisibility();
  const {
    isActingOnBehalf,
    hasPermission,
    hasWritePermission,
    activeUserName,
  } = useActiveUser();
  const { getDateRelationToToday, loggingLevel } = usePreferences();
  debug(loggingLevel, 'MainLayout: Component rendered.');

  const { data: appVersion } = useCurrentVersionQuery();
  const [isAddCompOpen, setIsAddCompOpen] = useState(false);
  const [isMealTypeSelectOpen, setIsMealTypeSelectOpen] = useState(false);

  // Fetch meal types for quick log menu
  const { data: mealTypes } = useMealTypes();

  const handleSignOut = async () => {
    info(loggingLevel, 'MainLayout: Attempting to sign out.');
    try {
      await signOut();
      toast({
        title: t('common.success', 'Success'),
        description: t('auth.signedOut', 'Signed out successfully'),
      });
      navigate('/login'); // Navigate to login page after sign out
    } catch (err) {
      error(loggingLevel, 'MainLayout: Sign out error:', err);
      toast({
        title: t('common.error', 'Error'),
        description: t('auth.signOutFailed', 'Failed to sign out'),
        variant: 'destructive',
      });
    }
  };

  const addCompItems: AddCompItem[] = useMemo(() => {
    const items: AddCompItem[] = [];
    if (!isActingOnBehalf) {
      // DG FIT quick actions.
      items.push(
        { value: 'foodlog', label: 'Yemek', icon: Salad },
        { value: '/antrenman', label: 'Antrenman', icon: Dumbbell },
        { value: '/checkin', label: 'Ölçüm', icon: Scale },
        { value: 'ptai', label: 'PT AI', icon: Sparkles },
        {
          value: '/tarifler',
          label: 'Tarif oluştur',
          icon: ChefHat,
          fullWidth: true,
          tint: 'text-cat-amber',
        },
        {
          value: '/arkadaslar',
          label: 'Arkadaşlar',
          icon: Users,
          fullWidth: true,
          tint: 'text-cat-violet',
        },
        {
          value: '/reports',
          label: 'Gelişim',
          icon: BarChart3,
          fullWidth: true,
          tint: 'text-cat-green',
        }
      );
    } else {
      if (hasWritePermission('checkin')) {
        items.push({
          value: 'checkin',
          label: t('nav.checkin', 'Check-In'),
          icon: Activity,
        });
      }
      if (hasWritePermission('diary')) {
        items.push({
          value: 'foodlog',
          label: t('nav.foodLog', 'Food Log'),
          icon: Salad,
          fullWidth: true,
        });
      }
    }
    return items;
  }, [isActingOnBehalf, hasWritePermission, t]);

  // Map meal type names to icons
  const getMealTypeIcon = useCallback((name: string): LucideIcon => {
    const lowerName = name.toLowerCase();
    switch (lowerName) {
      case 'breakfast':
        return Coffee;
      case 'lunch':
        return Sandwich;
      case 'dinner':
        return UtensilsCrossed;
      case 'snacks':
        return Cookie;
      default:
        return UtensilsCrossed; // Default icon for custom meal types
    }
  }, []);

  // Get display name for meal type
  const getMealTypeLabel = useCallback(
    (name: string): string => {
      const lowerName = name.toLowerCase();
      switch (lowerName) {
        case 'breakfast':
          return t('common.breakfast', 'Breakfast');
        case 'lunch':
          return t('common.lunch', 'Lunch');
        case 'dinner':
          return t('common.dinner', 'Dinner');
        case 'snacks':
          return t('common.snacks', 'Snacks');
        default:
          return name; // Custom meal types use their own name
      }
    },
    [t]
  );

  // Generate meal type items from API
  const mealTypeItems: AddCompItem[] = useMemo(() => {
    if (!mealTypes) return [];

    return mealTypes
      .filter((mt) => mt.show_in_quick_log !== false)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((mt) => ({
        value: mt.name.toLowerCase(),
        label: getMealTypeLabel(mt.name),
        icon: getMealTypeIcon(mt.name),
      }));
  }, [mealTypes, getMealTypeLabel, getMealTypeIcon]);

  const availableTabs = useMemo(() => {
    debug(loggingLevel, 'MainLayout: Calculating available tabs (desktop).', {
      isActingOnBehalf,
      hasPermission,
      hasWritePermission,
    });
    const tabs = [];
    if (!isActingOnBehalf) {
      tabs.push(
        { value: '/', label: 'Özet', icon: LayoutGrid },
        { value: '/gunluk', label: 'Günlük', icon: BookOpen },
        { value: '/antrenman', label: 'Antrenman', icon: Dumbbell },
        { value: '/arkadaslar', label: 'Arkadaşlar', icon: Users },
        { value: '/reports', label: 'Gelişim', icon: BarChart3 },
        { value: '/foods', label: 'Yiyecekler', icon: Utensils },
        { value: '/tarifler', label: 'Tarifler', icon: ChefHat },
        { value: '/checkin', label: 'Ölçümler', icon: Scale },
        { value: '/settings', label: 'Ayarlar', icon: SettingsIcon }
      );
    } else {
      if (hasWritePermission('diary')) {
        tabs.push({ value: '/gunluk', label: t('nav.diary'), icon: Home });
      }
      if (hasWritePermission('checkin')) {
        tabs.push({
          value: '/checkin',
          label: t('nav.checkin'),
          icon: Activity,
        });
      }
      if (hasPermission('reports')) {
        tabs.push({
          value: '/reports',
          label: t('nav.reports'),
          icon: BarChart3,
        });
      }
      if (hasWritePermission('can_manage_medications')) {
        tabs.push({
          value: '/medications',
          label: t('nav.medications', 'Medications'),
          icon: Pill,
        });
      }
      // Owners and check-in delegates reach symptoms from the Check-in page; a
      // delegate who may track symptoms but not check-ins gets their own entry.
      if (
        hasWritePermission('can_manage_symptoms') &&
        !hasWritePermission('checkin')
      ) {
        tabs.push({
          value: '/symptoms',
          label: t('nav.symptoms', 'Symptoms'),
          icon: HeartPulse,
        });
      }
    }
    if (user?.role === 'admin' && !isActingOnBehalf) {
      tabs.push({ value: '/admin', label: t('nav.admin'), icon: Shield });
    }
    return tabs;
  }, [
    isActingOnBehalf,
    hasPermission,
    hasWritePermission,
    loggingLevel,
    user?.role,
    t,
  ]);

  const availableMobileTabs = useMemo(() => {
    debug(loggingLevel, 'MainLayout: Calculating available tabs (mobile).', {
      isActingOnBehalf,
      hasPermission,
      hasWritePermission,
      isAddCompOpen,
    });
    const mobileTabs = [];
    // Cycle/Pregnancy and Medications live in the "+" Add menu on mobile
    // (see addCompItems), not the bottom bar, to keep the bar uncluttered.
    if (!isActingOnBehalf) {
      mobileTabs.push(
        { value: '/', label: 'Özet', icon: LayoutGrid },
        { value: '/gunluk', label: 'Günlük', icon: BookOpen },
        {
          value: 'Add',
          label: 'Ekle',
          icon: isAddCompOpen ? X : Plus,
        },
        { value: '/antrenman', label: 'Antrenman', icon: Dumbbell },
        { value: '/menu', label: 'Menü', icon: Menu }
      );
    } else {
      if (hasWritePermission('diary')) {
        mobileTabs.push({
          value: '/gunluk',
          label: t('nav.diary'),
          icon: Home,
        });
      }
      if (hasWritePermission('checkin')) {
        mobileTabs.push({
          value: '/checkin',
          label: t('nav.checkin'),
          icon: Activity,
        });
      }
      if (hasPermission('reports')) {
        mobileTabs.push({
          value: '/reports',
          label: t('nav.reports'),
          icon: BarChart3,
        });
      }
      // Delegates have no "+" Add menu on mobile, so medications stays in the bar.
      if (hasWritePermission('can_manage_medications')) {
        mobileTabs.push({
          value: '/medications',
          label: t('nav.medications', 'Medications'),
          icon: Pill,
        });
      }
      if (
        hasWritePermission('can_manage_symptoms') &&
        !hasWritePermission('checkin')
      ) {
        mobileTabs.push({
          value: '/symptoms',
          label: t('nav.symptoms', 'Symptoms'),
          icon: HeartPulse,
        });
      }
    }
    return mobileTabs;
  }, [
    isActingOnBehalf,
    hasPermission,
    hasWritePermission,
    loggingLevel,
    isAddCompOpen,
    t,
  ]);

  const handleNavigateFromAddComp = useCallback(
    (value: string) => {
      info(loggingLevel, `MainLayout: Navigating to ${value} from AddComp.`);
      if (value === 'ptai') {
        setIsAddCompOpen(false);
        openChat();
      } else if (value === 'foodlog') {
        setIsAddCompOpen(false);
        // DG FIT keeps a single food list, so skip the meal picker then.
        if (mealTypeItems.length === 1) {
          navigate('/gunluk', {
            state: { openFoodSearchForMeal: mealTypeItems[0]?.value },
          });
        } else {
          setIsMealTypeSelectOpen(true);
        }
      } else {
        navigate(value);
        setIsAddCompOpen(false);
      }
    },
    [loggingLevel, navigate, mealTypeItems, openChat]
  );

  const handleMealTypeSelect = useCallback(
    (mealType: string) => {
      info(
        loggingLevel,
        `MainLayout: Meal type ${mealType} selected, navigating to diary.`
      );
      debug(
        loggingLevel,
        `[MainLayout] Navigating to diary with meal type: ${mealType}`
      );
      setIsMealTypeSelectOpen(false);
      navigate('/gunluk', { state: { openFoodSearchForMeal: mealType } });
    },
    [loggingLevel, navigate]
  );

  const gridClass = getGridClassNormal(availableTabs.length);

  const location = useLocation();

  // Whether the current route is reachable for the active profile. When acting
  // on behalf, a delegate only has a subset of tabs; landing on a disallowed
  // route (e.g. staying on Diary after switching to a checkin-only profile)
  // would otherwise mount that page and fire requests that 403.
  const isCurrentPathAllowed = useMemo(() => {
    if (!isActingOnBehalf || availableTabs.length === 0) {
      return true;
    }
    const currentPath = location.pathname;
    // Match exactly or as prefix (e.g. /medications/log should match /medications)
    return availableTabs.some((tab) => {
      if (tab.value === '/gunluk') {
        return (
          currentPath === '/gunluk' ||
          currentPath === '/workout-playback' ||
          currentPath.startsWith('/workout-playback/')
        );
      }
      return (
        currentPath === tab.value || currentPath.startsWith(tab.value + '/')
      );
    });
  }, [isActingOnBehalf, availableTabs, location.pathname]);

  useEffect(() => {
    if (!isCurrentPathAllowed) {
      const fallbackTab = availableTabs[0]?.value;
      if (fallbackTab) {
        debug(
          loggingLevel,
          `MainLayout: Redirecting from unauthorized path ${location.pathname} to ${fallbackTab}`
        );
        navigate(fallbackTab, { replace: true });
      }
    }
  }, [
    isCurrentPathAllowed,
    availableTabs,
    location.pathname,
    navigate,
    loggingLevel,
  ]);

  const subPageTitle = isActingOnBehalf
    ? undefined
    : menuPageTitle(location.pathname);
  const goBack = () => {
    const historyState = window.history.state as { idx?: number } | null;
    if ((historyState?.idx ?? 0) > 0) navigate(-1);
    else navigate('/menu');
  };

  const selectedDate = new URLSearchParams(location.search).get('date');
  const selectedDateRelation = selectedDate
    ? getDateRelationToToday(selectedDate)
    : 'today';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-[max(env(safe-area-inset-top),12px)] sm:py-8">
        <div className="mb-6 hidden items-center justify-between sm:flex">
          <div className="flex items-center gap-1">
            <img
              src="/images/dgfit-logo.png"
              alt="DG FIT"
              width={40}
              height={40}
              className="rounded-xl mr-2"
            />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              DG <span className="text-primary">FIT</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ProfileSwitcher />
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {t('layout.welcome', 'Welcome {{activeUserName}}', {
                activeUserName,
              })}
            </span>
            {onStartOnboarding && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartOnboarding}
                className="flex items-center gap-2"
                title={t('onboarding.completeSetup', 'Complete your setup')}
              >
                {t('onboarding.completeSetup', 'Complete Setup')}
              </Button>
            )}
            <GlobalNotificationIcon />
            <GlobalSyncButton />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t('auth.signOut', 'Sign Out')}
            </Button>
          </div>
        </div>
        {onStartOnboarding && (
          <Button
            variant="secondary"
            onClick={onStartOnboarding}
            className="mb-3 w-full sm:hidden"
          >
            {t('onboarding.completeSetup', 'Complete Setup')}
          </Button>
        )}
        <nav
          className={cn(
            'relative hidden sm:grid w-full gap-1 mb-6 bg-raised p-1 rounded-xl border border-border/60 transition-colors overflow-hidden',
            gridClass,
            selectedDateRelation === 'past' && 'border-date-past/40',
            selectedDateRelation === 'future' && 'border-date-future/40'
          )}
        >
          {availableTabs.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="ghost"
              className={cn(
                'relative flex items-center gap-2 rounded-lg transition-all',
                isTabActive(location.pathname, value)
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-tab-inactive'
              )}
              onClick={() => navigate(value)}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          ))}
        </nav>

        {/* Mobile tab bar, as in the SparkyFitness app: chrome bar with a
            hairline top edge, labelled tabs and a raised round Add button. */}
        <nav className="apple-safe-area sm:hidden fixed bottom-0 left-0 right-0 z-50 w-full border-t border-chrome-border bg-chrome">
          <div className="flex items-end">
            {availableMobileTabs.map(({ value, label, icon: Icon }) => {
              if (value === 'Add') {
                return (
                  <div
                    key={value}
                    className="flex flex-1 items-end justify-center pb-1"
                  >
                    <button
                      type="button"
                      aria-label={label}
                      onClick={() => setIsAddCompOpen((prev) => !prev)}
                      className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[2px_4px_6px_rgba(0,0,0,0.25)] transition-transform active:scale-95"
                    >
                      <Icon className="h-7 w-7" strokeWidth={2.75} />
                    </button>
                  </div>
                );
              }
              const active =
                isTabActive(location.pathname, value) ||
                (value === '/menu' && subPageTitle !== undefined);
              return (
                <button
                  key={value}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    setIsAddCompOpen(false);
                    navigate(value);
                  }}
                  className={cn(
                    'flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1',
                    active ? 'text-primary' : 'text-tab-inactive'
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.9} />
                  <span
                    className={cn(
                      'text-xs leading-4',
                      active ? 'font-semibold' : 'font-medium'
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="pb-24 sm:pb-0">
          {subPageTitle && (
            <div className="-mx-4 -mt-1 mb-3 flex items-center border-b border-border px-2 pb-2 sm:hidden">
              <button
                type="button"
                aria-label="Geri"
                onClick={goBack}
                className="flex h-10 w-10 items-center justify-center text-foreground"
              >
                <ChevronLeft className="h-[22px] w-[22px]" />
              </button>
              <h1 className="min-w-0 flex-1 truncate text-center text-lg font-semibold text-foreground">
                {subPageTitle}
              </h1>
              <span className="w-10" />
            </div>
          )}
          <InstallAppBanner />
          <OfflineWorkoutSync />
          {/* Don't mount a disallowed page while the redirect effect runs, or it
              fires requests the active profile isn't permitted to make. */}
          {isCurrentPathAllowed ? <Outlet /> : null}
        </div>

        <SparkyChat />
      </div>

      <AddComp
        isVisible={isAddCompOpen}
        onClose={() => setIsAddCompOpen(false)}
        items={addCompItems}
        onNavigate={handleNavigateFromAddComp}
      />

      <AddComp
        isVisible={isMealTypeSelectOpen}
        onClose={() => setIsMealTypeSelectOpen(false)}
        items={mealTypeItems}
        onNavigate={handleMealTypeSelect}
        title={t('foodDiary.selectMealType', 'Select Meal Type')}
      />

      <footer className="hidden text-center text-muted-foreground text-sm py-4 sm:block">
        <button
          type="button"
          className="cursor-pointer underline bg-transparent border-0 p-0 text-inherit font-normal text-sm"
          onClick={onShowAboutDialog}
        >
          {t('nav.sparkyFitnessV', 'DG FIT v{{version}}', {
            version: appVersion?.version ?? '',
          })}
        </button>
      </footer>
    </div>
  );
};

export default MainLayout;
