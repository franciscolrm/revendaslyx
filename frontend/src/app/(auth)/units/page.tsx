'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Building2,
  Eye,
  Pencil,
  Search,
  Filter,
  Home,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUnits, useUnitSummary, type Unit } from '@/hooks/use-units';
import { useEnterprises } from '@/hooks/use-enterprises';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { useImportSource } from '@/contexts/import-source-context';

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  available: { label: 'Disponível', variant: 'success' },
  sold: { label: 'Vendida', variant: 'info' },
  in_resale: { label: 'Em Revenda', variant: 'warning' },
  reserved: { label: 'Reservada', variant: 'purple' },
  transferred: { label: 'Transferida', variant: 'info' },
  unavailable: { label: 'Indisponível', variant: 'danger' },
};

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apto', house: 'Casa', commercial: 'Comercial', land: 'Terreno', other: 'Outro',
};

function formatCurrency(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v); }
function fmtShort(v: number) { if (v >= 1e6) return `R$ ${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `R$ ${(v/1e3).toFixed(0)}K`; return `R$ ${v.toFixed(0)}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('pt-BR'); }
function hasDebts(u: any) { return (Number(u.debts_cadin)||0)>0||(Number(u.debts_iptu)||0)>0||(Number(u.debts_condominio)||0)>0||(Number(u.debts_other)||0)>0; }

export default function UnitsPage() {
  const router = useRouter();
  const { filterParam } = useImportSource();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [enterpriseFilter, setEnterpriseFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400); return () => clearTimeout(t); }, [searchInput]);

  const { data: summary } = useUnitSummary(filterParam);
  const { data: enterprises } = useEnterprises();
  const { data: result, isLoading } = useUnits({
    page, per_page: 25, search: search || undefined,
    enterprise_id: enterpriseFilter || undefined, status: statusFilter || undefined,
    stock_available: stockFilter === 'true' ? true : undefined, import_batch_ids: filterParam,
  });

  const units = result?.data ?? [];
  const meta = result?.meta;
  const hasActive = !!(search || statusFilter || enterpriseFilter || stockFilter);
  const reset = () => { setSearchInput(''); setSearch(''); setStatusFilter(''); setEnterpriseFilter(''); setStockFilter(''); setPage(1); };

  const columns: Column<Unit>[] = useMemo(() => [
    { key: 'unit', header: 'Unidade', render: (r: any) => (
      <div><span className="block text-[12px] font-semibold text-[rgb(var(--foreground))]">{[r.block_tower, r.unit_number].filter(Boolean).join(' / ') || '-'}</span>
      {r.floor && <span className="text-[10px] text-[rgb(var(--muted-foreground))]">Andar {r.floor}</span>}</div>
    )},
    { key: 'enterprise', header: 'Empreendimento', render: (r: any) => <span className="block truncate text-[12px] text-[rgb(var(--foreground))] max-w-[150px]">{r.enterprise?.name || '-'}</span> },
    { key: 'unit_type', header: 'Tipo', render: (r: any) => <span className="text-[11px] text-[rgb(var(--muted-foreground))]">{TYPE_LABELS[r.unit_type] ?? r.unit_type ?? '-'}</span> },
    { key: 'area_m2', header: 'Área', className: 'text-right', render: (r: any) => <span className="text-[12px] text-[rgb(var(--foreground))]">{r.area_m2 ? `${Number(r.area_m2).toFixed(0)} m²` : '-'}</span> },
    { key: 'current_value', header: 'Valor', className: 'text-right', render: (r: any) => { const v = Number(r.current_value)||0; return <span className="text-[12px] font-medium text-[rgb(var(--foreground))]">{v > 0 ? formatCurrency(v) : '-'}</span>; } },
    { key: 'status', header: 'Status', render: (r: any) => { const c = STATUS_CONFIG[r.status] ?? { label: r.status, variant: 'default' }; return <Badge variant={c.variant as any}>{c.label}</Badge>; } },
    { key: 'stock', header: 'Estoque', render: (r: any) => <span className={cn('text-[11px] font-medium', r.stock_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-[rgb(var(--muted-foreground))]')}>{r.stock_available ? 'Sim' : 'Não'}</span> },
    { key: 'client', header: 'Cliente', render: (r: any) => { const c = r.current_client || r.original_client; return c ? <span className="block truncate text-[12px] text-[rgb(var(--foreground))] max-w-[120px]">{c.full_name}</span> : <span className="text-[11px] text-[rgb(var(--muted-foreground))]">-</span>; } },
    { key: 'debts', header: 'Débitos', render: (r: any) => { if (!hasDebts(r)) return <span className="text-[11px] text-[rgb(var(--muted-foreground))]">-</span>; const p: string[] = []; if (Number(r.debts_cadin)>0) p.push('CADIN'); if (Number(r.debts_iptu)>0) p.push('IPTU'); if (Number(r.debts_condominio)>0) p.push('Cond.'); if (Number(r.debts_other)>0) p.push('Outros'); return <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 dark:text-red-400"><AlertTriangle className="h-3 w-3" />{p.join(', ')}</span>; } },
    { key: 'origin', header: 'Origem', render: (r: any) => { const b = r.import_batch; if (!b) return <span className="text-[10px] text-[rgb(var(--muted-foreground))]">Manual</span>; return <div><span className="block text-[11px] font-medium text-[rgb(var(--foreground))]">{b.source_name}</span><span className="text-[10px] text-[rgb(var(--muted-foreground))]">{fmtDate(b.created_at)}</span></div>; } },
    { key: 'actions', header: '', className: 'w-[70px]', render: (r: any) => (
      <div className="flex items-center justify-end gap-0.5">
        <button onClick={(e) => { e.stopPropagation(); router.push(`/units/${r.id}`); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]"><Eye className="h-3.5 w-3.5" /></button>
        <button onClick={(e) => { e.stopPropagation(); router.push(`/units/${r.id}/edit`); }} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20"><Pencil className="h-3.5 w-3.5" /></button>
      </div>
    )},
  ], [router]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div><h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">Unidades</h1><p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">Gestão completa de unidades imobiliárias</p></div>
        <Link href="/units/new"><button className="flex h-9 items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 text-[12px] font-medium text-white hover:bg-accent-700"><Plus className="h-3.5 w-3.5" />Nova Unidade</button></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total" value={summary?.total ?? 0} icon={Building2} color="blue" />
        <KpiCard label="Disponíveis" value={summary?.by_status?.available ?? 0} icon={CheckCircle2} color="green" />
        <KpiCard label="Em Revenda" value={summary?.by_status?.in_resale ?? 0} icon={ShoppingCart} color="orange" />
        <KpiCard label="Vendidas" value={summary?.by_status?.sold ?? 0} icon={Home} color="cyan" />
        <KpiCard label="Com Débitos" value={summary?.with_debts ?? 0} icon={AlertTriangle} color="red" />
        <KpiCard label="Valor Total" value={fmtShort(summary?.total_value ?? 0)} icon={DollarSign} color="amber" />
      </div>

      {(summary?.by_source?.length ?? 0) > 1 && (
        <div className="flex items-center gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-2.5">
          <Database className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
          <span className="text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Por origem:</span>
          {summary!.by_source.map(s => <span key={s.name} className="text-[12px] text-[rgb(var(--foreground))]"><span className="font-semibold">{s.name}</span>: {s.count}</span>)}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Buscar por bloco ou unidade..." className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] pl-9 pr-3 text-[12px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={cn('flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium', showFilters || hasActive ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' : 'border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]')}><Filter className="h-3.5 w-3.5" />Filtros</button>
          {hasActive && <button onClick={reset} className="text-[11px] font-medium text-red-500">Limpar</button>}
        </div>
        <p className="text-[12px] text-[rgb(var(--muted-foreground))]">{meta?.total ?? 0} unidade{(meta?.total ?? 0) !== 1 ? 's' : ''}</p>
      </div>

      {showFilters && (
        <Card><CardContent className="py-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Empreendimento</label><select value={enterpriseFilter} onChange={e => { setEnterpriseFilter(e.target.value); setPage(1); }} className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"><option value="">Todos</option>{(enterprises??[]).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          <div><label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Status</label><select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"><option value="">Todos</option><option value="available">Disponível</option><option value="sold">Vendida</option><option value="in_resale">Em Revenda</option><option value="reserved">Reservada</option><option value="transferred">Transferida</option><option value="unavailable">Indisponível</option></select></div>
          <div><label className="mb-1 block text-[11px] font-medium text-[rgb(var(--muted-foreground))]">Estoque</label><select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1); }} className="h-8 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 text-[12px] text-[rgb(var(--foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"><option value="">Todos</option><option value="true">Em estoque</option></select></div>
        </div></CardContent></Card>
      )}

      <DataTable columns={columns} data={units} loading={isLoading} emptyMessage={hasActive ? 'Nenhuma unidade com os filtros aplicados.' : 'Nenhuma unidade cadastrada.'} onRowClick={(r: any) => router.push(`/units/${r.id}`)} rowKey={(r: any) => r.id} pagination={meta && meta.total_pages > 1 ? { page: meta.page, perPage: meta.per_page, total: meta.total, totalPages: meta.total_pages, onPageChange: setPage } : undefined} />
    </div>
  );
}

