'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Layers,
  Home,
  Users,
  UserCog,
  ClipboardCheck,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFlowTypes, useCreateProcess, type FlowType } from '@/hooks/use-processes';
import { useUnits, type Unit } from '@/hooks/use-units';
import { useClients } from '@/hooks/use-clients';
import { useBranches, useTeams, useOrgUsers } from '@/hooks/use-org';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { InputField, SelectField, TextareaField } from '@/components/ui/select-field';
import { EmptyState } from '@/components/ui/empty-state';

const STEPS = [
  { id: 1, label: 'Tipo de Fluxo', icon: Layers },
  { id: 2, label: 'Unidade', icon: Home },
  { id: 3, label: 'Vendedor', icon: Users },
  { id: 4, label: 'Atribuicao', icon: UserCog },
  { id: 5, label: 'Revisao', icon: ClipboardCheck },
];

export default function NewProcessPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [flowTypeId, setFlowTypeId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [sellerClientId, setSellerClientId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');

  // Search states
  const [unitSearch, setUnitSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Queries
  const { data: flowTypes, isLoading: loadingFlows } = useFlowTypes();
  const { data: unitsData } = useUnits({ search: unitSearch || undefined, per_page: 10 });
  const { data: clientsData } = useClients({ search: clientSearch || undefined, client_type: 'seller', per_page: 10 });
  const { data: branches } = useBranches();
  const { data: teams } = useTeams(branchId || undefined);
  const { data: orgUsers } = useOrgUsers(teamId || undefined);

  const createProcess = useCreateProcess();

  const selectedFlow = (flowTypes ?? []).find((ft) => ft.id === flowTypeId);
  const selectedUnit = (unitsData?.data ?? []).find((u) => u.id === unitId);
  const selectedClient = (clientsData?.data ?? []).find((c) => c.id === sellerClientId);

  const canAdvance = () => {
    if (currentStep === 1) return !!flowTypeId;
    return true; // Steps 2-4 are optional, step 5 is review
  };

  const handleSubmit = async () => {
    try {
      const result = await createProcess.mutateAsync({
        flow_type_id: flowTypeId,
        unit_id: unitId || undefined,
        seller_client_id: sellerClientId || undefined,
        assigned_user_id: assignedUserId || undefined,
        branch_id: branchId || undefined,
        team_id: teamId || undefined,
        priority,
        notes: notes || undefined,
      });
      router.push(`/processes/${result.id}`);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Processo de Revenda"
        description="Crie um novo processo seguindo o assistente passo a passo"
        back="/processes"
      />

      {/* Step Indicator */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isActive
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : isDone
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))]',
                    )}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : isDone
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[rgb(var(--muted-foreground))]',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-3 h-0.5 w-12 sm:w-20 lg:w-32',
                      currentStep > step.id
                        ? 'bg-emerald-500'
                        : 'bg-[rgb(var(--border))]',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        {/* Step 1: Flow Type */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                Selecione o Tipo de Fluxo
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Escolha o fluxo que define as etapas do processo de revenda.
              </p>
            </div>

            {loadingFlows ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-36 animate-pulse rounded-xl bg-[rgb(var(--muted))]" />
                ))}
              </div>
            ) : (flowTypes ?? []).length === 0 ? (
              <EmptyState
                icon={Layers}
                title="Nenhum tipo de fluxo cadastrado"
                description="Cadastre tipos de fluxo antes de criar processos."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(flowTypes ?? []).map((ft) => (
                  <button
                    key={ft.id}
                    onClick={() => setFlowTypeId(ft.id)}
                    className={cn(
                      'flex flex-col items-start rounded-xl border-2 p-5 text-left transition-all hover:shadow-md',
                      flowTypeId === ft.id
                        ? 'border-primary-500 bg-primary-50 shadow-md dark:bg-primary-900/10'
                        : 'border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:border-[rgb(var(--muted-foreground))]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          flowTypeId === ft.id
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]',
                        )}
                      >
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[rgb(var(--foreground))]">{ft.name}</h3>
                        <span className="text-xs text-[rgb(var(--muted-foreground))]">
                          {ft.code}
                        </span>
                      </div>
                    </div>
                    {ft.description && (
                      <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
                        {ft.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[rgb(var(--muted))] px-2.5 py-0.5 text-xs font-medium text-[rgb(var(--muted-foreground))]">
                        {ft.total_stages} etapas
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Unit */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                Selecione a Unidade
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Busque e selecione a unidade imobiliaria vinculada a este processo. (Opcional)
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder="Buscar unidade por numero, bloco ou empreendimento..."
                className="h-10 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-10 pr-4 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {selectedUnit && (
              <div className="rounded-xl border-2 border-primary-500 bg-primary-50 p-4 dark:bg-primary-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--foreground))]">
                      Unidade selecionada
                    </p>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">
                      {[selectedUnit.enterprise?.name, selectedUnit.block_tower, `Unid. ${selectedUnit.unit_number}`].filter(Boolean).join(' - ')}
                    </p>
                  </div>
                  <button
                    onClick={() => setUnitId('')}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {(unitsData?.data ?? []).map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => setUnitId(unit.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                    unitId === unit.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                      : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]/50',
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                      {unit.enterprise?.name ?? 'Empreendimento'} - {unit.block_tower ?? ''} Unid. {unit.unit_number}
                    </p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      {unit.unit_type ?? ''} {unit.area_m2 ? `| ${unit.area_m2}m²` : ''} {unit.current_value ? `| R$ ${unit.current_value.toLocaleString('pt-BR')}` : ''}
                    </p>
                  </div>
                  {unitId === unit.id && <Check className="h-5 w-5 text-primary-500" />}
                </button>
              ))}
              {unitSearch && (unitsData?.data ?? []).length === 0 && (
                <p className="py-4 text-center text-sm text-[rgb(var(--muted-foreground))]">
                  Nenhuma unidade encontrada.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Seller Client */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                Selecione o Vendedor
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Busque e selecione o cliente vendedor deste processo. (Opcional)
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar cliente por nome ou documento..."
                className="h-10 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-10 pr-4 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {selectedClient && (
              <div className="rounded-xl border-2 border-primary-500 bg-primary-50 p-4 dark:bg-primary-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--foreground))]">
                      Vendedor selecionado
                    </p>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">
                      {selectedClient.full_name} {selectedClient.document_number ? `(${selectedClient.document_number})` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSellerClientId('')}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {(clientsData?.data ?? []).map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSellerClientId(client.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                    sellerClientId === client.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                      : 'border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]/50',
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                      {client.full_name}
                    </p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      {client.document_number ?? ''} {client.phone ? `| ${client.phone}` : ''} {client.email ? `| ${client.email}` : ''}
                    </p>
                  </div>
                  {sellerClientId === client.id && <Check className="h-5 w-5 text-primary-500" />}
                </button>
              ))}
              {clientSearch && (clientsData?.data ?? []).length === 0 && (
                <p className="py-4 text-center text-sm text-[rgb(var(--muted-foreground))]">
                  Nenhum cliente encontrado.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Assignment */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                Atribuicao e Prioridade
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Defina o responsavel, filial, equipe e prioridade do processo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Filial"
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setTeamId(''); setAssignedUserId(''); }}
                options={(branches ?? []).map((b: any) => ({ value: b.id, label: b.name }))}
                placeholder="Selecione a filial..."
              />
              <SelectField
                label="Equipe"
                value={teamId}
                onChange={(e) => { setTeamId(e.target.value); setAssignedUserId(''); }}
                options={(teams ?? []).map((t: any) => ({ value: t.id, label: t.name }))}
                placeholder="Selecione a equipe..."
              />
              <SelectField
                label="Responsavel"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                options={(orgUsers ?? []).map((u: any) => ({ value: u.id, label: u.full_name }))}
                placeholder="Selecione o responsavel..."
              />
              <SelectField
                label="Prioridade"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: 'low', label: 'Baixa' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'Alta' },
                  { value: 'urgent', label: 'Urgente' },
                ]}
              />
            </div>

            <TextareaField
              label="Observacoes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observacoes adicionais sobre o processo..."
            />
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">
                Revisao e Confirmacao
              </h2>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Revise as informacoes e confirme a criacao do processo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewCard
                label="Tipo de Fluxo"
                value={selectedFlow?.name ?? '-'}
                sublabel={selectedFlow ? `${selectedFlow.total_stages} etapas` : undefined}
              />
              <ReviewCard
                label="Unidade"
                value={
                  selectedUnit
                    ? `${selectedUnit.enterprise?.name ?? ''} - ${selectedUnit.block_tower ?? ''} Unid. ${selectedUnit.unit_number}`
                    : 'Nao selecionada'
                }
              />
              <ReviewCard
                label="Vendedor"
                value={selectedClient?.full_name ?? 'Nao selecionado'}
                sublabel={selectedClient?.document_number}
              />
              <ReviewCard
                label="Responsavel"
                value={(orgUsers ?? []).find((u: any) => u.id === assignedUserId)?.full_name ?? 'Nao definido'}
              />
              <ReviewCard
                label="Filial / Equipe"
                value={[
                  (branches ?? []).find((b: any) => b.id === branchId)?.name,
                  (teams ?? []).find((t: any) => t.id === teamId)?.name,
                ].filter(Boolean).join(' / ') || 'Nao definidos'}
              />
              <ReviewCard
                label="Prioridade"
                value={priorityLabels[priority] ?? 'Normal'}
              />
            </div>

            {notes && (
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 p-4">
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Observacoes</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">{notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          Voltar
        </Button>

        {currentStep < 5 ? (
          <Button
            icon={ArrowRight}
            onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
            disabled={!canAdvance()}
          >
            Proximo
          </Button>
        ) : (
          <Button
            icon={Check}
            onClick={handleSubmit}
            loading={createProcess.isPending}
            className="bg-accent-600 hover:bg-accent-700 text-white"
          >
            Criar Processo
          </Button>
        )}
      </div>
    </div>
  );
}

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

function ReviewCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[rgb(var(--foreground))]">{value}</p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-[rgb(var(--muted-foreground))]">{sublabel}</p>
      )}
    </div>
  );
}
