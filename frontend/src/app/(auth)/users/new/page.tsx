'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateUser } from '@/hooks/use-users';
import { useRoles } from '@/hooks/use-org';
import { FormField, Input, Select } from '@/components/form-field';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { User, Shield } from 'lucide-react';

export default function NewUserPage() {
  const router = useRouter();
  const createUser = useCreateUser();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role_name: '',
  });
  const [error, setError] = useState('');

  const { data: roles } = useRoles();

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
          <Button type="submit" loading={createUser.isPending}>
            Criar Usuário
          </Button>
        </div>
      </form>
    </div>
  );
}
