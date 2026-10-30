import { ChevronRight } from 'lucide-react';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/** Shared card style of the DG FIT settings and admin lists. */
export const SETTINGS_CARD =
  'mb-3 rounded-2xl border-0 bg-card shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none';

/**
 * A 56px card row that opens a collapsed group ("Gelişmiş ayarlar ›").
 * Must be rendered inside a `<Collapsible>`.
 */
export const SettingsGroupToggle = ({
  label,
  hint,
  className,
}: {
  label: string;
  hint?: string;
  className?: string;
}) => (
  <CollapsibleTrigger
    className={cn(
      SETTINGS_CARD,
      'group flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60',
      className
    )}
  >
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold">{label}</span>
      {hint && (
        <span className="mt-0.5 text-sm text-muted-foreground">{hint}</span>
      )}
    </span>
    <ChevronRight
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
    />
  </CollapsibleTrigger>
);
