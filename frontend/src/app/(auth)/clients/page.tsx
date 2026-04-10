'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Users2,
  Eye,
  Pencil,
  Phone,
  Mail,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { useClients } from '@/hooks/use-clients';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';

const CLIENT_TYPE_OPTIONS = [
  { value: 'seller', label: 'Vendedor' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'both', label: 'Ambos' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
];

const typeLabels: Record<string, { label: string; variant: 'info' | 'purple' | 'orange' }> = {
  seller: { label: 'Vendedor', variant: 'info' },
  buyer: { label: 'Comprador', variant: 'purple' },
  both: { label: 'Ambos', variant: 'orange' },
};

function formatDocument(doc?: string) {
  if (!doc) return '-';
  if (doc.length === 11) {
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (doc.length === 14) {
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

export default function ClientsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [clientType, setClientType] = useState('');
  const [status, setStatus] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useClients({
    page,
    per_page: 15,
    search: debouncedSearch || undefined,
    client_type: clientType || undefined,
    status: status || undefined,
  });

  const clients = data?.data ?? [];
  const meta = data?.meta;

  const columns: Column<Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: 'full_name',
        header: 'Nome',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {(row.full_name as string)?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <span className="font-medium text-[rgb(var(--foreground))]">
              {row.full_name as string}
            </span>
          </div>
        ),
      },
      {
        key: 'document_number',
        header: 'CPF/CNPJ',
        render: (row) => (
          <span className="font-mono text-xs text-[rgb(var(--muted-foreground))]">
            {formatDocument(row.document_number as string)}
          </span>
        ),
      },
      {
        key: 'client_type',
        header: 'Tipo',
        render: (row) => {
          const cfg = typeLabels[row.client_type as string] ?? {
            label: row.client_type,
            variant: 'default' as const,
          };
          return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
        },
      },
      {
        key: 'phone',
        header: 'Telefone',
        render: (row) =>
          row.phone ? (
            <span className="flex items-center gap-1.5 text-[rgb(var(--muted-foreground))]">
              <Phone className="h-3.5 w-3.5" />
              {row.phone as string}
            </span>
          ) : (
            <span className="text-[rgb(var(--muted-foreground))]">-</span>
          ),
      },
      {
        key: 'email',
        header: 'Email',
        render: (row) =>
          row.email ? (
            <span className="flex items-center gap-1.5 text-[rgb(var(--muted-foreground))]">
              <Mail className="h-3.5 w-3.5" />
              <span className="max-w-[180px] truncate">{row.email as string}</span>
            </span>
          ) : (
            <span className="text-[rgb(var(--muted-foreground))]">-</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
            <span className="flex items-center gap-1">
              {row.status === 'active' ? (
                <UserCheck className="h-3 w-3" />
              ) : (
                <UserMinus className="h-3 w-3" />
              )}
              {row.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-[80px]',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/clients/${row.id}`);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              title="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/clients/${row.id}/edit`);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--muted-foreground))] transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gerencie sua base de clientes"
        actions={
          <Link href="/clients/new">
            <Button
              icon={Plus}
              className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
            >
              Novo Cliente
            </Button>
          </Link>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nome, CPF/CNPJ ou email..."
      >
        <FilterSelect
          value={clientType}
          onChange={(v) => {
            setClientType(v);
            setPage(1);
          }}
          options={CLIENT_TYPE_OPTIONS}
          placeholder="Tipo"
        />
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          placeholder="Status"
        />
      </FilterBar>

      {!isLoading && clients.length === 0 && !debouncedSearch && !clientType && !status ? (
        <EmptyState
          icon={Users2}
          title="Nenhum cliente cadastrado"
          description="Comece adicionando seu primeiro cliente ao sistema"
          action={
            <Link href="/clients/new">
              <Button
                icon={Plus}
                size="sm"
                className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
              >
                Novo Cliente
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          loading={isLoading}
          emptyMessage="Nenhum cliente encontrado com os filtros aplicados"
          onRowClick={(row: any) => router.push(`/clients/${row.id}`)}
          rowKey={(row: any) => row.id}
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
      )}
    </div>
  );
}
