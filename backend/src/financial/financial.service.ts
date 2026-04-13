import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import { UpsertFinancialValueDto } from './financial.dto';

@Injectable()
export class FinancialService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async getComponents() {
    const { data, error } = await this.supabase.admin
      .from('resale_financial_components')
      .select('*')
      .eq('is_active', true)
      .order('default_order');

    if (error) throw error;
    return data;
  }

  async getByResale(userId: string, resaleId: string) {
    const canAccess = await this.scopeService.canAccessResale(userId, resaleId);
    if (!canAccess) throw new ForbiddenException('Sem acesso a esta revenda');

    const { data, error } = await this.supabase.admin
      .from('resale_financial_values')
      .select(
        `
        id, amount, notes, reference_date, created_at,
        component:resale_financial_components(code, name, component_type, default_order)
      `,
      )
      .eq('resale_id', resaleId)
      .order('component(default_order)');

    if (error) throw error;
    return data;
  }

  async upsertValue(dto: UpsertFinancialValueDto, userId: string) {
    const canAccess = await this.scopeService.canAccessResale(
      userId,
      dto.resale_id,
    );
    if (!canAccess) throw new ForbiddenException('Sem acesso a esta revenda');

    // Resolver component_id pelo code
    const { data: component } = await this.supabase.admin
      .from('resale_financial_components')
      .select('id')
      .eq('code', dto.component_code)
      .single();

    if (!component)
      throw new NotFoundException(
        `Componente "${dto.component_code}" não encontrado`,
      );

    // Verificar se já existe valor para este resale + component
    const { data: existing } = await this.supabase.admin
      .from('resale_financial_values')
      .select('id')
      .eq('resale_id', dto.resale_id)
      .eq('component_id', component.id)
      .maybeSingle();

    if (existing) {
      const { error } = await this.supabase.admin
        .from('resale_financial_values')
        .update({
          amount: dto.amount,
          notes: dto.notes,
          reference_date: dto.reference_date,
        })
        .eq('id', existing.id);
      if (error) throw error;
      return { id: existing.id, action: 'updated' };
    }

    const { data, error } = await this.supabase.admin
      .from('resale_financial_values')
      .insert({
        resale_id: dto.resale_id,
        component_id: component.id,
        amount: dto.amount,
        notes: dto.notes,
        reference_date: dto.reference_date,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id, action: 'created' };
  }

  async getProcessEntries(processId: string) {
    const { data, error } = await this.supabase.admin
      .from('process_financial_entries')
      .select(`
        id, entry_type, amount, description, due_date, paid_date,
        payment_status, installment_number, total_installments, notes, created_at,
        component:resale_financial_components(code, name, component_type, default_order)
      `)
      .eq('process_id', processId)
      .order('created_at');

    if (error) throw error;
    return data;
  }

  async getSummary(importBatchIds?: string[]) {
    // Filter by process import_batch_id (not financial entry import_batch_id)
    let processIdFilter: string[] | null = null;
    if (importBatchIds?.length) {
      const { data: procs } = await this.supabase.admin
        .from('resale_processes')
        .select('id')
        .in('import_batch_id', importBatchIds);
      processIdFilter = (procs ?? []).map((p) => p.id);
      if (processIdFilter.length === 0) {
        return { components: [], totals: { receitas: 0, despesas: 0, resultado: 0, valorVenda: 0, ticketMedio: 0, totalRevendas: 0 } };
      }
    }

    let qb = this.supabase.admin
      .from('process_financial_entries')
      .select(`
        amount, entry_type, process_id,
        component:resale_financial_components(code, name, component_type),
        process:resale_processes!inner(status)
      `);

    if (processIdFilter) {
      qb = qb.in('process_id', processIdFilter);
    }

    const { data: crmData } = await qb;

    if (crmData?.length) {
      const processIds = new Set(crmData.map(e => e.process_id));
      const totalRevendas = processIds.size;

      let receitas = 0;
      let despesas = 0;
      const componentTotals: Record<string, number> = {};

      for (const entry of crmData) {
        const amount = Number(entry.amount) || 0;
        const comp = entry.component as any;
        const code = comp?.code ?? 'unknown';
        const type = comp?.component_type ?? entry.entry_type;

        componentTotals[code] = (componentTotals[code] || 0) + amount;

        if (type === 'receita' || entry.entry_type === 'receivable') receitas += amount;
        else despesas += amount;
      }

      const valorVenda = componentTotals['valor_venda'] || 0;

      return {
        components: Object.entries(componentTotals).map(([code, total]) => ({ code, total })),
        totals: {
          receitas,
          despesas,
          resultado: receitas - despesas,
          valorVenda,
          ticketMedio: totalRevendas > 0 ? Math.round(valorVenda / totalRevendas) : 0,
          totalRevendas,
        },
      };
    }

    // Fallback: legacy resale financial values
    const { data, error } = await this.supabase.admin
      .from('vw_resale_financial_summary')
      .select('resale_id, valor_venda, valor_avaliacao, financiamento, subsidio, fgts, comissao, total_receitas, total_despesas, resultado_liquido');

    if (error) return { components: [], totals: { receitas: 0, despesas: 0, resultado: 0, valorVenda: 0, ticketMedio: 0, totalRevendas: 0 } };

    const rows = data ?? [];
    const totalRevendas = rows.length;
    const receitas = rows.reduce((s, r) => s + (Number(r.total_receitas) || 0), 0);
    const despesas = rows.reduce((s, r) => s + (Number(r.total_despesas) || 0), 0);
    const valorVenda = rows.reduce((s, r) => s + (Number(r.valor_venda) || 0), 0);

    const componentTotals: Record<string, number> = {};
    for (const row of rows) {
      for (const key of ['financiamento', 'subsidio', 'fgts', 'comissao', 'valor_venda', 'valor_avaliacao'] as const) {
        componentTotals[key] = (componentTotals[key] || 0) + (Number(row[key]) || 0);
      }
    }

    return {
      components: Object.entries(componentTotals).map(([code, total]) => ({ code, total })),
      totals: {
        receitas,
        despesas,
        resultado: receitas - despesas,
        valorVenda,
        ticketMedio: totalRevendas > 0 ? Math.round(valorVenda / totalRevendas) : 0,
        totalRevendas,
      },
    };
  }

  async getFullSummary(importBatchIds?: string[]) {
    try {
      // If filtering by import batch, first get the relevant process IDs
      // (filter on resale_processes.import_batch_id, not on financial entries)
      let processIdFilter: string[] | null = null;
      if (importBatchIds?.length) {
        const { data: procs } = await this.supabase.admin
          .from('resale_processes')
          .select('id')
          .in('import_batch_id', importBatchIds);
        processIdFilter = (procs ?? []).map((p) => p.id);
        if (processIdFilter.length === 0) return this.getEmptyFinancialSummary();
      }

      let qb = this.supabase.admin
        .from('process_financial_entries')
        .select(`
          id, entry_type, amount, payment_status,
          component:resale_financial_components(code, name, component_type),
          process:resale_processes!inner(
            id, status,
            unit:units(id, current_value, enterprise:enterprises(name, code)),
            import_batch:import_batches(source_name)
          )
        `);

      if (processIdFilter) {
        qb = qb.in('process_id', processIdFilter);
      }

      const { data, error } = await qb;
      if (error) {
        return this.getEmptyFinancialSummary();
      }

      const entries = data ?? [];
      if (!entries.length) return this.getEmptyFinancialSummary();

      // ── KPIs ──
      let receitas = 0;
      let despesas = 0;
      let valorVenda = 0;
      const processIds = new Set<string>();
      const componentMap: Record<string, { code: string; name: string; type: string; total: number }> = {};
      const sourceMap: Record<string, { receitas: number; despesas: number; valor_venda: number; count: Set<string> }> = {};
      const enterpriseMap: Record<string, { name: string; valor_venda: number; count: Set<string> }> = {};
      const statusMap: Record<string, { receitas: number; despesas: number }> = {};

      for (const e of entries) {
        const amt = Number(e.amount) || 0;
        const comp = e.component as any;
        const proc = e.process as any;
        const code = comp?.code ?? 'unknown';
        const compType = comp?.component_type ?? 'referencia';
        const processId = proc?.id;

        if (processId) processIds.add(processId);

        // Receita / Despesa classification
        if (compType === 'receita' || e.entry_type === 'receivable' || e.entry_type === 'received') {
          receitas += amt;
        } else if (compType === 'despesa' || e.entry_type === 'payable' || e.entry_type === 'paid') {
          despesas += amt;
        }

        if (code === 'valor_venda') valorVenda += amt;

        // By component
        if (!componentMap[code]) {
          componentMap[code] = { code, name: comp?.name ?? code, type: compType, total: 0 };
        }
        componentMap[code].total += amt;

        // By source
        const srcName = proc?.import_batch?.source_name ?? 'Manual';
        if (!sourceMap[srcName]) {
          sourceMap[srcName] = { receitas: 0, despesas: 0, valor_venda: 0, count: new Set() };
        }
        if (compType === 'receita' || e.entry_type === 'receivable' || e.entry_type === 'received') {
          sourceMap[srcName].receitas += amt;
        } else if (compType === 'despesa' || e.entry_type === 'payable' || e.entry_type === 'paid') {
          sourceMap[srcName].despesas += amt;
        }
        if (code === 'valor_venda') sourceMap[srcName].valor_venda += amt;
        if (processId) sourceMap[srcName].count.add(processId);

        // By enterprise
        const entName = proc?.unit?.enterprise?.name ?? 'Sem empreendimento';
        if (!enterpriseMap[entName]) {
          enterpriseMap[entName] = { name: entName, valor_venda: 0, count: new Set() };
        }
        if (code === 'valor_venda') enterpriseMap[entName].valor_venda += amt;
        if (processId) enterpriseMap[entName].count.add(processId);

        // By process status
        const pStatus = proc?.status ?? 'unknown';
        if (!statusMap[pStatus]) statusMap[pStatus] = { receitas: 0, despesas: 0 };
        if (compType === 'receita' || e.entry_type === 'receivable') {
          statusMap[pStatus].receitas += amt;
        } else if (compType === 'despesa' || e.entry_type === 'payable') {
          statusMap[pStatus].despesas += amt;
        }
      }

      const totalProcesses = processIds.size;
      const ticketMedio = totalProcesses > 0 ? valorVenda / totalProcesses : 0;

      return {
        kpis: {
          receitas,
          despesas,
          resultado: receitas - despesas,
          valor_venda: valorVenda,
          ticket_medio: ticketMedio,
          total_processes: totalProcesses,
        },
        by_component: Object.values(componentMap)
          .filter((c) => c.total > 0)
          .sort((a, b) => b.total - a.total),
        by_source: Object.entries(sourceMap).map(([name, v]) => ({
          source_name: name,
          receitas: v.receitas,
          despesas: v.despesas,
          resultado: v.receitas - v.despesas,
          valor_venda: v.valor_venda,
          count: v.count.size,
        })),
        top_enterprises: Object.values(enterpriseMap)
          .map((e) => ({ name: e.name, valor_venda: e.valor_venda, count: e.count.size }))
          .filter((e) => e.valor_venda > 0)
          .sort((a, b) => b.valor_venda - a.valor_venda)
          .slice(0, 10),
        by_process_status: Object.entries(statusMap).map(([status, v]) => ({
          status,
          receitas: v.receitas,
          despesas: v.despesas,
        })),
      };
    } catch {
      return this.getEmptyFinancialSummary();
    }
  }

  private getEmptyFinancialSummary() {
    return {
      kpis: { receitas: 0, despesas: 0, resultado: 0, valor_venda: 0, ticket_medio: 0, total_processes: 0 },
      by_component: [],
      by_source: [],
      top_enterprises: [],
      by_process_status: [],
    };
  }

  async getSummaryByBranch() {
    // Query base tables directly (view may not exist)
    try {
      const { data: check } = await this.supabase.admin
        .from('resale_financial_values')
        .select('id')
        .limit(1);

      if (!check?.length) return [];

      const { data, error } = await this.supabase.admin
        .from('resale_financial_values')
        .select(`
          amount,
          component:resale_financial_components(code, name, component_type),
          resale:resales(id, branch_id)
        `);

      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
  }
}
