import { cn } from '@/lib/cn';

interface ProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const colorStyles = {
  primary: 'bg-primary-500',
  accent: 'bg-accent-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
};

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
  color = 'primary',
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex-1 overflow-hidden rounded-full bg-[rgb(var(--muted))]',
          sizeStyles[size],
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorStyles[color],
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[3ch] text-right text-sm font-medium text-[rgb(var(--foreground))]">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}

interface StageProgressProps {
  current: number;
  total: number;
  className?: string;
}

export function StageProgress({ current, total, className }: StageProgressProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ProgressBar value={(current / total) * 100} size="md" color="primary" />
      <span className="whitespace-nowrap text-sm font-medium text-[rgb(var(--muted-foreground))]">
        {current}/{total}
      </span>
    </div>
  );
}
