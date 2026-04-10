import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'gray';
}

const colorMap = {
  blue: {
    bg: 'bg-primary-50 dark:bg-primary-500/10',
    icon: 'text-primary-600 dark:text-primary-400',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    icon: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    icon: 'text-indigo-600 dark:text-indigo-400',
  },
  gray: {
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    icon: 'text-slate-600 dark:text-slate-400',
  },
};

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  color = 'blue',
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[rgb(var(--muted-foreground))]">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-[rgb(var(--foreground))]">{value}</p>
          {sublabel && (
            <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{sublabel}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              c.bg,
              c.icon,
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
    </div>
  );
}
