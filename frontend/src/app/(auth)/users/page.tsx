'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Eye, Users } from 'lucide-react';
import { useUsers, useDeleteUser } from '@/hooks/use-users';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function UsersPage() {
  const router = useRouter();
  const { data: users, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) return;
    setDeletingId(id);
    deleteUser.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Link href="/users/new">
          <Button icon={Plus}>Novo Usuário</Button>
        </Link>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : !users?.length ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário cadastrado"
          description="Crie o primeiro usuário do sistema"
          action={
            <Link href="/users/new">
              <Button icon={Plus} size="sm">Novo Usuário</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Empresa</th>
                  <th className="px-6 py-3 font-medium">Filial</th>
                  <th className="px-6 py-3 font-medium">Equipe</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u: any) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/users/${u.id}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <Avatar name={u.full_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {u.full_name}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {u.email}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {u.company?.name ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {u.branch?.name ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {u.team?.name ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="purple">
                        {u.user_roles
                          ?.map((ur: any) => ur.role?.name)
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/users/${u.id}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/users/${u.id}/edit`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.full_name)}
                          disabled={deletingId === u.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
