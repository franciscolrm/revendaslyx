import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

export interface UserScope {
  scopeType: 'own' | 'team' | 'branch' | 'region' | 'global';
  regionIds: string[];
  branchIds: string[];
  teamIds: string[];
}

@Injectable()
export class ScopeService {
  constructor(private supabase: SupabaseService) {}

  async getUserScope(userId: string): Promise<UserScope> {
    const { data: scopes } = await this.supabase.admin
      .from('access_scopes')
      .select('scope_type, region_id, branch_id, team_id')
      .eq('user_id', userId);

    if (!scopes || scopes.length === 0) {
      return {
        scopeType: 'own',
        regionIds: [],
        branchIds: [],
        teamIds: [],
      };
    }

    // Pegar o scope mais amplo
    const priority = ['global', 'region', 'branch', 'team', 'own'];
    let bestScope = 'own';
    for (const s of scopes) {
      if (priority.indexOf(s.scope_type) < priority.indexOf(bestScope)) {
        bestScope = s.scope_type;
      }
    }

    return {
      scopeType: bestScope as UserScope['scopeType'],
      regionIds: scopes
        .filter((s) => s.region_id)
        .map((s) => s.region_id!),
      branchIds: scopes
        .filter((s) => s.branch_id)
        .map((s) => s.branch_id!),
      teamIds: scopes
        .filter((s) => s.team_id)
        .map((s) => s.team_id!),
    };
  }

  /** Aplica filtro de scope a uma query de resales */
  applyResaleScope(
    qb: any,
    userId: string,
    scope: UserScope,
  ) {
    switch (scope.scopeType) {
      case 'global':
        return qb; // Sem filtro
      case 'region':
        return qb.in('region_id', scope.regionIds);
      case 'branch':
        return qb.in('branch_id', scope.branchIds);
      case 'team':
        return qb.in('team_id', scope.teamIds);
      case 'own':
        return qb.eq('assigned_user_id', userId);
    }
  }

  /** Verifica se o usuário pode acessar uma revenda específica */
  async canAccessResale(
    userId: string,
    resaleId: string,
  ): Promise<boolean> {
    const scope = await this.getUserScope(userId);

    if (scope.scopeType === 'global') return true;

    const { data } = await this.supabase.admin
      .from('resales')
      .select('id, region_id, branch_id, team_id, assigned_user_id')
      .eq('id', resaleId)
      .single();

    if (!data) return false;

    switch (scope.scopeType) {
      case 'region':
        return scope.regionIds.includes(data.region_id);
      case 'branch':
        return scope.branchIds.includes(data.branch_id);
      case 'team':
        return scope.teamIds.includes(data.team_id);
      case 'own':
        return data.assigned_user_id === userId;
    }
  }
}
