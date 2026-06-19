import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span
        className={cn(
          'animate-spin rounded-full border-primary-600 border-t-transparent',
          sizeMap[size],
          className,
        )}
      />
      {label ? <span className="text-sm text-gray-500">{label}</span> : null}
    </span>
  );
}
