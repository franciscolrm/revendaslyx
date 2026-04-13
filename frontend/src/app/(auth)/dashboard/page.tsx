'use client';

import { useMemo } from 'react';
import {
  GitBranch,
  Users,
  Building2,
  CheckSquare,
  Phone,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Home,
  UserCheck,
  Calendar,
  Target,
  Layers,
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
import { useAuth } from '@/contexts/auth-context';
import { useFullDashboard } from '@/hooks/use-dashboard';
import { useImportSource } from '@/contexts/import-source-context';

// ── Constants ──

const STAGE_GROUPS: Record<string, { label: string; color: string; hex: string }> = {
  prospeccao: { label: 'Prospecção', color: 'bg-slate-500', hex: '#64748b' },
  captacao: { label: 'Captação', color: 'bg-slate-500', hex: '#64748b' },
  contato: { label: 'Contato', color: 'bg-blue-500', hex: '#3b82f6' },
  comercial: { label: 'Comercial', color: 'bg-orange-500', hex: '#f97316' },
  cartorio: { label: 'Cartório', color: 'bg-purple-500', hex: '#a855f7' },
  caixa: { label: 'Caixa', color: 'bg-cyan-500', hex: '#06b6d4' },
  financiamento: { label: 'Financiamento', color: 'bg-cyan-600', hex: '#0891b2' },
  transferencia: { label: 'Transferência', color: 'bg-indigo-500', hex: '#6366f1' },
  recebimento: { label: 'Recebimento', color: 'bg-teal-500', hex: '#14b8a6' },
  encerramento: { label: 'Encerramento', color: 'bg-gray-400', hex: '#9ca3af' },
  venda_concluida: { label: 'Vendidas', color: 'bg-emerald-500', hex: '#10b981' },
  renegociacao: { label: 'Renegociação', color: 'bg-amber-500', hex: '#f59e0b' },
  aguardando: { label: 'Aguardando', color: 'bg-yellow-500', hex: '#eab308' },
  sem_retorno: { label: 'Sem Retorno', color: 'bg-red-400', hex: '#f87171' },
  encerrado: { label: 'Encerrado', color: 'bg-gray-400', hex: '#9ca3af' },
  problema: { label: 'Problema', color: 'bg-red-600', hex: '#dc2626' },
  adimplente: { label: 'Adimplente', color: 'bg-green-500', hex: '#22c55e' },
  outros: { label: 'Outros', color: 'bg-gray-500', hex: '#6b7280' },
};

const UNIT_STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  sold: '#3b82f6',
  in_resale: '#f97316',
  reserved: '#a855f7',
  transferred: '#06b6d4',
  unavailable: '#ef4444',
};

const UNIT_STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  sold: 'Vendida',
  in_resale: 'Em Revenda',
  reserved: 'Reservada',
  transferred: 'Transferida',
  unavailable: 'Indisponível',
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  meeting: 'Reunião',
  visit: 'Visita',
  email: 'E-mail',
  cartorio: 'Cartório',
  caixa_interview: 'Entrev. Caixa',
  signing: 'Assinatura',
  uber: 'Uber',
  note: 'Nota',
  other: 'Outro',
};

const SOURCE_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4'];

// ── Helpers ──

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[rgb(var(--foreground))]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {isCurrency ? formatCurrency(p.value) : formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[rgb(var(--foreground))]">{d.name}</p>
      <p className="text-xs" style={{ color: d.payload.fill }}>{formatNumber(d.value)}</p>
    </div>
  );
}

// ── Section Title ──

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />}
      <h3 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">{children}</h3>
    </div>
  );
}

// ── Loading Skeleton ──

function Skeleton() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
        <p className="text-xs text-[rgb(var(--muted-foreground))]">Carregando dashboard...</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ██  MAIN DASHBOARD PAGE
// ══════════════════════════════════════════════

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] ?? '';
  const { filterParam } = useImportSource();

  const { data, isLoading } = useFullDashboard(filterParam);

  const kpis = data?.kpis;
  const pipeline = data?.pipeline ?? [];
  const unitsByStatus = data?.units_by_status ?? [];
  const processesByEnterprise = data?.processes_by_enterprise ?? [];
  const comparisonBySource = data?.comparison_by_source ?? [];
  const financialByComponent = data?.financial_by_component ?? [];
  const topStatuses = data?.top_statuses ?? [];
  const topEnterprises = data?.top_enterprises ?? [];
  const topUsers = data?.top_users ?? [];
  const activitiesByType = data?.activities_by_type ?? [];
  const operationalAlerts = data?.operational_alerts ?? [];

  // ── Derived chart data ──

  const pipelineFunnel = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of pipeline) {
      const g = item.stage_group ?? 'outros';
      map[g] = (map[g] || 0) + (item.total_resales || 0);
    }
    const maxCount = Math.max(1, ...Object.values(map));
    return Object.entries(map)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        key,
        label: STAGE_GROUPS[key]?.label ?? key,
        color: STAGE_GROUPS[key]?.color ?? 'bg-gray-500',
        hex: STAGE_GROUPS[key]?.hex ?? '#6b7280',
        count,
        barWidth: Math.round((count / maxCount) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [pipeline]);

  const pieUnits = useMemo(
    () =>
      unitsByStatus.map((u) => ({
        name: UNIT_STATUS_LABELS[u.status] ?? u.status,
        value: u.count,
        fill: UNIT_STATUS_COLORS[u.status] ?? '#6b7280',
      })),
    [unitsByStatus],
  );

  const barEnterprises = useMemo(
    () =>
      processesByEnterprise.slice(0, 8).map((e) => ({
        name: e.name.length > 20 ? e.name.slice(0, 18) + '...' : e.name,
        processos: e.count,
      })),
    [processesByEnterprise],
  );

  const barComparison = useMemo(
    () =>
      comparisonBySource.map((s) => ({
        name: s.source_name ?? 'Desconhecido',
        Processos: s.processes,
        Unidades: s.units,
        Clientes: s.clients,
      })),
    [comparisonBySource],
  );

  const barFinancial = useMemo(
    () =>
      financialByComponent
        .filter((f) => f.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
        .map((f) => ({
          name: f.name.length > 18 ? f.name.slice(0, 16) + '...' : f.name,
          valor: f.total,
          type: f.component_type,
        })),
    [financialByComponent],
  );

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ══ Header ══ */}
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--foreground))]">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-0.5 text-[13px] text-[rgb(var(--muted-foreground))]">
          Visão consolidada do seu CRM imobiliário
        </p>
      </div>

      {/* ══ KPI Cards - Row 1: Processos & Unidades ══ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total Processos"
          value={formatNumber(kpis?.total_processes ?? 0)}
          sublabel={`${kpis?.active_processes ?? 0} ativos`}
          icon={GitBranch}
          color="blue"
        />
        <KpiCard
          label="Concluídos"
          value={formatNumber(kpis?.completed_processes ?? 0)}
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          label="Total Unidades"
          value={formatNumber(kpis?.total_units ?? 0)}
          sublabel={`${kpis?.units_available ?? 0} disponíveis`}
          icon={Building2}
          color="purple"
        />
        <KpiCard
          label="Em Revenda"
          value={formatNumber(kpis?.units_in_resale ?? 0)}
          icon={Home}
          color="orange"
        />
        <KpiCard
          label="Vendidas"
          value={formatNumber(kpis?.units_sold ?? 0)}
          icon={Target}
          color="cyan"
        />
        <KpiCard
          label="Clientes"
          value={formatNumber(kpis?.total_clients ?? 0)}
          sublabel={`${kpis?.total_sellers ?? 0} vend. / ${kpis?.total_buyers ?? 0} comp.`}
          icon={Users}
          color="indigo"
        />
      </div>

      {/* ══ KPI Cards - Row 2: Financeiro & Operacional ══ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Valor em Carteira"
          value={formatCurrency(kpis?.financial_receivable ?? 0)}
          icon={DollarSign}
          color="amber"
        />
        <KpiCard
          label="Valor Recebido"
          value={formatCurrency(kpis?.financial_received ?? 0)}
          icon={DollarSign}
          color="green"
        />
        <KpiCard
          label="Valor Total Vendas"
          value={formatCurrency(kpis?.financial_total_sale_value ?? 0)}
          sublabel={`Ticket: ${formatCurrency(kpis?.ticket_medio ?? 0)}`}
          icon={BarChart3}
          color="blue"
        />
        <KpiCard
          label="Tarefas Pendentes"
          value={formatNumber(kpis?.pending_tasks ?? 0)}
          sublabel={kpis?.overdue_tasks ? `${kpis.overdue_tasks} vencidas` : undefined}
          icon={CheckSquare}
          color={kpis?.overdue_tasks ? 'red' : 'amber'}
        />
        <KpiCard
          label="Atividades do Mês"
          value={formatNumber(kpis?.activities_this_month ?? 0)}
          sublabel={`${kpis?.total_activities ?? 0} total`}
          icon={Calendar}
          color="purple"
        />
        <KpiCard
          label="Cancelados"
          value={formatNumber(kpis?.cancelled_processes ?? 0)}
          sublabel={kpis?.paused_processes ? `${kpis.paused_processes} pausados` : undefined}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* ══ Pipeline + Unidades por Status ══ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionTitle icon={Layers}>Pipeline - Funil por Estágio</SectionTitle>
          </CardHeader>
          <CardContent>
            {pipelineFunnel.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">
                Nenhum dado de pipeline disponível.
              </p>
            ) : (
              <div className="space-y-2">
                {pipelineFunnel.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-[12px] font-medium text-[rgb(var(--foreground))]">
                      {item.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-7 w-full overflow-hidden rounded-lg bg-[rgb(var(--muted))]">
                        <div
                          className={cn('flex h-full items-center rounded-lg px-2.5 transition-all duration-700', item.color)}
                          style={{ width: `${Math.max(item.barWidth, item.count > 0 ? 8 : 0)}%` }}
                        >
                          <span className="text-[11px] font-bold text-white drop-shadow-sm">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] font-medium text-[rgb(var(--muted-foreground))]">
                      {((item.count / (kpis?.active_processes || 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Units by Status - Donut */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Building2}>Unidades por Status</SectionTitle>
          </CardHeader>
          <CardContent>
            {pieUnits.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieUnits}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieUnits.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-[11px] text-[rgb(var(--foreground))]">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ Gráficos Analíticos Row ══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processos por Empreendimento */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Building2}>Processos por Empreendimento</SectionTitle>
          </CardHeader>
          <CardContent>
            {barEnterprises.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barEnterprises} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11, fill: 'rgb(var(--foreground))' }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="processos" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} name="Processos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Comparação por Origem */}
        <Card>
          <CardHeader>
            <SectionTitle icon={BarChart3}>Comparação por Origem</SectionTitle>
          </CardHeader>
          <CardContent>
            {barComparison.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">
                Importe dados de múltiplas origens para ver a comparação.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barComparison} margin={{ left: 0, right: 16 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-[11px] text-[rgb(var(--foreground))]">{value}</span>
                    )}
                  />
                  <Bar dataKey="Processos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="Unidades" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="Clientes" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ Financeiro + Atividades ══ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Financeiro por Componente */}
        <Card>
          <CardHeader>
            <SectionTitle icon={DollarSign}>Distribuição Financeira</SectionTitle>
          </CardHeader>
          <CardContent>
            {barFinancial.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados financeiros</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barFinancial} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11, fill: 'rgb(var(--foreground))' }}
                  />
                  <Tooltip content={<ChartTooltip isCurrency />} />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={20} name="Valor">
                    {barFinancial.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.type === 'receita' ? '#10b981' : entry.type === 'despesa' ? '#ef4444' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Atividades por Tipo */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Phone}>Atividades por Tipo</SectionTitle>
          </CardHeader>
          <CardContent>
            {activitiesByType.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem atividades registradas</p>
            ) : (
              <div className="space-y-2.5">
                {activitiesByType.slice(0, 8).map((a) => {
                  const max = activitiesByType[0]?.count || 1;
                  const pct = Math.round((a.count / max) * 100);
                  return (
                    <div key={a.type} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-[12px] font-medium text-[rgb(var(--foreground))]">
                        {ACTIVITY_LABELS[a.type] ?? a.type}
                      </span>
                      <div className="flex-1">
                        <div className="h-6 w-full overflow-hidden rounded-md bg-[rgb(var(--muted))]">
                          <div
                            className="flex h-full items-center rounded-md bg-primary-500 px-2 transition-all duration-500"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          >
                            <span className="text-[11px] font-bold text-white">{a.count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ Tabelas Analíticas: Top Status + Top Empreendimentos + Top Corretores ══ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Status */}
        <Card>
          <CardHeader>
            <SectionTitle icon={BarChart3}>Top Status</SectionTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topStatuses.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <div className="divide-y divide-[rgb(var(--border))]">
                {topStatuses.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: STAGE_GROUPS[s.stage_group]?.hex ?? '#6b7280' }}
                      />
                      <span className="truncate text-[12px] text-[rgb(var(--foreground))]">
                        {s.status_name}
                      </span>
                    </div>
                    <span className="shrink-0 text-[12px] font-bold text-[rgb(var(--foreground))]">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Empreendimentos */}
        <Card>
          <CardHeader>
            <SectionTitle icon={Building2}>Top Empreendimentos</SectionTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topEnterprises.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <div className="divide-y divide-[rgb(var(--border))]">
                {topEnterprises.slice(0, 8).map((e, i) => (
                  <div key={i} className="px-5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-[12px] font-medium text-[rgb(var(--foreground))]">
                        {e.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-[rgb(var(--muted-foreground))]">
                        {e.total_units} un.
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-[rgb(var(--muted-foreground))]">
                      <span className="text-emerald-500">{e.available} disp.</span>
                      <span className="text-orange-500">{e.in_resale} revenda</span>
                      <span className="text-blue-500">{e.sold} vend.</span>
                      {e.avg_value > 0 && (
                        <span className="ml-auto font-medium">{formatCurrency(e.avg_value)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Corretores */}
        <Card>
          <CardHeader>
            <SectionTitle icon={UserCheck}>Top Corretores</SectionTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topUsers.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px] text-[rgb(var(--muted-foreground))]">Sem dados</p>
            ) : (
              <div className="divide-y divide-[rgb(var(--border))]">
                {topUsers.slice(0, 8).map((u, i) => (
                  <div key={u.user_id ?? i} className="flex items-center justify-between px-5 py-2.5">
                    <div className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-[rgb(var(--foreground))]">
                        {u.full_name}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                        {u.active} ativos &middot; {u.completed} concluídos
                      </span>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-500/10">
                      <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400">
                        {u.total_processes}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ Alertas Operacionais ══ */}
      {operationalAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <SectionTitle icon={AlertTriangle}>Alertas Operacionais</SectionTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {operationalAlerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[rgb(var(--foreground))]">{alert.message}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {alert.count} {alert.count === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
