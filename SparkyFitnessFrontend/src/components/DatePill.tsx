import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { addDays, localDateToDay } from '@workspace/shared';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';

const pillLabel = (date: Date) => {
  const parts = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')}, ${get('day')} ${get('month')}`;
};

interface DatePillProps {
  date: string;
  onChange: (date: string) => void;
}

/**
 * The SparkyFitness mobile date navigator: back/forward chevrons around a
 * rounded date pill that opens a calendar. Past days tint orange, future days
 * sky blue, today stays plain.
 */
const DatePill = ({ date, onChange }: DatePillProps) => {
  const {
    getDateRelationToToday,
    parseDateInUserTimezone,
    formatDateInUserTimezone,
  } = usePreferences();
  const relation = getDateRelationToToday(date);
  const selected = parseDateInUserTimezone(date);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label="Önceki gün"
        className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft className="h-[18px] w-[18px]" />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-10 min-w-[8.5rem] items-center justify-center gap-1 rounded-full border px-3 text-base font-medium sm:text-lg',
              relation === 'today' && 'border-transparent text-foreground',
              relation === 'past' &&
                'border-date-past/35 bg-date-past/12 text-date-past',
              relation === 'future' &&
                'border-date-future/35 bg-date-future/12 text-date-future'
            )}
          >
            {pillLabel(selected)}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center" sideOffset={8}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (!d) return;
              onChange(localDateToDay(d));
              setOpen(false);
            }}
            yearsRange={10}
          />
          {relation !== 'today' && (
            <button
              type="button"
              className="mx-2 mb-2 h-10 w-[calc(100%-1rem)] rounded-xl bg-primary/12 text-sm font-semibold text-primary"
              onClick={() => {
                onChange(formatDateInUserTimezone(new Date(), 'yyyy-MM-dd'));
                setOpen(false);
              }}
            >
              Bugüne dön
            </button>
          )}
        </PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label="Sonraki gün"
        className="flex h-11 w-11 items-center justify-center text-muted-foreground"
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
};

export default DatePill;
