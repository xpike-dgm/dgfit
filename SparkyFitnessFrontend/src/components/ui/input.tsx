import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { normalizeDecimalInput } from '@/utils/decimalInput';

/** How a stored "78.5" is shown in a Turkish number field. */
const toDisplay = (value: React.ComponentProps<'input'>['value']) =>
  typeof value === 'number' || typeof value === 'string'
    ? String(value).replace('.', ',')
    : value;

const decimals = (step: number) => {
  const text = String(step);
  return text.includes('.') ? text.split('.')[1]!.length : 0;
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current!);

    const isNumber = type === 'number';

    // Number fields render as text with a decimal keyboard: a native
    // type="number" drops the comma Turkish users type ("78,5" became 785).
    // The value handed to onChange is normalized to a dot decimal.
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (isNumber) {
        event.target.value = normalizeDecimalInput(event.target.value);
      }
      props.onChange?.(event);
    };

    const handleStep = (direction: 'up' | 'down') => {
      const input = innerRef.current;
      if (!input || input.disabled || input.readOnly) return;
      const step = Number(props.step) > 0 ? Number(props.step) : 1;
      const current = parseFloat(normalizeDecimalInput(input.value)) || 0;
      let next = direction === 'up' ? current + step : current - step;
      if (props.min !== undefined) next = Math.max(Number(props.min), next);
      if (props.max !== undefined) next = Math.min(Number(props.max), next);
      const text = next.toFixed(decimals(step));
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const inputElement = (
      <input
        type={isNumber ? 'text' : type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input bg-raised px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
          'dark:[color-scheme:dark]',
          isNumber && 'tabular-nums sm:pr-6',
          className
        )}
        ref={innerRef}
        {...props}
        {...(isNumber
          ? {
              inputMode: props.inputMode ?? 'decimal',
              autoComplete: props.autoComplete ?? 'off',
              value: toDisplay(props.value),
              defaultValue: toDisplay(props.defaultValue) as
                string | number | undefined,
              onChange: handleChange,
            }
          : {})}
      />
    );

    if (!isNumber) return inputElement;

    // Desktop-only hover stepper; on phones it only stole room from the digits.
    return (
      <div className="relative group/input w-full">
        {inputElement}
        <div className="absolute right-0 top-0 hidden flex-col w-5 h-full border-l bg-muted/5 opacity-0 group-hover/input:opacity-100 transition-opacity z-10 sm:flex">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            disabled={props.disabled || props.readOnly}
            className="flex flex-1 items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors border-b"
            onClick={() => handleStep('up')}
          >
            <ChevronUp className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            disabled={props.disabled || props.readOnly}
            className="flex flex-1 items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => handleStep('down')}
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
