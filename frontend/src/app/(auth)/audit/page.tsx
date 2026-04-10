'use client';

import { useState } from 'react';
import {
  Shield,
  Eye,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { Modal } from '@/components/ui/modal';
import { useAuditLogs, type AuditLog } from '@/hooks/use-audit';

const entityOptions = [
  { value: 'users', label: 'Usu\u00e1rios' },
  { value: 'clients', label: 'Clientes' },
  { value: 'units', label: 'Unidades' },
  { value: 'processes', label: 'Processos' },
  { value: 'documents', label: 'Documentos' },
  { value: 'tasks', label: 'Tarefas' },
];

const actionOptions = [
  { value: 'insert', label: 'Inser\u00e7\u00e3o' },
  { value: 'update', label: 'Atualiza\u00e7\u00e3o' },
  { value: 'delete', label: 'Exclus\u00e3o' },
];

const actionBadge: Record<string, { label: string; variant: 'success' | 'info' | 'danger' }> = {
  insert: { label: 'Inser\u00e7\u00e3o', variant: 'success' },
  update: { label: 'Atualiza\u00e7\u00e3o', variant: 'info' },
  delete: { label: 'Exclus\u00e3o', variant: 'danger' },
};

const actionIcons: Record<string, React.ElementType> = {
  insert: Plus,
  update: Pencil,
  delete: Trash2,
};

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDiffFields(
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>,
) {
  const allKeys = new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ]);
  const diffs: { field: string; old: unknown; new: unknown }[] = [];

  for (const key of allKeys) {
    const oldVal = oldData?.[key];
    const newVal = newData?.[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ field: key, old: oldVal, new: newVal });
    }
  }
  return diffs;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data, isLoading } = useAuditLogs({
    page,
    per_page: 20,
    entity_name: entity || undefined,
    action: action || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    search: search || undefined,
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  const columns: Column<AuditLog>[] = [
    {
      key: 'created_at',
      header: 'Data/Hora',
      render: (row) => (
        <span className="text-sm text-[rgb(var(--muted-foreground))]">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Usu\u00e1rio',
      render: (row) => (
        <span className="text-sm font-medium text-[rgb(var(--foreground))]">
          {row.user?.full_name ?? 'Sistema'}
        </span>
      ),
    },
    {
      key: 'entity_name',
      header: 'Entidade',
      render: (row) => (
        <span className="text-sm capitalize text-[rgb(var(--foreground))]">
          {entityOptions.find((e) => e.value === row.entity_name)?.label ??
            row.entity_name}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'A\u00e7\u00e3o',
      render: (row) => {
        const config = actionBadge[row.action];
        const Icon = actionIcons[row.action] ?? ArrowRightLeft;
        return (
          <Badge variant={config?.variant ?? 'default'}>
            <Icon className="mr-1 h-3 w-3" />
            {config?.label ?? row.action}
          </Badge>
        );
      },
    },
    {
      key: 'details',
      header: 'Detalhes',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={Eye}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
        >
          Ver
        </Button>
      ),
    },
  ];

  const diffs = selected
    ? getDiffFields(selected.old_data, selected.new_data)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Registro de todas as altera\u00e7\u00f5es do sistema"
      />

      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Buscar por usu\u00e1rio ou entidade..."
      >
        <FilterSelect
          value={entity}
          onChange={(val) => {
            setEntity(val);
            setPage(1);
          }}
          options={entityOptions}
          placeholder="Entidade"
        />
        <FilterSelect
          value={action}
          onChange={(val) => {
            setAction(val);
            setPage(1);
          }}
          options={actionOptions}
          placeholder="A\u00e7\u00e3o"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 text-sm text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          title="Data in\u00edcio"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 text-sm text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          title="Data fim"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={(logs ?? []) as any[]}
        loading={isLoading}
        emptyMessage="Nenhum registro de auditoria encontrado"
        rowKey={(row) => row.id as string}
        pagination={
          meta
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

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalhes da Altera\u00e7\u00e3o"
        description={
          selected
            ? `${actionBadge[selected.action]?.label ?? selected.action} em ${
                entityOptions.find((e) => e.value === selected.entity_name)
                  ?.label ?? selected.entity_name
              } - ${formatDateTime(selected.created_at)}`
            : undefined
        }
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 p-4">
              <div>
                <p className="text-xs font-medium uppercase text-[rgb(var(--muted-foreground))]">
                  Usu\u00e1rio
                </p>
                <p className="mt-0.5 text-sm font-medium text-[rgb(var(--foreground))]">
                  {selected.user?.full_name ?? 'Sistema'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-[rgb(var(--muted-foreground))]">
                  ID da Entidade
                </p>
                <p className="mt-0.5 text-sm font-mono text-[rgb(var(--foreground))]">
                  {selected.entity_id}
                </p>
              </div>
            </div>

            {/* Diff view */}
            {selected.action === 'update' && diffs.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-[rgb(var(--border))]">
                <div className="grid grid-cols-3 gap-0 border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                  <span>Campo</span>
                  <span>Valor Anterior</span>
                  <span>Novo Valor</span>
                </div>
                <div className="divide-y divide-[rgb(var(--border))]">
                  {diffs.map((diff) => (
                    <div
                      key={diff.field}
                      className="grid grid-cols-3 gap-0 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[rgb(var(--foreground))]">
                        {diff.field}
                      </span>
                      <span className="text-sm">
                        <span className="inline-block rounded bg-red-50 px-2 py-0.5 font-mono text-red-700 dark:bg-red-500/10 dark:text-red-400">
                          {formatValue(diff.old)}
                        </span>
                      </span>
                      <span className="text-sm">
                        <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 font-mono text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {formatValue(diff.new)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : selected.action === 'insert' && selected.new_data ? (
              <div className="rounded-lg border border-[rgb(var(--border))]">
                <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                  Dados Inseridos
                </div>
                <pre className="overflow-x-auto p-4 text-sm font-mono text-emerald-700 dark:text-emerald-400">
                  {JSON.stringify(selected.new_data, null, 2)}
                </pre>
              </div>
            ) : selected.action === 'delete' && selected.old_data ? (
              <div className="rounded-lg border border-[rgb(var(--border))]">
                <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                  Dados Removidos
                </div>
                <pre className="overflow-x-auto p-4 text-sm font-mono text-red-700 dark:text-red-400">
                  {JSON.stringify(selected.old_data, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                Sem dados dispon\u00edveis para esta altera\u00e7\u00e3o
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
