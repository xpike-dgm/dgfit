import type { CalorieBalance } from '@workspace/shared';

const fmt = (value: number) => Math.round(value).toLocaleString('tr-TR');

/**
 * The compact calorie line at the top of the SparkyFitness app's Diary:
 * eaten / budget kcal, what is left, and a thin progress bar.
 */
const DiaryCalorieBar = ({ balance }: { balance: CalorieBalance }) => {
  const { eaten, remaining } = balance;
  const budget = eaten + remaining;
  const progress = budget > 0 ? eaten / budget : 0;
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-lg font-bold text-foreground">
          {fmt(eaten)}
          {budget > 0 && (
            <span className="font-semibold text-caption"> / {fmt(budget)}</span>
          )}
          <span className="text-sm font-normal text-caption"> kcal</span>
        </span>
        {budget > 0 && (
          <span className="text-sm font-bold text-foreground">
            {fmt(Math.abs(remaining))}
            <span className="font-normal text-caption">
              {remaining >= 0 ? ' kalan' : ' fazla'}
            </span>
          </span>
        )}
      </div>
      {budget > 0 && (
        <div className="h-[7px] overflow-hidden rounded bg-progress-track">
          <div
            className="h-full rounded bg-calories transition-[width] duration-500"
            style={{ width: `${Math.min(progress, 1) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default DiaryCalorieBar;
