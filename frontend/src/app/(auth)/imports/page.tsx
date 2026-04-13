'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileUp, Package, Trash2, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';
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
  detailed: 'Detalhado (CRM)',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  done: 'Concluído',
  error: 'Erro',
};

function formatDuration(ms: number | null | undefined) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportsPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Polling do batch em processamento
  const { data: batchStatus } = useQuery({
    queryKey: ['imports', 'batch-status', activeBatchId],
    queryFn: () => api.get(`/imports/batches/${activeBatchId}/status`).then(r => r.data),
    enabled: !!activeBatchId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'error') return false;
      return 2000;
    },
  });

  // Quando polling detecta conclusão
  useEffect(() => {
    if (batchStatus?.status === 'done' || batchStatus?.status === 'error') {
      qc.invalidateQueries({ queryKey: ['imports', 'batches'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['units'] });
      qc.invalidateQueries({ queryKey: ['processes'] });
    }
  }, [batchStatus?.status, qc]);

  const { data: batches, isLoading } = useQuery({
    queryKey: ['imports', 'batches'],
    queryFn: () => api.get('/imports/batches').then((r) => r.data),
    refetchInterval: activeBatchId ? 3000 : false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('file', f);
      return api.post('/imports/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      setFile(null);
      setUploadError('');
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) input.value = '';

      if (data.status === 'processing' && data.import_batch_id) {
        setActiveBatchId(data.import_batch_id);
        qc.invalidateQueries({ queryKey: ['imports', 'batches'] });
      } else {
        qc.invalidateQueries({ queryKey: ['imports'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
      }
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

  const isProcessing = !!activeBatchId && batchStatus?.status === 'processing';
  const isDone = batchStatus?.status === 'done';
  const isError = batchStatus?.status === 'error';

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
                  Formatos aceitos: XLSX, CSV ou JSON — processamento automático
                </p>
              </div>
              <input
                type="file"
                accept=".csv,.json,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setUploadError('');
                  setActiveBatchId(null);
                }}
              />
            </label>
            <Button
              onClick={() => file && uploadMutation.mutate(file)}
              disabled={!file || isProcessing}
              loading={uploadMutation.isPending}
              icon={Upload}
            >
              Enviar
            </Button>
          </div>

          {uploadError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Processing status */}
          {isProcessing && batchStatus && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-500/10 dark:text-blue-400">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Processando importação...</span>
              </div>
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-blue-200 dark:bg-blue-900">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${batchStatus.total_rows > 0 ? Math.min(100, (batchStatus.valid_rows / batchStatus.total_rows) * 100) : 10}%` }}
                  />
                </div>
                <div className="mt-1 text-xs">
                  {batchStatus.valid_rows ?? 0} / {batchStatus.total_rows ?? '...'} registros
                  {batchStatus.duplicate_count > 0 && <> | {batchStatus.duplicate_count} duplicados</>}
                </div>
              </div>
            </div>
          )}

          {/* Done status */}
          {isDone && batchStatus && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Importação concluída!</span>
                <span className="text-xs ml-auto">{formatDuration(batchStatus.processing_time_ms)}</span>
              </div>
              <div className="mt-1 text-xs space-y-0.5">
                <div>{batchStatus.total_rows} registros processados | {batchStatus.valid_rows} válidos</div>
                {batchStatus.duplicate_count > 0 && <div>{batchStatus.duplicate_count} duplicados (atualizados)</div>}
                {batchStatus.invalid_rows > 0 && <div className="text-amber-600 dark:text-amber-400">{batchStatus.invalid_rows} com erro</div>}
                {batchStatus.error_summary?.clients_created > 0 && <div>{batchStatus.error_summary.clients_created} clientes</div>}
                {batchStatus.error_summary?.units_created > 0 && <div>{batchStatus.error_summary.units_created} unidades</div>}
                {batchStatus.error_summary?.processes_created > 0 && <div>{batchStatus.error_summary.processes_created} processos</div>}
                {batchStatus.error_summary?.financial_created > 0 && <div>{batchStatus.error_summary.financial_created} entradas financeiras</div>}
              </div>
            </div>
          )}

          {/* Error status */}
          {isError && batchStatus && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Importação com erro</span>
              </div>
              {batchStatus.error_summary?.messages?.map((msg: string, i: number) => (
                <div key={i} className="mt-1 text-xs">{msg}</div>
              ))}
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
                    <th className="px-4 py-3 font-medium">Arquivo</th>
                    <th className="px-4 py-3 font-medium">Fonte</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Válidos</th>
                    <th className="px-4 py-3 font-medium text-right">Erros</th>
                    <th className="px-4 py-3 font-medium text-right">Dupl.</th>
                    <th className="px-4 py-3 font-medium">Tempo</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {batches.map((b: any) => (
                    <tr key={b.id} className="transition-colors hover:bg-[rgb(var(--muted))]/50">
                      <td className="px-4 py-3 font-medium text-[rgb(var(--foreground))] max-w-[200px] truncate">{b.file?.file_name ?? '-'}</td>
                      <td className="px-4 py-3 text-[rgb(var(--muted-foreground))]">{b.source_name ?? '-'}</td>
                      <td className="px-4 py-3 text-[rgb(var(--muted-foreground))]">{typeLabels[b.import_type] ?? b.import_type ?? '-'}</td>
                      <td className="px-4 py-3">
                        {b.status === 'processing' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {statusLabels[b.status]}
                          </span>
                        ) : (
                          <StatusBadge status={b.status} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{b.total_rows ?? 0}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{b.valid_rows ?? 0}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{b.invalid_rows ?? 0}</td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{b.duplicate_count ?? 0}</td>
                      <td className="px-4 py-3 text-[rgb(var(--muted-foreground))]">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(b.processing_time_ms)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[rgb(var(--muted-foreground))] text-xs">{new Date(b.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => confirm('Excluir este lote e todos os dados associados?') && deleteMutation.mutate(b.id)}
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
