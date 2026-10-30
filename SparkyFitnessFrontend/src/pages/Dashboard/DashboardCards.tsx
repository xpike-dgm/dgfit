import type React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const fmt = (value: number) =>
  Math.round(value).toLocaleString('tr-TR', { maximumFractionDigits: 0 });

/** Standard SparkyFitness card shell: Porcelain fill, 16px radius, soft shadow. */
export const SparkyCard = ({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const classes = cn(
    'mb-3 block w-full rounded-2xl bg-card p-4 text-left shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none',
    className
  );
  return onClick ? (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  );
};

/** Bold section title on the left, optional "Detaylar ›" link on the right. */
export const SparkyCardHeader = ({
  title,
  linkLabel = 'Detaylar',
  onLink,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}) => (
  <div className="mb-2 flex items-center justify-between px-1">
    <h2 className="text-base font-bold text-muted-foreground">{title}</h2>
    {onLink && (
      <button
        type="button"
        onClick={onLink}
        className="flex items-center text-xs font-semibold text-primary"
      >
        {linkLabel}
        <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const ProgressRing = ({
  progress,
  size = 160,
  stroke = 12,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(progress, 1));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-progress-track"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        className="stroke-calories transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  );
};

const SideStat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-1 flex-col items-center justify-center">
    <span className="text-xl font-bold text-foreground">{fmt(value)}</span>
    <span className="mt-1 text-xs text-muted-foreground">{label}</span>
  </div>
);

export const CalorieRingCard = ({
  eaten,
  burned,
  remaining,
  progress,
}: {
  eaten: number;
  burned: number;
  remaining: number;
  progress: number;
}) => (
  <SparkyCard>
    <div className="flex items-center justify-center">
      <SideStat label="Alınan" value={eaten} />
      <div className="relative mx-2 flex items-center justify-center">
        <ProgressRing progress={progress} />
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-foreground">
            {fmt(remaining)}
          </span>
          <span className="text-xs text-muted-foreground">kalan</span>
          <span className="mt-0.5 text-xs text-caption">
            / {fmt(eaten + remaining)} kcal
          </span>
        </div>
      </div>
      <SideStat label="Yakılan" value={burned} />
    </div>
  </SparkyCard>
);

/** One nutrient tile of the 2x2 Nutrients grid. */
export const MacroBar = ({
  label,
  consumed,
  goal,
  colorClass,
  unit = 'g',
}: {
  label: string;
  consumed: number;
  goal: number;
  colorClass: string;
  unit?: string;
}) => {
  const hasGoal = goal > 0;
  const progress = hasGoal ? consumed / goal : 0;
  const diff = goal - consumed;
  return (
    <div className="w-[48%] p-1">
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {hasGoal
            ? `${fmt(consumed)}${unit} / ${fmt(goal)}${unit}`
            : `${fmt(consumed)}${unit}`}
        </span>
      </div>
      {hasGoal && (
        <>
          <div className="h-2 overflow-hidden rounded bg-progress-track">
            <div
              className={cn(
                'h-full rounded transition-[width] duration-500',
                colorClass
              )}
              style={{ width: `${Math.min(progress, 1) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-caption">
            %{Math.round(progress * 100)} ·{' '}
            {diff > 0
              ? `${fmt(diff)}${unit} kaldı`
              : diff < 0
                ? `${fmt(-diff)}${unit} fazla`
                : 'tamam'}
          </p>
        </>
      )}
    </div>
  );
};

/** Labelled progress row used by the Exercise card. */
export const ProgressRow = ({
  label,
  current,
  goal,
  unit,
  colorClass,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  colorClass: string;
}) => {
  const progress = goal > 0 ? current / goal : current > 0 ? 1 : 0;
  return (
    <div className="px-1 py-1.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {goal > 0
            ? `${fmt(current)} / ${fmt(goal)} ${unit}`
            : `${fmt(current)} ${unit}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-progress-track">
        <div
          className={cn(
            'h-full rounded transition-[width] duration-500',
            colorClass
          )}
          style={{ width: `${Math.min(progress, 1) * 100}%` }}
        />
      </div>
    </div>
  );
};
