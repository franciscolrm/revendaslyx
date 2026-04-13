import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import { CreateUnitDto, UpdateUnitDto, ListUnitsQueryDto } from './units.dto';

@Injectable()
export class UnitsService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(query: ListUnitsQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('units')
      .select(
        `
        *,
        enterprise:enterprises(id, name, code),
        original_client:clients!units_original_client_id_fkey(id, full_name, phone),
        current_client:clients!units_current_client_id_fkey(id, full_name, phone),
        import_batch:import_batches(id, source_name, created_at)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (query.enterprise_id) {
      qb = qb.eq('enterprise_id', query.enterprise_id);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.stock_available === 'true') {
      qb = qb.eq('stock_available', true);
    }
    if (query.import_batch_ids) {
      const ids = query.import_batch_ids.split(',').filter(Boolean);
      if (ids.length > 0) qb = qb.in('import_batch_id', ids);
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `block_tower.ilike.%${sanitized}%,unit_number.ilike.%${sanitized}%`,
        );
      }
    }

    const { data, count, error } = await qb;
    if (error) throw error;

    return {
      data,
      meta: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count ?? 0) / perPage),
      },
    };
  }

  async getSummary(importBatchIds?: string[]) {
    try {
      let qb = this.supabase.admin.from('units').select('id, status, stock_available, current_value, debts_cadin, debts_iptu, debts_condominio, debts_other, import_batch_id');
      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }
      const { data, error } = await qb;
      if (error) throw error;

      const units = data ?? [];
      const byStatus: Record<string, number> = {};
      let withDebts = 0;
      let totalValue = 0;

      for (const u of units) {
        byStatus[u.status] = (byStatus[u.status] || 0) + 1;
        totalValue += Number(u.current_value) || 0;
        if ((Number(u.debts_cadin) || 0) > 0 || (Number(u.debts_iptu) || 0) > 0 ||
            (Number(u.debts_condominio) || 0) > 0 || (Number(u.debts_other) || 0) > 0) {
          withDebts++;
        }
      }

      // By source
      const batchIds = [...new Set(units.map(u => u.import_batch_id).filter(Boolean))];
      const sourceMap: Record<string, number> = {};
      if (batchIds.length > 0) {
        const { data: batches } = await this.supabase.admin
          .from('import_batches').select('id, source_name').in('id', batchIds);
        const nameMap = Object.fromEntries((batches ?? []).map(b => [b.id, b.source_name ?? 'Desconhecido']));
        for (const u of units) {
          const src = nameMap[u.import_batch_id] ?? 'Manual';
          sourceMap[src] = (sourceMap[src] || 0) + 1;
        }
      }

      return {
        total: units.length,
        by_status: byStatus,
        in_stock: units.filter(u => u.stock_available).length,
        with_debts: withDebts,
        total_value: totalValue,
        by_source: Object.entries(sourceMap).map(([name, count]) => ({ name, count })),
      };
    } catch {
      return { total: 0, by_status: {}, in_stock: 0, with_debts: 0, total_value: 0, by_source: [] };
    }
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.admin
      .from('units')
      .select(
        `
        *,
        enterprise:enterprises(id, name, code, address_street, address_city, address_state)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Unidade não encontrada');
    return data;
  }

  async create(dto: CreateUnitDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('units')
      .insert({ ...dto, created_by: userId })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateUnitDto) {
    const { data, error } = await this.supabase.admin
      .from('units')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Unidade não encontrada');
    return data;
  }

  async remove(id: string) {
    const { data, error } = await this.supabase.admin
      .from('units')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Unidade não encontrada');
    return data;
  }
}
