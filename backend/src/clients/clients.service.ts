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
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (query.client_type) {
      qb = qb.eq('client_type', query.client_type);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `full_name.ilike.%${sanitized}%,document_number.ilike.%${sanitized}%,email.ilike.%${sanitized}%`,
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
