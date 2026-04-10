import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class OrgService {
  constructor(private supabase: SupabaseService) {}

  async getCompanies() {
    const { data, error } = await this.supabase.admin
      .from('companies')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return data;
  }

  async getRegions(companyId?: string) {
    let qb = this.supabase.admin
      .from('regions')
      .select('id, name, company_id')
      .order('name');
    if (companyId) qb = qb.eq('company_id', companyId);
    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async getBranches(regionId?: string) {
    let qb = this.supabase.admin
      .from('branches')
      .select('id, name, region_id, company_id')
      .order('name');
    if (regionId) qb = qb.eq('region_id', regionId);
    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async getTeams(branchId?: string) {
    let qb = this.supabase.admin
      .from('teams')
      .select('id, name, branch_id')
      .order('name');
    if (branchId) qb = qb.eq('branch_id', branchId);
    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async getRoles() {
    const { data, error } = await this.supabase.admin
      .from('roles')
      .select('id, name, description')
      .order('name');
    if (error) throw error;
    return data;
  }

  async getResaleStatuses() {
    const { data, error } = await this.supabase.admin
      .from('resale_statuses')
      .select('id, code, name, stage_group, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data;
  }

  async getUsersSimple(teamId?: string) {
    let qb = this.supabase.admin
      .from('users')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name');
    if (teamId) qb = qb.eq('team_id', teamId);
    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }
}
