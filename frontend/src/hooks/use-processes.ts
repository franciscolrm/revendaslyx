import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface FlowType {
  id: string;
  name: string;
  code: string;
  description?: string;
  total_stages: number;
  stages?: FlowStage[];
}

export interface FlowStage {
  id: string;
  stage_order: number;
  name: string;
  description?: string;
  stage_group: string;
  sla_days: number;
  requires_documents: boolean;
  requires_tasks: boolean;
  checklist: string[];
  auto_tasks: { title: string; type: string }[];
}

export interface Process {
  id: string;
  process_code: string;
  flow_type_id: string;
  unit_id?: string;
  seller_client_id?: string;
  buyer_client_id?: string;
  current_stage_id?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  assigned_user_id?: string;
  region_id?: string;
  branch_id?: string;
  team_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  started_at: string;
  completed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  notes?: string;
  created_at: string;
  // Relations
  flow_type?: { name: string; code: string; total_stages: number };
  current_stage?: FlowStage;
  unit?: { unit_number: string; block_tower?: string; enterprise?: { name: string } };
  seller_client?: { full_name: string; phone?: string; document_number?: string };
  buyer_client?: { full_name: string; phone?: string; document_number?: string };
  assigned_user?: { full_name: string };
  region?: { name: string };
  branch?: { name: string };
  team?: { name: string };
  stage_history?: StageHistoryItem[];
  comments?: ProcessComment[];
}

export interface StageHistoryItem {
  id: string;
  from_stage?: { name: string; stage_order: number };
  to_stage: { name: string; stage_order: number };
  changed_by_user?: { full_name: string };
  changed_at: string;
  reason?: string;
  notes?: string;
}

export interface ProcessComment {
  id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  user?: { full_name: string };
}

interface ListProcessesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  flow_type_id?: string;
  stage_group?: string;
  branch_id?: string;
  team_id?: string;
  assigned_user_id?: string;
  priority?: string;
}

export function useProcesses(params: ListProcessesParams = {}) {
  return useQuery({
    queryKey: ['processes', params],
    queryFn: async () => {
      const { data } = await api.get('/processes', { params });
      return data as { data: Process[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
  });
}

export function useProcess(id?: string) {
  return useQuery({
    queryKey: ['processes', id],
    queryFn: async () => {
      const { data } = await api.get(`/processes/${id}`);
      return data as Process;
    },
    enabled: !!id,
  });
}

export function useCreateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      flow_type_id: string;
      unit_id?: string;
      seller_client_id?: string;
      buyer_client_id?: string;
      assigned_user_id?: string;
      region_id?: string;
      branch_id?: string;
      team_id?: string;
      priority?: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/processes', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processes'] }),
  });
}

export function useUpdateProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<Process> & { id: string }) => {
      const { data } = await api.patch(`/processes/${id}`, dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processes'] }),
  });
}

export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ processId, notes }: { processId: string; notes?: string }) => {
      const { data } = await api.post(`/processes/${processId}/advance`, { notes });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['processes'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useRevertStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ processId, reason }: { processId: string; reason: string }) => {
      const { data } = await api.post(`/processes/${processId}/revert`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['processes'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useAddProcessComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ processId, content, is_internal }: { processId: string; content: string; is_internal?: boolean }) => {
      const { data } = await api.post(`/processes/${processId}/comments`, { content, is_internal });
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['processes', vars.processId] }),
  });
}

export function useProcessTimeline(processId?: string) {
  return useQuery({
    queryKey: ['processes', processId, 'timeline'],
    queryFn: async () => {
      const { data } = await api.get(`/processes/${processId}/timeline`);
      return data as Array<{
        id: string;
        type: 'stage_change' | 'comment' | 'activity' | 'document' | 'task';
        title: string;
        description?: string;
        user?: string;
        date: string;
      }>;
    },
    enabled: !!processId,
  });
}

export function useFlowTypes() {
  return useQuery({
    queryKey: ['flow-types'],
    queryFn: async () => {
      const { data } = await api.get('/processes/flow-types');
      return data as FlowType[];
    },
  });
}

export function usePipelineData(flowTypeId?: string) {
  return useQuery({
    queryKey: ['pipeline', flowTypeId],
    queryFn: async () => {
      const { data } = await api.get('/processes', {
        params: { status: 'active', per_page: 100, flow_type_id: flowTypeId },
      });
      return data as { data: Process[]; meta: { total: number } };
    },
  });
}
