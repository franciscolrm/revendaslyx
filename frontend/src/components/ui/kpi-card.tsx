import { cn } from '@/lib/cn';

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', icon: 'text-orange-600 dark:text-orange-400' },
  red: { bg: 'bg-red-50 dark:bg-red-500/10', icon: 'text-red-600 dark:text-red-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', icon: 'text-cyan-600 dark:text-cyan-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: 'text-indigo-600 dark:text-indigo-400' },
};

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sublabel?: string;
}

export function KpiCard({ label, value, icon: Icon, color, sublabel }: KpiCardProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  const display = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', c.bg)}>
        <Icon className={cn('h-4 w-4', c.icon)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold leading-tight text-[rgb(var(--foreground))]">{display}</p>
        <p className="truncate text-[10px] text-[rgb(var(--muted-foreground))]">{label}</p>
        {sublabel && (
          <p className="truncate text-[10px] text-[rgb(var(--muted-foreground))]">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
