'use client';

import { useState, useMemo } from 'react';
import {
  GitBranch,
  Phone,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { BatchSelector } from '@/components/batch-selector';
import { usePipeline } from '@/hooks/use-dashboard';

// ── Flow definition ─────────────────────────────────────

interface FlowStage {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;        // bg color for node
  accent: string;       // border/accent color
  textColor: string;    // text color
  iconBg: string;       // icon background
  type: 'main' | 'side' | 'end';
}

const FLOW_STAGES: FlowStage[] = [
  { key: 'captacao', label: 'Captacao', icon: Users, color: 'bg-slate-50 dark:bg-slate-900/60', accent: 'border-slate-300 dark:border-slate-600', textColor: 'text-slate-700 dark:text-slate-300', iconBg: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300', type: 'main' },
  { key: 'contato', label: 'Contato', icon: Phone, color: 'bg-blue-50 dark:bg-blue-950/40', accent: 'border-blue-300 dark:border-blue-700', textColor: 'text-blue-700 dark:text-blue-300', iconBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400', type: 'main' },
  { key: 'cartorio', label: 'Cartorio', icon: GitBranch, color: 'bg-purple-50 dark:bg-purple-950/40', accent: 'border-purple-300 dark:border-purple-700', textColor: 'text-purple-700 dark:text-purple-300', iconBg: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400', type: 'main' },
  { key: 'comercial', label: 'Comercial', icon: TrendingUp, color: 'bg-orange-50 dark:bg-orange-950/40', accent: 'border-orange-300 dark:border-orange-700', textColor: 'text-orange-700 dark:text-orange-300', iconBg: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400', type: 'main' },
  { key: 'renegociacao', label: 'Renegociacao', icon: Zap, color: 'bg-amber-50 dark:bg-amber-950/40', accent: 'border-amber-300 dark:border-amber-700', textColor: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400', type: 'side' },
  { key: 'financiamento', label: 'Financiamento', icon: BarChart3, color: 'bg-cyan-50 dark:bg-cyan-950/40', accent: 'border-cyan-300 dark:border-cyan-700', textColor: 'text-cyan-700 dark:text-cyan-300', iconBg: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400', type: 'main' },
  { key: 'venda_concluida', label: 'Vendidas', icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-950/40', accent: 'border-emerald-400 dark:border-emerald-600', textColor: 'text-emerald-700 dark:text-emerald-300', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400', type: 'end' },
  { key: 'aguardando', label: 'Aguardando', icon: Clock, color: 'bg-yellow-50 dark:bg-yellow-950/40', accent: 'border-yellow-300 dark:border-yellow-600', textColor: 'text-yellow-700 dark:text-yellow-300', iconBg: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400', type: 'side' },
  { key: 'sem_retorno', label: 'Sem Retorno', icon: XCircle, color: 'bg-red-50 dark:bg-red-950/40', accent: 'border-red-300 dark:border-red-600', textColor: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400', type: 'end' },
  { key: 'encerrado', label: 'Encerrado', icon: AlertTriangle, color: 'bg-gray-50 dark:bg-gray-900/60', accent: 'border-gray-300 dark:border-gray-600', textColor: 'text-gray-600 dark:text-gray-400', iconBg: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400', type: 'end' },
  { key: 'problema', label: 'Problema', icon: AlertTriangle, color: 'bg-red-50 dark:bg-red-950/40', accent: 'border-red-400 dark:border-red-700', textColor: 'text-red-700 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400', type: 'end' },
  { key: 'adimplente', label: 'Adimplente', icon: CheckCircle2, color: 'bg-green-50 dark:bg-green-950/40', accent: 'border-green-300 dark:border-green-600', textColor: 'text-green-700 dark:text-green-300', iconBg: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400', type: 'side' },
  { key: 'outros', label: 'Outros', icon: BarChart3, color: 'bg-gray-50 dark:bg-gray-900/60', accent: 'border-gray-300 dark:border-gray-600', textColor: 'text-gray-600 dark:text-gray-400', iconBg: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400', type: 'side' },
];

interface PipelineItem {
  stage_group: string;
  status_code: string;
  status_name: string;
  total_resales: number;
  total_calls: number;
  operation_name?: string;
}

// ── Flow Node Component ─────────────────────────────────

function FlowNode({
  stage,
  items,
  totalResales,
  expanded,
  onToggle,
}: {
  stage: FlowStage;
  items: PipelineItem[];
  totalResales: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const stageTotal = items.reduce((s, i) => s + i.total_resales, 0);
  const stageCalls = items.reduce((s, i) => s + i.total_calls, 0);
  const pct = totalResales > 0 ? Math.round((stageTotal / totalResales) * 100) : 0;
  const Icon = stage.icon;

  return (
    <div className="group">
      {/* Node */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
          stage.color,
          stage.accent,
          expanded ? 'shadow-md ring-2 ring-primary-500/20' : 'hover:shadow-md',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', stage.iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={cn('text-sm font-semibold', stage.textColor)}>
                {stage.label}
              </h3>
              {stage.type === 'end' && (
                <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-medium uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  Final
                </span>
              )}
            </div>
            <p className="text-[11px] text-[rgb(var(--muted-foreground))]">
              {items.length} status{items.length !== 1 ? '' : ''} neste grupo
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-xl font-bold', stage.textColor)}>{stageTotal}</p>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">revendas</p>
          </div>
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[rgb(var(--muted-foreground))]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[rgb(var(--muted-foreground))]" />
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgb(var(--border))]">
            <div
              className={cn('h-full rounded-full transition-all duration-700', stage.iconBg.split(' ')[0])}
              style={{ width: `${Math.max(pct, stageTotal > 0 ? 3 : 0)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-[rgb(var(--muted-foreground))]">{pct}%</span>
        </div>

        {/* Metrics row */}
        <div className="mt-2.5 flex items-center gap-4">
          {stageCalls > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-[rgb(var(--muted-foreground))]">
              <Phone className="h-3 w-3" />
              {stageCalls} ligacoes
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-[rgb(var(--muted-foreground))]">
            <BarChart3 className="h-3 w-3" />
            {pct}% do total
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 space-y-1 pl-4">
          {items
            .sort((a, b) => b.total_resales - a.total_resales)
            .map((item, i) => {
              const itemPct = stageTotal > 0 ? Math.round((item.total_resales / stageTotal) * 100) : 0;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5"
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--muted-foreground))]/30" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[rgb(var(--foreground))]">
                    {item.status_name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.total_calls > 0 && (
                      <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                        {item.total_calls} lig.
                      </span>
                    )}
                    <span className="text-[12px] font-bold text-[rgb(var(--foreground))]">
                      {item.total_resales}
                    </span>
                    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                      <div
                        className={cn('h-full rounded-full', stage.iconBg.split(' ')[0])}
                        style={{ width: `${itemPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── Flow Connector ──────────────────────────────────────

function FlowConnector({ type = 'vertical' }: { type?: 'vertical' | 'branch' }) {
  if (type === 'branch') {
    return (
      <div className="flex items-center justify-center py-1">
        <div className="flex items-center gap-1 text-[rgb(var(--muted-foreground))]/40">
          <div className="h-px w-6 bg-[rgb(var(--border))]" />
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-1">
      <div className="flex flex-col items-center">
        <div className="h-4 w-px bg-[rgb(var(--border))]" />
        <ChevronDown className="h-3 w-3 -mt-0.5 text-[rgb(var(--muted-foreground))]/40" />
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────

export default function PipelinePage() {
  const [batchId, setBatchId] = useState<string | undefined>();
  const { data: pipeline, isLoading } = usePipeline(batchId);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const items: PipelineItem[] = pipeline ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, PipelineItem[]> = {};
    for (const item of items) {
      const group = item.stage_group ?? 'outros';
      if (!map[group]) map[group] = [];
      map[group].push(item);
    }
    return map;
  }, [items]);

  const activeStages = FLOW_STAGES.filter((s) => grouped[s.key]?.length > 0);
  const mainFlow = activeStages.filter((s) => s.type === 'main');
  const sideFlow = activeStages.filter((s) => s.type === 'side');
  const endFlow = activeStages.filter((s) => s.type === 'end');

  const totalResales = items.reduce((sum, i) => sum + (i.total_resales || 0), 0);
  const totalCalls = items.reduce((sum, i) => sum + (i.total_calls || 0), 0);
  const totalStatuses = items.filter((i) => i.total_resales > 0).length;

  function toggleNode(key: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Pipeline de Revendas"
          description="Fluxograma de status das revendas importadas"
        />
        <BatchSelector value={batchId} onChange={setBatchId} />
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-500/10">
            <GitBranch className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-[rgb(var(--foreground))]">{totalResales}</p>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">revendas</p>
          </div>
        </div>
        <div className="h-8 w-px bg-[rgb(var(--border))]" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-500/10">
            <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-[rgb(var(--foreground))]">{totalCalls}</p>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">ligacoes</p>
          </div>
        </div>
        <div className="h-8 w-px bg-[rgb(var(--border))]" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
            <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-[rgb(var(--foreground))]">{totalStatuses}</p>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">status ativos</p>
          </div>
        </div>
        <div className="h-8 w-px bg-[rgb(var(--border))]" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-[rgb(var(--foreground))]">{activeStages.length}</p>
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]">grupos</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span className="text-[13px] text-[rgb(var(--muted-foreground))]">Carregando fluxograma...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Nenhum dado de pipeline"
          description="Faca upload de um CSV na pagina de Importacoes para popular o fluxograma."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Flow - Left column (8/12) */}
          <div className="lg:col-span-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-[rgb(var(--border))]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                Fluxo Principal
              </span>
              <div className="h-px flex-1 bg-[rgb(var(--border))]" />
            </div>

            <div className="space-y-0">
              {mainFlow.map((stage, i) => (
                <div key={stage.key}>
                  <FlowNode
                    stage={stage}
                    items={grouped[stage.key] ?? []}
                    totalResales={totalResales}
                    expanded={expandedNodes.has(stage.key)}
                    onToggle={() => toggleNode(stage.key)}
                  />
                  {i < mainFlow.length - 1 && <FlowConnector />}
                </div>
              ))}

              {/* End nodes */}
              {endFlow.length > 0 && (
                <>
                  <FlowConnector />
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-[rgb(var(--border))]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                      Finalizacao
                    </span>
                    <div className="h-px flex-1 bg-[rgb(var(--border))]" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {endFlow.map((stage) => (
                      <FlowNode
                        key={stage.key}
                        stage={stage}
                        items={grouped[stage.key] ?? []}
                        totalResales={totalResales}
                        expanded={expandedNodes.has(stage.key)}
                        onToggle={() => toggleNode(stage.key)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Side Flow - Right column (4/12) */}
          <div className="lg:col-span-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-[rgb(var(--border))]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                Paralelos
              </span>
              <div className="h-px flex-1 bg-[rgb(var(--border))]" />
            </div>

            <div className="space-y-3">
              {sideFlow.map((stage) => (
                <FlowNode
                  key={stage.key}
                  stage={stage}
                  items={grouped[stage.key] ?? []}
                  totalResales={totalResales}
                  expanded={expandedNodes.has(stage.key)}
                  onToggle={() => toggleNode(stage.key)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
