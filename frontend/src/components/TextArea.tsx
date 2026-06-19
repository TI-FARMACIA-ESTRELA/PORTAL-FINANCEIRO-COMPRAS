import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
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
        <textarea
          id={fieldId}
          ref={ref}
          rows={3}
          className={cn(
            'input-base resize-y',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : hint ? (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
