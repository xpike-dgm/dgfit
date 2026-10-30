import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  SET_TYPE_LABELS_TR,
  SET_TYPE_MAIN_CHOICES,
  SET_TYPE_OTHER_CHOICES,
  SET_TYPE_STYLES,
  setTypeChoice,
  setTypeLabelTr,
} from '@/constants/exercises';

interface SetTypeSelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Set 2 türü". */
  ariaLabel: string;
  className?: string;
}

/**
 * Set type picker: the four types people use (Normal, Isınma, Azaltmalı set,
 * Tükeniş) first, the rest under "Diğer". Stored values stay English.
 */
const SetTypeSelect = ({
  value,
  onChange,
  ariaLabel,
  className,
}: SetTypeSelectProps) => {
  const choice = setTypeChoice(value);
  const others: string[] = [...SET_TYPE_OTHER_CHOICES];
  if (
    !(SET_TYPE_MAIN_CHOICES as readonly string[]).includes(choice) &&
    !others.includes(choice)
  ) {
    others.push(choice);
  }

  return (
    <Select value={choice} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn('h-11 px-2 text-sm', className)}
      >
        <span
          className={cn(
            'truncate rounded-full px-2 py-0.5 text-xs font-medium',
            SET_TYPE_STYLES[choice] ?? 'bg-muted text-muted-foreground'
          )}
        >
          {setTypeLabelTr(choice)}
        </span>
      </SelectTrigger>
      <SelectContent>
        {SET_TYPE_MAIN_CHOICES.map((type) => (
          <SelectItem key={type} value={type}>
            {SET_TYPE_LABELS_TR[type]}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Diğer</SelectLabel>
          {others.map((type) => (
            <SelectItem key={type} value={type}>
              {SET_TYPE_LABELS_TR[type] ?? type}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default SetTypeSelect;
