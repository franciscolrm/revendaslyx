import { cn } from '@/lib/cn';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'orange';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/20',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/20',
  orange: 'bg-accent-50 text-accent-700 ring-1 ring-accent-600/20 dark:bg-accent-500/10 dark:text-accent-400 dark:ring-accent-400/20',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Ativo', variant: 'success' },
    inactive: { label: 'Inativo', variant: 'warning' },
    blocked: { label: 'Bloqueado', variant: 'danger' },
    pending: { label: 'Pendente', variant: 'warning' },
    processing: { label: 'Processando', variant: 'info' },
    done: { label: 'Concluído', variant: 'success' },
    error: { label: 'Erro', variant: 'danger' },
  };

  const config = map[status] ?? { label: status, variant: 'default' as BadgeVariant };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
