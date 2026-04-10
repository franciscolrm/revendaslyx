'use client';

import { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  File,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSelect } from '@/components/ui/filter-bar';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Modal } from '@/components/ui/modal';
import {
  useDocuments,
  useDocumentCategories,
  useUploadDocument,
  type Document,
} from '@/hooks/use-documents';

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'default'; icon: any }> = {
  pending: { label: 'Pendente', variant: 'warning', icon: Clock },
  received: { label: 'Recebido', variant: 'info', icon: FileText },
  validated: { label: 'Validado', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rejeitado', variant: 'danger', icon: XCircle },
  expired: { label: 'Expirado', variant: 'default', icon: AlertCircle },
};

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: docData, isLoading } = useDocuments({
    page,
    per_page: 20,
    status: filterStatus || undefined,
    category_id: filterCategory || undefined,
  });

  const { data: categories } = useDocumentCategories();
  const uploadDoc = useUploadDocument();

  const documents = docData?.data ?? [];
  const meta = docData?.meta;

  // Local search filter
  const filtered = search.trim()
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.process?.process_code?.toLowerCase().includes(search.toLowerCase()) ||
          d.client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          d.category?.name?.toLowerCase().includes(search.toLowerCase()),
      )
    : documents;

  const categoryOptions = (Array.isArray(categories) ? categories : []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const statusOptions = Object.entries(STATUS_MAP).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  }));

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    await uploadDoc.mutateAsync({ file: selectedFile });
    setUploadModalOpen(false);
    setSelectedFile(null);
  }, [selectedFile, uploadDoc]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: Column<Document>[] = [
    {
      key: 'title',
      header: 'Título',
      render: (row) => (
        <div className="flex items-center gap-2.5 max-w-[250px]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--muted))]">
            <File className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[rgb(var(--foreground))] truncate">{row.title}</p>
            {row.file_name && (
              <p className="text-[10px] text-[rgb(var(--muted-foreground))] truncate">{row.file_name}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (row) => (
        <span className="text-xs text-[rgb(var(--muted-foreground))]">
          {row.category?.name ?? '-'}
        </span>
      ),
    },
    {
      key: 'process',
      header: 'Processo',
      render: (row) => (
        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
          {row.process?.process_code ?? '-'}
        </span>
      ),
    },
    {
      key: 'client',
      header: 'Cliente',
      render: (row) => (
        <span className="text-xs text-[rgb(var(--foreground))]">
          {row.client?.full_name ?? '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const cfg = STATUS_MAP[row.status] ?? { label: row.status, variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'version',
      header: 'Versão',
      render: (row) => (
        <span className="text-xs text-[rgb(var(--muted-foreground))]">v{row.version}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (row) => (
        <span className="text-xs text-[rgb(var(--muted-foreground))]">
          {new Date(row.created_at).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Central de documentos do sistema"
        actions={
          <Button icon={Upload} onClick={() => setUploadModalOpen(true)}>
            Upload
          </Button>
        }
      />

      {/* Filters */}
      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar documento, processo, cliente..."
      >
        <FilterSelect
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); setPage(1); }}
          options={statusOptions}
          placeholder="Status"
        />
        <FilterSelect
          value={filterCategory}
          onChange={(v) => { setFilterCategory(v); setPage(1); }}
          options={categoryOptions}
          placeholder="Categoria"
        />
      </FilterBar>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered as any}
        loading={isLoading}
        emptyMessage="Nenhum documento encontrado"
        onRowClick={(row) => setDetailModal(row as unknown as Document)}
        rowKey={(row) => (row as any).id}
        pagination={meta ? {
          page: meta.page,
          perPage: meta.per_page,
          total: meta.total,
          totalPages: meta.total_pages,
          onPageChange: setPage,
        } : undefined}
      />

      {/* Upload Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); setSelectedFile(null); }}
        title="Upload de Documento"
        description="Selecione um arquivo para enviar"
      >
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 p-8 transition-colors hover:border-primary-400 hover:bg-[rgb(var(--muted))]/50"
          >
            <Upload className="h-8 w-8 text-[rgb(var(--muted-foreground))]" />
            <p className="mt-3 text-sm font-medium text-[rgb(var(--foreground))]">
              {selectedFile ? selectedFile.name : 'Clique para selecionar um arquivo'}
            </p>
            {selectedFile && (
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                {formatFileSize(selectedFile.size)}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setUploadModalOpen(false); setSelectedFile(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} loading={uploadDoc.isPending} disabled={!selectedFile}>
              Enviar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={detailModal?.title ?? 'Documento'}
        size="lg"
      >
        {detailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Categoria</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">{detailModal.category?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Status</p>
                <div className="mt-1">
                  {(() => {
                    const cfg = STATUS_MAP[detailModal.status] ?? { label: detailModal.status, variant: 'default' as const };
                    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
                  })()}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Processo</p>
                <p className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">
                  {detailModal.process?.process_code ?? '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Cliente</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">{detailModal.client?.full_name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Arquivo</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">{detailModal.file_name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Tamanho</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">{formatFileSize(detailModal.file_size)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Versão</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">v{detailModal.version}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Data</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">
                  {new Date(detailModal.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {detailModal.notes && (
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Observações</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">{detailModal.notes}</p>
              </div>
            )}

            {detailModal.rejection_reason && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/5">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Motivo da rejeição</p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{detailModal.rejection_reason}</p>
              </div>
            )}

            {detailModal.validated_at && (
              <div>
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))]">Validado em</p>
                <p className="mt-1 text-sm text-[rgb(var(--foreground))]">
                  {new Date(detailModal.validated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
