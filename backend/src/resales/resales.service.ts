import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import {
  CreateResaleDto,
  UpdateResaleDto,
  ListResalesQueryDto,
} from './resales.dto';

@Injectable()
export class ResalesService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(userId: string, query: ListResalesQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('resales')
      .select(
        `
        *,
        status:resale_statuses(code, name, stage_group),
        branch:branches(name),
        team:teams(name),
        assigned_user:users!resales_assigned_user_id_fkey(full_name)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('updated_at', { ascending: false });

    // Aplicar scope do usuário
    const scope = await this.scopeService.getUserScope(userId);
    qb = this.scopeService.applyResaleScope(qb, userId, scope);

    if (query.status_code) {
      qb = qb.eq('status.code', query.status_code);
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
    if (query.search) {
      // Sanitizar input — remover caracteres especiais do PostgREST filter
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `customer_name.ilike.%${sanitized}%,external_code.ilike.%${sanitized}%,document.ilike.%${sanitized}%`,
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

  async findById(userId: string, id: string) {
    // Verificar acesso antes de retornar
    const canAccess = await this.scopeService.canAccessResale(userId, id);
    if (!canAccess) throw new ForbiddenException('Sem acesso a esta revenda');

    const { data, error } = await this.supabase.admin
      .from('resales')
      .select(
        `
        *,
        status:resale_statuses(code, name, stage_group),
        region:regions(name),
        branch:branches(name),
        team:teams(name),
        assigned_user:users!resales_assigned_user_id_fkey(full_name, email),
        status_history:resale_status_history(
          id, changed_at, notes,
          status:resale_statuses(code, name),
          changed_by_user:users!resale_status_history_changed_by_fkey(full_name)
        ),
        interactions:resale_interactions(
          id, interaction_type, interaction_date, result, notes,
          performed_by_user:users!resale_interactions_performed_by_fkey(full_name)
        ),
        financial_values:resale_financial_values(
          id, amount, notes, reference_date,
          component:resale_financial_components(code, name, component_type)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Revenda não encontrada');

    return data;
  }

  async create(dto: CreateResaleDto) {
    const { data, error } = await this.supabase.admin
      .from('resales')
      .insert(dto)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async update(userId: string, id: string, dto: UpdateResaleDto) {
    const canAccess = await this.scopeService.canAccessResale(userId, id);
    if (!canAccess) throw new ForbiddenException('Sem acesso a esta revenda');

    const { data, error } = await this.supabase.admin
      .from('resales')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Revenda não encontrada');
    return data;
  }

  async changeStatus(
    userId: string,
    resaleId: string,
    statusCode: string,
    notes?: string,
  ) {
    const canAccess = await this.scopeService.canAccessResale(userId, resaleId);
    if (!canAccess) throw new ForbiddenException('Sem acesso a esta revenda');

    const { data, error } = await this.supabase.admin.rpc(
      'change_resale_status',
      {
        p_resale_id: resaleId,
        p_new_status: statusCode,
        p_notes: notes ?? null,
      },
    );

    if (error) throw error;
    return { history_id: data };
  }

  async addInteraction(
    userId: string,
    resaleId: string,
    type: string,
    result?: string,
    notes?: string,
  ) {
    const canAccess = await this.scopeService.canAccessResale(userId, resaleId);
    if (!canAccess) throw new ForbiddenException('Sem acesso a esta revenda');

    const { data, error } = await this.supabase.admin
      .from('resale_interactions')
      .insert({
        resale_id: resaleId,
        interaction_type: type,
        performed_by: userId,
        result,
        notes,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }
}
