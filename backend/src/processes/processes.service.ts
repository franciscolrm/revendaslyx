import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import {
  CreateProcessDto,
  UpdateProcessDto,
  ListProcessesQueryDto,
} from './processes.dto';

@Injectable()
export class ProcessesService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(userId: string, query: ListProcessesQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('resale_processes')
      .select(
        `
        *,
        flow_type:resale_flow_types(id, name, code),
        current_stage:flow_stages!resale_processes_current_stage_id_fkey(id, name, stage_group, stage_order),
        seller_client:clients!resale_processes_seller_client_id_fkey(id, full_name, document_number),
        buyer_client:clients!resale_processes_buyer_client_id_fkey(id, full_name, document_number),
        unit:units(id, unit_number, block_tower),
        enterprise:enterprises(id, name),
        branch:branches(name),
        team:teams(name),
        assigned_user:users!resale_processes_assigned_user_id_fkey(full_name)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('updated_at', { ascending: false });

    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.flow_type_id) {
      qb = qb.eq('flow_type_id', query.flow_type_id);
    }
    if (query.branch_id) {
      qb = qb.eq('branch_id', query.branch_id);
    }
    if (query.team_id) {
      qb = qb.eq('team_id', query.team_id);
    }
    if (query.assigned_user_id) {
      qb = qb.eq('assigned_user_id', query.assigned_user_id);
    }
    if (query.priority) {
      qb = qb.eq('priority', query.priority);
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(`process_code.ilike.%${sanitized}%`);
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
      .from('resale_processes')
      .select(
        `
        *,
        flow_type:resale_flow_types(id, name, code, total_stages),
        current_stage:flow_stages!resale_processes_current_stage_id_fkey(id, name, stage_group, stage_order, sla_days, requires_documents, requires_tasks, checklist),
        seller_client:clients!resale_processes_seller_client_id_fkey(id, full_name, document_number, email, phone),
        buyer_client:clients!resale_processes_buyer_client_id_fkey(id, full_name, document_number, email, phone),
        unit:units(id, unit_number, block_tower, unit_type, status, current_value),
        enterprise:enterprises(id, name, code),
        branch:branches(name),
        team:teams(name),
        assigned_user:users!resale_processes_assigned_user_id_fkey(full_name, email),
        process_stage_history(
          id, from_stage_id, to_stage_id, changed_at, reason, notes,
          from_stage:flow_stages!process_stage_history_from_stage_id_fkey(id, name, stage_group, stage_order),
          to_stage:flow_stages!process_stage_history_to_stage_id_fkey(id, name, stage_group, stage_order),
          changed_by_user:users!process_stage_history_changed_by_fkey(full_name)
        ),
        process_comments(
          id, content, is_internal, created_at,
          user:users!process_comments_user_id_fkey(full_name)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Processo não encontrado');
    return data;
  }

  async create(dto: CreateProcessDto, userId: string) {
    // Get the first stage of the selected flow type
    const { data: firstStage, error: stageError } = await this.supabase.admin
      .from('flow_stages')
      .select('id')
      .eq('flow_type_id', dto.flow_type_id)
      .order('stage_order', { ascending: true })
      .limit(1)
      .single();

    if (stageError || !firstStage) {
      throw new BadRequestException('Tipo de fluxo inválido ou sem etapas configuradas');
    }

    const { data, error } = await this.supabase.admin
      .from('resale_processes')
      .insert({
        ...dto,
        current_stage_id: firstStage.id,
        status: 'active',
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Create initial stage history entry
    await this.supabase.admin
      .from('process_stage_history')
      .insert({
        process_id: data.id,
        to_stage_id: firstStage.id,
        changed_by: userId,
        notes: 'Processo criado',
      });

    return data;
  }

  async update(id: string, dto: UpdateProcessDto) {
    const { data, error } = await this.supabase.admin
      .from('resale_processes')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Processo não encontrado');
    return data;
  }

  async advanceStage(id: string, userId: string, notes?: string) {
    const { data, error } = await this.supabase.admin.rpc(
      'advance_process_stage',
      {
        p_process_id: id,
        p_user_id: userId,
        p_notes: notes ?? null,
      },
    );

    if (error) throw error;
    return { success: true, data };
  }

  async revertStage(id: string, userId: string, reason?: string) {
    const { data, error } = await this.supabase.admin.rpc(
      'revert_process_stage',
      {
        p_process_id: id,
        p_user_id: userId,
        p_reason: reason ?? null,
      },
    );

    if (error) throw error;
    return { success: true, data };
  }

  async addComment(processId: string, userId: string, content: string, isInternal?: boolean) {
    const { data, error } = await this.supabase.admin
      .from('process_comments')
      .insert({
        process_id: processId,
        user_id: userId,
        content,
        is_internal: isInternal ?? true,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async listComments(processId: string) {
    const { data, error } = await this.supabase.admin
      .from('process_comments')
      .select(
        `
        *,
        user:users!process_comments_user_id_fkey(full_name)
      `,
      )
      .eq('process_id', processId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getTimeline(processId: string) {
    const [stageResult, commentResult, activityResult] = await Promise.all([
      this.supabase.admin
        .from('process_stage_history')
        .select(
          `
          id, changed_at, reason, notes,
          from_stage:flow_stages!process_stage_history_from_stage_id_fkey(id, name, stage_group),
          to_stage:flow_stages!process_stage_history_to_stage_id_fkey(id, name, stage_group),
          changed_by_user:users!process_stage_history_changed_by_fkey(full_name)
        `,
        )
        .eq('process_id', processId),
      this.supabase.admin
        .from('process_comments')
        .select(
          `
          id, content, is_internal, created_at,
          user:users!process_comments_user_id_fkey(full_name)
        `,
        )
        .eq('process_id', processId),
      this.supabase.admin
        .from('activities')
        .select(
          `
          id, activity_type, title, description, scheduled_at, completed_at, status,
          assigned_to_user:users!activities_assigned_to_fkey(full_name)
        `,
        )
        .eq('process_id', processId),
    ]);

    const timeline: any[] = [];

    if (stageResult.data) {
      for (const item of stageResult.data) {
        timeline.push({
          type: 'stage_change',
          timestamp: item.changed_at,
          data: item,
        });
      }
    }

    if (commentResult.data) {
      for (const item of commentResult.data) {
        timeline.push({
          type: 'comment',
          timestamp: item.created_at,
          data: item,
        });
      }
    }

    if (activityResult.data) {
      for (const item of activityResult.data) {
        timeline.push({
          type: 'activity',
          timestamp: item.scheduled_at || item.completed_at,
          data: item,
        });
      }
    }

    timeline.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    return timeline;
  }

  async listFlowTypes() {
    const { data, error } = await this.supabase.admin
      .from('resale_flow_types')
      .select(
        `
        *,
        stages:flow_stages(id, name, stage_group, stage_order, sla_days, requires_documents, requires_tasks, checklist, auto_tasks)
      `,
      )
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }
}
