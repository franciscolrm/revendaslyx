import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--muted))]">
        <Icon className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
      </div>
      <h3 className="mt-4 text-[13px] font-semibold text-[rgb(var(--foreground))]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-[rgb(var(--muted-foreground))]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
