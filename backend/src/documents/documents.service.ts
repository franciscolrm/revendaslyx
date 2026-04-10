import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/common/supabase/supabase.service';
import { ScopeService } from '@/common/scope/scope.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ValidateDocumentDto,
  ListDocumentsQueryDto,
} from './documents.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    private supabase: SupabaseService,
    private scopeService: ScopeService,
  ) {}

  async list(query: ListDocumentsQueryDto) {
    const page = Number(query.page) || 1;
    const perPage = Math.min(Number(query.per_page) || 20, 100);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let qb = this.supabase.admin
      .from('documents')
      .select(
        `
        *,
        category:document_categories(id, name),
        process:resale_processes(id, process_code),
        client:clients(id, full_name),
        unit:units(id, unit_number, block_tower)
      `,
        { count: 'exact' },
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (query.process_id) {
      qb = qb.eq('process_id', query.process_id);
    }
    if (query.client_id) {
      qb = qb.eq('client_id', query.client_id);
    }
    if (query.unit_id) {
      qb = qb.eq('unit_id', query.unit_id);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    if (query.category_id) {
      qb = qb.eq('category_id', query.category_id);
    }
    if (query.search) {
      const sanitized = query.search.replace(/[%_\\,().*]/g, '');
      if (sanitized.length > 0) {
        qb = qb.or(
          `title.ilike.%${sanitized}%,file_name.ilike.%${sanitized}%`,
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
      .from('documents')
      .select(
        `
        *,
        category:document_categories(id, name),
        process:resale_processes(id, process_code),
        client:clients(id, full_name),
        unit:units(id, unit_number, block_tower),
        uploaded_by_user:users!documents_uploaded_by_fkey(full_name),
        validated_by_user:users!documents_validated_by_fkey(full_name)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Documento não encontrado');
    return data;
  }

  async create(dto: CreateDocumentDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('documents')
      .insert({
        ...dto,
        status: 'pending',
        uploaded_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async upload(file: Express.Multer.File, userId: string) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${randomUUID()}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = this.supabase.admin.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      file_url: urlData.publicUrl,
      file_name: file.originalname,
      file_path: filePath,
      mime_type: file.mimetype,
      size: file.size,
    };
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const { data, error } = await this.supabase.admin
      .from('documents')
      .update(dto)
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Documento não encontrado');
    return data;
  }

  async validate(id: string, dto: ValidateDocumentDto, userId: string) {
    const { data, error } = await this.supabase.admin
      .from('documents')
      .update({
        status: dto.action,
        rejection_reason: dto.reason,
        validated_by: userId,
        validated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Documento não encontrado');
    return data;
  }

  async remove(id: string) {
    const { data, error } = await this.supabase.admin
      .from('documents')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Documento não encontrado');
    return data;
  }

  async listCategories() {
    const { data, error } = await this.supabase.admin
      .from('document_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }
}
