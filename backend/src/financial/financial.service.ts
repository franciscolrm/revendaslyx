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

  async getSummary() {
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
