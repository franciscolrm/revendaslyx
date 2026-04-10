'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateUser } from '@/hooks/use-users';
import {
  useCompanies,
  useRegions,
  useBranches,
  useTeams,
  useRoles,
} from '@/hooks/use-org';
import { FormField, Input, Select } from '@/components/form-field';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { User, Building2, Shield } from 'lucide-react';

const scopeOptions = [
  { value: 'own', label: 'Próprio (own)' },
  { value: 'team', label: 'Equipe (team)' },
  { value: 'branch', label: 'Filial (branch)' },
  { value: 'region', label: 'Região (region)' },
  { value: 'global', label: 'Global' },
];

export default function NewUserPage() {
  const router = useRouter();
  const createUser = useCreateUser();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    company_id: '',
    region_id: '',
    branch_id: '',
    team_id: '',
    role_name: '',
    scope_type: '',
  });
  const [error, setError] = useState('');

  const { data: companies } = useCompanies();
  const { data: regions } = useRegions(form.company_id || undefined);
  const { data: branches } = useBranches(form.region_id || undefined);
  const { data: teams } = useTeams(form.branch_id || undefined);
  const { data: roles } = useRoles();

  function set(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'company_id') {
        next.region_id = '';
        next.branch_id = '';
        next.team_id = '';
      }
      if (field === 'region_id') {
        next.branch_id = '';
        next.team_id = '';
      }
      if (field === 'branch_id') {
        next.team_id = '';
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== ''),
    );

    createUser.mutate(payload, {
      onSuccess: () => router.push('/users'),
      onError: (err: any) => {
        setError(err.response?.data?.message ?? 'Erro ao criar usuário');
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Novo Usuário"
        description="Preencha os dados para criar um novo usuário"
        back="/users"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Dados Pessoais</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nome Completo"
                required
                className="sm:col-span-2"
              >
                <Input
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="E-mail" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Senha" required>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mín. 8 caracteres"
                />
              </FormField>
              <FormField label="Telefone">
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Lotação</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Empresa">
                <Select
                  value={form.company_id}
                  onChange={(e) => set('company_id', e.target.value)}
                  placeholder="Selecione..."
                  options={
                    companies?.map((c: any) => ({
                      value: c.id,
                      label: c.name,
                    })) ?? []
                  }
                />
              </FormField>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Perfil e Acesso</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Perfil (Role)">
                <Select
                  value={form.role_name}
                  onChange={(e) => set('role_name', e.target.value)}
                  placeholder="Selecione..."
                  options={
                    roles?.map((r: any) => ({
                      value: r.name,
                      label: r.name,
                    })) ?? []
                  }
                />
              </FormField>
              <FormField label="Escopo de Acesso">
                <Select
                  value={form.scope_type}
                  onChange={(e) => set('scope_type', e.target.value)}
                  placeholder="Selecione..."
                  options={scopeOptions}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" loading={createUser.isPending}>
            Criar Usuário
          </Button>
        </div>
      </form>
    </div>
  );
}
