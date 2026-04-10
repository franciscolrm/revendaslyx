import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ListTasksQueryDto,
} from './tasks.dto';

@Injectable()
export class TasksService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(query: ListTasksQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('tasks')
      .select(
        `
        *,
        process:resale_processes(id, process_code),
        assigned_to_user:users!tasks_assigned_to_fkey(full_name),
        created_by_user:users!tasks_created_by_fkey(full_name)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (query.process_id) {
      qb = qb.eq('process_id', query.process_id);
    }
    if (query.assigned_to) {
      qb = qb.eq('assigned_to', query.assigned_to);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.priority) {
      qb = qb.eq('priority', query.priority);
    }
    if (query.overdue === 'true') {
      qb = qb
        .lt('due_date', new Date().toISOString())
        .neq('status', 'completed')
        .neq('status', 'cancelled');
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
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
      .from('tasks')
      .select(
        `
        *,
        process:resale_processes(id, process_code),
        assigned_to_user:users!tasks_assigned_to_fkey(full_name, email),
        created_by_user:users!tasks_created_by_fkey(full_name),
        task_comments(
          id, content, created_at,
          user:users!task_comments_user_id_fkey(full_name)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Tarefa não encontrada');
    return data;
  }

  async create(dto: CreateTaskDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('tasks')
      .insert({
        ...dto,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const { data, error } = await this.supabase.admin
      .from('tasks')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Tarefa não encontrada');
    return data;
  }

  async complete(id: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: userId,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Tarefa não encontrada');
    return data;
  }

  async addComment(taskId: string, userId: string, content: string) {
    const { data, error } = await this.supabase.admin
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async listComments(taskId: string) {
    const { data, error } = await this.supabase.admin
      .from('task_comments')
      .select(
        `
        *,
        user:users!task_comments_user_id_fkey(full_name)
      `,
      )
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
