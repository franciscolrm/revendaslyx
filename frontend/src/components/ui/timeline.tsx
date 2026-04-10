import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';
  user?: string;
  type?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const iconColorStyles = {
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  accent: 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  muted: 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]',
};

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[17px] top-10 h-[calc(100%-24px)] w-px bg-[rgb(var(--border))]" />
            )}
            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                iconColorStyles[item.iconColor ?? 'muted'],
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
            </div>
            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-[rgb(var(--muted-foreground))]">
                      {item.description}
                    </p>
                  )}
                  {item.user && (
                    <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                      por {item.user}
                    </p>
                  )}
                </div>
                <time className="whitespace-nowrap text-xs text-[rgb(var(--muted-foreground))]">
                  {item.date}
                </time>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
