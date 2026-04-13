import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';

export interface UnitSummary {
  total: number;
  by_status: Record<string, number>;
  in_stock: number;
  with_debts: number;
  total_value: number;
  by_source: Array<{ name: string; count: number }>;
}

export interface Unit {
  id: string;
  enterprise_id?: string;
  block_tower?: string;
  unit_number: string;
  floor?: string;
  unit_type?: string;
  area_m2?: number;
  original_value?: number;
  current_value?: number;
  status: string;
  stock_available: boolean;
  original_client_id?: string;
  current_client_id?: string;
  debts_cadin?: number;
  debts_iptu?: number;
  debts_condominio?: number;
  debts_other?: number;
  debts_description?: string;
  notes?: string;
  created_at: string;
  enterprise?: { name: string; code: string };
  original_client?: { full_name: string; phone?: string };
  current_client?: { full_name: string; phone?: string };
  import_batch?: { id: string; source_name: string; created_at: string } | null;
}

interface ListUnitsParams {
  page?: number;
  per_page?: number;
  search?: string;
  enterprise_id?: string;
  status?: string;
  stock_available?: boolean;
  import_batch_ids?: string;
}

export function useUnits(params: ListUnitsParams = {}) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: async () => {
      const { data } = await api.get('/units', { params });
      return data as { data: Unit[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
    placeholderData: keepPreviousData,
  });
}

export function useUnitSummary(importBatchIds?: string) {
  return useQuery({
    queryKey: ['units', 'summary', importBatchIds],
    queryFn: async () => {
      const { data } = await api.get('/units/summary', {
        params: importBatchIds ? { import_batch_ids: importBatchIds } : {},
      });
      return data as UnitSummary;
    },
    staleTime: 30_000,
  });
}

export function useUnit(id?: string) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: async () => {
      const { data } = await api.get(`/units/${id}`);
      return data as Unit;
    },
    enabled: !!id,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Unit>) => {
      const { data } = await api.post('/units', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<Unit> & { id: string }) => {
      const { data } = await api.patch(`/units/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/units/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  });
}
