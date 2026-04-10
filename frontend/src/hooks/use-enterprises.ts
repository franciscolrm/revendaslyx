import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Enterprise {
  id: string;
  name: string;
  code?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  total_units: number;
  status: string;
  notes?: string;
  created_at: string;
}

export function useEnterprises(search?: string) {
  return useQuery({
    queryKey: ['enterprises', search],
    queryFn: async () => {
      const { data } = await api.get('/enterprises', { params: { search } });
      return data as Enterprise[];
    },
  });
}

export function useEnterprise(id?: string) {
  return useQuery({
    queryKey: ['enterprises', id],
    queryFn: async () => {
      const { data } = await api.get(`/enterprises/${id}`);
      return data as Enterprise;
    },
    enabled: !!id,
  });
}

export function useCreateEnterprise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Enterprise>) => {
      const { data } = await api.post('/enterprises', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprises'] }),
  });
}

export function useUpdateEnterprise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<Enterprise> & { id: string }) => {
      const { data } = await api.patch(`/enterprises/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprises'] }),
  });
}
