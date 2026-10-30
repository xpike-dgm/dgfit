import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const { getDateRelationToToday, parseDateInUserTimezone } = usePreferences();
  const relation = getDateRelationToToday(date);
  const selected = parseDateInUserTimezone(date);

  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label="Önceki gün"
        className="flex h-11 w-9 items-center justify-center text-muted-foreground"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft className="h-[18px] w-[18px]" />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 rounded-full border px-2.5 py-1 text-base font-medium sm:text-lg',
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
            onSelect={(d) => d && onChange(localDateToDay(d))}
            yearsRange={10}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label="Sonraki gün"
        className="flex h-11 w-9 items-center justify-center text-muted-foreground"
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
};

export default DatePill;
