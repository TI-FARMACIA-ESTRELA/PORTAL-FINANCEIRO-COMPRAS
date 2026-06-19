import type { ComponentType, SVGProps } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: Tone;
}

const toneMap: Record<Tone, { icon: string; value: string }> = {
  default: { icon: 'bg-gray-100 text-gray-600', value: 'text-gray-900' },
  success: { icon: 'bg-green-100 text-green-600', value: 'text-green-700' },
  warning: { icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
  danger: { icon: 'bg-red-100 text-red-600', value: 'text-red-700' },
  info: { icon: 'bg-primary-100 text-primary-600', value: 'text-primary-700' },
};

export function KpiCard({ label, value, hint, icon: Icon, tone = 'default' }: KpiCardProps) {
  const tones = toneMap[tone];
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {Icon ? (
          <span className={cn('rounded-lg p-2', tones.icon)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={cn('mt-3 text-2xl font-semibold', tones.value)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
