'use client';

import { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building2,
  Database,
  Wallet,
  Receipt,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { cn } from '@/lib/cn';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { useFinancialFull } from '@/hooks/use-dashboard';
import { useImportSource } from '@/contexts/import-source-context';

// ── Helpers ──

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function fmtShort(v: number) {
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

const COMP_COLORS: Record<string, string> = {
  receita: '#10b981', despesa: '#ef4444', referencia: '#3b82f6',
};
const SOURCE_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#06b6d4'];
const PIE_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4', '#eab308', '#6366f1'];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[rgb(var(--foreground))]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {fmtCurrency(p.value)}</p>
      ))}
    </div>
  );
}

function PieTooltipC({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[rgb(var(--foreground))]">{payload[0].name}</p>
      <p className="text-xs" style={{ color: payload[0].payload.fill }}>{fmtCurrency(payload[0].value)}</p>
    </div>
  );
}

// ══════════════════════════════════════
// ██  MAIN PAGE
// ══════════════════════════════════════

export default function FinancialPage() {
  const { filterParam } = useImportSource();
  const { data, isLoading } = useFinancialFull(filterParam);

  const kpis = data?.kpis;
  const byComponent = data?.by_component ?? [];
  const bySource = data?.by_source ?? [];
  const topEnterprises = data?.top_enterprises ?? [];

  // Chart data
  const componentChart = useMemo(() =>
    byComponent.slice(0, 10).map((c) => ({
      name: c.name.length > 16 ? c.name.slice(0, 14) + '...' : c.name,
      valor: c.total,
      type: c.type,
    })),
  [byComponent]);

  const sourceComparison = useMemo(() =>
    bySource.map((s) => ({
      name: s.source_name,
      Receitas: s.receitas,
      Despesas: s.despesas,
    })),
  [bySource]);

  const enterprisePie = useMemo(() =>
    topEnterprises.slice(0, 6).map((e, i) => ({
      name: e.name.length > 20 ? e.name.slice(0, 18) + '...' : e.name,
      value: e.valor_venda,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    })),
  [topEnterprises]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
          <p className="text-xs text-[rgb(var(--muted-foreground))]">Carregando financeiro...</p>
        </div>
      </div>
    );
  }

  const resultado = kpis?.resultado ?? 0;

  return (
    <div className="space-y-6">
      {/* ══ Header ══ */}
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">Financeiro</h1>
        <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">
          Análise financeira completa das revendas imobiliárias
        </p>
      </div>

      {/* ══ KPIs ══ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Valor de Vendas" value={fmtShort(kpis?.valor_venda ?? 0)} icon={DollarSign} color="blue" />
        <KpiCard label="Receitas" value={fmtShort(kpis?.receitas ?? 0)} icon={TrendingUp} color="green" />
        <KpiCard label="Despesas" value={fmtShort(kpis?.despesas ?? 0)} icon={TrendingDown} color="red" />
        <KpiCard
          label="Resultado"
          value={fmtShort(resultado)}
          icon={resultado >= 0 ? ArrowUpRight : ArrowDownRight}
          color={resultado >= 0 ? 'green' : 'red'}
        />
        <KpiCard label="Ticket Médio" value={fmtShort(kpis?.ticket_medio ?? 0)} icon={Target} color="purple" />
        <KpiCard label="Processos" value={kpis?.total_processes ?? 0} icon={Receipt} color="cyan" />
      </div>

      {/* ══ Source comparison bar ══ */}
      {bySource.length > 1 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-3">
          <Database className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
          {bySource.map((s, i) => (
            <div key={s.source_name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
              <div>
                <span className="text-[12px] font-semibold text-[rgb(var(--foreground))]">{s.source_name}</span>
                <span className="ml-2 text-[11px] text-[rgb(var(--muted-foreground))]">
                  {s.count} proc. &middot; Vendas: {fmtShort(s.valor_venda)} &middot; Resultado: {fmtShort(s.resultado)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ Charts Row ══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Component */}
        <Card>
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Valores por Componente</h3>
          </CardHeader>
          <CardContent>
            {componentChart.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados financeiros importados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={componentChart} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} tickFormatter={fmtShort} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'rgb(var(--foreground))' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18} name="Valor">
                    {componentChart.map((entry, i) => (
                      <Cell key={i} fill={COMP_COLORS[entry.type] ?? '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Comparison by Source */}
        <Card>
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">
              {bySource.length > 1 ? 'Comparativo por Origem' : 'Receitas vs Despesas'}
            </h3>
          </CardHeader>
          <CardContent>
            {sourceComparison.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceComparison} margin={{ left: 0, right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} tickFormatter={fmtShort} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-[11px] text-[rgb(var(--foreground))]">{v}</span>} />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ Enterprise Pie + Component Table ══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Enterprises */}
        <Card>
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Valor de Vendas por Empreendimento</h3>
          </CardHeader>
          <CardContent>
            {enterprisePie.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={enterprisePie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                    {enterprisePie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={<PieTooltipC />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-[11px] text-[rgb(var(--foreground))]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Component Detail Table */}
        <Card>
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Detalhamento por Componente</h3>
          </CardHeader>
          <CardContent className="p-0">
            {byComponent.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <div className="divide-y divide-[rgb(var(--border))]">
                {byComponent.map((c) => (
                  <div key={c.code} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COMP_COLORS[c.type] ?? '#6b7280' }}
                      />
                      <div className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-[rgb(var(--foreground))]">{c.name}</span>
                        <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                          {c.type === 'receita' ? 'Receita' : c.type === 'despesa' ? 'Despesa' : 'Referência'}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'shrink-0 text-[12px] font-bold',
                      c.type === 'receita' ? 'text-emerald-600 dark:text-emerald-400' :
                      c.type === 'despesa' ? 'text-red-600 dark:text-red-400' :
                      'text-[rgb(var(--foreground))]'
                    )}>
                      {fmtCurrency(c.total)}
                    </span>
                  </div>
                ))}
                {/* Totals */}
                <div className="flex items-center justify-between bg-[rgb(var(--muted))]/50 px-5 py-3">
                  <span className="text-[12px] font-semibold text-[rgb(var(--foreground))]">Resultado</span>
                  <span className={cn(
                    'text-[14px] font-bold',
                    resultado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {fmtCurrency(resultado)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ Top Enterprises Table ══ */}
      {topEnterprises.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Ranking de Empreendimentos por Valor</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[rgb(var(--border))]">
              {topEnterprises.map((e, i) => {
                const pct = (kpis?.valor_venda ?? 0) > 0 ? Math.round((e.valor_venda / kpis!.valor_venda) * 100) : 0;
                return (
                  <div key={e.name} className="flex items-center gap-4 px-5 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11px] font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-[rgb(var(--foreground))]">{e.name}</span>
                      <span className="text-[10px] text-[rgb(var(--muted-foreground))]">{e.count} processos</span>
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="w-24 shrink-0 text-right text-[12px] font-bold text-[rgb(var(--foreground))]">
                      {fmtCurrency(e.valor_venda)}
                    </span>
                    <span className="w-10 shrink-0 text-right text-[11px] text-[rgb(var(--muted-foreground))]">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

