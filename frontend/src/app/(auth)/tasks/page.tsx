'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { InputField, TextareaField, SelectField } from '@/components/ui/select-field';
import { useMyTasks, useCreateTask, useCompleteTask, type Task } from '@/hooks/use-tasks';

const PRIORITY_MAP: Record<string, { label: string; variant: 'default' | 'info' | 'orange' | 'danger' }> = {
  low: { label: 'Baixa', variant: 'default' },
  normal: { label: 'Normal', variant: 'info' },
  high: { label: 'Alta', variant: 'orange' },
  urgent: { label: 'Urgente', variant: 'danger' },
};

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'default' | 'danger' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  in_progress: { label: 'Em Andamento', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'danger' },
};

const TAB_LIST = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'in_progress', label: 'Em Andamento' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'all', label: 'Todas' },
];

export default function TasksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState('normal');
  const [formDueDate, setFormDueDate] = useState('');

  const statusFilter = activeTab === 'all' ? undefined : activeTab;

  const { data: taskData, isLoading } = useMyTasks({
    page,
    per_page: 20,
    status: statusFilter,
    priority: filterPriority || undefined,
  });

  const createTask = useCreateTask();
  const completeTask = useCompleteTask();

  const tasks = taskData?.data ?? [];
  const meta = taskData?.meta;

  // Filter by search locally
  const filteredTasks = search.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.process?.process_code?.toLowerCase().includes(search.toLowerCase()),
      )
    : tasks;

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  };

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim()) return;
    await createTask.mutateAsync({
      title: formTitle,
      description: formDescription || undefined,
      priority: formPriority as Task['priority'],
      due_date: formDueDate || undefined,
      task_type: 'manual',
      status: 'pending',
    });
    setModalOpen(false);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('normal');
    setFormDueDate('');
  }, [formTitle, formDescription, formPriority, formDueDate, createTask]);

  const handleComplete = useCallback(
    async (e: React.MouseEvent, taskId: string) => {
      e.stopPropagation();
      await completeTask.mutateAsync(taskId);
    },
    [completeTask],
  );

  const priorityOptions = [
    { value: 'low', label: 'Baixa' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];

  const columns: Column<Task>[] = [
    {
      key: 'title',
      header: 'Título',
      render: (row) => (
        <div className="max-w-[300px]">
          <p className={cn(
            'text-sm font-medium truncate',
            isOverdue(row) ? 'text-red-600 dark:text-red-400' : 'text-[rgb(var(--foreground))]',
          )}>
            {row.title}
          </p>
          {row.description && (
            <p className="mt-0.5 text-xs text-[rgb(var(--muted-foreground))] truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'process',
      header: 'Processo',
      render: (row) => (
        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
          {row.process?.process_code ?? '-'}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Prioridade',
      render: (row) => {
        const cfg = PRIORITY_MAP[row.priority] ?? { label: row.priority, variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const cfg = STATUS_MAP[row.status] ?? { label: row.status, variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'due_date',
      header: 'Prazo',
      render: (row) => {
        if (!row.due_date) return <span className="text-xs text-[rgb(var(--muted-foreground))]">-</span>;
        const overdue = isOverdue(row);
        return (
          <span className={cn(
            'flex items-center gap-1 text-xs font-medium',
            overdue ? 'text-red-500' : 'text-[rgb(var(--muted-foreground))]',
          )}>
            {overdue && <AlertCircle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            {new Date(row.due_date).toLocaleDateString('pt-BR')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row) =>
        row.status !== 'completed' && row.status !== 'cancelled' ? (
          <button
            onClick={(e) => handleComplete(e, row.id)}
            className="flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <Check className="h-3 w-3" />
            Concluir
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Tarefas"
        description="Gerencie suas tarefas e atividades pendentes"
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Nova Tarefa
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={TAB_LIST}
        activeTab={activeTab}
        onChange={(id) => { setActiveTab(id); setPage(1); }}
      />

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar tarefa, processo..."
      >
        <FilterSelect
          value={filterPriority}
          onChange={(v) => { setFilterPriority(v); setPage(1); }}
          options={priorityOptions}
          placeholder="Prioridade"
        />
      </FilterBar>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredTasks as any}
        loading={isLoading}
        emptyMessage="Nenhuma tarefa encontrada"
        rowKey={(row) => (row as any).id}
        pagination={meta ? {
          page: meta.page,
          perPage: meta.per_page,
          total: meta.total,
          totalPages: meta.total_pages,
          onPageChange: setPage,
        } : undefined}
      />

      {/* Create Task Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova Tarefa"
        description="Crie uma nova tarefa manual"
      >
        <div className="space-y-4">
          <InputField
            label="Título"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Ex: Ligar para cliente"
          />
          <TextareaField
            label="Descrição"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Detalhes sobre a tarefa..."
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Prioridade"
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value)}
              options={priorityOptions}
            />
            <InputField
              label="Prazo"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={createTask.isPending}>
              Criar Tarefa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
