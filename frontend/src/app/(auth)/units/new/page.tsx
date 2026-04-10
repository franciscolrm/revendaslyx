'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Building2 } from 'lucide-react';

import { useCreateUnit } from '@/hooks/use-units';
import { useEnterprises } from '@/hooks/use-enterprises';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { InputField, SelectField, TextareaField } from '@/components/ui/select-field';
import { cn } from '@/lib/cn';

const UNIT_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'land', label: 'Terreno' },
  { value: 'other', label: 'Outro' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponivel' },
  { value: 'sold', label: 'Vendida' },
  { value: 'in_resale', label: 'Em Revenda' },
  { value: 'reserved', label: 'Reservada' },
  { value: 'transferred', label: 'Transferida' },
];

interface FormData {
  enterprise_id: string;
  block_tower: string;
  unit_number: string;
  floor: string;
  unit_type: string;
  area_m2: string;
  original_value: string;
  current_value: string;
  status: string;
  stock_available: boolean;
  original_client_id: string;
  current_client_id: string;
  debts_cadin: string;
  debts_iptu: string;
  debts_condominio: string;
  debts_other: string;
  debts_description: string;
  notes: string;
}

const initialForm: FormData = {
  enterprise_id: '',
  block_tower: '',
  unit_number: '',
  floor: '',
  unit_type: '',
  area_m2: '',
  original_value: '',
  current_value: '',
  status: 'available',
  stock_available: true,
  original_client_id: '',
  current_client_id: '',
  debts_cadin: '',
  debts_iptu: '',
  debts_condominio: '',
  debts_other: '',
  debts_description: '',
  notes: '',
};

export default function NewUnitPage() {
  const router = useRouter();
  const createUnit = useCreateUnit();
  const { data: enterprises } = useEnterprises();

  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const enterpriseOptions = (enterprises ?? []).map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const set = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.enterprise_id) errs.enterprise_id = 'Selecione o empreendimento';
    if (!form.unit_number.trim()) errs.unit_number = 'Informe o numero da unidade';
    if (!form.status) errs.status = 'Selecione o status';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dto: Record<string, unknown> = {
      enterprise_id: form.enterprise_id,
      unit_number: form.unit_number.trim(),
      status: form.status,
      stock_available: form.stock_available,
    };
    if (form.block_tower.trim()) dto.block_tower = form.block_tower.trim();
    if (form.floor.trim()) dto.floor = form.floor.trim();
    if (form.unit_type) dto.unit_type = form.unit_type;
    if (form.area_m2) dto.area_m2 = parseFloat(form.area_m2);
    if (form.original_value) dto.original_value = parseFloat(form.original_value);
    if (form.current_value) dto.current_value = parseFloat(form.current_value);
    if (form.original_client_id.trim()) dto.original_client_id = form.original_client_id.trim();
    if (form.current_client_id.trim()) dto.current_client_id = form.current_client_id.trim();
    if (form.debts_cadin) dto.debts_cadin = parseFloat(form.debts_cadin);
    if (form.debts_iptu) dto.debts_iptu = parseFloat(form.debts_iptu);
    if (form.debts_condominio) dto.debts_condominio = parseFloat(form.debts_condominio);
    if (form.debts_other) dto.debts_other = parseFloat(form.debts_other);
    if (form.debts_description.trim()) dto.debts_description = form.debts_description.trim();
    if (form.notes.trim()) dto.notes = form.notes.trim();

    try {
      await createUnit.mutateAsync(dto);
      router.push('/units');
    } catch {
      // handled by react-query
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Unidade"
        description="Cadastre uma nova unidade no sistema"
        back="/units"
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identificacao */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[rgb(var(--foreground))]">
              <Building2 className="h-5 w-5 text-[rgb(var(--muted-foreground))]" />
              Identificacao
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Empreendimento"
              required
              value={form.enterprise_id}
              onChange={(e) => set('enterprise_id', e.target.value)}
              options={enterpriseOptions}
              placeholder="Selecione..."
              error={errors.enterprise_id}
            />
            <InputField
              label="Bloco / Torre"
              value={form.block_tower}
              onChange={(e) => set('block_tower', e.target.value)}
              placeholder="Ex: Torre A, Bloco 1"
            />
            <InputField
              label="Numero da Unidade"
              required
              value={form.unit_number}
              onChange={(e) => set('unit_number', e.target.value)}
              placeholder="Ex: 101"
              error={errors.unit_number}
            />
            <InputField
              label="Andar"
              value={form.floor}
              onChange={(e) => set('floor', e.target.value)}
              placeholder="Ex: 1"
            />
            <SelectField
              label="Tipo"
              value={form.unit_type}
              onChange={(e) => set('unit_type', e.target.value)}
              options={UNIT_TYPE_OPTIONS}
              placeholder="Selecione..."
            />
          </div>
        </section>

        {/* Caracteristicas */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Caracteristicas
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-3">
            <InputField
              label="Area (m2)"
              type="number"
              step="0.01"
              min="0"
              value={form.area_m2}
              onChange={(e) => set('area_m2', e.target.value)}
              placeholder="0,00"
            />
            <InputField
              label="Valor Original (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.original_value}
              onChange={(e) => set('original_value', e.target.value)}
              placeholder="0,00"
            />
            <InputField
              label="Valor Atual (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.current_value}
              onChange={(e) => set('current_value', e.target.value)}
              placeholder="0,00"
            />
          </div>
        </section>

        {/* Status */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Status e Disponibilidade
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <SelectField
              label="Status"
              required
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              options={STATUS_OPTIONS}
              error={errors.status}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[rgb(var(--foreground))]">
                Disponivel em Estoque
              </label>
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={form.stock_available}
                  onChange={(e) => set('stock_available', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-[rgb(var(--foreground))]">
                  {form.stock_available ? 'Sim, disponivel em estoque' : 'Nao disponivel em estoque'}
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Vinculos */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Vinculos
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <InputField
              label="Cliente Original (ID)"
              value={form.original_client_id}
              onChange={(e) => set('original_client_id', e.target.value)}
              placeholder="ID do cliente original (opcional)"
            />
            <InputField
              label="Cliente Atual (ID)"
              value={form.current_client_id}
              onChange={(e) => set('current_client_id', e.target.value)}
              placeholder="ID do cliente atual (opcional)"
            />
          </div>
        </section>

        {/* Debitos */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Debitos
            </h2>
            <p className="mt-0.5 text-xs text-[rgb(var(--muted-foreground))]">
              Informe os debitos pendentes da unidade
            </p>
          </div>
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <InputField
                label="CADIN (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.debts_cadin}
                onChange={(e) => set('debts_cadin', e.target.value)}
                placeholder="0,00"
              />
              <InputField
                label="IPTU (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.debts_iptu}
                onChange={(e) => set('debts_iptu', e.target.value)}
                placeholder="0,00"
              />
              <InputField
                label="Condominio (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.debts_condominio}
                onChange={(e) => set('debts_condominio', e.target.value)}
                placeholder="0,00"
              />
              <InputField
                label="Outros (R$)"
                type="number"
                step="0.01"
                min="0"
                value={form.debts_other}
                onChange={(e) => set('debts_other', e.target.value)}
                placeholder="0,00"
              />
            </div>
            <TextareaField
              label="Descricao dos Debitos"
              value={form.debts_description}
              onChange={(e) => set('debts_description', e.target.value)}
              placeholder="Descreva os detalhes dos debitos..."
            />
          </div>
        </section>

        {/* Observacoes */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Observacoes
            </h2>
          </div>
          <div className="p-6">
            <TextareaField
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Observacoes gerais sobre a unidade..."
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-[rgb(var(--border))] pt-6">
          <Link href="/units">
            <Button variant="secondary" type="button">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            icon={Save}
            loading={createUnit.isPending}
          >
            Salvar Unidade
          </Button>
        </div>
      </form>
    </div>
  );
}
