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
        enterprise:enterprises(id, name, code)
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
