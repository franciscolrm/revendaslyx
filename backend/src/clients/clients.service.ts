import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsQueryDto,
  AddClientContactDto,
} from './clients.dto';

@Injectable()
export class ClientsService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(query: ListClientsQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('clients')
      .select(
        `
        *,
        import_batch:import_batches(id, source_name, created_at)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (query.client_type) {
      qb = qb.eq('client_type', query.client_type);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.import_batch_ids) {
      const ids = query.import_batch_ids.split(',').filter(Boolean);
      if (ids.length > 0) qb = qb.in('import_batch_id', ids);
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `full_name.ilike.%${sanitized}%,document_number.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`,
        );
      }
    }

    const { data, count, error } = await qb;
    if (error) throw error;

    // Enrich with process counts (lightweight)
    const clientIds = (data ?? []).map((c) => c.id);
    let processMap: Record<string, { as_seller: number; as_buyer: number }> = {};
    if (clientIds.length > 0) {
      try {
        const [sellerRes, buyerRes] = await Promise.all([
          this.supabase.admin
            .from('resale_processes')
            .select('seller_client_id')
            .in('seller_client_id', clientIds),
          this.supabase.admin
            .from('resale_processes')
            .select('buyer_client_id')
            .in('buyer_client_id', clientIds),
        ]);

        for (const p of sellerRes.data ?? []) {
          if (!processMap[p.seller_client_id]) processMap[p.seller_client_id] = { as_seller: 0, as_buyer: 0 };
          processMap[p.seller_client_id].as_seller++;
        }
        for (const p of buyerRes.data ?? []) {
          if (!processMap[p.buyer_client_id]) processMap[p.buyer_client_id] = { as_seller: 0, as_buyer: 0 };
          processMap[p.buyer_client_id].as_buyer++;
        }
      } catch {
        // non-critical
      }
    }

    const enriched = (data ?? []).map((c) => ({
      ...c,
      process_count_seller: processMap[c.id]?.as_seller ?? 0,
      process_count_buyer: processMap[c.id]?.as_buyer ?? 0,
    }));

    return {
      data: enriched,
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
      let qb = this.supabase.admin.from('clients').select('id, client_type, status, phone, email, import_batch_id');
      if (importBatchIds?.length) {
        qb = qb.in('import_batch_id', importBatchIds);
      }
      const { data, error } = await qb;
      if (error) throw error;

      const clients = data ?? [];
      const total = clients.length;
      const sellers = clients.filter((c) => c.client_type === 'seller' || c.client_type === 'both').length;
      const buyers = clients.filter((c) => c.client_type === 'buyer' || c.client_type === 'both').length;
      const active = clients.filter((c) => c.status === 'active').length;
      const withPhone = clients.filter((c) => c.phone).length;
      const withEmail = clients.filter((c) => c.email).length;

      // By source
      const sourceMap: Record<string, number> = {};
      const batchIds = [...new Set(clients.map((c) => c.import_batch_id).filter(Boolean))];
      if (batchIds.length > 0) {
        const { data: batches } = await this.supabase.admin
          .from('import_batches')
          .select('id, source_name')
          .in('id', batchIds);
        const batchNameMap = Object.fromEntries((batches ?? []).map((b) => [b.id, b.source_name ?? 'Desconhecido']));
        for (const c of clients) {
          const src = batchNameMap[c.import_batch_id] ?? 'Manual';
          sourceMap[src] = (sourceMap[src] || 0) + 1;
        }
      }

      return {
        total,
        sellers,
        buyers,
        active,
        with_phone: withPhone,
        with_email: withEmail,
        by_source: Object.entries(sourceMap).map(([name, count]) => ({ name, count })),
      };
    } catch {
      return { total: 0, sellers: 0, buyers: 0, active: 0, with_phone: 0, with_email: 0, by_source: [] };
    }
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.admin
      .from('clients')
      .select(
        `
        *,
        client_contacts(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Cliente não encontrado');
    return data;
  }

  async create(dto: CreateClientDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('clients')
      .insert({ ...dto, created_by: userId })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateClientDto) {
    const { data, error } = await this.supabase.admin
      .from('clients')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Cliente não encontrado');
    return data;
  }

  async remove(id: string) {
    const { data, error } = await this.supabase.admin
      .from('clients')
      .update({ status: 'inactive' })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Cliente não encontrado');
    return data;
  }

  async addContact(id: string, dto: AddClientContactDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('client_contacts')
      .insert({
        client_id: id,
        contact_type: dto.contact_type,
        subject: dto.subject,
        notes: dto.notes,
        performed_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async listContacts(id: string) {
    const { data, error } = await this.supabase.admin
      .from('client_contacts')
      .select(
        `
        *,
        performed_by_user:users!client_contacts_performed_by_fkey(full_name)
      `,
      )
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
