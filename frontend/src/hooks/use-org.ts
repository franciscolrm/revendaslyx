import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useCompanies() {
  return useQuery({
    queryKey: ['org', 'companies'],
    queryFn: () => api.get('/org/companies').then((r) => r.data),
  });
}

export function useRegions(companyId?: string) {
  return useQuery({
    queryKey: ['org', 'regions', companyId],
    queryFn: () =>
      api
        .get('/org/regions', { params: { company_id: companyId } })
        .then((r) => r.data),
  });
}

export function useBranches(regionId?: string) {
  return useQuery({
    queryKey: ['org', 'branches', regionId],
    queryFn: () =>
      api
        .get('/org/branches', { params: { region_id: regionId } })
        .then((r) => r.data),
  });
}

export function useTeams(branchId?: string) {
  return useQuery({
    queryKey: ['org', 'teams', branchId],
    queryFn: () =>
      api
        .get('/org/teams', { params: { branch_id: branchId } })
        .then((r) => r.data),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['org', 'roles'],
    queryFn: () => api.get('/org/roles').then((r) => r.data),
  });
}

export function useResaleStatuses() {
  return useQuery({
    queryKey: ['org', 'resale-statuses'],
    queryFn: () => api.get('/org/resale-statuses').then((r) => r.data),
  });
}

export function useOrgUsers(teamId?: string) {
  return useQuery({
    queryKey: ['org', 'users', teamId],
    queryFn: () =>
      api
        .get('/org/users', { params: { team_id: teamId } })
        .then((r) => r.data),
  });
}
