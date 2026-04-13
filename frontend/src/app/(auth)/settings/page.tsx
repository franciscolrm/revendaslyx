'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
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
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { FlowDiagramDrawer } from '@/components/flow-diagram';
import {
  useMyWhatsAppInstance,
  useCreateWhatsAppInstance,
  useWhatsAppQrCode,
  useDisconnectWhatsApp,
  useRestartWhatsApp,
} from '@/hooks/use-whatsapp';

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

function WhatsAppConnectionCard() {
  const { data: instance, isLoading } = useMyWhatsAppInstance();
  const { data: qrData, isLoading: qrLoading, refetch: refetchQr } = useWhatsAppQrCode(
    !!instance?.configured && instance?.status !== 'connected',
  );
  const createInstance = useCreateWhatsAppInstance();
  const disconnect = useDisconnectWhatsApp();
  const restart = useRestartWhatsApp();

  const isConnected = instance?.status === 'connected';
  const isConfigured = instance?.configured;

  async function handleConnect() {
    await createInstance.mutateAsync();
  }

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <MessageCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[rgb(var(--foreground))]">WhatsApp</h3>
              <p className="text-[12px] text-[rgb(var(--muted-foreground))]">
                {isConnected ? `Conectado: ${instance?.phone_number}` : 'Conecte seu número para atender clientes'}
              </p>
            </div>
          </div>
          <div className={cn('flex items-center gap-2 rounded-full px-3 py-1', isConnected ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800')}>
            <div className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-gray-400')} />
            <span className={cn('text-[11px] font-medium', isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600')}>
              {isConnected ? 'Conectado' : isConfigured ? 'Desconectado' : 'Não configurado'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* CONNECTED */}
        {isConnected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-500/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-emerald-800 dark:text-emerald-300">WhatsApp conectado</p>
                <p className="text-[12px] text-emerald-600 dark:text-emerald-400">
                  {instance?.phone_number ? `Número: ${instance.phone_number}` : 'Pronto para enviar e receber mensagens'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => restart.mutate()} disabled={restart.isPending} className="rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-[13px] font-medium text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--muted))] disabled:opacity-50">
                {restart.isPending ? 'Reconectando...' : 'Reconectar'}
              </button>
              <button onClick={() => disconnect.mutate()} disabled={disconnect.isPending} className="rounded-lg border border-red-200 px-4 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-500/10 disabled:opacity-50">
                {disconnect.isPending ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </div>
        )}

        {/* NOT CONFIGURED — One click to start */}
        {!isConfigured && (
          <div className="text-center py-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <MessageCircle className="h-10 w-10 text-emerald-500" />
            </div>
            <h4 className="mt-4 text-[15px] font-semibold text-[rgb(var(--foreground))]">Conectar WhatsApp</h4>
            <p className="mt-2 text-[13px] text-[rgb(var(--muted-foreground))] max-w-sm mx-auto">
              Clique no botão abaixo para gerar o QR Code. Depois, escaneie com seu celular.
            </p>
            <button
              onClick={handleConnect}
              disabled={createInstance.isPending}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {createInstance.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
              {createInstance.isPending ? 'Gerando...' : 'Conectar meu WhatsApp'}
            </button>
            {createInstance.isError && (
              <p className="mt-3 text-[12px] text-red-500">
                Erro ao criar instância. Verifique se a Evolution API está rodando.
              </p>
            )}
          </div>
        )}

        {/* CONFIGURED BUT NOT CONNECTED — QR Code */}
        {isConfigured && !isConnected && (
          <div className="space-y-5">
            <div className="flex flex-col items-center py-2">
              <div className="relative flex h-[280px] w-[280px] items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-white dark:border-emerald-700 dark:bg-gray-950">
                {qrLoading && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
                    <span className="text-[12px] text-[rgb(var(--muted-foreground))]">Gerando QR Code...</span>
                  </div>
                )}
                {!qrLoading && qrData?.error && (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                    <span className="text-[11px] text-[rgb(var(--muted-foreground))]">{qrData.error}</span>
                  </div>
                )}
                {!qrLoading && qrData?.connected && (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    <span className="text-[13px] font-medium text-emerald-600">Conectado!</span>
                  </div>
                )}
                {!qrLoading && qrData?.qr_code && !qrData?.connected && (
                  <img
                    src={qrData.qr_code.startsWith('data:') ? qrData.qr_code : `data:image/png;base64,${qrData.qr_code}`}
                    alt="QR Code WhatsApp"
                    className="h-[256px] w-[256px] rounded-xl"
                  />
                )}
              </div>

              <button
                onClick={() => refetchQr()}
                disabled={qrLoading}
                className="mt-3 rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-[12px] font-medium text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--muted))] disabled:opacity-50"
              >
                Atualizar QR Code
              </button>
            </div>

            {/* Instructions */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-800 dark:bg-emerald-500/5">
              <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300 mb-3">Como conectar</p>
              <div className="space-y-3">
                {[
                  'Abra o WhatsApp no seu celular',
                  'Toque em Menu (⋮) ou Configurações',
                  'Toque em "Dispositivos conectados"',
                  'Toque em "Conectar um dispositivo"',
                  'Aponte a câmera para o QR Code acima',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-300">
                      {i + 1}
                    </div>
                    <span className="text-[13px] text-emerald-700 dark:text-emerald-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegracoesTab() {
  return (
    <div className="space-y-6">
      <WhatsAppConnectionCard />

      {/* Other integrations */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.filter((i) => i.name !== 'WhatsApp').map((item) => {
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
