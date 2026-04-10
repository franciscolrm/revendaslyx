import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Task {
  id: string;
  process_id?: string;
  stage_id?: string;
  title: string;
  description?: string;
  task_type: 'manual' | 'automatic' | 'checklist';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  completed_by?: string;
  created_by?: string;
  created_at: string;
  process?: { process_code: string };
  assigned_user?: { full_name: string };
  created_by_user?: { full_name: string };
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  content: string;
  created_at: string;
  user?: { full_name: string };
}

interface ListTasksParams {
  page?: number;
  per_page?: number;
  process_id?: string;
  assigned_to?: string;
  status?: string;
  priority?: string;
  overdue?: boolean;
}

export function useTasks(params: ListTasksParams = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const { data } = await api.get('/tasks', { params });
      return data as { data: Task[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
  });
}

export function useMyTasks(params: Omit<ListTasksParams, 'assigned_to'> = {}) {
  return useQuery({
    queryKey: ['tasks', 'my', params],
    queryFn: async () => {
      const { data } = await api.get('/tasks/my', { params });
      return data as { data: Task[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
  });
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data as Task;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Task>) => {
      const { data } = await api.post('/tasks', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<Task> & { id: string }) => {
      const { data } = await api.patch(`/tasks/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/tasks/${id}/complete`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { content });
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['tasks', vars.taskId] }),
  });
}
