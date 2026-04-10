'use client';

import { useState, useMemo } from 'react';
import {
  Activity,
  GitBranch,
  Phone,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { BatchSelector } from '@/components/batch-selector';
import { usePipeline, useSnapshotEvolution } from '@/hooks/use-dashboard';

const STAGE_COLORS: Record<string, string> = {
  captacao: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  venda_concluida: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  comercial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  contato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cartorio: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  renegociacao: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  financiamento: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  aguardando: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  sem_retorno: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  encerrado: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  problema: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  outros: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STAGE_LABELS: Record<string, string> = {
  captacao: 'Captação',
  venda_concluida: 'Vendida',
  comercial: 'Comercial',
  contato: 'Contato',
  cartorio: 'Cartório',
  renegociacao: 'Renegociação',
  financiamento: 'Financiamento',
  aguardando: 'Aguardando',
  sem_retorno: 'Sem Retorno',
  encerrado: 'Encerrado',
  problema: 'Problema',
  adimplente: 'Adimplente',
  outros: 'Outros',
};

export default function ProcessesPage() {
  const [batchId, setBatchId] = useState<string | undefined>();
  const { data: pipeline, isLoading } = usePipeline(batchId);

  const items = pipeline ?? [];

  const totalResales = useMemo(() => items.reduce((s: number, i: any) => s + (i.total_resales || 0), 0), [items]);
  const totalCalls = useMemo(() => items.reduce((s: number, i: any) => s + (i.total_calls || 0), 0), [items]);
  const statusCount = items.filter((i: any) => i.total_resales > 0).length;

  const columns: Column[] = [
    {
      key: 'status_name',
      header: 'Status',
      render: (row: any) => (
        <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">
          {row.status_name}
        </span>
      ),
    },
    {
      key: 'stage_group',
      header: 'Grupo',
      render: (row: any) => (
        <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', STAGE_COLORS[row.stage_group] ?? STAGE_COLORS.outros)}>
          {STAGE_LABELS[row.stage_group] ?? row.stage_group}
        </span>
      ),
    },
    {
      key: 'total_resales',
      header: 'Quantidade',
      className: 'text-right',
      render: (row: any) => (
        <span className="text-[13px] font-bold text-[rgb(var(--foreground))]">{row.total_resales}</span>
      ),
    },
    {
      key: 'total_calls',
      header: 'Ligações',
      className: 'text-right',
      render: (row: any) => (
        <span className="text-[13px] text-[rgb(var(--muted-foreground))]">{row.total_calls || '-'}</span>
      ),
    },
    {
      key: 'operation_name',
      header: 'Operação',
      render: (row: any) => (
        <span className="text-[13px] text-[rgb(var(--muted-foreground))]">{row.operation_name ?? '-'}</span>
      ),
    },
  ];

  const sortedItems = useMemo(() => {
    return [...items]
      .filter((i: any) => i.total_resales > 0)
      .sort((a: any, b: any) => b.total_resales - a.total_resales);
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader title="Processos" description="Dados importados por status de revenda" />
        <BatchSelector value={batchId} onChange={setBatchId} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Revendas" value={totalResales} icon={GitBranch} color="blue" />
        <StatCard label="Total Ligações" value={totalCalls} icon={Phone} color="purple" />
        <StatCard label="Status Ativos" value={statusCount} icon={BarChart3} color="green" />
        <StatCard label="Operações" value={[...new Set(items.map((i: any) => i.operation_name))].filter(Boolean).length} icon={Activity} color="yellow" />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={sortedItems}
        loading={isLoading}
        emptyMessage="Nenhum dado importado. Faça upload de um CSV na página de Importações."
      />
    </div>
  );
}
