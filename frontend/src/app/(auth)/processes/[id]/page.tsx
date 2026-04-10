'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  Pause,
  XCircle,
  Eye,
  Layers,
  Clock,
  MessageSquare,
  Activity,
  Users,
  Home,
  FileText,
  DollarSign,
  ListTodo,
  StickyNote,
  ShieldCheck,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  Mail,
  Hash,
  Upload,
  Plus,
  Send,
  ExternalLink,
  Building,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useProcess,
  useAdvanceStage,
  useRevertStage,
  useAddProcessComment,
  useProcessTimeline,
  useUpdateProcess,
  type Process,
  type FlowStage,
} from '@/hooks/use-processes';
import { useDocuments, useUploadDocument } from '@/hooks/use-documents';
import { useTasks, useCreateTask, useCompleteTask } from '@/hooks/use-tasks';
import { useProcessFinancialEntries, useCreateFinancialEntry } from '@/hooks/use-process-financial';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { StageProgress, ProgressBar } from '@/components/ui/progress-bar';
import { Timeline } from '@/components/ui/timeline';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { TextareaField, InputField, SelectField } from '@/components/ui/select-field';

// ─── Config Maps ───────────────────────────────────────
const priorityConfig = {
  low: { label: 'Baixa', variant: 'default' as const },
  normal: { label: 'Normal', variant: 'info' as const },
  high: { label: 'Alta', variant: 'warning' as const },
  urgent: { label: 'Urgente', variant: 'danger' as const },
};

const statusConfig = {
  active: { label: 'Ativo', variant: 'success' as const },
  paused: { label: 'Pausado', variant: 'warning' as const },
  completed: { label: 'Concluido', variant: 'info' as const },
  cancelled: { label: 'Cancelado', variant: 'danger' as const },
};

const docStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  received: { label: 'Recebido', variant: 'info' },
  validated: { label: 'Validado', variant: 'success' },
  rejected: { label: 'Rejeitado', variant: 'danger' },
  expired: { label: 'Expirado', variant: 'default' },
};

const taskStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  in_progress: { label: 'Em Andamento', variant: 'info' },
  completed: { label: 'Concluida', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
};

const paymentStatusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  paid: { label: 'Pago', variant: 'success' },
  overdue: { label: 'Vencido', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'default' },
  partial: { label: 'Parcial', variant: 'info' },
};

// ─── Helper ────────────────────────────────────────────
function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(v?: number) {
  if (v == null) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function daysBetween(from?: string, to?: string) {
  if (!from) return 0;
  const a = new Date(from);
  const b = to ? new Date(to) : new Date();
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════
export default function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: process, isLoading } = useProcess(id);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [advanceModal, setAdvanceModal] = useState(false);
  const [revertModal, setRevertModal] = useState(false);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [revertReason, setRevertReason] = useState('');

  const advanceStage = useAdvanceStage();
  const revertStage = useRevertStage();
  const updateProcess = useUpdateProcess();

  const handleAdvance = async () => {
    if (!id) return;
    await advanceStage.mutateAsync({ processId: id, notes: advanceNotes || undefined });
    setAdvanceModal(false);
    setAdvanceNotes('');
  };

  const handleRevert = async () => {
    if (!id || !revertReason.trim()) return;
    await revertStage.mutateAsync({ processId: id, reason: revertReason });
    setRevertModal(false);
    setRevertReason('');
  };

  const handlePause = () => {
    if (!id || !process) return;
    const newStatus = process.status === 'paused' ? 'active' : 'paused';
    updateProcess.mutate({ id, status: newStatus } as any);
  };

  const handleCancel = () => {
    if (!id) return;
    if (window.confirm('Tem certeza que deseja cancelar este processo?')) {
      updateProcess.mutate({ id, status: 'cancelled' } as any);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
        <div className="h-48 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
        <div className="h-96 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
      </div>
    );
  }

  if (!process) {
    return (
      <EmptyState
        title="Processo nao encontrado"
        description="O processo solicitado nao existe ou foi removido."
        action={<Button variant="secondary" onClick={() => router.push('/processes')}>Voltar</Button>}
      />
    );
  }

  const currentOrder = process.current_stage?.stage_order ?? 0;
  const totalStages = process.flow_type?.total_stages ?? 1;
  const prio = priorityConfig[process.priority] ?? priorityConfig.normal;
  const stat = statusConfig[process.status] ?? statusConfig.active;
  const isTerminal = process.status === 'completed' || process.status === 'cancelled';

  const tabs = [
    { id: 'overview', label: 'Visao Geral', icon: <Eye className="h-4 w-4" /> },
    { id: 'stages', label: 'Etapas', icon: <Layers className="h-4 w-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="h-4 w-4" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'unit', label: 'Unidade', icon: <Home className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <FileText className="h-4 w-4" /> },
    { id: 'financial', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tarefas', icon: <ListTodo className="h-4 w-4" /> },
    { id: 'notes', label: 'Observacoes', icon: <StickyNote className="h-4 w-4" /> },
    { id: 'audit', label: 'Auditoria', icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header Section ─────────────────────────────── */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/processes')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-[rgb(var(--foreground))]">
                {process.process_code}
              </h1>
              <Badge variant={stat.variant}>{stat.label}</Badge>
              <Badge variant={prio.variant}>{prio.label}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[rgb(var(--muted-foreground))]">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {process.flow_type?.name ?? '-'}
              </span>
              {process.assigned_user && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {process.assigned_user.full_name}
                </span>
              )}
              {process.branch && (
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  {process.branch.name}
                </span>
              )}
              {process.team && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {process.team.name}
                </span>
              )}
            </div>

            {/* Stage progress */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {process.current_stage?.name ?? 'Sem etapa'}
                </span>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">
                  Etapa {currentOrder} de {totalStages}
                </span>
              </div>
              <StageProgress current={currentOrder} total={totalStages} className="max-w-sm" />
            </div>
          </div>

          {/* Right: Actions */}
          {!isTerminal && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon={ChevronRight}
                onClick={() => setAdvanceModal(true)}
                size="md"
              >
                Avancar Etapa
              </Button>
              <Button
                variant="secondary"
                icon={ChevronLeft}
                onClick={() => setRevertModal(true)}
                size="md"
              >
                Retornar Etapa
              </Button>
              <Button
                variant="ghost"
                icon={Pause}
                onClick={handlePause}
                size="md"
              >
                {process.status === 'paused' ? 'Retomar' : 'Pausar'}
              </Button>
              <Button
                variant="ghost"
                icon={XCircle}
                onClick={handleCancel}
                size="md"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs ───────────────────────────────────────── */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ─── Tab Content ────────────────────────────────── */}
      <div>
        {activeTab === 'overview' && <TabOverview process={process} />}
        {activeTab === 'stages' && <TabStages process={process} />}
        {activeTab === 'timeline' && <TabTimeline processId={id} />}
        {activeTab === 'clients' && <TabClients process={process} />}
        {activeTab === 'unit' && <TabUnit process={process} />}
        {activeTab === 'documents' && <TabDocuments processId={id} />}
        {activeTab === 'financial' && <TabFinancial processId={id} />}
        {activeTab === 'tasks' && <TabTasks processId={id} />}
        {activeTab === 'notes' && <TabNotes process={process} processId={id} />}
        {activeTab === 'audit' && <TabAudit />}
      </div>

      {/* ─── Advance Modal ──────────────────────────────── */}
      <Modal
        open={advanceModal}
        onClose={() => setAdvanceModal(false)}
        title="Avancar Etapa"
        description={`Mover de "${process.current_stage?.name ?? ''}" para a proxima etapa.`}
      >
        <div className="space-y-4">
          <TextareaField
            label="Observacoes (opcional)"
            value={advanceNotes}
            onChange={(e) => setAdvanceNotes(e.target.value)}
            placeholder="Adicione observacoes sobre o avanco..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdvanceModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdvance} loading={advanceStage.isPending} icon={ChevronRight}>
              Avancar
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Revert Modal ───────────────────────────────── */}
      <Modal
        open={revertModal}
        onClose={() => setRevertModal(false)}
        title="Retornar Etapa"
        description={`Retornar da etapa "${process.current_stage?.name ?? ''}".`}
      >
        <div className="space-y-4">
          <TextareaField
            label="Motivo (obrigatorio)"
            value={revertReason}
            onChange={(e) => setRevertReason(e.target.value)}
            placeholder="Informe o motivo do retorno..."
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevertModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleRevert}
              loading={revertStage.isPending}
              icon={ChevronLeft}
              disabled={!revertReason.trim()}
            >
              Retornar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: VISAO GERAL
// ═══════════════════════════════════════════════════════
function TabOverview({ process }: { process: Process }) {
  const { data: tasks } = useTasks({ process_id: process.id, status: 'pending', per_page: 1 });
  const { data: docs } = useDocuments({ process_id: process.id, status: 'pending' });

  const pendingTasks = tasks?.meta?.total ?? 0;
  const pendingDocs = docs?.meta?.total ?? 0;

  // Days in current stage: find last stage change
  const lastStageChange = (process.stage_history ?? [])
    .filter((h) => h.to_stage?.stage_order === process.current_stage?.stage_order)
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];
  const daysInStage = daysBetween(lastStageChange?.changed_at ?? process.started_at);

  return (
    <div className="space-y-6">
      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Process Info */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
            Informacoes do Processo
          </h3>
          <div className="mt-4 space-y-3">
            <InfoRow label="Codigo" value={process.process_code} />
            <InfoRow label="Tipo de Fluxo" value={process.flow_type?.name ?? '-'} />
            <InfoRow label="Prioridade" value={priorityConfig[process.priority]?.label ?? '-'} />
            <InfoRow label="Status" value={statusConfig[process.status]?.label ?? '-'} />
            <InfoRow label="Inicio" value={formatDate(process.started_at)} />
            {process.completed_at && <InfoRow label="Conclusao" value={formatDate(process.completed_at)} />}
            {process.cancelled_at && <InfoRow label="Cancelamento" value={formatDate(process.cancelled_at)} />}
            {process.cancel_reason && <InfoRow label="Motivo Cancelamento" value={process.cancel_reason} />}
            <InfoRow label="Criado em" value={formatDateTime(process.created_at)} />
          </div>
        </div>

        {/* Current Stage Info */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
            Etapa Atual
          </h3>
          {process.current_stage ? (
            <div className="mt-4 space-y-3">
              <InfoRow label="Nome" value={process.current_stage.name} />
              {process.current_stage.description && (
                <InfoRow label="Descricao" value={process.current_stage.description} />
              )}
              <InfoRow label="Grupo" value={process.current_stage.stage_group} />
              <InfoRow label="SLA" value={`${process.current_stage.sla_days} dias`} />
              {process.current_stage.checklist && process.current_stage.checklist.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Checklist</span>
                  <ul className="mt-1.5 space-y-1">
                    {process.current_stage.checklist.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[rgb(var(--foreground))]">
                        <Circle className="h-3 w-3 text-[rgb(var(--muted-foreground))]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[rgb(var(--muted-foreground))]">Nenhuma etapa ativa.</p>
          )}
        </div>
      </div>

      {/* Mini stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Tarefas Pendentes" value={pendingTasks} icon={ListTodo} color="yellow" />
        <StatCard label="Documentos Pendentes" value={pendingDocs} icon={FileText} color="red" />
        <StatCard label="Dias na Etapa Atual" value={daysInStage} icon={Clock} color="blue" />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-[rgb(var(--muted-foreground))]">{label}</span>
      <span className="text-right text-sm text-[rgb(var(--foreground))]">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: ETAPAS
// ═══════════════════════════════════════════════════════
function TabStages({ process }: { process: Process }) {
  const currentOrder = process.current_stage?.stage_order ?? 0;
  const stageHistory = process.stage_history ?? [];

  // Build stages list from flow_type stages if available, otherwise from history
  // We'll synthesize stages from total_stages and history
  const totalStages = process.flow_type?.total_stages ?? 0;

  // Try to build from stage_history: gather unique stages
  const stagesFromHistory = new Map<number, { name: string; order: number }>();
  stageHistory.forEach((h) => {
    if (h.from_stage) stagesFromHistory.set(h.from_stage.stage_order, { name: h.from_stage.name, order: h.from_stage.stage_order });
    if (h.to_stage) stagesFromHistory.set(h.to_stage.stage_order, { name: h.to_stage.name, order: h.to_stage.stage_order });
  });
  if (process.current_stage) {
    stagesFromHistory.set(process.current_stage.stage_order, {
      name: process.current_stage.name,
      order: process.current_stage.stage_order,
    });
  }

  const stages = Array.from({ length: totalStages }, (_, i) => {
    const order = i + 1;
    const known = stagesFromHistory.get(order);
    return {
      order,
      name: known?.name ?? `Etapa ${order}`,
      isCurrent: order === currentOrder,
      isCompleted: order < currentOrder || process.status === 'completed',
      isFuture: order > currentOrder && process.status !== 'completed',
    };
  });

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
      <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
        Etapas do Fluxo
      </h3>

      <div className="space-y-0">
        {stages.map((stage, idx) => {
          const historyForStage = stageHistory.filter(
            (h) => h.to_stage?.stage_order === stage.order,
          );
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.order} className="relative flex gap-4 pb-8">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[19px] top-10 h-[calc(100%-16px)] w-0.5',
                    stage.isCompleted
                      ? 'bg-emerald-300 dark:bg-emerald-700'
                      : stage.isCurrent
                        ? 'bg-primary-300 dark:bg-primary-700'
                        : 'bg-[rgb(var(--border))]',
                  )}
                />
              )}

              {/* Step indicator */}
              <div className="relative z-10 shrink-0">
                {stage.isCompleted ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : stage.isCurrent ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-500 bg-primary-50 text-primary-600 shadow-md shadow-primary-500/20 dark:bg-primary-900/20 dark:text-primary-400">
                    <CircleDot className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))]">
                    <span className="text-sm font-medium">{stage.order}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <h4
                    className={cn(
                      'text-sm font-semibold',
                      stage.isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : stage.isCurrent
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-[rgb(var(--muted-foreground))]',
                    )}
                  >
                    {stage.name}
                  </h4>
                  {stage.isCurrent && (
                    <Badge variant="info">Atual</Badge>
                  )}
                </div>

                {/* History entries under completed stages */}
                {historyForStage.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {historyForStage.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-lg bg-[rgb(var(--muted))]/40 px-3 py-2 text-xs text-[rgb(var(--muted-foreground))]"
                      >
                        <span className="font-medium">
                          {h.changed_by_user?.full_name ?? 'Sistema'}
                        </span>
                        {' avancou em '}
                        <span>{formatDateTime(h.changed_at)}</span>
                        {h.notes && (
                          <p className="mt-0.5 text-[rgb(var(--foreground))]">{h.notes}</p>
                        )}
                        {h.reason && (
                          <p className="mt-0.5 italic text-amber-600 dark:text-amber-400">
                            Motivo: {h.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: TIMELINE
// ═══════════════════════════════════════════════════════
function TabTimeline({ processId }: { processId: string }) {
  const { data: timeline, isLoading } = useProcessTimeline(processId);

  const timelineItems = useMemo(() => {
    return (timeline ?? []).map((item) => {
      let iconColor: 'primary' | 'muted' | 'accent' | 'success' | 'warning' = 'muted';
      let icon = Activity;
      if (item.type === 'stage_change') { iconColor = 'primary'; icon = Layers; }
      else if (item.type === 'comment') { iconColor = 'muted'; icon = MessageSquare; }
      else if (item.type === 'activity') { iconColor = 'accent'; icon = Activity; }
      else if (item.type === 'document') { iconColor = 'success'; icon = FileText; }
      else if (item.type === 'task') { iconColor = 'warning'; icon = ListTodo; }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        user: item.user,
        date: formatDateTime(item.date),
        icon,
        iconColor,
      };
    });
  }, [timeline]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-9 w-9 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-[rgb(var(--muted))]" />
              <div className="h-3 w-32 animate-pulse rounded bg-[rgb(var(--muted))]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhum evento registrado"
        description="A timeline sera preenchida conforme o processo avanca."
      />
    );
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
      <Timeline items={timelineItems} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: CLIENTES
// ═══════════════════════════════════════════════════════
function TabClients({ process }: { process: Process }) {
  const router = useRouter();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Seller */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
            Vendedor
          </h3>
          {process.seller_client_id && (
            <Link
              href={`/clients/${process.seller_client_id}`}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Ver perfil <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        {process.seller_client ? (
          <div className="mt-4 space-y-3">
            <ClientInfoRow icon={User} label="Nome" value={process.seller_client.full_name} />
            {process.seller_client.document_number && (
              <ClientInfoRow icon={Hash} label="Documento" value={process.seller_client.document_number} />
            )}
            {process.seller_client.phone && (
              <ClientInfoRow icon={Phone} label="Telefone" value={process.seller_client.phone} />
            )}
          </div>
        ) : (
          <EmptyState
            icon={User}
            title="Vendedor nao vinculado"
            description="Nenhum vendedor foi vinculado a este processo."
          />
        )}
      </div>

      {/* Buyer */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
            Comprador
          </h3>
          {process.buyer_client_id && (
            <Link
              href={`/clients/${process.buyer_client_id}`}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Ver perfil <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        {process.buyer_client ? (
          <div className="mt-4 space-y-3">
            <ClientInfoRow icon={User} label="Nome" value={process.buyer_client.full_name} />
            {process.buyer_client.document_number && (
              <ClientInfoRow icon={Hash} label="Documento" value={process.buyer_client.document_number} />
            )}
            {process.buyer_client.phone && (
              <ClientInfoRow icon={Phone} label="Telefone" value={process.buyer_client.phone} />
            )}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Comprador nao vinculado"
            description="Nenhum comprador foi vinculado a este processo."
            action={<Button variant="secondary" size="sm" icon={Plus}>Vincular Comprador</Button>}
          />
        )}
      </div>
    </div>
  );
}

function ClientInfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-[rgb(var(--muted-foreground))]" />
      <div>
        <span className="text-xs text-[rgb(var(--muted-foreground))]">{label}</span>
        <p className="text-sm font-medium text-[rgb(var(--foreground))]">{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: UNIDADE
// ═══════════════════════════════════════════════════════
function TabUnit({ process }: { process: Process }) {
  if (!process.unit) {
    return (
      <EmptyState
        icon={Home}
        title="Nenhuma unidade vinculada"
        description="Este processo nao possui uma unidade imobiliaria associada."
      />
    );
  }

  const unit = process.unit;
  const totalDebts =
    ((unit as any).debts_cadin ?? 0) +
    ((unit as any).debts_iptu ?? 0) +
    ((unit as any).debts_condominio ?? 0) +
    ((unit as any).debts_other ?? 0);

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          Detalhes da Unidade
        </h3>
        {process.unit_id && (
          <Link
            href={`/units/${process.unit_id}`}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Ver completo <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UnitInfoCard label="Empreendimento" value={unit.enterprise?.name ?? '-'} icon={Building} />
        <UnitInfoCard label="Bloco/Torre" value={unit.block_tower ?? '-'} icon={MapPin} />
        <UnitInfoCard label="Numero" value={unit.unit_number} icon={Hash} />
      </div>

      {totalDebts > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Debitos: {formatCurrency(totalDebts)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitInfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 p-3">
      <Icon className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
      <div>
        <span className="text-xs text-[rgb(var(--muted-foreground))]">{label}</span>
        <p className="text-sm font-medium text-[rgb(var(--foreground))]">{value}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: DOCUMENTOS
// ═══════════════════════════════════════════════════════
function TabDocuments({ processId }: { processId: string }) {
  const { data, isLoading } = useDocuments({ process_id: processId });
  const documents = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          Documentos do Processo
        </h3>
        <Button size="sm" icon={Upload} variant="secondary">
          Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento"
          description="Nenhum documento foi vinculado a este processo ainda."
          action={<Button size="sm" icon={Upload} variant="secondary">Upload de Documento</Button>}
        />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const dStatus = docStatusConfig[doc.status] ?? docStatusConfig.pending;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm transition-colors hover:bg-[rgb(var(--muted))]/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--muted))]">
                    <FileText className="h-5 w-5 text-[rgb(var(--muted-foreground))]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--foreground))]">{doc.title}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      {doc.category?.name ?? 'Sem categoria'} | {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <Badge variant={dStatus.variant}>{dStatus.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: FINANCEIRO
// ═══════════════════════════════════════════════════════
function TabFinancial({ processId }: { processId: string }) {
  const { data: entries, isLoading } = useProcessFinancialEntries(processId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_type: 'receivable' as string,
    description: '',
    amount: '',
    due_date: '',
  });
  const createEntry = useCreateFinancialEntry();

  const items = entries ?? [];

  const totalReceivable = items.filter((e) => e.entry_type === 'receivable').reduce((s, e) => s + e.amount, 0);
  const totalPayable = items.filter((e) => e.entry_type === 'payable').reduce((s, e) => s + e.amount, 0);
  const totalReceived = items.filter((e) => e.entry_type === 'received' || (e.entry_type === 'receivable' && e.payment_status === 'paid')).reduce((s, e) => s + e.amount, 0);
  const totalPaid = items.filter((e) => e.entry_type === 'paid' || (e.entry_type === 'payable' && e.payment_status === 'paid')).reduce((s, e) => s + e.amount, 0);
  const balance = totalReceivable - totalPayable;

  const handleAddEntry = async () => {
    await createEntry.mutateAsync({
      process_id: processId,
      entry_type: newEntry.entry_type as any,
      description: newEntry.description,
      amount: parseFloat(newEntry.amount) || 0,
      due_date: newEntry.due_date || undefined,
      payment_status: 'pending',
    });
    setShowAddModal(false);
    setNewEntry({ entry_type: 'receivable', description: '', amount: '', due_date: '' });
  };

  const columns: Column<(typeof items)[0]>[] = [
    {
      key: 'entry_type',
      header: 'Tipo',
      render: (row) => {
        const typeLabels: Record<string, string> = {
          receivable: 'A Receber',
          payable: 'A Pagar',
          received: 'Recebido',
          paid: 'Pago',
          transfer: 'Transferencia',
        };
        return <span className="text-sm">{typeLabels[row.entry_type] ?? row.entry_type}</span>;
      },
    },
    { key: 'description', header: 'Descricao', render: (row) => <span className="text-sm">{row.description ?? '-'}</span> },
    {
      key: 'amount',
      header: 'Valor',
      render: (row) => (
        <span className={cn('text-sm font-semibold', row.entry_type === 'receivable' || row.entry_type === 'received' ? 'text-emerald-600' : 'text-red-600')}>
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    { key: 'due_date', header: 'Vencimento', render: (row) => <span className="text-sm">{formatDate(row.due_date)}</span> },
    {
      key: 'payment_status',
      header: 'Status',
      render: (row) => {
        const cfg = paymentStatusConfig[row.payment_status] ?? paymentStatusConfig.pending;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'installment',
      header: 'Parcela',
      render: (row) => (
        <span className="text-sm text-[rgb(var(--muted-foreground))]">
          {row.installment_number && row.total_installments
            ? `${row.installment_number}/${row.total_installments}`
            : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Receitas" value={formatCurrency(totalReceivable)} icon={DollarSign} color="green" />
        <StatCard label="Total Despesas" value={formatCurrency(totalPayable)} icon={DollarSign} color="red" />
        <StatCard label="Total Recebido" value={formatCurrency(totalReceived)} icon={DollarSign} color="blue" />
        <StatCard label="Total Pago" value={formatCurrency(totalPaid)} icon={DollarSign} color="yellow" />
        <StatCard label="Saldo" value={formatCurrency(balance)} icon={DollarSign} color={balance >= 0 ? 'green' : 'red'} />
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button size="sm" icon={Plus} variant="secondary" onClick={() => setShowAddModal(true)}>
          Nova Entrada
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={items as any}
        loading={isLoading}
        emptyMessage="Nenhuma entrada financeira registrada"
        rowKey={(row) => row.id}
      />

      {/* Add Entry Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nova Entrada Financeira"
      >
        <div className="space-y-4">
          <SelectField
            label="Tipo"
            value={newEntry.entry_type}
            onChange={(e) => setNewEntry({ ...newEntry, entry_type: e.target.value })}
            options={[
              { value: 'receivable', label: 'A Receber' },
              { value: 'payable', label: 'A Pagar' },
              { value: 'received', label: 'Recebido' },
              { value: 'paid', label: 'Pago' },
            ]}
            required
          />
          <InputField
            label="Descricao"
            value={newEntry.description}
            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
            placeholder="Descricao da entrada..."
          />
          <InputField
            label="Valor (R$)"
            type="number"
            step="0.01"
            value={newEntry.amount}
            onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
            placeholder="0,00"
            required
          />
          <InputField
            label="Vencimento"
            type="date"
            value={newEntry.due_date}
            onChange={(e) => setNewEntry({ ...newEntry, due_date: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddEntry} loading={createEntry.isPending} icon={Plus}>Adicionar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: TAREFAS
// ═══════════════════════════════════════════════════════
function TabTasks({ processId }: { processId: string }) {
  const { data, isLoading } = useTasks({ process_id: processId });
  const completeTask = useCompleteTask();
  const createTask = useCreateTask();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'normal', due_date: '' });

  const tasks = data?.data ?? [];

  const handleAddTask = async () => {
    await createTask.mutateAsync({
      process_id: processId,
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority as any,
      due_date: newTask.due_date || undefined,
      task_type: 'manual',
      status: 'pending',
    });
    setShowAddModal(false);
    setNewTask({ title: '', description: '', priority: 'normal', due_date: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          Tarefas do Processo
        </h3>
        <Button size="sm" icon={Plus} variant="secondary" onClick={() => setShowAddModal(true)}>
          Nova Tarefa
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa"
          description="Nenhuma tarefa foi criada para este processo."
          action={<Button size="sm" icon={Plus} variant="secondary" onClick={() => setShowAddModal(true)}>Criar Tarefa</Button>}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const tStatus = taskStatusConfig[task.status] ?? taskStatusConfig.pending;
            const tPrio = priorityConfig[task.priority] ?? priorityConfig.normal;
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm transition-colors',
                  isCompleted && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !isCompleted && completeTask.mutate(task.id)}
                    disabled={isCompleted}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-[rgb(var(--border))] hover:border-primary-500',
                    )}
                  >
                    {isCompleted && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium text-[rgb(var(--foreground))]',
                        isCompleted && 'line-through',
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[rgb(var(--muted-foreground))]">
                      {task.assigned_user && <span>{task.assigned_user.full_name}</span>}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tPrio.variant}>{tPrio.label}</Badge>
                  <Badge variant={tStatus.variant}>{tStatus.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Tarefa">
        <div className="space-y-4">
          <InputField
            label="Titulo"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Titulo da tarefa..."
            required
          />
          <TextareaField
            label="Descricao"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Descricao da tarefa..."
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Prioridade"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Baixa' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'Alta' },
                { value: 'urgent', label: 'Urgente' },
              ]}
            />
            <InputField
              label="Vencimento"
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddTask} loading={createTask.isPending} icon={Plus} disabled={!newTask.title.trim()}>
              Criar Tarefa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: OBSERVACOES (NOTES/COMMENTS)
// ═══════════════════════════════════════════════════════
function TabNotes({ process, processId }: { process: Process; processId: string }) {
  const [newComment, setNewComment] = useState('');
  const addComment = useAddProcessComment();

  const comments = process.comments ?? [];

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ processId, content: newComment });
    setNewComment('');
  };

  return (
    <div className="space-y-6">
      {/* Add comment form */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
        <TextareaField
          placeholder="Escreva uma observacao..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            icon={Send}
            onClick={handleSubmit}
            loading={addComment.isPending}
            disabled={!newComment.trim()}
          >
            Enviar
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nenhuma observacao"
          description="Seja o primeiro a adicionar uma observacao a este processo."
        />
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {(comment.user?.full_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                    {comment.user?.full_name ?? 'Usuario'}
                  </span>
                </div>
                <time className="text-xs text-[rgb(var(--muted-foreground))]">
                  {formatDateTime(comment.created_at)}
                </time>
              </div>
              <p className="mt-2 text-sm text-[rgb(var(--foreground))] leading-relaxed">
                {comment.content}
              </p>
              {comment.is_internal && (
                <Badge variant="warning" className="mt-2">Interno</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: AUDITORIA
// ═══════════════════════════════════════════════════════
function TabAudit() {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="Em breve"
      description="O modulo de auditoria esta sendo desenvolvido e estara disponivel em breve."
    />
  );
}
