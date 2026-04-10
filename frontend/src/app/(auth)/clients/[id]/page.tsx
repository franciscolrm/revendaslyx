'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Pencil,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  MessageSquare,
  Calendar,
  Plus,
  Video,
  Globe,
  StickyNote,
  FolderOpen,
  ClipboardList,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { useClient, useClientContacts, useAddClientContact } from '@/hooks/use-clients';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Timeline } from '@/components/ui/timeline';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { InputField, SelectField, TextareaField } from '@/components/ui/select-field';
import { cn } from '@/lib/cn';

const typeLabels: Record<string, { label: string; variant: 'info' | 'purple' | 'orange' }> = {
  seller: { label: 'Vendedor', variant: 'info' },
  buyer: { label: 'Comprador', variant: 'purple' },
  both: { label: 'Ambos', variant: 'orange' },
};

const CONTACT_TYPE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'visit', label: 'Visita' },
  { value: 'meeting', label: 'Reuniao' },
  { value: 'note', label: 'Anotacao' },
];

const contactTypeIcons: Record<string, { icon: typeof Phone; color: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  whatsapp: { icon: MessageSquare, color: 'success' },
  phone: { icon: Phone, color: 'primary' },
  email: { icon: Mail, color: 'accent' },
  visit: { icon: MapPin, color: 'warning' },
  meeting: { icon: Video, color: 'primary' },
  note: { icon: StickyNote, color: 'muted' },
};

const contactTypeLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Telefone',
  email: 'E-mail',
  visit: 'Visita',
  meeting: 'Reuniao',
  note: 'Anotacao',
};

function formatDocument(doc?: string) {
  if (!doc) return '-';
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
}

function formatDate(dateStr: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatAddress(client: Record<string, unknown>) {
  const parts = [
    client.address_street && `${client.address_street}`,
    client.address_number && `n ${client.address_number}`,
    client.address_complement,
    client.address_neighborhood,
    client.address_city && client.address_state
      ? `${client.address_city} - ${client.address_state}`
      : client.address_city || client.address_state,
    client.address_zip && `CEP: ${client.address_zip}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: client, isLoading } = useClient(id);
  const { data: contacts } = useClientContacts(id);
  const addContact = useAddClientContact();

  const [activeTab, setActiveTab] = useState('details');
  const [contactModal, setContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    contact_type: '',
    subject: '',
    notes: '',
  });

  function handleAddContact(ev: React.FormEvent) {
    ev.preventDefault();
    if (!contactForm.contact_type) return;

    addContact.mutate(
      {
        clientId: id,
        contact_type: contactForm.contact_type,
        subject: contactForm.subject || undefined,
        notes: contactForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setContactModal(false);
          setContactForm({ contact_type: '', subject: '', notes: '' });
        },
      },
    );
  }

  const tabs = [
    { id: 'details', label: 'Detalhes', icon: <FileText className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contatos', icon: <MessageSquare className="h-4 w-4" />, count: contacts?.length },
    { id: 'processes', label: 'Processos', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <FolderOpen className="h-4 w-4" /> },
  ];

  if (isLoading || !client) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
          <div className="h-48 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
        </div>
      </div>
    );
  }

  const typeCfg = typeLabels[client.client_type] ?? { label: client.client_type, variant: 'info' as const };
  const address = formatAddress(client as unknown as Record<string, unknown>);

  const timelineItems = (contacts ?? []).map((c) => {
    const cfg = contactTypeIcons[c.contact_type] ?? { icon: Globe, color: 'muted' as const };
    return {
      id: c.id,
      title: c.subject || contactTypeLabels[c.contact_type] || c.contact_type,
      description: c.notes,
      date: formatDate(c.contact_date),
      icon: cfg.icon,
      iconColor: cfg.color,
      user: c.performed_by_user?.full_name,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={client.full_name}
        back="/clients"
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={client.status === 'active' ? 'success' : 'warning'}>
              <span className="flex items-center gap-1">
                {client.status === 'active' ? <UserCheck className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />}
                {client.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </Badge>
            <Link href={`/clients/${id}/edit`}>
              <Button variant="secondary" icon={Pencil} size="sm">
                Editar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Data */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] px-6 py-4">
            <User className="h-4 w-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Dados Pessoais</h3>
          </div>
          <div className="space-y-4 p-6">
            <InfoRow label="Tipo" value={<Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>} />
            <InfoRow
              label="Documento"
              value={
                <span className="font-mono text-sm">
                  {client.document_type?.toUpperCase()}: {formatDocument(client.document_number)}
                </span>
              }
            />
            <InfoRow
              label="Email"
              value={
                client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-1.5 text-primary-600 hover:underline dark:text-primary-400"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {client.email}
                  </a>
                ) : (
                  '-'
                )
              }
            />
            <InfoRow
              label="Telefone"
              value={
                client.phone ? (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[rgb(var(--muted-foreground))]" />
                    {client.phone}
                  </span>
                ) : (
                  '-'
                )
              }
            />
            {client.phone_secondary && (
              <InfoRow
                label="Tel. Secundario"
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[rgb(var(--muted-foreground))]" />
                    {client.phone_secondary}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] px-6 py-4">
            <MapPin className="h-4 w-4 text-accent-500" />
            <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Endereco</h3>
          </div>
          <div className="p-6">
            {address ? (
              <div className="space-y-4">
                <InfoRow label="Rua" value={client.address_street ?? '-'} />
                <InfoRow label="Numero" value={client.address_number ?? '-'} />
                {client.address_complement && (
                  <InfoRow label="Complemento" value={client.address_complement} />
                )}
                <InfoRow label="Bairro" value={client.address_neighborhood ?? '-'} />
                <InfoRow label="Cidade" value={client.address_city ?? '-'} />
                <InfoRow label="Estado" value={client.address_state ?? '-'} />
                <InfoRow label="CEP" value={client.address_zip ?? '-'} />
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
                Nenhum endereco cadastrado
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-6" />

        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <DetailCard title="Informacoes de Cadastro">
                  <InfoRow label="Criado em" value={formatDate(client.created_at)} />
                  <InfoRow label="Atualizado em" value={formatDate(client.updated_at)} />
                  <InfoRow label="Status" value={
                    <Badge variant={client.status === 'active' ? 'success' : 'warning'}>
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  } />
                </DetailCard>
                <DetailCard title="Contato">
                  <InfoRow label="Email" value={client.email ?? '-'} />
                  <InfoRow label="Telefone" value={client.phone ?? '-'} />
                  <InfoRow label="Tel. Secundario" value={client.phone_secondary ?? '-'} />
                </DetailCard>
              </div>
              {client.notes && (
                <DetailCard title="Observacoes">
                  <p className="whitespace-pre-wrap text-sm text-[rgb(var(--card-foreground))]">
                    {client.notes}
                  </p>
                </DetailCard>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[rgb(var(--muted-foreground))]">
                  Historico de contatos com o cliente
                </p>
                <Button
                  icon={Plus}
                  size="sm"
                  className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
                  onClick={() => setContactModal(true)}
                >
                  Novo Contato
                </Button>
              </div>

              {timelineItems.length > 0 ? (
                <Timeline items={timelineItems} />
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="Nenhum contato registrado"
                  description="Registre o primeiro contato com este cliente"
                  action={
                    <Button
                      icon={Plus}
                      size="sm"
                      className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
                      onClick={() => setContactModal(true)}
                    >
                      Novo Contato
                    </Button>
                  }
                />
              )}
            </div>
          )}

          {/* Processes Tab */}
          {activeTab === 'processes' && (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum processo vinculado"
              description="Processos vinculados a este cliente aparecerão aqui"
            />
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <EmptyState
              icon={FolderOpen}
              title="Nenhum documento vinculado"
              description="Documentos vinculados a este cliente aparecerão aqui"
            />
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal
        open={contactModal}
        onClose={() => setContactModal(false)}
        title="Novo Contato"
        description="Registre uma interacao com o cliente"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <SelectField
            label="Tipo de Contato"
            required
            value={contactForm.contact_type}
            onChange={(e) =>
              setContactForm((prev) => ({ ...prev, contact_type: e.target.value }))
            }
            options={CONTACT_TYPE_OPTIONS}
            placeholder="Selecione o tipo"
          />
          <InputField
            label="Assunto"
            value={contactForm.subject}
            onChange={(e) =>
              setContactForm((prev) => ({ ...prev, subject: e.target.value }))
            }
            placeholder="Assunto do contato"
          />
          <TextareaField
            label="Observacoes"
            value={contactForm.notes}
            onChange={(e) =>
              setContactForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Detalhes da interacao..."
            rows={4}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setContactModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={addContact.isPending}
              className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
            >
              Registrar Contato
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ─── Helper Components ───────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-[rgb(var(--muted-foreground))]">{label}</span>
      <span className="text-right text-sm font-medium text-[rgb(var(--card-foreground))]">
        {value}
      </span>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-5">
      <h4 className="mb-4 text-sm font-semibold text-[rgb(var(--foreground))]">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
