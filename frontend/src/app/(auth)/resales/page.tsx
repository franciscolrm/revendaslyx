'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useResales } from '@/hooks/use-resales';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';

const statusColorMap: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'purple' | 'default'> = {
  '01_angariacao': 'info',
  '01_vendida': 'success',
  '02_liberada_pra_venda': 'purple',
  '02_cancelada': 'danger',
  '03_agendada_cartorio': 'warning',
  '03_analise_juridica': 'purple',
  '04_escritura_assinada': 'info',
  '05_registro_andamento': 'warning',
  '06_registrada': 'success',
  '07_concluida': 'success',
  '08_distrato': 'danger',
};

export default function ResalesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useResales({ page, search, per_page: 20 });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou documento..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <Link href="/resales/new">
          <Button icon={Plus}>Nova Revenda</Button>
        </Link>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : !data?.data?.length ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma revenda encontrada"
          description={search ? 'Tente ajustar sua busca' : 'Crie sua primeira revenda'}
          action={
            !search && (
              <Link href="/resales/new">
                <Button icon={Plus} size="sm">Nova Revenda</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-left text-gray-500">
                    <th className="px-6 py-3 font-medium">Código</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Filial</th>
                    <th className="px-6 py-3 font-medium">Equipe</th>
                    <th className="px-6 py-3 font-medium">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map((resale: any) => (
                    <tr
                      key={resale.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/resales/${resale.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {resale.external_code ?? '-'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {resale.customer_name}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            statusColorMap[resale.status?.code] ?? 'default'
                          }
                        >
                          {resale.status?.name ?? '-'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {resale.branch?.name ?? '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {resale.team?.name ?? '-'}
                      </td>
                      <td className="px-6 py-4">
                        {resale.assigned_user?.full_name ? (
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={resale.assigned_user.full_name}
                              size="sm"
                            />
                            <span className="text-gray-700">
                              {resale.assigned_user.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {data?.meta && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {data.meta.total} revenda(s) &middot; Página {data.meta.page}{' '}
                de {data.meta.total_pages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.total_pages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
