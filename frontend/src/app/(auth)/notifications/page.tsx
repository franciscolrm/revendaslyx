'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  CheckSquare,
  GitBranch,
  FileText,
  Bell,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from '@/hooks/use-notifications';

const typeIcons: Record<Notification['type'], React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
  task: CheckSquare,
  stage: GitBranch,
  document: FileText,
};

const typeColors: Record<Notification['type'], string> = {
  info: 'text-blue-400 bg-blue-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  error: 'text-red-400 bg-red-500/10',
  success: 'text-emerald-400 bg-emerald-500/10',
  task: 'text-purple-400 bg-purple-500/10',
  stage: 'text-primary-400 bg-primary-500/10',
  document: 'text-accent-400 bg-accent-500/10',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHour < 24) return `${diffHour}h atr\u00e1s`;
  if (diffDay === 1) return 'Ontem';
  if (diffDay < 7) return `${diffDay} dias atr\u00e1s`;
  return date.toLocaleDateString('pt-BR');
}

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return 'Hoje';
  if (date >= yesterday) return 'Ontem';
  if (date >= weekAgo) return 'Esta Semana';
  return 'Mais Antigos';
}

function getNotificationHref(n: Notification): string | undefined {
  if (!n.reference_type || !n.reference_id) return undefined;
  const routes: Record<string, string> = {
    process: '/processes',
    task: '/tasks',
    document: '/documents',
    activity: '/agenda',
    client: '/clients',
    unit: '/units',
  };
  const base = routes[n.reference_type];
  return base ? `${base}/${n.reference_id}` : undefined;
}

type FilterTab = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    if (filter === 'read') return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, filter]);

  const grouped = useMemo(() => {
    if (!filtered.length) return {};
    const groups: Record<string, Notification[]> = {};
    const order = ['Hoje', 'Ontem', 'Esta Semana', 'Mais Antigos'];

    for (const n of filtered) {
      const group = getDateGroup(n.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    }

    const sorted: Record<string, Notification[]> = {};
    for (const key of order) {
      if (groups[key]) sorted[key] = groups[key];
    }
    return sorted;
  }, [filtered]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const tabs = [
    { id: 'all' as const, label: 'Todas', count: notifications?.length },
    { id: 'unread' as const, label: 'Não lidas', count: unreadCount },
    { id: 'read' as const, label: 'Lidas', count: (notifications?.length ?? 0) - unreadCount },
  ];

  function handleClick(n: Notification) {
    if (!n.is_read) {
      markAsRead.mutate(n.id);
    }
    const href = getNotificationHref(n);
    if (href) {
      router.push(href);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notificações"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              icon={CheckCheck}
              onClick={() => markAllAsRead.mutate()}
              loading={markAllAsRead.isPending}
            >
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={tabs}
        activeTab={filter}
        onChange={(id) => setFilter(id as FilterTab)}
      />

      {!filtered.length ? (
        <EmptyState
          icon={Bell}
          title={
            filter === 'unread'
              ? 'Nenhuma notificação não lida'
              : filter === 'read'
                ? 'Nenhuma notificação lida'
                : 'Nenhuma notificação'
          }
          description={
            filter === 'all'
              ? 'Você será notificado sobre atualizações importantes aqui'
              : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                {group}
              </h2>
              <div className="space-y-2">
                {items.map((n) => {
                  const Icon = typeIcons[n.type] ?? Info;
                  const colorClass = typeColors[n.type] ?? typeColors.info;
                  const href = getNotificationHref(n);

                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'group flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200',
                        n.is_read
                          ? 'border-[rgb(var(--border))]/60 bg-[rgb(var(--card))]/80'
                          : 'border-primary-500/20 bg-primary-500/[0.03]',
                        href ? 'cursor-pointer' : 'cursor-default',
                        'hover:border-[rgb(var(--border))] hover:shadow-sm',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          colorClass,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'text-sm',
                              n.is_read
                                ? 'font-medium text-[rgb(var(--foreground))]'
                                : 'font-semibold text-[rgb(var(--foreground))]',
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500 shadow-sm shadow-primary-500/50" />
                          )}
                        </div>
                        {n.message && (
                          <p className="mt-0.5 text-sm text-[rgb(var(--muted-foreground))] line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <p className="mt-1.5 text-xs text-[rgb(var(--muted-foreground))]/70">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
