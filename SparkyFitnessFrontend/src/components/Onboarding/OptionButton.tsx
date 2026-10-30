import { Check } from 'lucide-react';

interface OptionButtonProps {
  label: string;
  subLabel?: string;
  isSelected: boolean;
  onClick: () => void;
}

export const OptionButton = ({
  label,
  subLabel,
  isSelected,
  onClick,
}: OptionButtonProps) => (
  <button
    type="button"
    aria-pressed={isSelected}
    onClick={onClick}
    className={`
      w-full text-left p-5 my-3 rounded-xl border-2 transition-all duration-200
      flex flex-col justify-center bg-card
      ${
        isSelected
          ? 'border-primary'
          : 'border-border hover:border-primary/50 hover:shadow-sm'
      }
    `}
  >
    <div className="flex justify-between items-center w-full">
      <span className="font-semibold text-lg text-foreground">{label}</span>
      {isSelected && (
        <div className="bg-primary rounded-full p-1">
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
    {subLabel && (
      <span className="text-muted-foreground text-base mt-1">{subLabel}</span>
    )}
  </button>
);
