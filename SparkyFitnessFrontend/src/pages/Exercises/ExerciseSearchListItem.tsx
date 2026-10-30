import { ElementType, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import { categoryLabel } from '@/utils/dgfitLabels';
import { EXERCISE_CATEGORY_META } from '@/constants/exercises';
import { Exercise } from '@/types/exercises';
import {
  resolveExerciseImageSrc,
  filterValidExerciseImages,
} from '@/utils/exercises';
import { localizeMuscle, localizeEquipment } from '@/utils/exerciseTaxonomy';
import { useImageSlideshow } from '@/hooks/useImageSlideshow';

type ExerciseCategory = keyof typeof EXERCISE_CATEGORY_META;

interface ExerciseListItemProps {
  exercise: Exercise;
  onAction: (exercise: Exercise) => void | Promise<void>;
  actionText: string;
  actionIcon?: ElementType;
}

/**
 * One row of the exercise picker: an animated thumbnail (the start/end photos
 * flip like a movement demo), the name, one "muscle · equipment" caption and
 * a round add button. The whole row is the tap target.
 */
export const ExerciseSearchListItem = ({
  exercise,
  onAction,
  actionText,
  actionIcon: ActionIcon = Plus,
}: ExerciseListItemProps) => {
  const { t } = useTranslation();
  const [isActioning, setIsActioning] = useState(false);
  const [imageError, setImageError] = useState(false);
  const images = filterValidExerciseImages(exercise.images);
  const frame = useImageSlideshow(imageError ? 0 : images.length, 1200);

  const handleAction = async () => {
    if (isActioning) return;
    setIsActioning(true);
    try {
      await onAction(exercise);
    } finally {
      setIsActioning(false);
    }
  };

  const meta =
    EXERCISE_CATEGORY_META[exercise.category as ExerciseCategory] ??
    EXERCISE_CATEGORY_META['general'];
  const CategoryIcon = meta.icon;

  const caption = [
    exercise.primary_muscles?.[0]
      ? localizeMuscle(t, exercise.primary_muscles[0])
      : exercise.category
        ? categoryLabel(exercise.category)
        : null,
    exercise.equipment?.[0]
      ? localizeEquipment(t, exercise.equipment[0])
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={isActioning}
      aria-label={`${exercise.name} – ${actionText}`}
      className="flex w-full items-center gap-3 rounded-xl bg-card p-2 text-left transition-opacity active:opacity-70 disabled:opacity-60"
    >
      {images.length > 0 && !imageError ? (
        <img
          src={resolveExerciseImageSrc(images[frame % images.length])}
          alt=""
          loading="lazy"
          onError={() => setImageError(true)}
          className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain"
        />
      ) : (
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
        >
          <CategoryIcon className={`h-5 w-5 ${meta.color}`} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {exercise.name}
        </span>
        {caption && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {caption}
          </span>
        )}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
        {isActioning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ActionIcon className="h-[18px] w-[18px]" />
        )}
      </span>
    </button>
  );
};
