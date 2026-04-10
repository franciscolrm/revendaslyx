import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Client {
  id: string;
  client_type: 'seller' | 'buyer' | 'both';
  full_name: string;
  document_number?: string;
  document_type?: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  contacts?: ClientContact[];
}

interface ClientContact {
  id: string;
  contact_type: string;
  contact_date: string;
  subject?: string;
  notes?: string;
  performed_by_user?: { full_name: string };
}

interface ListClientsParams {
  page?: number;
  per_page?: number;
  search?: string;
  client_type?: string;
  status?: string;
}

export function useClients(params: ListClientsParams = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const { data } = await api.get('/clients', { params });
      return data as { data: Client[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
  });
}

export function useClient(id?: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${id}`);
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Client>) => {
      const { data } = await api.post('/clients', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<Client> & { id: string }) => {
      const { data } = await api.patch(`/clients/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/clients/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useAddClientContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, ...dto }: { clientId: string; contact_type: string; subject?: string; notes?: string }) => {
      const { data } = await api.post(`/clients/${clientId}/contacts`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useClientContacts(clientId?: string) {
  return useQuery({
    queryKey: ['clients', clientId, 'contacts'],
    queryFn: async () => {
      const { data } = await api.get(`/clients/${clientId}/contacts`);
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });
}
