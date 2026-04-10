import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private supabase: SupabaseService) {}

  // ── Pipeline: snapshot data with optional batch filter ──

  async getPipeline(snapshotBatchId?: string) {
    this.logger.log(`getPipeline called, snapshotBatchId=${snapshotBatchId ?? 'none'}`);

    if (snapshotBatchId) {
      return this.getPipelineBySnapshotBatch(snapshotBatchId);
    }

    // Priority: snapshot data from imports (real imported data)
    try {
      const snapshotData = await this.getPipelineFromLatestSnapshot();
      this.logger.log(`Snapshot data: ${snapshotData.length} items`);
      if (snapshotData.length > 0) {
        return snapshotData;
      }
    } catch (err: any) {
      this.logger.error(`getPipelineFromLatestSnapshot error: ${err.message}`);
    }

    // Fallback: use resales view (legacy CRM data)
    this.logger.log('Falling back to vw_pipeline view');
    const { data, error } = await this.supabase.admin
      .from('vw_pipeline')
      .select('stage_group, status_code, status_name, sort_order, total_resales');

    if (error) {
      this.logger.error(`getPipeline view: ${error.message}`);
      return [];
    }

    return (data ?? []).map((s) => ({
      stage_group: s.stage_group,
      status_code: s.status_code,
      status_name: s.status_name,
      sort_order: s.sort_order,
      total_resales: Number(s.total_resales) || 0,
      total_calls: 0,
    }));
  }

  private async getPipelineFromLatestSnapshot() {
    const { data: batches, error: batchErr } = await this.supabase.admin
      .from('snapshot_batches')
      .select('id, reference_date, source_name')
      .eq('status', 'done')
      .order('reference_date', { ascending: false })
      .limit(1);

    this.logger.log(`Snapshot batches query: count=${batches?.length ?? 0}, error=${batchErr?.message ?? 'none'}, data=${JSON.stringify(batches)}`);

    if (!batches?.length) return [];

    const result = await this.getPipelineBySnapshotBatch(batches[0].id);
    this.logger.log(`Snapshot pipeline result: ${result.length} items`);
    return result;
  }

  private async getPipelineBySnapshotBatch(batchId: string) {
    const { data, error } = await this.supabase.admin
      .from('daily_status_snapshots')
      .select('status_name_raw, quantity, call_quantity, operation_name')
      .eq('batch_id', batchId);

    if (error) {
      this.logger.error(`getPipelineByBatch: ${error.message}`);
      return [];
    }

    return (data ?? []).map((s, i) => ({
      stage_group: this.mapToStageGroup(s.status_name_raw),
      status_code: s.status_name_raw?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown',
      status_name: s.status_name_raw,
      sort_order: i,
      total_resales: Number(s.quantity) || 0,
      total_calls: Number(s.call_quantity) || 0,
      operation_name: s.operation_name,
    }));
  }

  // ── Pipeline por filial ──

  async getPipelineByBranch() {
    const { data, error } = await this.supabase.admin
      .from('vw_pipeline_by_branch')
      .select('company_name, region_name, branch_name, stage_group, status_code, status_name, sort_order, total_resales');

    if (error) {
      this.logger.error(`getPipelineByBranch: ${error.message}`);
      return [];
    }

    return (data ?? []).map((s) => ({
      company_name: s.company_name ?? 'Sem empresa',
      region_name: s.region_name ?? 'Sem região',
      branch_name: s.branch_name ?? 'Sem filial',
      stage_group: s.stage_group,
      status_code: s.status_code,
      status_name: s.status_name,
      sort_order: s.sort_order,
      total_resales: Number(s.total_resales) || 0,
    }));
  }

  // ── Team performance ──

  async getTeamPerformance() {
    const { data, error } = await this.supabase.admin
      .from('vw_team_performance')
      .select('team_id, team_name, branch_name, region_name, leader_name, total_resales, concluidas, distratos, total_interactions, interactions_mes_atual');

    if (error) {
      this.logger.error(`getTeamPerformance: ${error.message}`);
      return [];
    }

    return (data ?? []).map((t) => ({
      team_id: t.team_id,
      team_name: t.team_name,
      branch_name: t.branch_name ?? '-',
      region_name: t.region_name ?? '-',
      leader_name: t.leader_name,
      total_resales: Number(t.total_resales) || 0,
      concluidas: Number(t.concluidas) || 0,
      distratos: Number(t.distratos) || 0,
      total_interactions: Number(t.total_interactions) || 0,
      interactions_mes_atual: Number(t.interactions_mes_atual) || 0,
    }));
  }

  // ── User performance ──

  async getUserPerformance() {
    const { data, error } = await this.supabase.admin
      .from('vw_user_performance')
      .select('user_id, full_name, team_name, branch_name, total_resales, concluidas, distratos, total_interactions, interactions_mes_atual, ultima_interacao');

    if (error) {
      this.logger.error(`getUserPerformance: ${error.message}`);
      return [];
    }

    return (data ?? []).map((u) => ({
      user_id: u.user_id,
      full_name: u.full_name,
      team_name: u.team_name ?? '-',
      branch_name: u.branch_name ?? '-',
      total_resales: Number(u.total_resales) || 0,
      concluidas: Number(u.concluidas) || 0,
      distratos: Number(u.distratos) || 0,
      total_interactions: Number(u.total_interactions) || 0,
      interactions_mes_atual: Number(u.interactions_mes_atual) || 0,
      ultima_interacao: u.ultima_interacao,
    }));
  }

  // ── Snapshot evolution with batch filter ──

  async getSnapshotEvolution(startDate?: string, endDate?: string, snapshotBatchId?: string) {
    let batchQuery = this.supabase.admin
      .from('snapshot_batches')
      .select('id, reference_date, source_name')
      .eq('status', 'done')
      .order('reference_date', { ascending: true })
      .limit(100);

    if (snapshotBatchId) {
      batchQuery = batchQuery.eq('id', snapshotBatchId);
    }
    if (startDate) batchQuery = batchQuery.gte('reference_date', startDate);
    if (endDate) batchQuery = batchQuery.lte('reference_date', endDate);

    const { data: batches, error: bErr } = await batchQuery;
    if (bErr) {
      this.logger.error(`getSnapshotEvolution batches: ${bErr.message}`);
      return [];
    }
    if (!batches?.length) return [];

    const batchIds = batches.map((b) => b.id);
    const { data: snapshots, error: sErr } = await this.supabase.admin
      .from('daily_status_snapshots')
      .select('batch_id, operation_name, status_name_raw, quantity, call_quantity')
      .in('batch_id', batchIds);

    if (sErr) {
      this.logger.error(`getSnapshotEvolution snapshots: ${sErr.message}`);
      return [];
    }

    const batchMap = Object.fromEntries(batches.map((b) => [b.id, b]));

    return (snapshots ?? []).map((s) => ({
      reference_date: batchMap[s.batch_id]?.reference_date,
      source_name: batchMap[s.batch_id]?.source_name,
      operation_name: s.operation_name,
      status_name_raw: s.status_name_raw,
      stage_group: this.mapToStageGroup(s.status_name_raw),
      quantity: s.quantity,
      call_quantity: s.call_quantity,
    }));
  }

  // ── Generate snapshot ──

  async generateSnapshot(referenceDate?: string) {
    try {
      const { data, error } = await this.supabase.admin.rpc('generate_daily_snapshot', {
        p_reference_date: referenceDate ?? new Date().toISOString().split('T')[0],
        p_source_name: 'manual',
      });
      if (error) throw error;
      return { batch_id: data };
    } catch (err: any) {
      this.logger.error(`generateSnapshot: ${err.message}`);
      return { error: err.message };
    }
  }

  // ── Stage mapping ──

  private mapToStageGroup(rawStatus: string): string {
    const lower = (rawStatus ?? '').toLowerCase().trim();
    const map: Record<string, string> = {
      'angariação': 'captacao',
      'angariacao': 'captacao',
      'vendida': 'venda_concluida',
      'liberada pra venda': 'comercial',
      'liberada para venda': 'comercial',
      'em contato': 'contato',
      'renegociacao': 'renegociacao',
      'renegociação': 'renegociacao',
      'agendada cartorio': 'cartorio',
      'agendada - cartorio': 'cartorio',
      'agendada - cartório': 'cartorio',
      'em agendamento': 'cartorio',
      'enviado a agencia': 'financiamento',
      'enviado a agência': 'financiamento',
      'enviado agencia': 'financiamento',
      'agendado - caixa': 'financiamento',
      'agendado caixa': 'financiamento',
      'aguardando retorno': 'aguardando',
      'sem retorno': 'sem_retorno',
      'sem retorno/contato': 'sem_retorno',
      'sem retorno comercial': 'sem_retorno',
      'sem interesse': 'encerrado',
      'sem condicoes': 'encerrado',
      'sem condições': 'encerrado',
      'numero invalido': 'problema',
      'número inválido': 'problema',
      'juridico': 'cartorio',
      'jurídico': 'cartorio',
      'adimplente': 'adimplente',
    };

    for (const [key, group] of Object.entries(map)) {
      if (lower.includes(key)) return group;
    }
    return 'outros';
  }
}
