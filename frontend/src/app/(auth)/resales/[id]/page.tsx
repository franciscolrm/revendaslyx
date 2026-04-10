'use client';

import { useParams } from 'next/navigation';
import {
  useResale,
  useChangeStatus,
  useAddInteraction,
} from '@/hooks/use-resales';
import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  Mail,
  MapPin,
  User,
  MessageSquare,
  Clock,
  Send,
  ArrowRightLeft,
} from 'lucide-react';

const statusOptions = [
  { value: '01_angariacao', label: 'Angariação' },
  { value: '01_vendida', label: 'Vendida' },
  { value: '02_liberada_pra_venda', label: 'Liberada p/ Venda' },
  { value: '02_cancelada', label: 'Cancelada' },
  { value: '03_agendada_cartorio', label: 'Agendada Cartório' },
  { value: '03_analise_juridica', label: 'Análise Jurídica' },
  { value: '04_escritura_assinada', label: 'Escritura Assinada' },
  { value: '05_registro_andamento', label: 'Registro em Andamento' },
  { value: '06_registrada', label: 'Registrada' },
  { value: '07_concluida', label: 'Concluída' },
  { value: '08_distrato', label: 'Distrato' },
];

const interactionTypes = [
  { value: 'call', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'visit', label: 'Visita' },
  { value: 'note', label: 'Anotação' },
];

const interactionIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  visit: <MapPin className="h-3.5 w-3.5" />,
  note: <MessageSquare className="h-3.5 w-3.5" />,
};

export default function ResaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: resale, isLoading } = useResale(id);
  const changeStatus = useChangeStatus();
  const addInteraction = useAddInteraction();

  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [interType, setInterType] = useState('call');
  const [interNotes, setInterNotes] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!resale) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50">
        <p className="text-sm text-red-600">Revenda não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={resale.customer_name}
        description={`${resale.external_code ?? 'Sem código'}`}
        back="/resales"
        actions={
          <Badge
            variant={
              resale.status?.code?.includes('concluida')
                ? 'success'
                : resale.status?.code?.includes('distrato') ||
                    resale.status?.code?.includes('cancelada')
                  ? 'danger'
                  : 'info'
            }
          >
            {resale.status?.name ?? 'Sem status'}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dados gerais */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Dados da Revenda</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
              {[
                { label: 'Documento', value: resale.document },
                { label: 'Telefone', value: resale.phone },
                { label: 'E-mail', value: resale.email },
                { label: 'Origem', value: resale.source },
                { label: 'Filial', value: resale.branch?.name },
                { label: 'Equipe', value: resale.team?.name },
                { label: 'Responsável', value: resale.assigned_user?.full_name },
                { label: 'Região', value: resale.region?.name },
              ].map((field) => (
                <div key={field.label}>
                  <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    {field.label}
                  </dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {field.value ?? (
                      <span className="font-normal text-gray-400">-</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {resale.notes && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Observações
                </p>
                <p className="mt-1 text-sm text-gray-700">{resale.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="space-y-4">
          {/* Mudar Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Mudar Status</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">Selecione o status...</option>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Observações (opcional)"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={2}
              />
              <Button
                onClick={() => {
                  if (!newStatus) return;
                  changeStatus.mutate(
                    {
                      resaleId: id,
                      status_code: newStatus,
                      notes: statusNotes,
                    },
                    {
                      onSuccess: () => {
                        setNewStatus('');
                        setStatusNotes('');
                      },
                    },
                  );
                }}
                disabled={!newStatus}
                loading={changeStatus.isPending}
                className="w-full"
              >
                Alterar Status
              </Button>
            </CardContent>
          </Card>

          {/* Nova Interação */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Nova Interação</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={interType}
                onChange={(e) => setInterType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {interactionTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Detalhes da interação"
                value={interNotes}
                onChange={(e) => setInterNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={2}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  addInteraction.mutate(
                    {
                      resaleId: id,
                      interaction_type: interType,
                      notes: interNotes,
                    },
                    { onSuccess: () => setInterNotes('') },
                  );
                }}
                loading={addInteraction.isPending}
                className="w-full"
              >
                Registrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de Status */}
      {resale.status_history?.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">
                Histórico de Status
              </h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {resale.status_history.map((h: any) => (
                <div key={h.id} className="flex items-start gap-4 px-6 py-4">
                  <Badge variant="info">{h.status?.name}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500">
                      por{' '}
                      <span className="font-medium text-gray-700">
                        {h.changed_by_user?.full_name ?? 'Sistema'}
                      </span>{' '}
                      em{' '}
                      {new Date(h.changed_at).toLocaleString('pt-BR')}
                    </p>
                    {h.notes && (
                      <p className="mt-1 text-sm text-gray-600">{h.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interações */}
      {resale.interactions?.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Interações</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {resale.interactions.map((i: any) => (
                <div key={i.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    {interactionIcons[i.interaction_type] ?? (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {interactionTypes.find(
                          (t) => t.value === i.interaction_type,
                        )?.label ?? i.interaction_type}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {i.performed_by_user?.full_name ?? 'Sistema'} &middot;{' '}
                        {new Date(i.interaction_date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {i.result && (
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {i.result}
                      </p>
                    )}
                    {i.notes && (
                      <p className="mt-1 text-sm text-gray-600">{i.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financeiro */}
      {resale.financial_values?.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Financeiro</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-gray-500">
                    <th className="px-6 py-3 font-medium">Componente</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resale.financial_values.map((fv: any) => (
                    <tr
                      key={fv.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {fv.component?.name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            fv.component?.component_type === 'receita'
                              ? 'success'
                              : fv.component?.component_type === 'despesa'
                                ? 'danger'
                                : 'default'
                          }
                        >
                          {fv.component?.component_type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {Number(fv.amount).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
