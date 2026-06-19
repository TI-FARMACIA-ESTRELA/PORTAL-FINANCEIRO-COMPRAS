import type { ReactNode } from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/20/solid';
import { cn } from '@/utils/cn';

interface FilterBarProps {
  children?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: ReactNode;
  className?: string;
}

export function FilterBar({
  children,
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-900/5',
        className,
      )}
    >
      <div className="flex flex-wrap items-end gap-3">
        {onSearchChange ? (
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </span>
            <input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-base pl-10"
            />
          </div>
        ) : null}
        {children}
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      {!onSearchChange && !children ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <FunnelIcon className="h-4 w-4" /> Filtros
        </p>
      ) : null}
    </div>
  );
}
