import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  padded?: boolean;
}

export function Card({
  children,
  className,
  title,
  subtitle,
  actions,
  padded = true,
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-white shadow-sm ring-1 ring-gray-900/5',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={cn(padded ? 'p-5' : '')}>{children}</div>
    </div>
  );
}
