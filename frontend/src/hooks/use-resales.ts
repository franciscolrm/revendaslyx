import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface ListParams {
  page?: number;
  per_page?: number;
  status_code?: string;
  branch_id?: string;
  team_id?: string;
  assigned_user_id?: string;
  search?: string;
}

export function useResales(params: ListParams = {}) {
  return useQuery({
    queryKey: ['resales', params],
    queryFn: () => api.get('/resales', { params }).then((r) => r.data),
  });
}

export function useResale(id: string) {
  return useQuery({
    queryKey: ['resales', id],
    queryFn: () => api.get(`/resales/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateResale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post('/resales', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resales'] }),
  });
}

export function useUpdateResale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/resales/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resales'] }),
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      resaleId,
      status_code,
      notes,
    }: {
      resaleId: string;
      status_code: string;
      notes?: string;
    }) =>
      api
        .post(`/resales/${resaleId}/change-status`, { status_code, notes })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resales'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      resaleId,
      ...data
    }: {
      resaleId: string;
      interaction_type: string;
      result?: string;
      notes?: string;
    }) =>
      api
        .post(`/resales/${resaleId}/interactions`, data)
        .then((r) => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['resales', vars.resaleId] }),
  });
}
