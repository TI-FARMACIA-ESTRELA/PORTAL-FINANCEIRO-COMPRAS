import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  value: number | '';
  onValueChange: (value: number | '') => void;
}

function formatDisplay(value: number | ''): string {
  if (value === '') return '';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sanitizeEditText(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  const commaIdx = cleaned.indexOf(',');

  if (commaIdx === -1) {
    return cleaned.replace(/\./g, '');
  }

  const intPart = cleaned.slice(0, commaIdx).replace(/\./g, '');
  const decPart = cleaned.slice(commaIdx + 1).replace(/[.,]/g, '').slice(0, 2);
  return `${intPart},${decPart}`;
}

function parseEditText(raw: string): number | '' {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === ',') return '';

  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return '';

  return Math.round(parsed * 100) / 100;
}

function toEditText(value: number | ''): string {
  if (value === '') return '';

  const [intPart, decPart] = value.toFixed(2).split('.');
  if (decPart === '00') return intPart;
  return `${intPart},${decPart.replace(/0+$/, '') || '0'}`;
}

/**
 * Input monetário em R$. Durante a edição mantém texto livre; ao sair do campo
 * formata em pt-BR. Evita reformatar a cada tecla, o que quebrava digitação e backspace.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    { label, error, hint, value, onValueChange, className, id, required, onFocus, onBlur, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const [isFocused, setIsFocused] = useState(false);
    const [editText, setEditText] = useState('');

    const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setEditText(toEditText(value));
      onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeEditText(event.target.value);
      setEditText(sanitized);
      onValueChange(parseEditText(sanitized));
    };

    const display = isFocused ? editText : formatDisplay(value);

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
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
