'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useUpdateUser, useChangePassword } from '@/hooks/use-users';
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
import { Skeleton } from '@/components/ui/skeleton';
import { User, Building2, Shield, Lock } from 'lucide-react';

const scopeOptions = [
  { value: 'own', label: 'Próprio (own)' },
  { value: 'team', label: 'Equipe (team)' },
  { value: 'branch', label: 'Filial (branch)' },
  { value: 'region', label: 'Região (region)' },
  { value: 'global', label: 'Global' },
];

const statusOptions = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'blocked', label: 'Bloqueado' },
];

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user, isLoading } = useUser(id);
  const updateUser = useUpdateUser();
  const changePassword = useChangePassword();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    status: '',
    company_id: '',
    region_id: '',
    branch_id: '',
    team_id: '',
    role_name: '',
    scope_type: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data: companies } = useCompanies();
  const { data: regions } = useRegions(form.company_id || undefined);
  const { data: branches } = useBranches(form.region_id || undefined);
  const { data: teams } = useTeams(form.branch_id || undefined);
  const { data: roles } = useRoles();

  useEffect(() => {
    if (user && !loaded) {
      setForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        status: user.status || 'active',
        company_id: user.company?.id || '',
        region_id: user.region?.id || '',
        branch_id: user.branch?.id || '',
        team_id: user.team?.id || '',
        role_name:
          user.user_roles
            ?.map((ur: any) => ur.role?.name)
            .filter(Boolean)[0] || '',
        scope_type:
          user.access_scopes?.map((s: any) => s.scope_type)[0] || '',
      });
      setLoaded(true);
    }
  }, [user, loaded]);

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

    const payload: Record<string, unknown> = { id };
    for (const [key, val] of Object.entries(form)) {
      if (val !== '') payload[key] = val;
    }

    updateUser.mutate(payload as any, {
      onSuccess: () => router.push(`/users/${id}`),
      onError: (err: any) => {
        setError(err.response?.data?.message ?? 'Erro ao atualizar usuário');
      },
    });
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');

    changePassword.mutate(
      { id, new_password: newPassword },
      {
        onSuccess: () => {
          setPasswordMsg('Senha alterada com sucesso');
          setNewPassword('');
        },
        onError: (err: any) => {
          setPasswordMsg(
            err.response?.data?.message ?? 'Erro ao alterar senha',
          );
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-red-300 bg-red-50">
        <p className="text-sm text-red-600">Usuário não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Editar Usuário"
        description={user.full_name}
        back={`/users/${id}`}
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
              <FormField label="E-mail">
                <Input value={user.email} disabled className="bg-gray-50" />
              </FormField>
              <FormField label="Telefone">
                <Input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </FormField>
              <FormField label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  options={statusOptions}
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
          <Button type="submit" loading={updateUser.isPending}>
            Salvar Alterações
          </Button>
        </div>
      </form>

      {/* Troca de senha */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Alterar Senha</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword}>
            <div className="flex items-end gap-3">
              <FormField label="Nova Senha" required className="flex-1">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mín. 8 caracteres"
                />
              </FormField>
              <Button
                variant="secondary"
                type="submit"
                loading={changePassword.isPending}
              >
                Alterar Senha
              </Button>
            </div>
            {passwordMsg && (
              <p
                className={`mt-3 text-sm ${
                  passwordMsg.includes('sucesso')
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {passwordMsg}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
