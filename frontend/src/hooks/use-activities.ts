import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Activity {
  id: string;
  process_id?: string;
  client_id?: string;
  activity_type: string;
  title: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  assigned_to?: string;
  location?: string;
  result?: string;
  notes?: string;
  created_at: string;
  process?: { process_code: string };
  client?: { full_name: string };
  assigned_user?: { full_name: string };
}

interface ListActivitiesParams {
  page?: number;
  per_page?: number;
  process_id?: string;
  client_id?: string;
  assigned_to?: string;
  activity_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export function useActivities(params: ListActivitiesParams = {}) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: async () => {
      const { data } = await api.get('/activities', { params });
      return data as { data: Activity[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
  });
}

export function useMyActivities() {
  return useQuery({
    queryKey: ['activities', 'my'],
    queryFn: async () => {
      const { data } = await api.get('/activities/my');
      return data as { data: Activity[] };
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Activity>) => {
      const { data } = await api.post('/activities', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<Activity> & { id: string }) => {
      const { data } = await api.patch(`/activities/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}
