import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ImportedFinancialItem {
  id: string;
  import_batch_id: string;
  item_name: string;
  item_value: number | null;
  item_type: string;
  notes: string | null;
  created_at: string;
}

export function useImportedFinancialItems(importBatchId?: string) {
  return useQuery({
    queryKey: ['imports', 'financial-items', importBatchId],
    queryFn: () =>
      api
        .get('/imports/financial-items', {
          params: importBatchId ? { import_batch_id: importBatchId } : {},
        })
        .then((r) => r.data as ImportedFinancialItem[]),
  });
}

export interface ImportBatch {
  id: string;
  import_type: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_at: string;
  file?: { file_name: string };
}

export function useImportBatches(importType?: string) {
  return useQuery({
    queryKey: ['imports', 'batches', importType],
    queryFn: () =>
      api
        .get('/imports/batches', {
          params: importType ? { import_type: importType } : {},
        })
        .then((r) => r.data as ImportBatch[]),
  });
}
