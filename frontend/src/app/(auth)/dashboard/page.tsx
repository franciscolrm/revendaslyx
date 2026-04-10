'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Users,
  Building2,
  CheckSquare,
  Phone,
  TrendingUp,
  Clock,
  ArrowRight,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { usePipeline, useSnapshotBatches } from '@/hooks/use-dashboard';
import { useMyTasks } from '@/hooks/use-tasks';

// Stage group mapping for imported snapshot data
const STAGE_GROUPS = [
  { key: 'captacao', label: 'Captação', color: 'bg-slate-500' },
  { key: 'venda_concluida', label: 'Vendidas', color: 'bg-emerald-500' },
  { key: 'comercial', label: 'Comercial', color: 'bg-orange-500' },
  { key: 'contato', label: 'Contato', color: 'bg-blue-500' },
  { key: 'cartorio', label: 'Cartório', color: 'bg-purple-500' },
  { key: 'renegociacao', label: 'Renegociação', color: 'bg-amber-500' },
  { key: 'financiamento', label: 'Financiamento', color: 'bg-cyan-500' },
  { key: 'aguardando', label: 'Aguardando', color: 'bg-yellow-500' },
  { key: 'sem_retorno', label: 'Sem Retorno', color: 'bg-red-400' },
  { key: 'encerrado', label: 'Encerrado', color: 'bg-gray-400' },
  { key: 'problema', label: 'Problema', color: 'bg-red-600' },
  { key: 'adimplente', label: 'Adimplente', color: 'bg-green-500' },
  { key: 'outros', label: 'Outros', color: 'bg-gray-500' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] ?? '';

  // Fetch pipeline data from imported snapshots
  const { data: pipelineData, isLoading: loadingPipeline } = usePipeline();

  // Fetch overdue tasks
  const { data: overdueTasks, isLoading: loadingTasks } = useMyTasks({
    overdue: true,
    per_page: 10,
  });

  const { data: pendingTasks } = useMyTasks({
    status: 'pending',
    per_page: 1,
  });

  const pipeline = pipelineData ?? [];
  const overdueList = overdueTasks?.data ?? [];
  const totalPendingTasks = pendingTasks?.meta?.total ?? 0;

  // Compute stats from pipeline data
  const totalResales = useMemo(() => {
    return pipeline.reduce((sum: number, item: any) => sum + (item.total_resales || 0), 0);
  }, [pipeline]);

  const totalCalls = useMemo(() => {
    return pipeline.reduce((sum: number, item: any) => sum + (item.total_calls || 0), 0);
  }, [pipeline]);

  // Group pipeline data by stage_group for the funnel chart
  const funnelData = useMemo(() => {
    const map: Record<string, { resales: number; calls: number }> = {};
    for (const item of pipeline) {
      const group = item.stage_group ?? 'outros';
      if (!map[group]) map[group] = { resales: 0, calls: 0 };
      map[group].resales += item.total_resales || 0;
      map[group].calls += item.total_calls || 0;
    }

    const maxCount = Math.max(1, ...Object.values(map).map((v) => v.resales));

    return STAGE_GROUPS
      .filter((sg) => map[sg.key])
      .map((sg) => ({
        ...sg,
        count: map[sg.key]?.resales ?? 0,
        calls: map[sg.key]?.calls ?? 0,
        barWidth: Math.round(((map[sg.key]?.resales ?? 0) / maxCount) * 100),
      }));
  }, [pipeline]);

  // Top statuses (individual rows from pipeline)
  const topStatuses = useMemo(() => {
    return [...pipeline]
      .filter((item: any) => item.total_resales > 0)
      .sort((a: any, b: any) => b.total_resales - a.total_resales)
      .slice(0, 10);
  }, [pipeline]);

  const vendidas = pipeline.find((i: any) => i.stage_group === 'venda_concluida')?.total_resales ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">
          Aqui está o resumo do seu dia.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Revendas"
          value={totalResales}
          icon={GitBranch}
          color="blue"
        />
        <StatCard
          label="Vendidas"
          value={vendidas}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Total Ligações"
          value={totalCalls}
          icon={Phone}
          color="purple"
        />
        <StatCard
          label="Tarefas Pendentes"
          value={totalPendingTasks}
          icon={CheckSquare}
          color="red"
        />
        <StatCard
          label="Status Distintos"
          value={pipeline.filter((i: any) => i.total_resales > 0).length}
          icon={BarChart3}
          color="indigo"
        />
      </div>

      {/* Pipeline Funnel + Top Statuses */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Pipeline - Funil por Grupo</h3>
          </CardHeader>
          <CardContent>
            {loadingPipeline ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : funnelData.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">
                Nenhum dado importado. Faça upload de um CSV na página de Importações.
              </div>
            ) : (
              <div className="space-y-2.5">
                {funnelData.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs font-medium text-[rgb(var(--foreground))]">
                      {item.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-7 w-full overflow-hidden rounded-lg bg-[rgb(var(--muted))]">
                        <div
                          className={cn('flex h-full items-center rounded-lg px-2 transition-all duration-700', item.color)}
                          style={{ width: `${Math.max(item.barWidth, item.count > 0 ? 6 : 0)}%` }}
                        >
                          {item.count > 0 && (
                            <span className="text-xs font-bold text-white">{item.count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs text-[rgb(var(--muted-foreground))]">
                      {item.calls > 0 ? `${item.calls} lig.` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Statuses */}
        <Card>
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Top Status por Quantidade</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[rgb(var(--border))]">
              {topStatuses.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">
                  Sem dados
                </div>
              ) : (
                topStatuses.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="truncate text-xs text-[rgb(var(--foreground))]">
                      {item.status_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[rgb(var(--foreground))]">
                        {item.total_resales}
                      </span>
                      {item.total_calls > 0 && (
                        <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                          ({item.total_calls} lig.)
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Tarefas Atrasadas</h3>
            <button
              onClick={() => router.push('/tasks')}
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : overdueList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <CheckSquare className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="mt-3 text-[13px] font-medium text-[rgb(var(--foreground))]">Tudo em dia!</p>
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">Nenhuma tarefa atrasada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueList.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/20 dark:bg-red-500/5"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[rgb(var(--foreground))] truncate">{task.title}</p>
                    {task.due_date && (
                      <span className="flex items-center gap-0.5 text-[10px] text-red-500 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
