'use client';

import { useMemo } from 'react';
import {
  DollarSign,
  FileText,
  Package,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useImportedFinancialItems, useImportBatches } from '@/hooks/use-imported-data';
import { usePipeline } from '@/hooks/use-dashboard';

export default function FinancialPage() {
  const { data: financialItems, isLoading: loadingFinancial } = useImportedFinancialItems();
  const { data: batches } = useImportBatches('financial');
  const { data: pipeline } = usePipeline();

  const items = financialItems ?? [];
  const pipelineItems = (pipeline ?? []) as any[];

  const pipelineSummary = useMemo(() => {
    const totalResales = pipelineItems.reduce((s, i) => s + (i.total_resales || 0), 0);
    const vendidas = pipelineItems.filter((i) => i.stage_group === 'venda_concluida').reduce((s, i) => s + (i.total_resales || 0), 0);
    const emCartorio = pipelineItems.filter((i) => i.stage_group === 'cartorio').reduce((s, i) => s + (i.total_resales || 0), 0);
    const financiamento = pipelineItems.filter((i) => i.stage_group === 'financiamento').reduce((s, i) => s + (i.total_resales || 0), 0);
    return { totalResales, vendidas, emCartorio, financiamento };
  }, [pipelineItems]);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Composição de valores e resumo das revendas" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Revendas" value={pipelineSummary.totalResales} icon={Package} color="blue" />
        <StatCard label="Vendidas" value={pipelineSummary.vendidas} icon={TrendingUp} color="green" />
        <StatCard label="Em Cartório" value={pipelineSummary.emCartorio} icon={FileText} color="purple" />
        <StatCard label="Financiamento" value={pipelineSummary.financiamento} icon={DollarSign} color="yellow" />
      </div>

      {/* Composição de Valores (Reno) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">
              Composição de Valores da Revenda
            </h3>
            {batches && batches.length > 0 && (
              <Badge variant="success">
                {batches.length} lote{batches.length > 1 ? 's' : ''} importado{batches.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingFinancial ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Nenhum dado financeiro importado"
              description="Faça upload do CSV de composição de valores (Reno) na página de Importações."
            />
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div
                  key={item.id ?? i}
                  className="flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">
                    {item.item_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Resumo por Etapa do Pipeline</h3>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'status_name',
                header: 'Status',
                render: (row) => <span className="text-[13px] text-[rgb(var(--foreground))]">{row.status_name}</span>,
              },
              {
                key: 'stage_group',
                header: 'Grupo',
                render: (row) => <Badge variant="default">{row.stage_group}</Badge>,
              },
              {
                key: 'total_resales',
                header: 'Quantidade',
                className: 'text-right',
                render: (row) => <span className="text-[13px] font-bold">{row.total_resales}</span>,
              },
              {
                key: 'total_calls',
                header: 'Ligações',
                className: 'text-right',
                render: (row) => <span className="text-[13px] text-[rgb(var(--muted-foreground))]">{row.total_calls || '-'}</span>,
              },
            ]}
            data={pipelineItems.filter((i) => i.total_resales > 0).sort((a, b) => b.total_resales - a.total_resales)}
            loading={!pipeline}
            emptyMessage="Importe um CSV para ver dados do pipeline."
          />
        </CardContent>
      </Card>
    </div>
  );
}
