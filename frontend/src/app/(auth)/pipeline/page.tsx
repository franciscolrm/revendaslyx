'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  GitBranch,
  Phone,
  ChevronDown,
  ChevronRight,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Zap,
  Building2,
  DollarSign,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  Pencil,
  Save,
  X,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { usePipelineDetail, type PipelineDetailStage } from '@/hooks/use-dashboard';
import { useImportSource } from '@/contexts/import-source-context';
import {
  useCarteiras,
  useCarteiraDatas,
  useCarteiraConsolidado,
  useCreateAjuste,
  useRemoveAjuste,
  useSyncCarteira,
  type CarteiraItem,
} from '@/hooks/use-carteiras';

// ── Stage configuration ──

interface StageConfig {
  label: string;
  icon: React.ElementType;
  gradient: string;
  dot: string;
  headerBg: string;
  textColor: string;
  type: 'main' | 'parallel' | 'end';
  order: number;
}

const STAGE_CONFIG: Record<string, StageConfig> = {
  prospeccao: { label: 'Prospecção', icon: Users, gradient: 'from-slate-500 to-slate-600', dot: 'bg-slate-500', headerBg: 'bg-slate-50 dark:bg-slate-900/50', textColor: 'text-slate-700 dark:text-slate-300', type: 'main', order: 1 },
  captacao: { label: 'Captação', icon: Users, gradient: 'from-slate-500 to-slate-600', dot: 'bg-slate-500', headerBg: 'bg-slate-50 dark:bg-slate-900/50', textColor: 'text-slate-700 dark:text-slate-300', type: 'main', order: 2 },
  contato: { label: 'Contato', icon: Phone, gradient: 'from-blue-500 to-blue-600', dot: 'bg-blue-500', headerBg: 'bg-blue-50 dark:bg-blue-950/40', textColor: 'text-blue-700 dark:text-blue-300', type: 'main', order: 3 },
  comercial: { label: 'Comercial', icon: TrendingUp, gradient: 'from-orange-500 to-orange-600', dot: 'bg-orange-500', headerBg: 'bg-orange-50 dark:bg-orange-950/40', textColor: 'text-orange-700 dark:text-orange-300', type: 'main', order: 4 },
  cartorio: { label: 'Cartório', icon: GitBranch, gradient: 'from-purple-500 to-purple-600', dot: 'bg-purple-500', headerBg: 'bg-purple-50 dark:bg-purple-950/40', textColor: 'text-purple-700 dark:text-purple-300', type: 'main', order: 5 },
  caixa: { label: 'Caixa', icon: DollarSign, gradient: 'from-cyan-500 to-cyan-600', dot: 'bg-cyan-500', headerBg: 'bg-cyan-50 dark:bg-cyan-950/40', textColor: 'text-cyan-700 dark:text-cyan-300', type: 'main', order: 6 },
  financiamento: { label: 'Financiamento', icon: BarChart3, gradient: 'from-cyan-600 to-cyan-700', dot: 'bg-cyan-600', headerBg: 'bg-cyan-50 dark:bg-cyan-950/40', textColor: 'text-cyan-700 dark:text-cyan-300', type: 'main', order: 7 },
  transferencia: { label: 'Transferência', icon: ArrowRight, gradient: 'from-indigo-500 to-indigo-600', dot: 'bg-indigo-500', headerBg: 'bg-indigo-50 dark:bg-indigo-950/40', textColor: 'text-indigo-700 dark:text-indigo-300', type: 'main', order: 8 },
  recebimento: { label: 'Recebimento', icon: CheckCircle2, gradient: 'from-teal-500 to-teal-600', dot: 'bg-teal-500', headerBg: 'bg-teal-50 dark:bg-teal-950/40', textColor: 'text-teal-700 dark:text-teal-300', type: 'main', order: 9 },
  encerramento: { label: 'Encerramento', icon: XCircle, gradient: 'from-gray-400 to-gray-500', dot: 'bg-gray-400', headerBg: 'bg-gray-50 dark:bg-gray-900/50', textColor: 'text-gray-600 dark:text-gray-400', type: 'main', order: 10 },
  venda_concluida: { label: 'Venda Concluída', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600', dot: 'bg-emerald-500', headerBg: 'bg-emerald-50 dark:bg-emerald-950/40', textColor: 'text-emerald-700 dark:text-emerald-300', type: 'end', order: 20 },
  renegociacao: { label: 'Renegociação', icon: Zap, gradient: 'from-amber-500 to-amber-600', dot: 'bg-amber-500', headerBg: 'bg-amber-50 dark:bg-amber-950/40', textColor: 'text-amber-700 dark:text-amber-300', type: 'parallel', order: 30 },
  aguardando: { label: 'Aguardando', icon: Clock, gradient: 'from-yellow-500 to-yellow-600', dot: 'bg-yellow-500', headerBg: 'bg-yellow-50 dark:bg-yellow-950/40', textColor: 'text-yellow-700 dark:text-yellow-300', type: 'parallel', order: 31 },
  sem_retorno: { label: 'Sem Retorno', icon: XCircle, gradient: 'from-red-400 to-red-500', dot: 'bg-red-400', headerBg: 'bg-red-50 dark:bg-red-950/40', textColor: 'text-red-600 dark:text-red-400', type: 'parallel', order: 32 },
  adimplente: { label: 'Adimplente', icon: CheckCircle2, gradient: 'from-green-500 to-green-600', dot: 'bg-green-500', headerBg: 'bg-green-50 dark:bg-green-950/40', textColor: 'text-green-700 dark:text-green-300', type: 'parallel', order: 33 },
  encerrado: { label: 'Encerrado', icon: AlertTriangle, gradient: 'from-gray-400 to-gray-500', dot: 'bg-gray-400', headerBg: 'bg-gray-50 dark:bg-gray-900/50', textColor: 'text-gray-600 dark:text-gray-400', type: 'end', order: 34 },
  problema: { label: 'Problema', icon: AlertTriangle, gradient: 'from-red-500 to-red-600', dot: 'bg-red-600', headerBg: 'bg-red-50 dark:bg-red-950/40', textColor: 'text-red-700 dark:text-red-400', type: 'end', order: 35 },
  outros: { label: 'Outros', icon: Layers, gradient: 'from-gray-400 to-gray-500', dot: 'bg-gray-400', headerBg: 'bg-gray-50 dark:bg-gray-900/50', textColor: 'text-gray-600 dark:text-gray-400', type: 'parallel', order: 99 },
};

const SOURCE_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4'];

function getStageConfig(key: string): StageConfig {
  return STAGE_CONFIG[key] ?? STAGE_CONFIG.outros;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

// ── Kanban Column ──

function KanbanColumn({
  stage,
  grandTotal,
  expanded,
  onToggle,
}: {
  stage: PipelineDetailStage;
  grandTotal: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = getStageConfig(stage.key);
  const Icon = cfg.icon;
  const pct = grandTotal > 0 ? Math.round((stage.total / grandTotal) * 100) : 0;
  const hasAlert = stage.urgent > 0 || stage.high > 0;

  return (
    <div className="flex flex-col rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Header with gradient bar */}
      <div className={cn('relative px-4 py-3', cfg.headerBg)}>
        <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', cfg.gradient)} />
        <div className="flex items-center gap-2.5 pt-0.5">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', cfg.gradient)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn('text-[13px] font-semibold leading-tight', cfg.textColor)}>
              {cfg.label}
            </h3>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">
              {stage.statuses.length} status
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-xl font-bold leading-none', cfg.textColor)}>{stage.total}</p>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">{pct}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
          <div
            className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', cfg.gradient)}
            style={{ width: `${Math.max(pct, stage.total > 0 ? 4 : 0)}%` }}
          />
        </div>

        {/* Priority alerts */}
        {hasAlert && (
          <div className="mt-2 flex items-center gap-2">
            {stage.urgent > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400">
                <Zap className="h-2.5 w-2.5" /> {stage.urgent} urgente{stage.urgent > 1 ? 's' : ''}
              </span>
            )}
            {stage.high > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                {stage.high} alta{stage.high > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body content */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {/* Source breakdown mini bars */}
        {stage.sources.length > 1 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Por origem</p>
            {stage.sources.map((src, i) => (
              <div key={src.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                />
                <span className="flex-1 truncate text-[11px] text-[rgb(var(--foreground))]">{src.name}</span>
                <span className="shrink-0 text-[11px] font-bold text-[rgb(var(--foreground))]">{src.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top enterprises */}
        {stage.top_enterprises.length > 0 && stage.top_enterprises[0].name !== 'Sem empreendimento' && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Empreendimentos</p>
            {stage.top_enterprises.slice(0, 3).map((e) => (
              <div key={e.name} className="flex items-center gap-2">
                <Building2 className="h-2.5 w-2.5 shrink-0 text-[rgb(var(--muted-foreground))]" />
                <span className="flex-1 truncate text-[11px] text-[rgb(var(--foreground))]">
                  {e.name.length > 22 ? e.name.slice(0, 20) + '...' : e.name}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-[rgb(var(--foreground))]">{e.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Value */}
        {stage.total_value > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[rgb(var(--muted))]/50 px-2.5 py-1.5">
            <DollarSign className="h-3 w-3 text-[rgb(var(--muted-foreground))]" />
            <span className="text-[11px] font-medium text-[rgb(var(--foreground))]">{formatCurrency(stage.total_value)}</span>
            <span className="text-[10px] text-[rgb(var(--muted-foreground))]">em carteira</span>
          </div>
        )}
      </div>

      {/* Expandable status detail */}
      <div className="border-t border-[rgb(var(--border))]">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))]/50"
        >
          <span>Detalhar status ({stage.statuses.length})</span>
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {expanded && (
          <div className="border-t border-[rgb(var(--border))] px-4 py-2 space-y-1">
            {stage.statuses.map((s) => {
              const statusPct = stage.total > 0 ? Math.round((s.count / stage.total) * 100) : 0;
              return (
                <div key={s.name} className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot)} />
                  <span className="flex-1 truncate text-[11px] text-[rgb(var(--foreground))]">{s.name}</span>
                  <span className="shrink-0 text-[11px] font-bold text-[rgb(var(--foreground))]">{s.count}</span>
                  <div className="h-1 w-10 overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                    <div
                      className={cn('h-full rounded-full', cfg.dot)}
                      style={{ width: `${statusPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compact Parallel Card ──

function ParallelCard({
  stage,
  grandTotal,
}: {
  stage: PipelineDetailStage;
  grandTotal: number;
}) {
  const cfg = getStageConfig(stage.key);
  const Icon = cfg.icon;
  const pct = grandTotal > 0 ? Math.round((stage.total / grandTotal) * 100) : 0;

  return (
    <div className={cn('rounded-xl border border-[rgb(var(--border))] overflow-hidden', cfg.headerBg)}>
      <div className={cn('h-0.5 bg-gradient-to-r', cfg.gradient)} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white', cfg.gradient)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={cn('text-[12px] font-semibold', cfg.textColor)}>{cfg.label}</h4>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">{pct}% do total</p>
          </div>
          <p className={cn('text-lg font-bold', cfg.textColor)}>{stage.total}</p>
        </div>

        {/* Mini status list */}
        {stage.statuses.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {stage.statuses.slice(0, 3).map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="truncate text-[10px] text-[rgb(var(--muted-foreground))]">{s.name}</span>
                <span className="shrink-0 text-[10px] font-bold text-[rgb(var(--foreground))]">{s.count}</span>
              </div>
            ))}
            {stage.statuses.length > 3 && (
              <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                +{stage.statuses.length - 3} mais
              </span>
            )}
          </div>
        )}

        {/* Sources */}
        {stage.sources.length > 1 && (
          <div className="mt-2 flex items-center gap-2">
            {stage.sources.map((src, i) => (
              <span key={src.name} className="flex items-center gap-1 text-[10px] text-[rgb(var(--muted-foreground))]">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                {src.name} ({src.count})
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// ██  MAIN PAGE
// ══════════════════════════════════════

export default function PipelinePage() {
  const { filterParam } = useImportSource();
  const { data, isLoading } = usePipelineDetail(filterParam);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const stages = data?.stages ?? [];
  const grandTotal = data?.grand_total ?? 0;
  const globalSources = data?.sources ?? [];

  // Classify stages
  const { mainStages, parallelStages, endStages } = useMemo(() => {
    const main: PipelineDetailStage[] = [];
    const parallel: PipelineDetailStage[] = [];
    const end: PipelineDetailStage[] = [];

    for (const s of stages) {
      const cfg = getStageConfig(s.key);
      if (cfg.type === 'main') main.push(s);
      else if (cfg.type === 'end') end.push(s);
      else parallel.push(s);
    }

    main.sort((a, b) => (getStageConfig(a.key).order) - (getStageConfig(b.key).order));
    parallel.sort((a, b) => b.total - a.total);
    end.sort((a, b) => b.total - a.total);

    return { mainStages: main, parallelStages: parallel, endStages: end };
  }, [stages]);

  function toggleNode(key: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Conversion rate
  const vendidas = stages.find((s) => s.key === 'venda_concluida')?.total ?? 0;
  const conversionRate = grandTotal > 0 ? ((vendidas / grandTotal) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* ══ Header ══ */}
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">Pipeline de Revendas</h1>
        <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">
          Fluxo operacional completo do CRM imobiliário
        </p>
      </div>

      {/* ══ KPI Summary Bar ══ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <KpiCard icon={GitBranch} color="blue" label="Total no Pipeline" value={grandTotal} />
        <KpiCard icon={Layers} color="purple" label="Grupos Ativos" value={stages.length} />
        <KpiCard icon={CheckCircle2} color="green" label="Vendas Concluídas" value={vendidas} />
        <KpiCard icon={TrendingUp} color="cyan" label="Taxa de Conversão" value={`${conversionRate}%`} />
        {globalSources.length > 1 && (
          <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
              <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {globalSources.map((src, i) => (
                  <span key={src.name} className="flex items-center gap-1 text-[11px] font-medium text-[rgb(var(--foreground))]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    {src.name}: {src.count}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-[rgb(var(--muted-foreground))]">Origens</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Carregando pipeline...</p>
          </div>
        </div>
      ) : stages.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-[rgb(var(--muted-foreground))]/30" />
            <h3 className="mt-3 text-sm font-medium text-[rgb(var(--foreground))]">Nenhum dado no pipeline</h3>
            <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              Importe dados na página de Importações para popular o fluxograma.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ══ Fluxo Principal - Kanban Horizontal ══ */}
          {mainStages.length > 0 && (
            <div>
              <SectionDivider label="Fluxo Principal" />
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {mainStages.map((stage) => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    grandTotal={grandTotal}
                    expanded={expandedNodes.has(stage.key)}
                    onToggle={() => toggleNode(stage.key)}
                  />
                ))}
              </div>

              {/* Flow arrow connector visual */}
              <div className="mt-3 flex items-center gap-1 px-4">
                {mainStages.map((s, i) => (
                  <div key={s.key} className="flex items-center">
                    <span className={cn('h-2 w-2 rounded-full', getStageConfig(s.key).dot)} />
                    {i < mainStages.length - 1 && (
                      <div className="mx-0.5 h-px w-4 bg-[rgb(var(--border))] sm:w-8" />
                    )}
                  </div>
                ))}
                <span className="ml-2 text-[10px] text-[rgb(var(--muted-foreground))]">
                  {mainStages.length} etapas no fluxo principal
                </span>
              </div>
            </div>
          )}

          {/* ══ Finalizações ══ */}
          {endStages.length > 0 && (
            <div>
              <SectionDivider label="Finalizações" />
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {endStages.map((stage) => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    grandTotal={grandTotal}
                    expanded={expandedNodes.has(stage.key)}
                    onToggle={() => toggleNode(stage.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ══ Fluxos Paralelos ══ */}
          {parallelStages.length > 0 && (
            <div>
              <SectionDivider label="Fluxos Paralelos" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {parallelStages.map((stage) => (
                  <ParallelCard
                    key={stage.key}
                    stage={stage}
                    grandTotal={grandTotal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ══ Gargalos / Concentração ══ */}
          <Card>
            <CardHeader>
              <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">
                Concentração do Pipeline
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...stages]
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8)
                  .map((stage) => {
                    const cfg = getStageConfig(stage.key);
                    const pct = grandTotal > 0 ? Math.round((stage.total / grandTotal) * 100) : 0;
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', cfg.dot)} />
                        <span className="w-32 shrink-0 truncate text-[12px] font-medium text-[rgb(var(--foreground))]">
                          {cfg.label}
                        </span>
                        <div className="flex-1">
                          <div className="h-5 w-full overflow-hidden rounded-md bg-[rgb(var(--muted))]">
                            <div
                              className={cn('flex h-full items-center rounded-md bg-gradient-to-r px-2 transition-all duration-700', cfg.gradient)}
                              style={{ width: `${Math.max(pct, stage.total > 0 ? 4 : 0)}%` }}
                            >
                              {pct >= 8 && (
                                <span className="text-[10px] font-bold text-white">{stage.total}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {pct < 8 && (
                          <span className="shrink-0 text-[12px] font-bold text-[rgb(var(--foreground))]">{stage.total}</span>
                        )}
                        <span className="w-8 shrink-0 text-right text-[11px] font-medium text-[rgb(var(--muted-foreground))]">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ██  VISÃO OPERACIONAL DETALHADA          */}
      {/* ══════════════════════════════════════════ */}
      <OperationalView />
    </div>
  );
}

// ══════════════════════════════════════
// ██  OPERATIONAL VIEW (ex-Carteiras)
// ══════════════════════════════════════

function OperationalView() {
  const { data: carteiras } = useCarteiras();
  const [selectedCarteira, setSelectedCarteira] = useState('');
  const [selectedData, setSelectedData] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQtd, setEditQtd] = useState('');
  const [editLig, setEditLig] = useState('');

  const { data: datas } = useCarteiraDatas(selectedCarteira || undefined);
  const { data: consolidado, isLoading } = useCarteiraConsolidado(
    selectedCarteira || undefined,
    selectedData || undefined,
  );
  const createAjuste = useCreateAjuste();
  const removeAjuste = useRemoveAjuste();
  const syncCarteira = useSyncCarteira();

  if (carteiras?.length && !selectedCarteira) setSelectedCarteira(carteiras[0]);
  if (datas?.length && !selectedData) setSelectedData(datas[0].data_referencia);

  const snap = consolidado?.snapshot;
  const totais = consolidado?.totais;
  const itens = consolidado?.itens ?? [];

  const handleSync = useCallback(async () => {
    if (!selectedCarteira) return;
    await syncCarteira.mutateAsync(selectedCarteira);
  }, [selectedCarteira, syncCarteira]);

  const handleStartEdit = useCallback((item: CarteiraItem) => {
    setEditingItem(item.id);
    setEditQtd(String(item.quantidade_final ?? ''));
    setEditLig(String(item.qtde_ligacao_final ?? ''));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem || !selectedCarteira || !selectedData) return;
    await createAjuste.mutateAsync({
      carteira: selectedCarteira, data: selectedData, itemId: editingItem,
      quantidade_manual: editQtd ? Number(editQtd) : undefined,
      qtde_ligacao_manual: editLig ? Number(editLig) : undefined,
    });
    setEditingItem(null);
  }, [editingItem, selectedCarteira, selectedData, editQtd, editLig, createAjuste]);

  const handleRemoveAjuste = useCallback(async (itemId: string) => {
    if (!selectedCarteira || !selectedData) return;
    await removeAjuste.mutateAsync({ carteira: selectedCarteira, data: selectedData, itemId });
  }, [selectedCarteira, selectedData, removeAjuste]);

  return (
    <>
      <SectionDivider label="Visão Operacional Detalhada" />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Grupo</label>
          <select value={selectedCarteira} onChange={(e) => { setSelectedCarteira(e.target.value); setSelectedData(''); }}
            className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option value="">Selecione...</option>
            {(carteiras ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Data</label>
          <select value={selectedData} onChange={(e) => setSelectedData(e.target.value)}
            className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option value="">Selecione...</option>
            {(datas ?? []).map((d) => (
              <option key={d.data_referencia} value={d.data_referencia}>
                {new Date(d.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')} ({d.origem})
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleSync} disabled={!selectedCarteira || syncCarteira.isPending}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 text-[12px] font-medium text-[rgb(var(--foreground))] disabled:opacity-40 hover:bg-[rgb(var(--muted))]">
          <RefreshCw className={cn('h-3.5 w-3.5', syncCarteira.isPending && 'animate-spin')} /> Sincronizar
        </button>
      </div>

      {/* Resumo */}
      {snap && totais && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Geral" value={totais.total_geral_calculado} icon={Layers} color="blue" />
          <KpiCard label="Total Ligações" value={totais.total_ligacoes_calculado} icon={Phone} color="purple" />
          <KpiCard label="Status Ativos" value={totais.total_status} icon={CheckCircle2} color="green" />
          <KpiCard label={totais.tem_ajuste_manual ? 'Editado manualmente' : 'Sem edição manual'} value={snap.origem} icon={AlertTriangle} color={totais.tem_ajuste_manual ? 'orange' : 'cyan'} />
        </div>
      )}

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : !snap ? (
        selectedCarteira ? (
          <Card><CardContent className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">
            Clique em "Sincronizar" para carregar dados da importação, ou selecione uma data.
          </CardContent></Card>
        ) : null
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50">
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))] text-right">Qtd Import.</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))] text-right">Lig Import.</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))] text-right">Qtd Final</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))] text-right">Lig Final</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))] w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {itens.map((item) => {
                  const isEditing = editingItem === item.id;
                  const isTotal = (item.status_nome || '').toLowerCase().includes('total geral');
                  return (
                    <tr key={item.id} className={cn(isTotal && 'bg-[rgb(var(--muted))]/30 font-semibold')}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[rgb(var(--foreground))]">{item.status_nome}</span>
                          {item.tem_ajuste_manual && (
                            <span className="rounded bg-amber-100 px-1 text-[9px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">ajustado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[12px] text-[rgb(var(--muted-foreground))]">{item.quantidade_importada ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right text-[12px] text-[rgb(var(--muted-foreground))]">{item.qtde_ligacao_importada ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input type="number" value={editQtd} onChange={(e) => setEditQtd(e.target.value)}
                            className="h-7 w-20 rounded border border-primary-500 bg-[rgb(var(--card))] px-2 text-right text-[12px] text-[rgb(var(--foreground))] focus:outline-none" autoFocus />
                        ) : (
                          <span className={cn('text-[12px] font-medium', item.tem_ajuste_manual ? 'text-amber-600 dark:text-amber-400' : 'text-[rgb(var(--foreground))]')}>
                            {item.quantidade_final}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isEditing ? (
                          <input type="number" value={editLig} onChange={(e) => setEditLig(e.target.value)}
                            className="h-7 w-20 rounded border border-primary-500 bg-[rgb(var(--card))] px-2 text-right text-[12px] text-[rgb(var(--foreground))] focus:outline-none" />
                        ) : (
                          <span className={cn('text-[12px]', item.tem_ajuste_manual ? 'text-amber-600 dark:text-amber-400' : 'text-[rgb(var(--foreground))]')}>
                            {item.qtde_ligacao_final}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={handleSaveEdit} className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Save className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setEditingItem(null)} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]"><X className="h-3.5 w-3.5" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleStartEdit(item)} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                              {item.tem_ajuste_manual && (
                                <button onClick={() => handleRemoveAjuste(item.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Reverter"><RotateCcw className="h-3.5 w-3.5" /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {snap && (
            <div className="border-t border-[rgb(var(--border))] px-4 py-2.5 text-[11px] text-[rgb(var(--muted-foreground))]">
              {itens.length} status &middot; Origem: {snap.origem} &middot; Atualizado: {new Date(snap.atualizado_em).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Helper Components ──

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[rgb(var(--border))]" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted-foreground))]">
        {label}
      </span>
      <div className="h-px flex-1 bg-[rgb(var(--border))]" />
    </div>
  );
}
