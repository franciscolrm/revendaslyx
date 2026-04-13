'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  GitBranch,
  CheckCircle2,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Zap,
  Filter,
  ChevronDown,
  Phone,
  Mail,
  Building2,
  User,
  DollarSign,
  Clock,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useProcesses, useProcessSummary, type Process } from '@/hooks/use-processes';
import { useImportSource } from '@/contexts/import-source-context';

// ── Constants ──

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeVariant: string }> = {
  active: { label: 'Ativo', color: 'text-emerald-600 dark:text-emerald-400', badgeVariant: 'success' },
  completed: { label: 'Concluído', color: 'text-blue-600 dark:text-blue-400', badgeVariant: 'info' },
  cancelled: { label: 'Cancelado', color: 'text-red-600 dark:text-red-400', badgeVariant: 'danger' },
  paused: { label: 'Pausado', color: 'text-amber-600 dark:text-amber-400', badgeVariant: 'warning' },
};

const PRIORITY_CONFIG: Record<string, { label: string; badgeVariant: string }> = {
  urgent: { label: 'Urgente', badgeVariant: 'danger' },
  high: { label: 'Alta', badgeVariant: 'warning' },
  normal: { label: 'Normal', badgeVariant: 'default' },
  low: { label: 'Baixa', badgeVariant: 'default' },
};

const STAGE_GROUP_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  prospeccao: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
  contato: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  comercial: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  cartorio: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  caixa: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  financiamento: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-600' },
  transferencia: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  recebimento: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  encerramento: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', dot: 'bg-gray-500' },
  captacao: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
  venda_concluida: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  renegociacao: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  aguardando: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  sem_retorno: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  problema: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-600' },
  adimplente: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  outros: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
};

const STAGE_GROUP_LABELS: Record<string, string> = {
  prospeccao: 'Prospecção',
  contato: 'Contato',
  comercial: 'Comercial',
  cartorio: 'Cartório',
  caixa: 'Caixa',
  financiamento: 'Financiamento',
  transferencia: 'Transferência',
  recebimento: 'Recebimento',
  encerramento: 'Encerramento',
  captacao: 'Captação',
  venda_concluida: 'Vendida',
  renegociacao: 'Renegociação',
  aguardando: 'Aguardando',
  sem_retorno: 'Sem Retorno',
  problema: 'Problema',
  adimplente: 'Adimplente',
  outros: 'Outros',
};

// ── Helpers ──

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

// ══════════════════════════════════════
// ██  MAIN PAGE
// ══════════════════════════════════════

export default function ProcessesPage() {
  const { filterParam } = useImportSource();

  // ── State ──
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [stageGroupFilter, setStageGroupFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Summary (KPIs + stage tabs) ──
  const { data: summary } = useProcessSummary(filterParam);

  // ── Process list ──
  const { data: result, isLoading } = useProcesses({
    page,
    per_page: 25,
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    stage_group: stageGroupFilter || undefined,
    import_batch_ids: filterParam,
  });

  const processes = result?.data ?? [];
  const meta = result?.meta;

  // ── Handlers ──
  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleStageTab = useCallback((key: string) => {
    setStageGroupFilter((prev) => (prev === key ? '' : key));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSearchInput('');
    setStatusFilter('');
    setPriorityFilter('');
    setStageGroupFilter('');
    setPage(1);
  }, []);

  const hasActiveFilters = !!(search || statusFilter || priorityFilter || stageGroupFilter);

  // ── KPI values ──
  const total = summary?.total ?? 0;
  const active = summary?.by_status?.active ?? 0;
  const completed = summary?.by_status?.completed ?? 0;
  const cancelled = summary?.by_status?.cancelled ?? 0;
  const paused = summary?.by_status?.paused ?? 0;
  const urgent = (summary?.by_priority?.urgent ?? 0) + (summary?.by_priority?.high ?? 0);

  // ── Table columns ──
  const columns: Column<Process>[] = useMemo(() => [
    {
      key: 'process_code',
      header: 'Código',
      render: (row: any) => (
        <span className="text-[12px] font-mono font-semibold text-primary-600 dark:text-primary-400">
          {row.process_code}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.active;
        return <Badge variant={cfg.badgeVariant as any}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'current_stage',
      header: 'Etapa',
      render: (row: any) => {
        const stage = row.current_stage;
        if (!stage) return <span className="text-[12px] text-[rgb(var(--muted-foreground))]">-</span>;
        const sgColors = STAGE_GROUP_COLORS[stage.stage_group] ?? STAGE_GROUP_COLORS.outros;
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', sgColors.dot)} />
            <span className={cn('text-[12px] font-medium truncate max-w-[140px]', sgColors.text)}>
              {stage.name}
            </span>
          </div>
        );
      },
    },
    {
      key: 'enterprise',
      header: 'Empreendimento',
      render: (row: any) => {
        const name = row.unit?.enterprise?.name;
        return (
          <span className="text-[12px] text-[rgb(var(--foreground))] truncate max-w-[140px] block">
            {name || '-'}
          </span>
        );
      },
    },
    {
      key: 'unit',
      header: 'Unidade',
      render: (row: any) => {
        const u = row.unit;
        if (!u) return <span className="text-[12px] text-[rgb(var(--muted-foreground))]">-</span>;
        const parts = [u.block_tower, u.unit_number].filter(Boolean);
        return (
          <span className="text-[12px] text-[rgb(var(--foreground))]">
            {parts.join(' / ') || '-'}
          </span>
        );
      },
    },
    {
      key: 'seller',
      header: 'Vendedor',
      render: (row: any) => {
        const c = row.seller_client;
        if (!c) return <span className="text-[12px] text-[rgb(var(--muted-foreground))]">-</span>;
        return (
          <div className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-[rgb(var(--foreground))] max-w-[130px]">
              {c.full_name}
            </span>
            {c.phone && (
              <span className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--muted-foreground))]">
                <Phone className="h-2.5 w-2.5" />{c.phone}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'buyer',
      header: 'Comprador',
      render: (row: any) => {
        const c = row.buyer_client;
        if (!c) return <span className="text-[12px] text-[rgb(var(--muted-foreground))]">-</span>;
        return (
          <div className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-[rgb(var(--foreground))] max-w-[130px]">
              {c.full_name}
            </span>
            {c.phone && (
              <span className="flex items-center gap-0.5 text-[10px] text-[rgb(var(--muted-foreground))]">
                <Phone className="h-2.5 w-2.5" />{c.phone}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'assigned_user',
      header: 'Responsável',
      render: (row: any) => (
        <span className="text-[12px] text-[rgb(var(--foreground))] truncate max-w-[110px] block">
          {row.assigned_user?.full_name || '-'}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      className: 'text-right',
      render: (row: any) => {
        const val = Number(row.unit?.current_value) || 0;
        return (
          <span className="text-[12px] font-medium text-[rgb(var(--foreground))]">
            {val > 0 ? formatCurrency(val) : '-'}
          </span>
        );
      },
    },
    {
      key: 'priority',
      header: 'Prior.',
      render: (row: any) => {
        const cfg = PRIORITY_CONFIG[row.priority] ?? PRIORITY_CONFIG.normal;
        if (row.priority === 'normal' || row.priority === 'low') {
          return <span className="text-[11px] text-[rgb(var(--muted-foreground))]">{cfg.label}</span>;
        }
        return <Badge variant={cfg.badgeVariant as any}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'origin',
      header: 'Origem',
      render: (row: any) => {
        const batch = row.import_batch;
        if (!batch) return <span className="text-[11px] text-[rgb(var(--muted-foreground))]">Manual</span>;
        return (
          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-[rgb(var(--foreground))]">
              {batch.source_name || 'Import'}
            </span>
            <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
              {formatDate(batch.created_at)}
            </span>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-5">
      {/* ══ Header ══ */}
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">Processos</h1>
        <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">
          Gestão operacional de revendas imobiliárias
        </p>
      </div>

      {/* ══ KPIs ══ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total" value={total} icon={GitBranch} color="blue" />
        <KpiCard label="Ativos" value={active} icon={CheckCircle2} color="green" />
        <KpiCard label="Concluídos" value={completed} icon={CheckCircle2} color="cyan" />
        <KpiCard label="Cancelados" value={cancelled} icon={XCircle} color="red" />
        <KpiCard label="Pausados" value={paused} icon={PauseCircle} color="amber" />
        <KpiCard label="Urgente/Alta" value={urgent} icon={Zap} color="orange" />
      </div>

      {/* ══ Stage Group Tabs ══ */}
      {(summary?.stage_groups?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setStageGroupFilter(''); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all',
              !stageGroupFilter
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--border))]',
            )}
          >
            Todos
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              !stageGroupFilter ? 'bg-white/20' : 'bg-[rgb(var(--background))]',
            )}>
              {total}
            </span>
          </button>
          {summary!.stage_groups.map((sg) => {
            const isActive = stageGroupFilter === sg.key;
            const sgColor = STAGE_GROUP_COLORS[sg.key] ?? STAGE_GROUP_COLORS.outros;
            return (
              <button
                key={sg.key}
                onClick={() => handleStageTab(sg.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all',
                  isActive
                    ? cn(sgColor.bg, sgColor.text, 'ring-1 ring-current/20')
                    : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--border))]',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', sgColor.dot)} />
                {STAGE_GROUP_LABELS[sg.key] ?? sg.key}
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isActive ? 'bg-black/10 dark:bg-white/10' : 'bg-[rgb(var(--background))]',
                )}>
                  {sg.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ══ Search + Filters Bar ══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por código..."
              className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] pl-9 pr-3 text-[12px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors',
              showFilters || hasActiveFilters
                ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                : 'border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                {[search, statusFilter, priorityFilter, stageGroupFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] font-medium text-red-500 hover:text-red-600"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="text-[12px] text-[rgb(var(--muted-foreground))] shrink-0">
          {meta?.total ?? 0} processo{(meta?.total ?? 0) !== 1 ? 's' : ''} encontrado{(meta?.total ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ══ Expanded Filters ══ */}
      {showFilters && (
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Status filter */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos os status</option>
                  <option value="active">Ativo</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="paused">Pausado</option>
                </select>
              </div>

              {/* Priority filter */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Prioridade</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                  className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todas as prioridades</option>
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baixa</option>
                </select>
              </div>

              {/* Stage group filter (select alternative) */}
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Grupo de Etapa</label>
                <select
                  value={stageGroupFilter}
                  onChange={(e) => { setStageGroupFilter(e.target.value); setPage(1); }}
                  className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos os grupos</option>
                  {(summary?.stage_groups ?? []).map((sg) => (
                    <option key={sg.key} value={sg.key}>
                      {STAGE_GROUP_LABELS[sg.key] ?? sg.key} ({sg.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ Data Table ══ */}
      <DataTable
        columns={columns}
        data={processes}
        loading={isLoading}
        emptyMessage={
          hasActiveFilters
            ? 'Nenhum processo encontrado com os filtros aplicados.'
            : 'Nenhum processo importado. Faça upload na página de Importações.'
        }
        rowKey={(row: any) => row.id}
        pagination={
          meta && meta.total_pages > 1
            ? {
                page: meta.page,
                perPage: meta.per_page,
                total: meta.total,
                totalPages: meta.total_pages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}

