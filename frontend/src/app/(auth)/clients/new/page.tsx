'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { useCreateClient } from '@/hooks/use-clients';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { InputField, SelectField, TextareaField } from '@/components/ui/select-field';
import { cn } from '@/lib/cn';

const CLIENT_TYPE_OPTIONS = [
  { value: 'seller', label: 'Vendedor' },
  { value: 'buyer', label: 'Comprador' },
  { value: 'both', label: 'Ambos' },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
];

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapa' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceara' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espirito Santo' },
  { value: 'GO', label: 'Goias' },
  { value: 'MA', label: 'Maranhao' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Para' },
  { value: 'PB', label: 'Paraiba' },
  { value: 'PR', label: 'Parana' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piaui' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondonia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'Sao Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

interface FormData {
  client_type: string;
  full_name: string;
  document_type: string;
  document_number: string;
  email: string;
  phone: string;
  phone_secondary: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  notes: string;
}

const initialForm: FormData = {
  client_type: '',
  full_name: '',
  document_type: 'cpf',
  document_number: '',
  email: '',
  phone: '',
  phone_secondary: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  notes: '',
};

export default function NewClientPage() {
  const router = useRouter();
  const createClient = useCreateClient();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.client_type) e.client_type = 'Selecione o tipo de cliente';
    if (!form.full_name.trim()) e.full_name = 'Nome completo e obrigatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v) payload[k] = v;
    }

    createClient.mutate(payload, {
      onSuccess: () => router.push('/clients'),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Novo Cliente" back="/clients" />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dados Pessoais */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Dados Pessoais
            </h2>
            <p className="mt-0.5 text-sm text-[rgb(var(--muted-foreground))]">
              Informacoes basicas do cliente
            </p>
          </div>
          <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Tipo de Cliente"
              required
              value={form.client_type}
              onChange={(e) => update('client_type', e.target.value)}
              options={CLIENT_TYPE_OPTIONS}
              placeholder="Selecione o tipo"
              error={errors.client_type}
            />
            <InputField
              label="Nome Completo"
              required
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="Nome do cliente"
              error={errors.full_name}
              className="sm:col-span-2"
            />
            <SelectField
              label="Tipo de Documento"
              value={form.document_type}
              onChange={(e) => update('document_type', e.target.value)}
              options={DOCUMENT_TYPE_OPTIONS}
              placeholder="Selecione"
            />
            <InputField
              label="Numero do Documento"
              value={form.document_number}
              onChange={(e) => update('document_number', e.target.value)}
              placeholder={form.document_type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
            />
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="cliente@email.com"
            />
            <InputField
              label="Telefone Principal"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <InputField
              label="Telefone Secundario"
              value={form.phone_secondary}
              onChange={(e) => update('phone_secondary', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
        </section>

        {/* Endereco */}
        <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="border-b border-[rgb(var(--border))] px-6 py-4">
            <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">
              Endereco
            </h2>
            <p className="mt-0.5 text-sm text-[rgb(var(--muted-foreground))]">
              Endereco residencial ou comercial
            </p>
          </div>
          <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="CEP"
              value={form.address_zip}
              onChange={(e) => update('address_zip', e.target.value)}
              placeholder="00000-000"
            />
            <InputField
              label="Rua"
              value={form.address_street}
              onChange={(e) => update('address_street', e.target.value)}
              placeholder="Nome da rua"
              className="sm:col-span-2"
            />
            <InputField
              label="Numero"
              value={form.address_number}
              onChange={(e) => update('address_number', e.target.value)}
              placeholder="123"
            />
            <InputField
              label="Complemento"
              value={form.address_complement}
              onChange={(e) => update('address_complement', e.target.value)}
              placeholder="Apto, Bloco, etc."
            />
            <InputField
              label="Bairro"
              value={form.address_neighborhood}
              onChange={(e) => update('address_neighborhood', e.target.value)}
              placeholder="Bairro"
            />
            <InputField
              label="Cidade"
              value={form.address_city}
              onChange={(e) => update('address_city', e.target.value)}
              placeholder="Cidade"
            />
            <SelectField
              label="Estado"
              value={form.address_state}
              onChange={(e) => update('address_state', e.target.value)}
              options={BRAZILIAN_STATES}
              placeholder="Selecione o estado"
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
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Anotacoes sobre o cliente..."
              rows={4}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-4 shadow-sm">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/clients')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            icon={Save}
            loading={createClient.isPending}
            className="bg-accent-600 hover:bg-accent-700 focus-visible:ring-accent-500"
          >
            Salvar Cliente
          </Button>
        </div>
      </form>
    </div>
  );
}
