'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useUpdateUser, useChangePassword } from '@/hooks/use-users';
import { useRoles } from '@/hooks/use-org';
import { FormField, Input, Select } from '@/components/form-field';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Shield, Lock } from 'lucide-react';

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
    role_name: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data: roles } = useRoles();

  useEffect(() => {
    if (user && !loaded) {
      setForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        status: user.status || 'active',
        role_name:
          user.user_roles
            ?.map((ur: any) => ur.role?.name)
            .filter(Boolean)[0] || '',
      });
      setLoaded(true);
    }
  }, [user, loaded]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
