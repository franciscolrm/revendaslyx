import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';

@Injectable()
export class NotificationsService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(userId: string, page?: number, perPage?: number) {
    const p = Number(page) || 1;
    const pp = Math.min(Number(perPage) || 20, 100);
    const from = (p - 1) * pp;
    const to = from + pp - 1;

    const { data, count, error } = await this.supabase.admin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .range(from, to)
      .order('read', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data,
      meta: {
        total: count ?? 0,
        page: p,
        per_page: pp,
        total_pages: Math.ceil((count ?? 0) / pp),
      },
    };
  }

  async unreadCount(userId: string) {
    const { count, error } = await this.supabase.admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { unread_count: count ?? 0 };
  }

  async markAsRead(id: string, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Notificação não encontrada');
    return data;
  }

  async markAllAsRead(userId: string) {
    const { error } = await this.supabase.admin
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { success: true };
  }
}
