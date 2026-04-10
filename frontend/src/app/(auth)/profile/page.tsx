'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUser, useUpdateUser, useChangePassword } from '@/hooks/use-users';
import { FormField, Input } from '@/components/form-field';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { data: user, isLoading } = useUser(authUser?.id ?? '');
  const updateUser = useUpdateUser();
  const changePassword = useChangePassword();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  if (user && !profileLoaded) {
    setFullName(user.full_name || '');
    setPhone(user.phone || '');
    setProfileLoaded(true);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');

    updateUser.mutate(
      { id: authUser!.id, full_name: fullName, phone },
      {
        onSuccess: () => setMsg('Dados atualizados com sucesso'),
        onError: (err: any) =>
          setMsg(err.response?.data?.message ?? 'Erro ao atualizar'),
      },
    );
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');

    if (newPassword !== confirmPassword) {
      setPasswordMsg('As senhas não coincidem');
      return;
    }

    changePassword.mutate(
      { id: authUser!.id, new_password: newPassword },
      {
        onSuccess: () => {
          setPasswordMsg('Senha alterada com sucesso');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (err: any) =>
          setPasswordMsg(
            err.response?.data?.message ?? 'Erro ao alterar senha',
          ),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const roleName =
    user?.user_roles
      ?.map((ur: any) => ur.role?.name)
      .filter(Boolean)
      .join(', ') || '-';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Meu Perfil" description="Gerencie seus dados pessoais" />

      {/* Avatar card */}
      <div className="flex items-center gap-4 rounded-xl bg-[rgb(var(--card))] p-6 shadow-sm ring-1 ring-[rgb(var(--border))]">
        <Avatar name={user?.full_name ?? 'U'} size="lg" />
        <div>
          <p className="text-lg font-semibold text-[rgb(var(--foreground))]">
            {user?.full_name}
          </p>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{user?.email}</p>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
            {roleName} &middot; {user?.company?.name ?? '-'}
          </p>
        </div>
      </div>

      {/* Dados pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
            <h2 className="font-semibold text-[rgb(var(--foreground))]">Dados Pessoais</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Nome Completo"
                required
                className="sm:col-span-2"
              >
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="E-mail">
                <Input
                  value={user?.email ?? ''}
                  disabled
                  className="bg-[rgb(var(--muted))]"
                />
              </FormField>
              <FormField label="Telefone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </FormField>
              <FormField label="Perfil">
                <Input value={roleName} disabled className="bg-[rgb(var(--muted))]" />
              </FormField>
              <FormField label="Empresa">
                <Input
                  value={user?.company?.name ?? '-'}
                  disabled
                  className="bg-[rgb(var(--muted))]"
                />
              </FormField>
            </div>

            {msg && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                  msg.includes('sucesso')
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400'
                }`}
              >
                {msg}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={updateUser.isPending}>
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
            <h2 className="font-semibold text-[rgb(var(--foreground))]">Alterar Senha</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nova Senha" required>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mín. 8 caracteres"
                />
              </FormField>
              <FormField label="Confirmar Senha" required>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </FormField>
            </div>

            {passwordMsg && (
              <div
                className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                  passwordMsg.includes('sucesso')
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400'
                }`}
              >
                {passwordMsg}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button
                variant="secondary"
                type="submit"
                loading={changePassword.isPending}
              >
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
