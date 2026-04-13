import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { mapStatusToStageGroup } from '@/common/utils/text-matching';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private supabase: SupabaseService) {}

  // ── Pipeline: CRM data (primary) with snapshot fallback ──

  async getPipeline(snapshotBatchId?: string, importBatchIds?: string[]) {
    this.logger.log(`getPipeline called, snapshotBatchId=${snapshotBatchId ?? 'none'}, importBatchIds=${importBatchIds?.join(',') ?? 'all'}`);

    // If specific snapshot batch requested, use legacy flow
    if (snapshotBatchId) {
      return this.getPipelineBySnapshotBatch(snapshotBatchId);
    }

    // Priority 1: CRM data from resale_processes
    try {
      const crmData = await this.getPipelineFromCRM(importBatchIds);
      if (crmData.length > 0) {
        this.logger.log(`CRM pipeline data: ${crmData.length} items`);
        return crmData;
      }
    } catch (err: any) {
      this.logger.error(`CRM pipeline error: ${err.message}`);
    }

    // Priority 2: snapshot data from imports
    try {
      const snapshotData = await this.getPipelineFromLatestSnapshot();
      if (snapshotData.length > 0) {
        this.logger.log(`Snapshot data: ${snapshotData.length} items`);
        return snapshotData;
      }
    } catch (err: any) {
      this.logger.error(`getPipelineFromLatestSnapshot error: ${err.message}`);
    }

    // Fallback: legacy view
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

  // ── CRM Pipeline: from resale_processes + flow_stages ──

  private async getPipelineFromCRM(importBatchIds?: string[]) {
    // Query direta nas tabelas base — não depende de views
    let qb = this.supabase.admin
      .from('resale_processes')
      .select(`
        id, status, priority,
        current_stage:flow_stages!resale_processes_current_stage_id_fkey(
          name, stage_group, stage_order,
          flow_type:resale_flow_types(name, code)
        )
      `)
      .eq('status', 'active');

    if (importBatchIds?.length) {
      qb = qb.in('import_batch_id', importBatchIds);
    }

    const { data, error } = await qb;

    if (error) {
      this.logger.error(`CRM pipeline query: ${error.message}`);
      return [];
    }
    if (!data?.length) return [];

    // Agrupar por stage
    const grouped: Record<string, any> = {};
    for (const p of data) {
      const stage = p.current_stage as any;
      if (!stage) continue;
      const key = `${stage.name}|${stage.flow_type?.code}`;
      if (!grouped[key]) {
        grouped[key] = {
          stage_group: stage.stage_group,
          status_code: stage.name?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown',
          status_name: stage.name,
          sort_order: stage.stage_order ?? 0,
          total_resales: 0,
          total_calls: 0,
          flow_type: stage.flow_type?.name,
          urgent_count: 0,
          high_count: 0,
        };
      }
      grouped[key].total_resales++;
      if (p.priority === 'urgent') grouped[key].urgent_count++;
      if (p.priority === 'high') grouped[key].high_count++;
    }

    return Object.values(grouped).sort((a, b) => a.sort_order - b.sort_order);
  }

  // ── CRM Summary ──

  async getCrmSummary(importBatchIds?: string[]) {
    // Query direct from resale_processes — more flexible than the view
    let qb = this.supabase.admin
      .from('resale_processes')
      .select('id, status, seller_client_id, buyer_client_id, unit_id, import_batch_id');

    if (importBatchIds?.length) {
      qb = qb.in('import_batch_id', importBatchIds);
    }

    const { data, error } = await qb;
    if (error) {
      this.logger.error(`getCrmSummary: ${error.message}`);
      return null;
    }

    const processes = data ?? [];
    return {
      active_processes: processes.filter(p => p.status === 'active').length,
      completed_processes: processes.filter(p => p.status === 'completed').length,
      cancelled_processes: processes.filter(p => p.status === 'cancelled').length,
      paused_processes: processes.filter(p => p.status === 'paused').length,
      total_processes: processes.length,
      total_sellers: new Set(processes.map(p => p.seller_client_id).filter(Boolean)).size,
      total_buyers: new Set(processes.map(p => p.buyer_client_id).filter(Boolean)).size,
      total_units: new Set(processes.map(p => p.unit_id).filter(Boolean)).size,
    };
  }

  // ── Snapshot fallback ──

  private async getPipelineFromLatestSnapshot() {
    const { data: batches } = await this.supabase.admin
      .from('snapshot_batches')
      .select('id, reference_date, source_name')
      .eq('status', 'done')
      .order('reference_date', { ascending: false })
      .limit(1);

    if (!batches?.length) return [];
    return this.getPipelineBySnapshotBatch(batches[0].id);
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
    // Try CRM data first
    const { data: processes } = await this.supabase.admin
      .from('resale_processes')
      .select('id, status, current_stage_id, branch_id, region_id')
      .limit(1);

    if (processes?.length) {
      // Use CRM process data grouped by branch
      const { data, error } = await this.supabase.admin
        .from('resale_processes')
        .select(`
          id,
          status,
          branch:branches(name),
          region:regions(name),
          current_stage:flow_stages(stage_group, name, stage_order)
        `);

      if (!error && data?.length) {
        const grouped: Record<string, any> = {};
        for (const p of data) {
          const branchName = (p.branch as any)?.name ?? 'Sem filial';
          const regionName = (p.region as any)?.name ?? 'Sem região';
          const stageGroup = (p.current_stage as any)?.stage_group ?? 'outros';
          const stageName = (p.current_stage as any)?.name ?? 'Desconhecido';
          const key = `${branchName}|${stageGroup}|${stageName}`;

          if (!grouped[key]) {
            grouped[key] = {
              company_name: 'LYX',
              region_name: regionName,
              branch_name: branchName,
              stage_group: stageGroup,
              status_code: stageName.toLowerCase().replace(/\s+/g, '_'),
              status_name: stageName,
              sort_order: (p.current_stage as any)?.stage_order ?? 0,
              total_resales: 0,
            };
          }
          grouped[key].total_resales++;
        }
        return Object.values(grouped);
      }
    }

    // Fallback to legacy view
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

  // ── Snapshot evolution (kept for historical snapshots) ──

  async getSnapshotEvolution(startDate?: string, endDate?: string, snapshotBatchId?: string) {
    let batchQuery = this.supabase.admin
      .from('snapshot_batches')
      .select('id, reference_date, source_name')
      .eq('status', 'done')
      .order('reference_date', { ascending: true })
      .limit(100);

    if (snapshotBatchId) batchQuery = batchQuery.eq('id', snapshotBatchId);
    if (startDate) batchQuery = batchQuery.gte('reference_date', startDate);
    if (endDate) batchQuery = batchQuery.lte('reference_date', endDate);

    const { data: batches, error: bErr } = await batchQuery;
    if (bErr || !batches?.length) return [];

    const batchIds = batches.map((b) => b.id);
    const { data: snapshots, error: sErr } = await this.supabase.admin
      .from('daily_status_snapshots')
      .select('batch_id, operation_name, status_name_raw, quantity, call_quantity')
      .in('batch_id', batchIds);

    if (sErr) return [];

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

  // ── Pipeline Detail: rich pipeline data for the pipeline page ──

  async getPipelineDetail(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('resale_processes')
        .select(`
          id, status, priority, import_batch_id,
          current_stage:flow_stages!resale_processes_current_stage_id_fkey(
            name, stage_group, stage_order,
            flow_type:resale_flow_types(name, code)
          ),
          unit:units(
            id, current_value,
            enterprise:enterprises(name, code)
          ),
          import_batch:import_batches(source_name)
        `)
        .eq('status', 'active');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`getPipelineDetail: ${error.message}`);
        return this.getEmptyPipelineDetail();
      }
      if (!data?.length) return this.getEmptyPipelineDetail();

      // Build rich stage groups
      const stageMap: Record<string, {
        key: string;
        label: string;
        sort_order: number;
        flow_type: string;
        total: number;
        urgent: number;
        high: number;
        total_value: number;
        statuses: Record<string, number>;
        enterprises: Record<string, number>;
        sources: Record<string, number>;
      }> = {};

      let grandTotal = 0;

      for (const p of data) {
        const stage = p.current_stage as any;
        if (!stage) continue;

        const sg = stage.stage_group ?? 'outros';
        if (!stageMap[sg]) {
          stageMap[sg] = {
            key: sg,
            label: stage.name ?? sg,
            sort_order: stage.stage_order ?? 99,
            flow_type: stage.flow_type?.name ?? '',
            total: 0,
            urgent: 0,
            high: 0,
            total_value: 0,
            statuses: {},
            enterprises: {},
            sources: {},
          };
        }

        const entry = stageMap[sg];
        entry.total++;
        grandTotal++;

        if (p.priority === 'urgent') entry.urgent++;
        if (p.priority === 'high') entry.high++;

        // Status name (stage name is the status)
        const statusName = stage.name ?? 'Desconhecido';
        entry.statuses[statusName] = (entry.statuses[statusName] || 0) + 1;

        // Enterprise
        const unit = p.unit as any;
        const enterpriseName = unit?.enterprise?.name ?? 'Sem empreendimento';
        entry.enterprises[enterpriseName] = (entry.enterprises[enterpriseName] || 0) + 1;

        // Value
        const value = Number(unit?.current_value) || 0;
        entry.total_value += value;

        // Source
        const batch = p.import_batch as any;
        const sourceName = batch?.source_name ?? 'Manual';
        entry.sources[sourceName] = (entry.sources[sourceName] || 0) + 1;
      }

      // Convert to sorted arrays
      const stages = Object.values(stageMap)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          key: s.key,
          label: s.label,
          sort_order: s.sort_order,
          flow_type: s.flow_type,
          total: s.total,
          urgent: s.urgent,
          high: s.high,
          total_value: s.total_value,
          pct: grandTotal > 0 ? Math.round((s.total / grandTotal) * 100) : 0,
          statuses: Object.entries(s.statuses)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
          top_enterprises: Object.entries(s.enterprises)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
          sources: Object.entries(s.sources)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
        }));

      // Global source comparison
      const globalSources: Record<string, number> = {};
      for (const p of data) {
        const batch = p.import_batch as any;
        const src = batch?.source_name ?? 'Manual';
        globalSources[src] = (globalSources[src] || 0) + 1;
      }

      return {
        grand_total: grandTotal,
        total_stages: stages.length,
        sources: Object.entries(globalSources)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        stages,
      };
    } catch (err: any) {
      this.logger.error(`getPipelineDetail error: ${err.message}`);
      return this.getEmptyPipelineDetail();
    }
  }

  private getEmptyPipelineDetail() {
    return { grand_total: 0, total_stages: 0, sources: [], stages: [] };
  }

  // ── Full Summary: consolidated dashboard data ──

  async getFullSummary(importBatchIds?: string[]) {
    try {
      const hasFilter = (importBatchIds ?? []).length > 0;
      const filterIds = hasFilter ? importBatchIds! : undefined;

      // ── Helper: get process IDs for filtering tasks/activities ──
      let processIds: string[] | null = null;
      if (hasFilter) {
        const { data: procs } = await this.supabase.admin
          .from('resale_processes')
          .select('id')
          .in('import_batch_id', filterIds!);
        processIds = (procs ?? []).map((p) => p.id);
      }

      // ── Parallel queries ──
      const [
        processesResult,
        unitsResult,
        clientsResult,
        tasksResult,
        activitiesResult,
        financialResult,
        financialComponentsResult,
        pipelineResult,
        enterpriseUnitsResult,
        userProcessesResult,
        importBatchesResult,
        unitsWithDebtsResult,
      ] = await Promise.all([
        // 1. Processes
        this.queryProcesses(importBatchIds),
        // 2. Units
        this.queryUnits(importBatchIds),
        // 3. Clients
        this.queryClients(importBatchIds),
        // 4. Tasks (filtered by processIds if needed)
        this.queryTasks(processIds, hasFilter),
        // 5. Activities (filtered by processIds if needed)
        this.queryActivities(processIds, hasFilter),
        // 6. Financial entries
        this.queryFinancialEntries(importBatchIds),
        // 7. Financial by component
        this.queryFinancialByComponent(importBatchIds),
        // 8. Pipeline
        this.getPipelineFromCRM(importBatchIds).catch(() => []),
        // 9. Units joined with enterprises
        this.queryEnterpriseUnits(importBatchIds),
        // 10. User processes
        this.queryUserProcesses(importBatchIds),
        // 11. Import batches for comparison
        this.queryImportBatches(),
        // 12. Units with debts
        this.queryUnitsWithDebts(importBatchIds),
      ]);

      const processes = processesResult ?? [];
      const units = unitsResult ?? [];
      const clients = clientsResult ?? [];
      const tasks = tasksResult ?? [];
      const activities = activitiesResult ?? [];
      const financial = financialResult ?? [];
      const financialByComp = financialComponentsResult ?? [];
      const pipeline = pipelineResult ?? [];
      const enterpriseUnits = enterpriseUnitsResult ?? [];
      const userProcesses = userProcessesResult ?? [];
      const importBatches = importBatchesResult ?? [];
      const unitsWithDebts = unitsWithDebtsResult ?? 0;

      // ── KPIs ──
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const totalProcesses = processes.length;
      const activeProcesses = processes.filter((p) => p.status === 'active').length;
      const completedProcesses = processes.filter((p) => p.status === 'completed').length;
      const cancelledProcesses = processes.filter((p) => p.status === 'cancelled').length;
      const pausedProcesses = processes.filter((p) => p.status === 'paused').length;

      const totalUnits = units.length;
      const unitsByStatusMap: Record<string, number> = {};
      for (const u of units) {
        const s = u.status ?? 'unknown';
        unitsByStatusMap[s] = (unitsByStatusMap[s] || 0) + 1;
      }

      const totalClients = clients.length;
      const totalSellers = new Set(processes.map((p) => p.seller_client_id).filter(Boolean)).size;
      const totalBuyers = new Set(processes.map((p) => p.buyer_client_id).filter(Boolean)).size;

      const totalTasks = tasks.length;
      const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
      const overdueTasks = tasks.filter(
        (t) => t.status === 'pending' && t.due_date && new Date(t.due_date) < now,
      ).length;

      const totalActivities = activities.length;
      const activitiesThisMonth = activities.filter(
        (a) => a.created_at && a.created_at >= firstOfMonth,
      ).length;

      const financialReceivable = financial
        .filter((f) => f.entry_type === 'receivable' && f.payment_status === 'pending')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      const financialReceived = financial
        .filter((f) => f.payment_status === 'paid')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      const financialTotalSaleValue = financial
        .filter((f) => f.component_code === 'valor_venda')
        .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      const ticketMedio = totalProcesses > 0 ? financialTotalSaleValue / totalProcesses : 0;

      // ── units_by_status ──
      const unitsByStatus = Object.entries(unitsByStatusMap).map(([status, count]) => ({
        status,
        count,
      }));

      // ── processes_by_enterprise ──
      const enterpriseProcessMap: Record<string, { name: string; code: string; count: number }> = {};
      for (const p of processes) {
        const eName = (p as any).unit?.enterprise?.name ?? 'Sem empreendimento';
        const eCode = (p as any).unit?.enterprise?.code ?? 'none';
        const key = eCode;
        if (!enterpriseProcessMap[key]) {
          enterpriseProcessMap[key] = { name: eName, code: eCode, count: 0 };
        }
        enterpriseProcessMap[key].count++;
      }
      const processesByEnterprise = Object.values(enterpriseProcessMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // ── comparison_by_source ──
      const comparisonBySource = await this.buildComparisonBySource(importBatches);

      // ── financial_by_component ──
      const financialByComponent = financialByComp;

      // ── top_statuses ──
      const topStatuses = [...pipeline]
        .sort((a: any, b: any) => (b.total_resales || 0) - (a.total_resales || 0))
        .slice(0, 10)
        .map((p: any) => ({
          status_name: p.status_name,
          count: p.total_resales || 0,
          stage_group: p.stage_group,
        }));

      // ── top_enterprises ──
      const enterpriseMap: Record<string, any> = {};
      for (const u of enterpriseUnits) {
        const eName = (u as any).enterprise?.name ?? 'Sem empreendimento';
        if (!enterpriseMap[eName]) {
          enterpriseMap[eName] = {
            name: eName,
            total_units: 0,
            available: 0,
            in_resale: 0,
            sold: 0,
            values: [],
          };
        }
        enterpriseMap[eName].total_units++;
        if (u.status === 'available') enterpriseMap[eName].available++;
        if (u.status === 'in_resale') enterpriseMap[eName].in_resale++;
        if (u.status === 'sold') enterpriseMap[eName].sold++;
        if (u.current_value) enterpriseMap[eName].values.push(Number(u.current_value) || 0);
      }
      const topEnterprises = Object.values(enterpriseMap)
        .map((e: any) => ({
          name: e.name,
          total_units: e.total_units,
          available: e.available,
          in_resale: e.in_resale,
          sold: e.sold,
          avg_value:
            e.values.length > 0
              ? e.values.reduce((a: number, b: number) => a + b, 0) / e.values.length
              : 0,
        }))
        .sort((a, b) => b.total_units - a.total_units)
        .slice(0, 10);

      // ── top_users ──
      const userMap: Record<string, any> = {};
      for (const p of userProcesses) {
        const userId = p.assigned_user_id;
        const fullName = (p as any).assigned_user?.full_name ?? 'Sem usuário';
        if (!userId) continue;
        if (!userMap[userId]) {
          userMap[userId] = {
            user_id: userId,
            full_name: fullName,
            total_processes: 0,
            completed: 0,
            active: 0,
          };
        }
        userMap[userId].total_processes++;
        if (p.status === 'completed') userMap[userId].completed++;
        if (p.status === 'active') userMap[userId].active++;
      }
      const topUsers = Object.values(userMap)
        .sort((a: any, b: any) => b.total_processes - a.total_processes)
        .slice(0, 10);

      // ── activities_by_type ──
      const actTypeMap: Record<string, number> = {};
      for (const a of activities) {
        const t = a.activity_type ?? 'other';
        actTypeMap[t] = (actTypeMap[t] || 0) + 1;
      }
      const activitiesByType = Object.entries(actTypeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // ── operational_alerts ──
      const processesWithoutUnit = processes.filter((p) => !p.unit_id).length;
      const processesWithoutSeller = processes.filter((p) => !p.seller_client_id).length;
      const processesWithoutBuyer = processes.filter((p) => !p.buyer_client_id).length;

      const operationalAlerts: Array<{ type: string; message: string; count: number }> = [];
      if (processesWithoutUnit > 0) {
        operationalAlerts.push({
          type: 'missing_unit',
          message: 'Processos sem unidade vinculada',
          count: processesWithoutUnit,
        });
      }
      if (processesWithoutSeller > 0) {
        operationalAlerts.push({
          type: 'missing_seller',
          message: 'Processos sem vendedor vinculado',
          count: processesWithoutSeller,
        });
      }
      if (processesWithoutBuyer > 0) {
        operationalAlerts.push({
          type: 'missing_buyer',
          message: 'Processos sem comprador vinculado',
          count: processesWithoutBuyer,
        });
      }
      if (overdueTasks > 0) {
        operationalAlerts.push({
          type: 'overdue_tasks',
          message: 'Tarefas vencidas',
          count: overdueTasks,
        });
      }
      if (unitsWithDebts > 0) {
        operationalAlerts.push({
          type: 'units_with_debts',
          message: 'Unidades com débitos pendentes',
          count: unitsWithDebts,
        });
      }

      return {
        kpis: {
          total_processes: totalProcesses,
          active_processes: activeProcesses,
          completed_processes: completedProcesses,
          cancelled_processes: cancelledProcesses,
          paused_processes: pausedProcesses,
          total_units: totalUnits,
          units_available: unitsByStatusMap['available'] || 0,
          units_in_resale: unitsByStatusMap['in_resale'] || 0,
          units_sold: unitsByStatusMap['sold'] || 0,
          units_reserved: unitsByStatusMap['reserved'] || 0,
          total_clients: totalClients,
          total_sellers: totalSellers,
          total_buyers: totalBuyers,
          total_tasks: totalTasks,
          pending_tasks: pendingTasks,
          overdue_tasks: overdueTasks,
          total_activities: totalActivities,
          activities_this_month: activitiesThisMonth,
          financial_receivable: financialReceivable,
          financial_received: financialReceived,
          financial_total_sale_value: financialTotalSaleValue,
          ticket_medio: ticketMedio,
        },
        pipeline,
        units_by_status: unitsByStatus,
        processes_by_enterprise: processesByEnterprise,
        comparison_by_source: comparisonBySource,
        financial_by_component: financialByComponent,
        top_statuses: topStatuses,
        top_enterprises: topEnterprises,
        top_users: topUsers,
        activities_by_type: activitiesByType,
        operational_alerts: operationalAlerts,
      };
    } catch (err: any) {
      this.logger.error(`getFullSummary error: ${err.message}`);
      return this.getEmptyFullSummary();
    }
  }

  // ── Private query helpers for getFullSummary ──

  private async queryProcesses(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('resale_processes')
        .select('id, status, seller_client_id, buyer_client_id, unit_id, assigned_user_id, import_batch_id, unit:units(enterprise:enterprises(name, code))');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryProcesses: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryProcesses exception: ${err.message}`);
      return [];
    }
  }

  private async queryUnits(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin.from('units').select('id, status, current_value, enterprise_id');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryUnits: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryUnits exception: ${err.message}`);
      return [];
    }
  }

  private async queryClients(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin.from('clients').select('id');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryClients: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryClients exception: ${err.message}`);
      return [];
    }
  }

  private async queryTasks(processIds: string[] | null, hasFilter: boolean) {
    try {
      let qb = this.supabase.admin.from('tasks').select('id, status, due_date, process_id');

      if (hasFilter && processIds !== null) {
        if (processIds.length === 0) return [];
        qb = qb.in('process_id', processIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryTasks: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryTasks exception: ${err.message}`);
      return [];
    }
  }

  private async queryActivities(processIds: string[] | null, hasFilter: boolean) {
    try {
      let qb = this.supabase.admin
        .from('activities')
        .select('id, activity_type, created_at, process_id');

      if (hasFilter && processIds !== null) {
        if (processIds.length === 0) return [];
        qb = qb.in('process_id', processIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryActivities: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryActivities exception: ${err.message}`);
      return [];
    }
  }

  private async queryFinancialEntries(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('process_financial_entries')
        .select('id, entry_type, amount, payment_status, component_id, component:resale_financial_components(code)');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryFinancialEntries: ${error.message}`);
        return [];
      }
      return (data ?? []).map((f: any) => ({
        ...f,
        component_code: f.component?.code ?? null,
      }));
    } catch (err: any) {
      this.logger.error(`queryFinancialEntries exception: ${err.message}`);
      return [];
    }
  }

  private async queryFinancialByComponent(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('process_financial_entries')
        .select('amount, component:resale_financial_components(code, name, component_type)');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryFinancialByComponent: ${error.message}`);
        return [];
      }

      const grouped: Record<string, { code: string; name: string; component_type: string; total: number }> = {};
      for (const f of data ?? []) {
        const comp = (f as any).component;
        if (!comp) continue;
        const key = comp.code ?? 'unknown';
        if (!grouped[key]) {
          grouped[key] = {
            code: comp.code,
            name: comp.name,
            component_type: comp.component_type ?? 'other',
            total: 0,
          };
        }
        grouped[key].total += Number(f.amount) || 0;
      }
      return Object.values(grouped);
    } catch (err: any) {
      this.logger.error(`queryFinancialByComponent exception: ${err.message}`);
      return [];
    }
  }

  private async queryEnterpriseUnits(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('units')
        .select('id, status, current_value, enterprise:enterprises(name)');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryEnterpriseUnits: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryEnterpriseUnits exception: ${err.message}`);
      return [];
    }
  }

  private async queryUserProcesses(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('resale_processes')
        .select('id, status, assigned_user_id, assigned_user:users!resale_processes_assigned_user_id_fkey(full_name)');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryUserProcesses: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryUserProcesses exception: ${err.message}`);
      return [];
    }
  }

  private async queryImportBatches() {
    try {
      const { data, error } = await this.supabase.admin
        .from('import_batches')
        .select('id, source_name, import_type, status')
        .eq('status', 'done')
        .neq('import_type', 'snapshot');

      if (error) {
        this.logger.error(`queryImportBatches: ${error.message}`);
        return [];
      }
      return data ?? [];
    } catch (err: any) {
      this.logger.error(`queryImportBatches exception: ${err.message}`);
      return [];
    }
  }

  private async queryUnitsWithDebts(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin
        .from('units')
        .select('id, debts_cadin, debts_iptu, debts_condominio, debts_other');

      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }

      const { data, error } = await qb;
      if (error) {
        this.logger.error(`queryUnitsWithDebts: ${error.message}`);
        return 0;
      }
      return (data ?? []).filter(
        (u) =>
          (Number(u.debts_cadin) || 0) > 0 ||
          (Number(u.debts_iptu) || 0) > 0 ||
          (Number(u.debts_condominio) || 0) > 0 ||
          (Number(u.debts_other) || 0) > 0,
      ).length;
    } catch (err: any) {
      this.logger.error(`queryUnitsWithDebts exception: ${err.message}`);
      return 0;
    }
  }

  private async buildComparisonBySource(importBatches: any[]) {
    try {
      if (!importBatches.length) return [];

      // Group batches by source_name
      const sourceMap: Record<string, string[]> = {};
      for (const b of importBatches) {
        const src = b.source_name ?? 'Desconhecido';
        if (!sourceMap[src]) sourceMap[src] = [];
        sourceMap[src].push(b.id);
      }

      const results: Array<{
        source_name: string;
        processes: number;
        units: number;
        clients: number;
        financial_value: number;
      }> = [];

      for (const [sourceName, batchIds] of Object.entries(sourceMap)) {
        const [procRes, unitRes, clientRes, finRes] = await Promise.all([
          this.supabase.admin
            .from('resale_processes')
            .select('id', { count: 'exact', head: true })
            .in('import_batch_id', batchIds),
          this.supabase.admin
            .from('units')
            .select('id', { count: 'exact', head: true })
            .in('import_batch_id', batchIds),
          this.supabase.admin
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .in('import_batch_id', batchIds),
          this.supabase.admin
            .from('process_financial_entries')
            .select('amount')
            .in('import_batch_id', batchIds),
        ]);

        const financialValue = (finRes.data ?? []).reduce(
          (sum, f) => sum + (Number(f.amount) || 0),
          0,
        );

        results.push({
          source_name: sourceName,
          processes: procRes.count ?? 0,
          units: unitRes.count ?? 0,
          clients: clientRes.count ?? 0,
          financial_value: financialValue,
        });
      }

      return results.sort((a, b) => b.processes - a.processes);
    } catch (err: any) {
      this.logger.error(`buildComparisonBySource exception: ${err.message}`);
      return [];
    }
  }

  private getEmptyFullSummary() {
    return {
      kpis: {
        total_processes: 0,
        active_processes: 0,
        completed_processes: 0,
        cancelled_processes: 0,
        paused_processes: 0,
        total_units: 0,
        units_available: 0,
        units_in_resale: 0,
        units_sold: 0,
        units_reserved: 0,
        total_clients: 0,
        total_sellers: 0,
        total_buyers: 0,
        total_tasks: 0,
        pending_tasks: 0,
        overdue_tasks: 0,
        total_activities: 0,
        activities_this_month: 0,
        financial_receivable: 0,
        financial_received: 0,
        financial_total_sale_value: 0,
        ticket_medio: 0,
      },
      pipeline: [],
      units_by_status: [],
      processes_by_enterprise: [],
      comparison_by_source: [],
      financial_by_component: [],
      top_statuses: [],
      top_enterprises: [],
      top_users: [],
      activities_by_type: [],
      operational_alerts: [],
    };
  }

  // ── Stage mapping (for snapshot data) ──

  private mapToStageGroup(rawStatus: string): string {
    return mapStatusToStageGroup(rawStatus);
  }
}
