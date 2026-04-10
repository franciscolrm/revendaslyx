'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Workflow,
  Tag,
  Plug,
  MessageCircle,
  Mail,
  PenLine,
  Building,
  Wallet,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck,
  ListChecks,
  Monitor,
  Moon,
  Sun,
  ArrowDown,
  CheckCircle2,
  FileText,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { FlowDiagramDrawer } from '@/components/flow-diagram';

const tabList = [
  { id: 'geral', label: 'Geral', icon: <Settings className="h-4 w-4" /> },
  { id: 'fluxos', label: 'Fluxos', icon: <Workflow className="h-4 w-4" /> },
  { id: 'categorias', label: 'Categorias', icon: <Tag className="h-4 w-4" /> },
  { id: 'integracoes', label: 'Integrações', icon: <Plug className="h-4 w-4" /> },
];

const integrations = [
  { icon: MessageCircle, name: 'WhatsApp', description: 'Envie mensagens automáticas e receba notificações diretamente no WhatsApp.', status: 'Planejado' },
  { icon: Mail, name: 'Email', description: 'Integração com provedores de e-mail para comunicação automatizada.', status: 'Planejado' },
  { icon: PenLine, name: 'Assinatura Digital', description: 'Assine contratos e documentos digitalmente com validade jurídica.', status: 'Planejado' },
  { icon: Building, name: 'API Caixa', description: 'Integração com sistemas da Caixa Econômica para financiamento.', status: 'Planejado' },
  { icon: Wallet, name: 'ERP / Financeiro', description: 'Conecte com seu sistema ERP para sincronizar dados financeiros.', status: 'Planejado' },
];

const STAGE_GROUP_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  prospeccao: { bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
  contato: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  cartorio: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  comercial: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  caixa: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  financiamento: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500' },
  transferencia: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
  recebimento: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  encerramento: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-600' },
};

const STAGE_GROUP_LABELS: Record<string, string> = {
  prospeccao: 'Prospecção', contato: 'Contato', cartorio: 'Cartório',
  comercial: 'Comercial', caixa: 'Caixa', financiamento: 'Financiamento',
  transferencia: 'Transferência', recebimento: 'Recebimento', encerramento: 'Encerramento',
};

interface FlowType {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_stages?: number;
  stages?: Stage[];
}

interface Stage {
  id: string;
  name: string;
  stage_order: number;
  stage_group: string;
  sla_days?: number;
  requires_documents?: boolean;
  requires_tasks?: boolean;
  checklist?: string[];
  auto_tasks?: { title: string; type: string }[];
}

// ── Geral Tab ───────────────────────────────────────────

function GeralTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
            <h2 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Informações do Sistema</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Versão</p>
              <p className="mt-1 text-lg font-semibold text-[rgb(var(--foreground))]">1.0.0</p>
            </div>
            <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Ambiente</p>
              <p className="mt-1 text-lg font-semibold text-[rgb(var(--foreground))]">Produção</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
            <h2 className="text-[13px] font-semibold text-[rgb(var(--foreground))]">Aparência</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-[rgb(var(--muted-foreground))]">
            A seleção de tema (claro/escuro) está disponível no cabeçalho da aplicação. Utilize o botão de alternância de tema no menu superior.
          </p>
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] px-4 py-3">
              <Sun className="h-5 w-5 text-amber-500" />
              <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">Claro</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] px-4 py-3">
              <Moon className="h-5 w-5 text-indigo-500" />
              <span className="text-[13px] font-medium text-[rgb(var(--foreground))]">Escuro</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Fluxos Tab ──────────────────────────────────────────

function FluxosTab() {
  const { data: flowTypes, isLoading } = useQuery({
    queryKey: ['flow-types'],
    queryFn: async () => {
      const { data } = await api.get('/processes/flow-types');
      return data as FlowType[];
    },
  });

  const [selectedFlow, setSelectedFlow] = useState<FlowType | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
        ))}
      </div>
    );
  }

  if (!flowTypes?.length) {
    return <EmptyState icon={Workflow} title="Nenhum tipo de fluxo cadastrado" description="Tipos de fluxo definem as etapas dos processos de revenda" />;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {flowTypes.map((ft) => {
          const stageCount = ft.stages?.length ?? ft.total_stages ?? 0;
          const groups = [...new Set((ft.stages ?? []).map((s) => s.stage_group))];
          const groupLabels = groups.map((g) => STAGE_GROUP_LABELS[g] ?? g);

          return (
            <button
              key={ft.id}
              onClick={() => setSelectedFlow(ft)}
              className="group rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-left transition-all duration-150 hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  <Workflow className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-[rgb(var(--foreground))]">{ft.name}</h3>
                  {ft.description && (
                    <p className="mt-0.5 text-[12px] text-[rgb(var(--muted-foreground))] line-clamp-2">{ft.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{stageCount} etapas</Badge>
                    <Badge variant="default">{groups.length} grupos</Badge>
                  </div>
                  {groups.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {groups.map((g) => {
                        const colors = STAGE_GROUP_COLORS[g];
                        return <div key={g} className={cn('h-2.5 w-2.5 rounded-full', colors?.dot ?? 'bg-gray-400')} />;
                      })}
                      <span className="ml-1 text-[10px] text-[rgb(var(--muted-foreground))]">{groupLabels.join(' → ')}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[rgb(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {selectedFlow && <FlowDiagramDrawer flow={selectedFlow} onClose={() => setSelectedFlow(null)} />}
    </>
  );
}

// ── Categorias Tab ──────────────────────────────────────

function CategoriasTab() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const { data } = await api.get('/documents/categories');
      return data as { id: string; name: string; code: string; description?: string }[];
    },
  });

  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />;
  if (!categories?.length) return <EmptyState icon={Tag} title="Nenhuma categoria cadastrada" description="Categorias organizam os documentos do sistema" />;

  return (
    <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50">
            <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Nome</th>
            <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Código</th>
            <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">Descrição</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgb(var(--border))]">
          {categories.map((cat) => (
            <tr key={cat.id} className="transition-colors hover:bg-[rgb(var(--muted))]/50">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-[rgb(var(--foreground))]">{cat.name}</td>
              <td className="whitespace-nowrap px-4 py-3"><code className="rounded bg-[rgb(var(--muted))] px-2 py-0.5 text-xs font-mono">{cat.code}</code></td>
              <td className="px-4 py-3 text-[rgb(var(--muted-foreground))]">{cat.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Integrações Tab ─────────────────────────────────────

function IntegracoesTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {integrations.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.name} className="relative overflow-hidden">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--muted))]">
                <Icon className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
              </div>
              <h3 className="mt-3 text-[13px] font-semibold text-[rgb(var(--foreground))]">{item.name}</h3>
              <Badge variant="default" className="mt-2">{item.status}</Badge>
              <p className="mt-2 text-[12px] leading-relaxed text-[rgb(var(--muted-foreground))]">{item.description}</p>
              <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--card))]/60 backdrop-blur-[1px]">
                <span className="rounded-full bg-[rgb(var(--muted))] px-4 py-2 text-[13px] font-semibold text-[rgb(var(--muted-foreground))]">Em breve</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('geral');

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      <Tabs tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />
      <div className="mt-2">
        {activeTab === 'geral' && <GeralTab />}
        {activeTab === 'fluxos' && <FluxosTab />}
        {activeTab === 'categorias' && <CategoriasTab />}
        {activeTab === 'integracoes' && <IntegracoesTab />}
      </div>
    </div>
  );
}
