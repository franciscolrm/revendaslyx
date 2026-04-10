import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => api.get(`/users/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post('/users', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/users/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      id,
      new_password,
    }: {
      id: string;
      new_password: string;
    }) => api.patch(`/users/${id}/password`, { new_password }).then((r) => r.data),
  });
}

export function useOrgStructure() {
  return useQuery({
    queryKey: ['org-structure'],
    queryFn: async () => {
      const [companies, regions, branches, teams, roles] = await Promise.all([
        api.get('/org/companies').then((r) => r.data),
        api.get('/org/regions').then((r) => r.data),
        api.get('/org/branches').then((r) => r.data),
        api.get('/org/teams').then((r) => r.data),
        api.get('/org/roles').then((r) => r.data),
      ]);
      return { companies, regions, branches, teams, roles };
    },
  });
}
