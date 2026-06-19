import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, required, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-gray-700">
            {label}
            {required ? <span className="ml-0.5 text-red-500">*</span> : null}
          </label>
        ) : null}
        <select
          id={fieldId}
          ref={ref}
          className={cn(
            'input-base',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
