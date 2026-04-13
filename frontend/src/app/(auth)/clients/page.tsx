'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Search,
  Filter,
  Building2,
  GitBranch,
  Database,
  ShieldCheck,
  AtSign,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useClients, useClientSummary, type Client } from '@/hooks/use-clients';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { useImportSource } from '@/contexts/import-source-context';

// ── Constants ──

const TYPE_CONFIG: Record<string, { label: string; variant: string }> = {
  seller: { label: 'Vendedor', variant: 'info' },
  buyer: { label: 'Comprador', variant: 'purple' },
  both: { label: 'Ambos', variant: 'orange' },
};

function formatDocument(doc?: string) {
  if (!doc) return '-';
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

// ══════════════════════════════════════
// ██  MAIN PAGE
// ══════════════════════════════════════

export default function ClientsPage() {
  const router = useRouter();
  const { filterParam } = useImportSource();

  // ── State ──
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [clientType, setClientType] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Summary ──
  const { data: summary } = useClientSummary(filterParam);

  // ── Client list ──
  const { data: result, isLoading } = useClients({
    page,
    per_page: 25,
    search: search || undefined,
    client_type: clientType || undefined,
    status: status || undefined,
    import_batch_ids: filterParam,
  });

  const clients = result?.data ?? [];
  const meta = result?.meta;

  const hasActiveFilters = !!(search || clientType || status);

  const resetFilters = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setClientType('');
    setStatus('');
    setPage(1);
  }, []);

  // ── Table columns ──
  const columns: Column<Client>[] = useMemo(() => [
    {
      key: 'full_name',
      header: 'Nome',
      render: (row: any) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[12px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {(row.full_name as string)?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <span className="block truncate text-[12px] font-medium text-[rgb(var(--foreground))] max-w-[160px]">
              {row.full_name}
            </span>
            {row.address_city && (
              <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                {row.address_city}{row.address_state ? ` - ${row.address_state}` : ''}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'document_number',
      header: 'CPF/CNPJ',
      render: (row: any) => (
        <span className="font-mono text-[11px] text-[rgb(var(--muted-foreground))]">
          {formatDocument(row.document_number)}
        </span>
      ),
    },
    {
      key: 'client_type',
      header: 'Tipo',
      render: (row: any) => {
        const cfg = TYPE_CONFIG[row.client_type] ?? { label: row.client_type, variant: 'default' };
        return <Badge variant={cfg.variant as any}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'phone',
      header: 'Contato',
      render: (row: any) => (
        <div className="min-w-0 space-y-0.5">
          {row.phone ? (
            <span className="flex items-center gap-1 text-[11px] text-[rgb(var(--foreground))]">
              <Phone className="h-3 w-3 text-[rgb(var(--muted-foreground))]" />
              {row.phone}
            </span>
          ) : null}
          {row.phone_secondary ? (
            <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--muted-foreground))]">
              <Phone className="h-2.5 w-2.5" />
              {row.phone_secondary}
            </span>
          ) : null}
          {row.email ? (
            <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--muted-foreground))]">
              <Mail className="h-2.5 w-2.5" />
              <span className="truncate max-w-[140px]">{row.email}</span>
            </span>
          ) : null}
          {!row.phone && !row.email && (
            <span className="text-[11px] text-[rgb(var(--muted-foreground))]">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'processes',
      header: 'Processos',
      render: (row: any) => {
        const seller = row.process_count_seller ?? 0;
        const buyer = row.process_count_buyer ?? 0;
        const total = seller + buyer;
        if (total === 0) return <span className="text-[11px] text-[rgb(var(--muted-foreground))]">-</span>;
        return (
          <div className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              {total}
            </span>
            <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
              {seller > 0 && `${seller}v`}
              {seller > 0 && buyer > 0 && ' '}
              {buyer > 0 && `${buyer}c`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'blocked' ? 'danger' : 'warning'}>
          {row.status === 'active' ? 'Ativo' : row.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'origin',
      header: 'Origem',
      render: (row: any) => {
        const batch = row.import_batch;
        if (!batch) return <span className="text-[10px] text-[rgb(var(--muted-foreground))]">Manual</span>;
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
    {
      key: 'created_at',
      header: 'Cadastro',
      render: (row: any) => (
        <span className="text-[11px] text-[rgb(var(--muted-foreground))]">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[70px]',
      render: (row: any) => (
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/clients/${row.id}`); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            title="Ver detalhes"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/clients/${row.id}/edit`); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ], [router]);

  return (
    <div className="space-y-5">
      {/* ══ Header ══ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">Clientes</h1>
          <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">
            Base completa de clientes do CRM imobiliário
          </p>
        </div>
        <Link href="/clients/new">
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 text-[12px] font-medium text-white transition-colors hover:bg-accent-700">
            <Plus className="h-3.5 w-3.5" />
            Novo Cliente
          </button>
        </Link>
      </div>

      {/* ══ KPIs ══ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total" value={summary?.total ?? 0} icon={Users2} color="blue" />
        <KpiCard label="Vendedores" value={summary?.sellers ?? 0} icon={UserCheck} color="green" />
        <KpiCard label="Compradores" value={summary?.buyers ?? 0} icon={Users2} color="purple" />
        <KpiCard label="Com Telefone" value={summary?.with_phone ?? 0} icon={Phone} color="cyan" />
        <KpiCard label="Com Email" value={summary?.with_email ?? 0} icon={AtSign} color="amber" />
        <KpiCard label="Ativos" value={summary?.active ?? 0} icon={ShieldCheck} color="green" />
      </div>

      {/* ══ Source comparison (if multiple) ══ */}
      {(summary?.by_source?.length ?? 0) > 1 && (
        <div className="flex items-center gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-2.5">
          <Database className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
          <span className="text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Por origem:</span>
          {summary!.by_source.map((src) => (
            <span key={src.name} className="text-[12px] text-[rgb(var(--foreground))]">
              <span className="font-semibold">{src.name}</span>: {src.count}
            </span>
          ))}
        </div>
      )}

      {/* ══ Search + Filters ══ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome, CPF, telefone ou email..."
              className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] pl-9 pr-3 text-[12px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

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
                {[search, clientType, status].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[11px] font-medium text-red-500 hover:text-red-600">
              Limpar
            </button>
          )}
        </div>

        <p className="text-[12px] text-[rgb(var(--muted-foreground))] shrink-0">
          {meta?.total ?? 0} cliente{(meta?.total ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ══ Expanded Filters ══ */}
      {showFilters && (
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Tipo</label>
                <select
                  value={clientType}
                  onChange={(e) => { setClientType(e.target.value); setPage(1); }}
                  className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos os tipos</option>
                  <option value="seller">Vendedor</option>
                  <option value="buyer">Comprador</option>
                  <option value="both">Ambos</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Status</label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos os status</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ Data Table ══ */}
      <DataTable
        columns={columns}
        data={clients}
        loading={isLoading}
        emptyMessage={
          hasActiveFilters
            ? 'Nenhum cliente encontrado com os filtros aplicados.'
            : 'Nenhum cliente cadastrado. Importe dados ou adicione manualmente.'
        }
        onRowClick={(row: any) => router.push(`/clients/${row.id}`)}
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

