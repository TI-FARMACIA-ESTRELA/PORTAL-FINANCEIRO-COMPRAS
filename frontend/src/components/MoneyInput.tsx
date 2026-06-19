import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  value: number | '';
  onValueChange: (value: number | '') => void;
}

/**
 * Input monetário em R$. Mantém o valor como number (centavos seguros via toFixed)
 * para evitar problemas de float. A persistência final usa Decimal no backend.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ label, error, hint, value, onValueChange, className, id, required, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    const handleChange = (raw: string) => {
      const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
      if (cleaned === '' || cleaned === '-') {
        onValueChange('');
        return;
      }
      const parsed = Number(cleaned);
      onValueChange(Number.isNaN(parsed) ? '' : parsed);
    };

    const display =
      value === ''
        ? ''
        : value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

    return (
      <div className="w-full">
        {label ? (
          <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-gray-700">
            {label}
            {required ? <span className="ml-0.5 text-red-500">*</span> : null}
          </label>
        ) : null}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">
            R$
          </span>
          <input
            id={fieldId}
            ref={ref}
            type="text"
            inputMode="decimal"
            value={display}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'input-base pl-10 text-right',
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

MoneyInput.displayName = 'MoneyInput';
