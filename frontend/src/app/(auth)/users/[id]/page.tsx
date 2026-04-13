'use client';

import { use } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useUser } from '@/hooks/use-users';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">
        {value || <span className="font-normal text-gray-400">-</span>}
      </dd>
    </div>
  );
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: user, isLoading } = useUser(id);

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

  const roleName =
    user.user_roles
      ?.map((ur: any) => ur.role?.name)
      .filter(Boolean)
      .join(', ') || '-';


  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={user.full_name}
        back="/users"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={user.status} />
            <Link href={`/users/${id}/edit`}>
              <Button variant="secondary" icon={Pencil}>
                Editar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Avatar & quick info */}
      <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <Avatar name={user.full_name} size="lg" />
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {user.full_name}
          </p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Dados Pessoais</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome Completo" value={user.full_name} />
            <Field label="E-mail" value={user.email} />
            <Field label="Telefone" value={user.phone} />
            <Field
              label="Criado em"
              value={
                user.created_at
                  ? new Date(user.created_at).toLocaleDateString('pt-BR')
                  : null
              }
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Perfil e Acesso</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Perfil (Role)" value={roleName} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
