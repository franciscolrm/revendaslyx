import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface FinancialEntry {
  id: string;
  process_id: string;
  component_id?: string;
  entry_type: 'receivable' | 'payable' | 'received' | 'paid' | 'transfer';
  description?: string;
  amount: number;
  due_date?: string;
  paid_date?: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  installment_number?: number;
  total_installments?: number;
  receipt_path?: string;
  notes?: string;
  created_at: string;
  component?: { name: string; code: string; component_type: string };
}

export function useProcessFinancialEntries(processId?: string) {
  return useQuery({
    queryKey: ['process-financial', processId],
    queryFn: async () => {
      const { data } = await api.get(`/financial/process/${processId}/entries`);
      return data as FinancialEntry[];
    },
    enabled: !!processId,
  });
}

export function useCreateFinancialEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<FinancialEntry>) => {
      const { data } = await api.post('/financial/entries', dto);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['process-financial'] });
    },
  });
}

export function useUpdateFinancialEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<FinancialEntry> & { id: string }) => {
      const { data } = await api.patch(`/financial/entries/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-financial'] }),
  });
}

export function useDeleteFinancialEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/financial/entries/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process-financial'] }),
  });
}
