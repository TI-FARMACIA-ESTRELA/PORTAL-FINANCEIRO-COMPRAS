import { forwardRef, type InputHTMLAttributes } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Campo de data. Usa input nativo type="date" (permite digitar e abrir calendário).
 * A formatação de exibição dd/MM/yyyy é aplicada nas tabelas via utils/format.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, hint, className, id, required, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-gray-700">
            {label}
            {required ? <span className="ml-0.5 text-red-500">*</span> : null}
          </label>
        ) : null}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <CalendarDaysIcon className="h-5 w-5" />
          </span>
          <input
            id={fieldId}
            ref={ref}
            type="date"
            className={cn(
              'input-base pl-10',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

DateInput.displayName = 'DateInput';
