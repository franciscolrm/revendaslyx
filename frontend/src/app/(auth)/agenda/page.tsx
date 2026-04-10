'use client';

import { useState, useCallback } from 'react';
import {
  MessageCircle,
  Phone,
  Users,
  Landmark,
  Building,
  PenLine,
  Car,
  MapPin,
  Plus,
  Calendar,
  Clock,
  MapPinIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { InputField, TextareaField, SelectField } from '@/components/ui/select-field';
import { useActivities, useCreateActivity, type Activity } from '@/hooks/use-activities';

// ── Activity type config ─────────────────────────────────

const ACTIVITY_TYPES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
  call: { label: 'Ligação', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  meeting: { label: 'Reunião', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  cartorio: { label: 'Cartório', icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  caixa_interview: { label: 'Entrevista Caixa', icon: Building, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  signing: { label: 'Assinatura', icon: PenLine, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  uber: { label: 'Uber', icon: Car, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  visit: { label: 'Visita', icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
};

const STATUS_MAP: Record<string, { label: string; variant: 'info' | 'success' | 'danger' | 'warning' | 'default' }> = {
  scheduled: { label: 'Agendado', variant: 'info' },
  completed: { label: 'Realizado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
  no_show: { label: 'Ausente', variant: 'warning' },
};

export default function AgendaPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('call');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const { data: activityData, isLoading } = useActivities({
    page,
    per_page: 20,
    activity_type: filterType || undefined,
    status: filterStatus || undefined,
  });

  const createActivity = useCreateActivity();

  const activities = activityData?.data ?? [];

  // Local search filter
  const filtered = search.trim()
    ? activities.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          a.process?.process_code?.toLowerCase().includes(search.toLowerCase()),
      )
    : activities;

  const typeOptions = Object.entries(ACTIVITY_TYPES).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const statusOptions = Object.entries(STATUS_MAP).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim()) return;
    const scheduled_at = formDate && formTime
      ? new Date(`${formDate}T${formTime}`).toISOString()
      : formDate
        ? new Date(formDate).toISOString()
        : undefined;

    await createActivity.mutateAsync({
      title: formTitle,
      activity_type: formType,
      description: formDescription || undefined,
      scheduled_at,
      location: formLocation || undefined,
      status: 'scheduled',
    });
    setModalOpen(false);
    setFormTitle('');
    setFormType('call');
    setFormDate('');
    setFormTime('');
    setFormLocation('');
    setFormDescription('');
  }, [formTitle, formType, formDate, formTime, formLocation, formDescription, createActivity]);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Atividades e compromissos agendados"
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Nova Atividade
          </Button>
        }
      />

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar atividade, cliente..."
      >
        <FilterSelect
          value={filterType}
          onChange={(v) => { setFilterType(v); setPage(1); }}
          options={typeOptions}
          placeholder="Tipo"
        />
        <FilterSelect
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); setPage(1); }}
          options={statusOptions}
          placeholder="Status"
        />
      </FilterBar>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Nenhuma atividade encontrada"
          description="Crie uma nova atividade ou ajuste os filtros."
          action={
            <Button icon={Plus} onClick={() => setModalOpen(true)} size="sm">
              Nova Atividade
            </Button>
          }
        />
      )}

      {/* Activity cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((activity) => {
            const typeCfg = ACTIVITY_TYPES[activity.activity_type] ?? {
              label: activity.activity_type,
              icon: Calendar,
              color: 'text-gray-600',
              bg: 'bg-gray-50 dark:bg-gray-500/10',
            };
            const Icon = typeCfg.icon;
            const dt = formatDateTime(activity.scheduled_at);
            const statusCfg = STATUS_MAP[activity.status] ?? { label: activity.status, variant: 'default' as const };

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Type icon */}
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', typeCfg.bg)}>
                  <Icon className={cn('h-5 w-5', typeCfg.color)} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[rgb(var(--foreground))] truncate">
                        {activity.title}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <Badge variant="default">{typeCfg.label}</Badge>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-[rgb(var(--muted-foreground))]">
                    {dt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {dt.date}, {dt.time}
                      </span>
                    )}
                    {activity.client?.full_name && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {activity.client.full_name}
                      </span>
                    )}
                    {activity.process?.process_code && (
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {activity.process.process_code}
                      </span>
                    )}
                    {activity.location && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {activity.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Activity Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova Atividade"
        description="Agende uma nova atividade"
      >
        <div className="space-y-4">
          <InputField
            label="Título"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Ex: Reunião com cliente"
          />
          <SelectField
            label="Tipo"
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            options={typeOptions}
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Data"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <InputField
              label="Horário"
              type="time"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
            />
          </div>
          <InputField
            label="Local"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            placeholder="Ex: Cartório Central"
          />
          <TextareaField
            label="Descrição"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Observações..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={createActivity.isPending}>
              Agendar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
