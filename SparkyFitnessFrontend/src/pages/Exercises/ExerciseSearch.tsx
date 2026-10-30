import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  Search,
  Clock,
  TrendingUp,
  Filter,
  Dumbbell,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BodyMapFilter from './BodyMapFilter';

import { Exercise } from '@/types/exercises';
import { ExerciseSearchListItem } from './ExerciseSearchListItem';
import { useExerciseSearchHook } from '@/hooks/Exercises/useExerciseSearchHook';
import { localizeEquipment, localizeMuscle } from '@/utils/exerciseTaxonomy';

interface OwnershipFields {
  user_id?: string | null;
  userId?: string | null;
  is_public?: boolean | null;
  shared_with_public?: boolean | null;
  sharedWithPublic?: boolean | null;
}

const filterItems = <T,>(
  items: T[],
  filter: 'all' | 'mine' | 'family' | 'public',
  currentUserId?: string
): T[] => {
  if (filter === 'all') return items;
  return items.filter((item) => {
    const raw = item as unknown as OwnershipFields;
    const isOwner = !!(
      (raw.user_id && raw.user_id === currentUserId) ||
      (raw.userId && raw.userId === currentUserId)
    );
    const isPublic = !!(
      raw.is_public ||
      raw.shared_with_public ||
      raw.sharedWithPublic
    );

    if (filter === 'mine') {
      return isOwner;
    }
    if (filter === 'family') {
      return (
        !isOwner && !isPublic && (raw.user_id != null || raw.userId != null)
      );
    }
    if (filter === 'public') {
      return isPublic;
    }
    return true;
  });
};

interface ExerciseSearchProps {
  onExerciseSelect: (
    exercise: Exercise,
    sourceMode: 'internal' | 'external'
  ) => void;
  showInternalTab?: boolean;
  selectedDate?: string;
  onLogSuccess?: () => void;
  disableTabs?: boolean;
  initialSearchSource?: 'internal' | 'external';
}

const ExerciseSearch = ({
  onExerciseSelect,
  showInternalTab = true,
  disableTabs = false,
  initialSearchSource,
}: ExerciseSearchProps) => {
  const { t } = useTranslation();
  const {
    exercises,
    recentExercises,
    topExercises,
    loading,
    searchSource,
    providers,
    selectedProviderId,
    equipmentFilter,
    muscleGroupFilter,
    hasSearchedExternal,
    availableMuscleGroups,
    availableEquipment,
    searchTerm,
    selectedProviderType,
    handleSearch,
    handleAddExternalExercise,
    handleEquipmentToggle,
    handleMuscleToggle,
    setSelectedProviderId,
    setSelectedProviderType,
    setHasSearchedExternal,
    setSearchTerm,
  } = useExerciseSearchHook({
    showInternalTab,
    disableTabs,
    initialSearchSource,
  });

  const { user } = useAuth();
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [ownershipFilter, setOwnershipFilter] = useState<
    'all' | 'mine' | 'family' | 'public'
  >('all');

  const filteredRecentExercises = useMemo(
    () => filterItems(recentExercises, ownershipFilter, user?.id),
    [recentExercises, ownershipFilter, user?.id]
  );
  const filteredTopExercises = useMemo(
    () => filterItems(topExercises, ownershipFilter, user?.id),
    [topExercises, ownershipFilter, user?.id]
  );
  const filteredExercises = useMemo(
    () => filterItems(exercises, ownershipFilter, user?.id),
    [exercises, ownershipFilter, user?.id]
  );

  const triggerSearch = () => {
    handleSearch(searchTerm);
    if (searchSource === 'external') setHasSearchedExternal(true);
  };

  const renderExerciseList = (
    list: Exercise[],
    type: 'internal' | 'external',
    isAdd = false
  ) =>
    list.map((exercise) => (
      <ExerciseSearchListItem
        key={`${type}-${exercise.id}`}
        exercise={exercise}
        actionText={
          isAdd
            ? t('exercise.exerciseSearch.add', 'Add')
            : t('exercise.exerciseSearch.selectButton', 'Select')
        }
        actionIcon={isAdd ? Plus : undefined}
        onAction={async (ex: Exercise) => {
          if (isAdd) {
            const newEx = await handleAddExternalExercise(ex);
            if (newEx) onExerciseSelect(newEx, 'external');
          } else {
            onExerciseSelect(ex, type);
          }
        }}
      />
    ));

  const isSearching = searchTerm.trim().length > 0;
  const hasFilters = equipmentFilter.length > 0 || muscleGroupFilter.length > 0;
  const isFiltering = isSearching || hasFilters;
  const showRecent =
    searchSource === 'internal' &&
    !isFiltering &&
    !loading &&
    filteredRecentExercises.length > 0;
  const showTop =
    searchSource === 'internal' &&
    !isFiltering &&
    !loading &&
    filteredTopExercises.length > 0;
  const showInternalResults = searchSource === 'internal' && !loading;
  const showExternalResults =
    searchSource === 'external' &&
    hasSearchedExternal &&
    !loading &&
    exercises.length > 0;

  const clearFilters = () => {
    setSearchTerm('');
    equipmentFilter.forEach(handleEquipmentToggle);
    muscleGroupFilter.forEach(handleMuscleToggle);
  };

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
    }`;

  const sectionTitle = (icon: React.ReactNode, label: string) => (
    <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      {label}
    </div>
  );

  return (
    <div className="space-y-3 pt-2">
      {/* Provider selector (external only) */}
      {searchSource === 'external' && (
        <Select
          value={selectedProviderId ? String(selectedProviderId) : ''}
          onValueChange={(value) => {
            setSelectedProviderId(value);
            setSelectedProviderType(
              providers.find((p) => String(p.id) === value)?.provider_type ||
                null
            );
          }}
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue
              placeholder={t(
                'exercises.exerciseSearch.selectAProvider',
                'Select a provider'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.provider_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Search bar and filter chips stay pinned while the list scrolls. */}
      <div className="sticky -top-6 z-10 -mx-1 space-y-2 bg-background px-1 pb-2 pt-1">
        {/* The library searches as you type; external sources on demand. */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              enterKeyHint="search"
              placeholder={t(
                'exercise.exerciseSearch.placeholder',
                'Search exercises…'
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') triggerSearch();
              }}
              className="h-11 pl-9 text-base sm:text-sm"
            />
          </div>
          {searchSource === 'internal' && (
            // Ownership filter only matters with family sharing; keep phones uncluttered.
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select
                value={ownershipFilter}
                onValueChange={(value: 'all' | 'mine' | 'family' | 'public') =>
                  setOwnershipFilter(value)
                }
              >
                <SelectTrigger className="h-11 w-32">
                  <SelectValue
                    placeholder={t('exercises.exerciseSearch.all', 'All')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('exerciseSearch.ownership.all', 'All')}
                  </SelectItem>
                  <SelectItem value="mine">
                    {t('exerciseSearch.ownership.mine', 'My Exercises')}
                  </SelectItem>
                  <SelectItem value="family">
                    {t('exerciseSearch.ownership.family', 'Family')}
                  </SelectItem>
                  <SelectItem value="public">
                    {t('exerciseSearch.ownership.public', 'Public')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {searchSource === 'external' && (
            <Button
              onClick={triggerSearch}
              disabled={loading}
              className="h-11 shrink-0 px-4"
              aria-label={t(
                'exercise.exerciseSearch.placeholder',
                'Search exercises…'
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Muscle and equipment chips: one swipeable row each */}
        {availableMuscleGroups.length > 0 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setShowBodyMap((v) => !v)}
              className={chip(showBodyMap)}
            >
              Vücut haritası
            </button>
            {availableMuscleGroups.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMuscleToggle(m)}
                className={chip(muscleGroupFilter.includes(m))}
              >
                {localizeMuscle(t, m)}
              </button>
            ))}
          </div>
        )}
        {availableEquipment.length > 0 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {availableEquipment.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => handleEquipmentToggle(eq)}
                className={chip(equipmentFilter.includes(eq))}
              >
                {localizeEquipment(t, eq)}
              </button>
            ))}
          </div>
        )}
      </div>
      {showBodyMap && (
        <BodyMapFilter
          selectedMuscles={muscleGroupFilter}
          onMuscleToggle={handleMuscleToggle}
          availableMuscleGroups={availableMuscleGroups}
        />
      )}
      {isFiltering && searchSource === 'internal' && (
        <button
          type="button"
          onClick={clearFilters}
          className="px-1 text-xs font-semibold text-primary"
        >
          Filtreleri temizle
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('exercise.exerciseSearch.searching', 'Searching…')}</span>
        </div>
      )}

      {showRecent && (
        <section className="space-y-1.5">
          {sectionTitle(
            <Clock className="h-3 w-3" />,
            t('exercise.exerciseSearch.recent', 'Recent')
          )}
          {renderExerciseList(filteredRecentExercises, 'internal')}
        </section>
      )}

      {showTop && (
        <section className="space-y-1.5">
          {sectionTitle(
            <TrendingUp className="h-3 w-3" />,
            t('exercise.exerciseSearch.popular', 'Most Used')
          )}
          {renderExerciseList(filteredTopExercises, 'internal')}
        </section>
      )}

      {showInternalResults && (
        <section className="space-y-1.5">
          {sectionTitle(
            <Dumbbell className="h-3 w-3" />,
            isFiltering
              ? `Sonuçlar (${filteredExercises.length >= 50 ? '50+' : filteredExercises.length})`
              : 'Tüm hareketler'
          )}
          {filteredExercises.length > 0 ? (
            <>
              {renderExerciseList(filteredExercises, 'internal')}
              {/* The server returns at most 50 rows per search. */}
              {filteredExercises.length >= 50 && (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  İlk 50 hareket gösteriliyor. Aradığını bulmak için yaz ya da
                  kas/ekipman seç.
                </p>
              )}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('exercise.exerciseSearch.noResults', 'No exercises found.')}
            </p>
          )}
        </section>
      )}

      {showExternalResults && (
        <section className="space-y-1.5">
          {renderExerciseList(
            exercises,
            'external',
            selectedProviderType !== 'nutritionix'
          )}
        </section>
      )}
    </div>
  );
};

export default ExerciseSearch;
