import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AuditLog {
  id: string;
  user_id?: string;
  entity_name: string;
  entity_id: string;
  action: 'insert' | 'update' | 'delete';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: string;
  user?: { full_name: string };
}

export interface ListAuditParams {
  page?: number;
  per_page?: number;
  entity_name?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export function useAuditLogs(params: ListAuditParams = {}) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: async () => {
      const { data } = await api.get('/audit', { params });
      return data as {
        data: AuditLog[];
        meta: {
          total: number;
          page: number;
          per_page: number;
          total_pages: number;
        };
      };
    },
  });
}
