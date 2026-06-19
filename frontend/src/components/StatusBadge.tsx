import { cn } from '@/utils/cn';

export type BadgeVariant =
  | 'gray'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-700 ring-gray-600/20',
  blue: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  green: 'bg-green-100 text-green-700 ring-green-600/20',
  amber: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  red: 'bg-red-100 text-red-700 ring-red-600/20',
  purple: 'bg-purple-100 text-purple-700 ring-purple-600/20',
};

export function StatusBadge({ label, variant = 'gray', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantMap[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
