'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Edit,
  CheckCircle2,
  XCircle,
  DollarSign,
  User,
  FileText,
  FolderOpen,
  AlertTriangle,
  Info,
  Users,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';

import { useUnit } from '@/hooks/use-units';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';

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
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between py-2.5', className)}>
      <span className="text-sm text-[rgb(var(--muted-foreground))]">{label}</span>
      <span className="text-sm font-medium text-[rgb(var(--foreground))]">{value}</span>
    </div>
  );
}

function DebtRow({ label, value }: { label: string; value?: number }) {
  const hasDebt = (value ?? 0) > 0;
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-[rgb(var(--muted-foreground))]">{label}</span>
      <span className={cn('text-sm font-semibold', hasDebt ? 'text-red-600' : 'text-emerald-600')}>
        {formatBRL(value ?? 0)}
      </span>
    </div>
  );
}

export default function UnitDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: unit, isLoading } = useUnit(id);
  const [activeTab, setActiveTab] = useState('detalhes');

  const totalDebts = useMemo(() => {
    if (!unit) return 0;
    return (unit.debts_cadin ?? 0) + (unit.debts_iptu ?? 0) + (unit.debts_condominio ?? 0) + (unit.debts_other ?? 0);
  }, [unit]);

  const statusCfg = STATUS_BADGE_MAP[unit?.status ?? ''] ?? { label: unit?.status ?? '', variant: 'default' as const };

  const tabs = [
    { id: 'detalhes', label: 'Detalhes', icon: <Info className="h-4 w-4" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'processos', label: 'Processos', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'documentos', label: 'Documentos', icon: <FolderOpen className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
          ))}
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Unidade nao encontrada" back="/units" />
        <EmptyState
          icon={Building2}
          title="Unidade nao encontrada"
          description="A unidade solicitada nao existe ou foi removida."
          action={
            <Link href="/units">
              <Button variant="secondary" size="sm">Voltar para lista</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Unidade ${unit.unit_number}${unit.block_tower ? ` - ${unit.block_tower}` : ''}`}
        description={unit.enterprise?.name ?? 'Sem empreendimento'}
        back="/units"
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={statusCfg.variant} className="text-sm px-3 py-1">
              {statusCfg.label}
            </Badge>
            <Link href={`/units/${unit.id}/edit`}>
              <Button icon={Edit} variant="secondary">Editar</Button>
            </Link>
          </div>
        }
      />

      {/* Top Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card 1: Dados da Unidade */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] px-6 py-4">
            <Building2 className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Dados da Unidade</h3>
          </div>
          <div className="divide-y divide-[rgb(var(--border))] px-6">
            <InfoRow label="Empreendimento" value={unit.enterprise?.name ?? '-'} />
            <InfoRow label="Bloco / Torre" value={unit.block_tower ?? '-'} />
            <InfoRow label="Numero" value={unit.unit_number} />
            <InfoRow label="Andar" value={unit.floor ?? '-'} />
            <InfoRow label="Tipo" value={unit.unit_type ? TYPE_LABELS[unit.unit_type] ?? unit.unit_type : '-'} />
            <InfoRow label="Area" value={unit.area_m2 ? `${unit.area_m2} m2` : '-'} />
          </div>
        </div>

        {/* Card 2: Status e Disponibilidade */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] px-6 py-4">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Status e Valores</h3>
          </div>
          <div className="divide-y divide-[rgb(var(--border))] px-6">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-[rgb(var(--muted-foreground))]">Status</span>
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-[rgb(var(--muted-foreground))]">Estoque</span>
              {unit.stock_available ? (
                <Badge variant="success">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Disponivel
                </Badge>
              ) : (
                <Badge variant="default">
                  <XCircle className="mr-1 h-3 w-3" /> Indisponivel
                </Badge>
              )}
            </div>
            <InfoRow label="Valor Original" value={formatBRL(unit.original_value)} />
            <InfoRow label="Valor Atual" value={
              <span className="text-base font-bold text-emerald-600">{formatBRL(unit.current_value)}</span>
            } />
            {unit.original_value && unit.current_value && unit.original_value !== unit.current_value && (
              <InfoRow
                label="Variacao"
                value={
                  <span className={cn(
                    'text-sm font-medium',
                    unit.current_value > unit.original_value ? 'text-emerald-600' : 'text-red-600',
                  )}>
                    {unit.current_value > unit.original_value ? '+' : ''}
                    {(((unit.current_value - unit.original_value) / unit.original_value) * 100).toFixed(1)}%
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Card 3: Debitos */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] px-6 py-4">
            <AlertTriangle className={cn('h-5 w-5', totalDebts > 0 ? 'text-red-500' : 'text-emerald-500')} />
            <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Debitos</h3>
            {totalDebts > 0 && (
              <Badge variant="danger" className="ml-auto">Pendente</Badge>
            )}
          </div>
          <div className="divide-y divide-[rgb(var(--border))] px-6">
            <DebtRow label="CADIN" value={unit.debts_cadin} />
            <DebtRow label="IPTU" value={unit.debts_iptu} />
            <DebtRow label="Condominio" value={unit.debts_condominio} />
            <DebtRow label="Outros" value={unit.debts_other} />
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-semibold text-[rgb(var(--foreground))]">Total</span>
              <span className={cn('text-lg font-bold', totalDebts > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {formatBRL(totalDebts)}
              </span>
            </div>
          </div>
          {unit.debts_description && (
            <div className="border-t border-[rgb(var(--border))] px-6 py-3">
              <p className="text-xs text-[rgb(var(--muted-foreground))]">{unit.debts_description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6" />

        <div className="p-6">
          {/* Detalhes */}
          {activeTab === 'detalhes' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-3 text-sm font-semibold text-[rgb(var(--foreground))]">Informacoes Gerais</h4>
                <div className="space-y-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4">
                  <InfoRow label="Empreendimento" value={unit.enterprise?.name ?? '-'} />
                  <InfoRow label="Codigo Empreendimento" value={unit.enterprise?.code ?? '-'} />
                  <InfoRow label="Bloco / Torre" value={unit.block_tower ?? '-'} />
                  <InfoRow label="Numero" value={unit.unit_number} />
                  <InfoRow label="Andar" value={unit.floor ?? '-'} />
                  <InfoRow label="Tipo" value={unit.unit_type ? TYPE_LABELS[unit.unit_type] ?? unit.unit_type : '-'} />
                  <InfoRow label="Area" value={unit.area_m2 ? `${unit.area_m2} m2` : '-'} />
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-[rgb(var(--foreground))]">Observacoes</h4>
                <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4">
                  <p className="text-sm text-[rgb(var(--muted-foreground))] leading-relaxed">
                    {unit.notes || 'Nenhuma observacao registrada.'}
                  </p>
                </div>
                <h4 className="mb-3 mt-6 text-sm font-semibold text-[rgb(var(--foreground))]">Registro</h4>
                <div className="space-y-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4">
                  <InfoRow label="Criado em" value={new Date(unit.created_at).toLocaleDateString('pt-BR')} />
                  <InfoRow label="ID" value={
                    <span className="font-mono text-xs text-[rgb(var(--muted-foreground))]">{unit.id}</span>
                  } />
                </div>
              </div>
            </div>
          )}

          {/* Clientes */}
          {activeTab === 'clientes' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  <h4 className="text-sm font-semibold text-[rgb(var(--foreground))]">Cliente Original</h4>
                </div>
                {unit.original_client ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                      {unit.original_client.full_name}
                    </p>
                    {unit.original_client_id && (
                      <p className="font-mono text-xs text-[rgb(var(--muted-foreground))]">
                        ID: {unit.original_client_id}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--muted-foreground))]">
                    {unit.original_client_id ? `ID: ${unit.original_client_id}` : 'Nenhum cliente original vinculado.'}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-500" />
                  <h4 className="text-sm font-semibold text-[rgb(var(--foreground))]">Cliente Atual</h4>
                </div>
                {unit.current_client ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                      {unit.current_client.full_name}
                    </p>
                    {unit.current_client_id && (
                      <p className="font-mono text-xs text-[rgb(var(--muted-foreground))]">
                        ID: {unit.current_client_id}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[rgb(var(--muted-foreground))]">
                    {unit.current_client_id ? `ID: ${unit.current_client_id}` : 'Nenhum cliente atual vinculado.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Processos */}
          {activeTab === 'processos' && (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo vinculado"
              description="Os processos relacionados a esta unidade apareceram aqui."
            />
          )}

          {/* Documentos */}
          {activeTab === 'documentos' && (
            <EmptyState
              icon={FolderOpen}
              title="Nenhum documento anexado"
              description="Os documentos relacionados a esta unidade apareceram aqui."
            />
          )}
        </div>
      </div>
    </div>
  );
}
