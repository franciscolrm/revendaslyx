import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import {
  CreateActivityDto,
  UpdateActivityDto,
  ListActivitiesQueryDto,
} from './activities.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(query: ListActivitiesQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('activities')
      .select(
        `
        *,
        process:resale_processes(id, process_code),
        client:clients(id, full_name),
        assigned_to_user:users!activities_assigned_to_fkey(full_name),
        created_by_user:users!activities_created_by_fkey(full_name)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('scheduled_at', { ascending: true });

    if (query.process_id) {
      qb = qb.eq('process_id', query.process_id);
    }
    if (query.client_id) {
      qb = qb.eq('client_id', query.client_id);
    }
    if (query.assigned_to) {
      qb = qb.eq('assigned_to', query.assigned_to);
    }
    if (query.activity_type) {
      qb = qb.eq('activity_type', query.activity_type);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.date_from) {
      qb = qb.gte('scheduled_at', query.date_from);
    }
    if (query.date_to) {
      qb = qb.lte('scheduled_at', query.date_to);
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`,
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
      .from('activities')
      .select(
        `
        *,
        process:resale_processes(id, process_code),
        client:clients(id, full_name, email, phone),
        assigned_to_user:users!activities_assigned_to_fkey(full_name, email),
        created_by_user:users!activities_created_by_fkey(full_name)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Atividade não encontrada');
    return data;
  }

  async create(dto: CreateActivityDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('activities')
      .insert({
        ...dto,
        status: 'scheduled',
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateActivityDto) {
    const { data, error } = await this.supabase.admin
      .from('activities')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Atividade não encontrada');
    return data;
  }
}
