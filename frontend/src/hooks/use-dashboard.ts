import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';

export function usePipeline(snapshotBatchId?: string, importBatchIds?: string) {
  return useQuery({
    queryKey: ['dashboard', 'pipeline', snapshotBatchId, importBatchIds],
    queryFn: () =>
      api
        .get('/dashboard/pipeline', {
          params: {
            ...(snapshotBatchId ? { snapshot_batch_id: snapshotBatchId } : {}),
            ...(importBatchIds ? { import_batch_ids: importBatchIds } : {}),
          },
        })
        .then((r) => r.data),
  });
}

export function usePipelineByBranch() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline-by-branch'],
    queryFn: () => api.get('/dashboard/pipeline/by-branch').then((r) => r.data),
  });
}

export function useCrmSummary(importBatchIds?: string) {
  return useQuery({
    queryKey: ['dashboard', 'crm-summary', importBatchIds],
    queryFn: () =>
      api
        .get('/dashboard/crm-summary', {
          params: importBatchIds ? { import_batch_ids: importBatchIds } : {},
        })
        .then((r) => r.data),
  });
}

export function useFinancialSummary(importBatchIds?: string) {
  return useQuery({
    queryKey: ['financial', 'summary', importBatchIds],
    queryFn: () =>
      api
        .get('/financial/summary', {
          params: importBatchIds ? { import_batch_ids: importBatchIds } : {},
        })
        .then((r) => r.data),
  });
}

export interface FinancialFullData {
  kpis: {
    receitas: number;
    despesas: number;
    resultado: number;
    valor_venda: number;
    ticket_medio: number;
    total_processes: number;
  };
  by_component: Array<{ code: string; name: string; type: string; total: number }>;
  by_source: Array<{ source_name: string; receitas: number; despesas: number; resultado: number; valor_venda: number; count: number }>;
  top_enterprises: Array<{ name: string; valor_venda: number; count: number }>;
  by_process_status: Array<{ status: string; receitas: number; despesas: number }>;
}

export function useFinancialFull(importBatchIds?: string) {
  return useQuery<FinancialFullData>({
    queryKey: ['financial', 'full-summary', importBatchIds],
    queryFn: () =>
      api
        .get('/financial/full-summary', {
          params: importBatchIds ? { import_batch_ids: importBatchIds } : {},
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTeamPerformance() {
  return useQuery({
    queryKey: ['dashboard', 'team-performance'],
    queryFn: () => api.get('/dashboard/team-performance').then((r) => r.data),
  });
}

export function useUserPerformance() {
  return useQuery({
    queryKey: ['dashboard', 'user-performance'],
    queryFn: () => api.get('/dashboard/user-performance').then((r) => r.data),
  });
}

export function useSnapshotEvolution(startDate?: string, endDate?: string, snapshotBatchId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'snapshots', startDate, endDate, snapshotBatchId],
    queryFn: () =>
      api
        .get('/dashboard/snapshots', {
          params: {
            ...(startDate ? { start_date: startDate } : {}),
            ...(endDate ? { end_date: endDate } : {}),
            ...(snapshotBatchId ? { snapshot_batch_id: snapshotBatchId } : {}),
          },
        })
        .then((r) => r.data),
  });
}

export function useFinancialByBranch() {
  return useQuery({
    queryKey: ['financial', 'summary-by-branch'],
    queryFn: () => api.get('/financial/summary/by-branch').then((r) => r.data),
  });
}

// ── Pipeline Detail ──

export interface PipelineDetailStage {
  key: string;
  label: string;
  sort_order: number;
  flow_type: string;
  total: number;
  urgent: number;
  high: number;
  total_value: number;
  pct: number;
  statuses: Array<{ name: string; count: number }>;
  top_enterprises: Array<{ name: string; count: number }>;
  sources: Array<{ name: string; count: number }>;
}

export interface PipelineDetailData {
  grand_total: number;
  total_stages: number;
  sources: Array<{ name: string; count: number }>;
  stages: PipelineDetailStage[];
}

export function usePipelineDetail(importBatchIds?: string) {
  return useQuery<PipelineDetailData>({
    queryKey: ['dashboard', 'pipeline-detail', importBatchIds],
    queryFn: () =>
      api
        .get('/dashboard/pipeline-detail', {
          params: importBatchIds ? { import_batch_ids: importBatchIds } : {},
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export interface SnapshotBatch {
  id: string;
  source_name: string;
  reference_date: string;
  status: string;
  created_at: string;
}

export interface FullDashboardData {
  kpis: {
    total_processes: number;
    active_processes: number;
    completed_processes: number;
    cancelled_processes: number;
    paused_processes: number;
    total_units: number;
    units_available: number;
    units_in_resale: number;
    units_sold: number;
    units_reserved: number;
    total_clients: number;
    total_sellers: number;
    total_buyers: number;
    total_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    total_activities: number;
    activities_this_month: number;
    financial_receivable: number;
    financial_received: number;
    financial_total_sale_value: number;
    ticket_medio: number;
  };
  pipeline: Array<{
    stage_group: string;
    status_name: string;
    sort_order: number;
    total_resales: number;
    urgent_count?: number;
    high_count?: number;
  }>;
  units_by_status: Array<{ status: string; count: number }>;
  processes_by_enterprise: Array<{ name: string; code: string; count: number }>;
  comparison_by_source: Array<{
    source_name: string;
    processes: number;
    units: number;
    clients: number;
    financial_value: number;
  }>;
  financial_by_component: Array<{
    code: string;
    name: string;
    component_type: string;
    total: number;
  }>;
  top_statuses: Array<{ status_name: string; count: number; stage_group: string }>;
  top_enterprises: Array<{
    name: string;
    total_units: number;
    available: number;
    in_resale: number;
    sold: number;
    avg_value: number;
  }>;
  top_users: Array<{
    user_id: string;
    full_name: string;
    total_processes: number;
    completed: number;
    active: number;
  }>;
  activities_by_type: Array<{ type: string; count: number }>;
  operational_alerts: Array<{ type: string; message: string; count: number }>;
}

export function useFullDashboard(importBatchIds?: string) {
  return useQuery<FullDashboardData>({
    queryKey: ['dashboard', 'full-summary', importBatchIds],
    queryFn: () =>
      api
        .get('/dashboard/full-summary', {
          params: importBatchIds ? { import_batch_ids: importBatchIds } : {},
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSnapshotBatches() {
  return useQuery({
    queryKey: ['imports', 'snapshot-batches'],
    queryFn: () => api.get('/imports/snapshot-batches').then((r) => r.data as SnapshotBatch[]),
  });
}
