import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

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
  original_client?: { full_name: string };
  current_client?: { full_name: string };
}

interface ListUnitsParams {
  page?: number;
  per_page?: number;
  search?: string;
  enterprise_id?: string;
  status?: string;
  stock_available?: boolean;
}

export function useUnits(params: ListUnitsParams = {}) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: async () => {
      const { data } = await api.get('/units', { params });
      return data as { data: Unit[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
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
