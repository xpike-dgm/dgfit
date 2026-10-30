import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddCompItem {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Shown as a list row under the tiles instead of as a tile. */
  fullWidth?: boolean;
  /** Text color class for the row's icon tile; Sparky Blue by default. */
  tint?: string;
}

interface AddCompProps {
  isVisible: boolean;
  onClose: () => void;
  items: AddCompItem[];
  onNavigate: (value: string) => void;
  title?: string;
}

/** An icon on a softly tinted rounded square, as in the mobile AddSheet. */
const IconTile = ({
  icon: Icon,
  tint,
  size,
}: {
  icon: LucideIcon;
  tint?: string;
  size: 'card' | 'row';
}) => (
  <span
    className={cn(
      'relative flex shrink-0 items-center justify-center overflow-hidden',
      size === 'card'
        ? 'h-[52px] w-[52px] rounded-[18px]'
        : 'h-10 w-10 rounded-xl',
      tint ?? 'text-primary'
    )}
  >
    <span className="absolute inset-0 bg-current opacity-[0.14]" />
    <Icon className={size === 'card' ? 'h-[26px] w-[26px]' : 'h-5 w-5'} />
  </span>
);

/** Quick Actions sheet opened by the center Add button. */
const AddComp: React.FC<AddCompProps> = ({
  isVisible,
  onClose,
  items,
  onNavigate,
  title,
}) => {
  if (!isVisible) {
    return null;
  }

  const handleItemClick = (value: string) => {
    onNavigate(value);
    onClose();
  };

  const tiles = items.filter((item) => !item.fullWidth);
  const rows = items.filter((item) => item.fullWidth);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 animate-in fade-in duration-150 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Hızlı işlemler'}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card px-4 pt-2 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl animate-in slide-in-from-bottom-8 duration-200 sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-caption/60 sm:hidden" />
        <div className="mb-4 flex items-center justify-between px-1 pt-1">
          <h2 className="text-lg font-semibold text-foreground">
            {title || 'Hızlı işlemler'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex min-h-11 items-center px-2 text-base font-semibold text-primary"
          >
            Kapat
          </button>
        </div>

        {tiles.length > 0 && (
          <div
            className={cn(
              'mb-3 grid gap-2 rounded-2xl bg-raised p-3',
              tiles.length >= 4 ? 'grid-cols-4' : 'grid-cols-2'
            )}
          >
            {tiles.map((item) => (
              <button
                key={item.value}
                type="button"
                className="flex min-w-0 flex-col items-center gap-2 rounded-xl px-0.5 py-2 text-center transition-colors active:bg-accent"
                onClick={() => handleItemClick(item.value)}
              >
                <IconTile icon={item.icon} tint={item.tint} size="card" />
                <span className="text-sm leading-tight font-medium text-foreground">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-raised">
            {rows.map((item, index) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-accent',
                  index > 0 && 'border-t border-border'
                )}
                onClick={() => handleItemClick(item.value)}
              >
                <IconTile icon={item.icon} tint={item.tint} size="row" />
                <span className="flex-1 text-base font-semibold text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddComp;
