'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileUp, Package, Trash2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const typeLabels: Record<string, string> = {
  snapshot: 'Snapshot',
  financial: 'Financeiro',
  resales: 'Revendas',
};

export default function ImportsPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const { data: batches, isLoading } = useQuery({
    queryKey: ['imports', 'batches'],
    queryFn: () => api.get('/imports/batches').then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('file', f);
      return api.post('/imports/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setFile(null);
      setUploadError('');
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) input.value = '';
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      const msg = err.response?.data?.message ?? err.message ?? 'Erro ao importar';
      setUploadError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (batchId: string) =>
      api.delete(`/imports/batches/${batchId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['imports'] }),
  });

  const uploadData = uploadMutation.data as any;

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-[rgb(var(--muted-foreground))]" />
            <h2 className="font-semibold text-[rgb(var(--foreground))]">Upload de Arquivo</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[rgb(var(--border))] px-6 py-8 text-sm transition-colors hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-500/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--muted))]">
                <Upload className="h-5 w-5 text-[rgb(var(--muted-foreground))]" />
              </div>
              <div>
                <p className="font-medium text-[rgb(var(--foreground))]">
                  {file ? file.name : 'Clique para selecionar um arquivo'}
                </p>
                <p className="mt-0.5 text-xs text-[rgb(var(--muted-foreground))]">
                  Formatos aceitos: CSV ou JSON — processamento automático
                </p>
              </div>
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setUploadError('');
                }}
              />
            </label>
            <Button
              onClick={() => file && uploadMutation.mutate(file)}
              disabled={!file}
              loading={uploadMutation.isPending}
              icon={Upload}
            >
              Enviar
            </Button>
          </div>

          {uploadError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
              {uploadError}
            </div>
          )}

          {uploadData && !uploadError && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Importação concluída!</span>
              </div>
              <div className="mt-1 text-xs">
                {uploadData.staging_records} registros processados
                {uploadData.import_type && <> • Tipo: <strong>{typeLabels[uploadData.import_type] ?? uploadData.import_type}</strong></>}
                {uploadData.snapshots_created > 0 && <> • {uploadData.snapshots_created} snapshots criados</>}
                {uploadData.valid_rows > 0 && <> • {uploadData.valid_rows} válidos</>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[rgb(var(--muted-foreground))]" />
            <h2 className="font-semibold text-[rgb(var(--foreground))]">Lotes de Importação</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={3} cols={7} /></div>
          ) : !batches?.length ? (
            <div className="p-6">
              <EmptyState icon={Package} title="Nenhum lote importado" description="Faça o upload de um arquivo para começar" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 text-left text-[rgb(var(--muted-foreground))]">
                    <th className="px-6 py-3 font-medium">Arquivo</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Total</th>
                    <th className="px-6 py-3 font-medium text-right">Válidos</th>
                    <th className="px-6 py-3 font-medium text-right">Erros</th>
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-6 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {batches.map((b: any) => (
                    <tr key={b.id} className="transition-colors hover:bg-[rgb(var(--muted))]/50">
                      <td className="px-6 py-4 font-medium text-[rgb(var(--foreground))]">{b.file?.file_name ?? '-'}</td>
                      <td className="px-6 py-4 text-[rgb(var(--muted-foreground))]">{typeLabels[b.import_type] ?? b.import_type ?? '-'}</td>
                      <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                      <td className="px-6 py-4 text-right font-medium">{b.total_rows}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">{b.valid_rows}</td>
                      <td className="px-6 py-4 text-right text-red-600 dark:text-red-400">{b.invalid_rows}</td>
                      <td className="px-6 py-4 text-[rgb(var(--muted-foreground))]">{new Date(b.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => confirm('Excluir este lote?') && deleteMutation.mutate(b.id)}
                          loading={deleteMutation.isPending}
                          icon={Trash2}
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
