'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Check,
  RefreshCw,
  ShoppingBag,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import { useUnits, Unit } from '@/hooks/use-units';
import { useEnterprises } from '@/hooks/use-enterprises';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable, Column } from '@/components/ui/data-table';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponivel' },
  { value: 'sold', label: 'Vendida' },
  { value: 'in_resale', label: 'Em Revenda' },
  { value: 'reserved', label: 'Reservada' },
  { value: 'transferred', label: 'Transferida' },
];

const STOCK_OPTIONS = [
  { value: 'true', label: 'Disponivel' },
  { value: 'false', label: 'Indisponivel' },
];

const STATUS_BADGE_MAP: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'purple' | 'default' }> = {
  available: { label: 'Disponivel', variant: 'success' },
  sold: { label: 'Vendida', variant: 'info' },
  in_resale: { label: 'Em Revenda', variant: 'warning' },
  reserved: { label: 'Reservada', variant: 'purple' },
  transferred: { label: 'Transferida', variant: 'default' },
};

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  commercial: 'Comercial',
  land: 'Terreno',
  other: 'Outro',
};

const formatBRL = (value?: number) => {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function UnitsPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [enterpriseFilter, setEnterpriseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data: enterprisesData } = useEnterprises();
  const enterpriseOptions = useMemo(
    () => (enterprisesData ?? []).map((e) => ({ value: e.id, label: e.name })),
    [enterprisesData],
  );

  const { data, isLoading } = useUnits({
    page,
    per_page: perPage,
    search: search || undefined,
    enterprise_id: enterpriseFilter || undefined,
    status: statusFilter || undefined,
    stock_available: stockFilter ? stockFilter === 'true' : undefined,
  });

  const units = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, per_page: perPage, total_pages: 1 };

  // Stats computed from current data set (approximate from page)
  const stats = useMemo(() => {
    const all = units;
    return {
      total: meta.total,
      available: all.filter((u) => u.status === 'available').length,
      in_resale: all.filter((u) => u.status === 'in_resale').length,
      sold: all.filter((u) => u.status === 'sold').length,
    };
  }, [units, meta.total]);

  const columns: Column<Unit>[] = [
    {
      key: 'unit_number',
      header: 'Unidade',
      render: (row) => (
        <div>
          <span className="font-semibold text-[rgb(var(--foreground))]">{row.unit_number}</span>
          {row.block_tower && (
            <span className="ml-2 text-xs text-[rgb(var(--muted-foreground))]">
              {row.block_tower}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'enterprise',
      header: 'Empreendimento',
      render: (row) => (
        <span className="text-[rgb(var(--foreground))]">
          {row.enterprise?.name ?? '-'}
        </span>
      ),
    },
    {
      key: 'unit_type',
      header: 'Tipo',
      render: (row) => (
        <span className="text-[rgb(var(--muted-foreground))]">
          {row.unit_type ? TYPE_LABELS[row.unit_type] ?? row.unit_type : '-'}
        </span>
      ),
    },
    {
      key: 'area_m2',
      header: 'Area m2',
      render: (row) => (
        <span className="text-[rgb(var(--muted-foreground))]">
          {row.area_m2 ? `${row.area_m2} m2` : '-'}
        </span>
      ),
    },
    {
      key: 'current_value',
      header: 'Valor',
      render: (row) => (
        <span className="font-medium text-[rgb(var(--foreground))]">
          {formatBRL(row.current_value ?? row.original_value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const cfg = STATUS_BADGE_MAP[row.status] ?? { label: row.status, variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'stock_available',
      header: 'Estoque',
      render: (row) =>
        row.stock_available ? (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Sim
          </Badge>
        ) : (
          <Badge variant="default">
            <XCircle className="mr-1 h-3 w-3" />
            Nao
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      className: 'w-20 text-center',
      render: (row) => (
        <Link
          href={`/units/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
        >
          <Eye className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unidades"
        description="Gerencie todas as unidades dos empreendimentos"
        actions={
          <Link href="/units/new">
            <Button icon={Plus}>Nova Unidade</Button>
          </Link>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Unidades"
          value={stats.total}
          icon={Building2}
          color="blue"
        />
        <StatCard
          label="Disponiveis"
          value={stats.available}
          icon={Check}
          color="green"
        />
        <StatCard
          label="Em Revenda"
          value={stats.in_resale}
          icon={RefreshCw}
          color="yellow"
        />
        <StatCard
          label="Vendidas"
          value={stats.sold}
          icon={ShoppingBag}
          color="purple"
        />
      </div>

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar por numero, bloco..."
      >
        <FilterSelect
          value={enterpriseFilter}
          onChange={(v) => { setEnterpriseFilter(v); setPage(1); }}
          options={enterpriseOptions}
          placeholder="Empreendimento"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={STATUS_OPTIONS}
          placeholder="Status"
        />
        <FilterSelect
          value={stockFilter}
          onChange={(v) => { setStockFilter(v); setPage(1); }}
          options={STOCK_OPTIONS}
          placeholder="Estoque"
        />
      </FilterBar>

      {/* Table */}
      {!isLoading && units.length === 0 && !search && !statusFilter && !enterpriseFilter ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma unidade cadastrada"
          description="Cadastre a primeira unidade para comecar a gerenciar seu estoque."
          action={
            <Link href="/units/new">
              <Button icon={Plus} size="sm">Nova Unidade</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={units}
          loading={isLoading}
          emptyMessage="Nenhuma unidade encontrada"
          onRowClick={(row: any) => router.push(`/units/${row.id}`)}
          rowKey={(row: any) => row.id}
          pagination={{
            page: meta.page,
            perPage: meta.per_page,
            total: meta.total,
            totalPages: meta.total_pages,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
