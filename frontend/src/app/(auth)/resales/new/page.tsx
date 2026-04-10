'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateResale } from '@/hooks/use-resales';
import {
  useRegions,
  useBranches,
  useTeams,
  useOrgUsers,
} from '@/hooks/use-org';
import { FormField, Input, Select, Textarea } from '@/components/form-field';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { User, Building2, FileText } from 'lucide-react';

export default function NewResalePage() {
  const router = useRouter();
  const createResale = useCreateResale();

  const [form, setForm] = useState({
    customer_name: '',
    external_code: '',
    phone: '',
    email: '',
    region_id: '',
    branch_id: '',
    team_id: '',
    assigned_user_id: '',
    source: '',
    notes: '',
  });

  const { data: regions } = useRegions();
  const { data: branches } = useBranches(form.region_id || undefined);
  const { data: teams } = useTeams(form.branch_id || undefined);
  const { data: users } = useOrgUsers(form.team_id || undefined);

  function set(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'region_id') {
        next.branch_id = '';
        next.team_id = '';
        next.assigned_user_id = '';
      }
      if (field === 'branch_id') {
        next.team_id = '';
        next.assigned_user_id = '';
      }
      if (field === 'team_id') {
        next.assigned_user_id = '';
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== ''),
    );
    createResale.mutate(payload, {
      onSuccess: () => router.push('/resales'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nova Revenda"
        description="Preencha os dados para criar uma nova revenda"
        back="/resales"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">
                Dados do Cliente
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nome do Cliente"
                required
                className="sm:col-span-2"
              >
                <Input
                  value={form.customer_name}
                  onChange={(e) => set('customer_name', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Código Externo">
                <Input
                  value={form.external_code}
                  onChange={(e) => set('external_code', e.target.value)}
                />
              </FormField>
              <FormField label="Telefone">
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </FormField>
              <FormField label="E-mail" className="sm:col-span-2">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Atribuição</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Região">
                <Select
                  value={form.region_id}
                  onChange={(e) => set('region_id', e.target.value)}
                  placeholder="Selecione..."
                  options={
                    regions?.map((r: any) => ({
                      value: r.id,
                      label: r.name,
                    })) ?? []
                  }
                />
              </FormField>
              <FormField label="Filial">
                <Select
                  value={form.branch_id}
                  onChange={(e) => set('branch_id', e.target.value)}
                  placeholder="Selecione..."
                  options={
                    branches?.map((b: any) => ({
                      value: b.id,
                      label: b.name,
                    })) ?? []
                  }
                />
              </FormField>
              <FormField label="Equipe">
                <Select
                  value={form.team_id}
                  onChange={(e) => set('team_id', e.target.value)}
                  placeholder="Selecione..."
                  options={
                    teams?.map((t: any) => ({
                      value: t.id,
                      label: t.name,
                    })) ?? []
                  }
                />
              </FormField>
              <FormField label="Responsável">
                <Select
                  value={form.assigned_user_id}
                  onChange={(e) => set('assigned_user_id', e.target.value)}
                  placeholder="Selecione..."
                  options={
                    users?.map((u: any) => ({
                      value: u.id,
                      label: u.full_name,
                    })) ?? []
                  }
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Outros</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Origem">
                <Input
                  value={form.source}
                  onChange={(e) => set('source', e.target.value)}
                  placeholder="Ex: indicação, portal, captação"
                />
              </FormField>
            </div>
            <FormField label="Observações" className="mt-4">
              <Textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={3}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={createResale.isPending}>
            Criar Revenda
          </Button>
        </div>
      </form>
    </div>
  );
}
