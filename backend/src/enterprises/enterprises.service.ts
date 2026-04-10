import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import { CreateEnterpriseDto, UpdateEnterpriseDto } from './enterprises.dto';

@Injectable()
export class EnterprisesService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(search?: string) {
    let qb = this.supabase.admin
      .from('enterprises')
      .select('*')
      .order('name', { ascending: true });

    if (search) {
      const sanitized = search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `name.ilike.%${sanitized}%,code.ilike.%${sanitized}%`,
        );
      }
    }

    const { data, error } = await qb;
    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.admin
      .from('enterprises')
      .select(
        `
        *,
        units(id, block_tower, floor, unit_number, unit_type, status, current_value)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Empreendimento não encontrado');
    return data;
  }

  async create(dto: CreateEnterpriseDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('enterprises')
      .insert({ ...dto })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateEnterpriseDto) {
    const { data, error } = await this.supabase.admin
      .from('enterprises')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Empreendimento não encontrado');
    return data;
  }
}
