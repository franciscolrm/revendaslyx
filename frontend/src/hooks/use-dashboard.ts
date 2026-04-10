import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function usePipeline(snapshotBatchId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'pipeline', snapshotBatchId],
    queryFn: () =>
      api
        .get('/dashboard/pipeline', { params: snapshotBatchId ? { snapshot_batch_id: snapshotBatchId } : {} })
        .then((r) => r.data),
  });
}

export function usePipelineByBranch() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline-by-branch'],
    queryFn: () => api.get('/dashboard/pipeline/by-branch').then((r) => r.data),
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

export interface SnapshotBatch {
  id: string;
  source_name: string;
  reference_date: string;
  status: string;
  created_at: string;
}

export function useSnapshotBatches() {
  return useQuery({
    queryKey: ['imports', 'snapshot-batches'],
    queryFn: () => api.get('/imports/snapshot-batches').then((r) => r.data as SnapshotBatch[]),
  });
}
