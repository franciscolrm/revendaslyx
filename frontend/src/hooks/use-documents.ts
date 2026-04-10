import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Document {
  id: string;
  category_id?: string;
  process_id?: string;
  client_id?: string;
  unit_id?: string;
  title: string;
  file_name?: string;
  storage_path?: string;
  mime_type?: string;
  file_size?: number;
  status: 'pending' | 'received' | 'validated' | 'rejected' | 'expired';
  version: number;
  rejection_reason?: string;
  validated_by?: string;
  validated_at?: string;
  uploaded_by?: string;
  notes?: string;
  created_at: string;
  category?: { name: string; code: string };
  process?: { process_code: string };
  client?: { full_name: string };
  uploaded_by_user?: { full_name: string };
}

export interface DocumentCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface ListDocumentsParams {
  page?: number;
  per_page?: number;
  process_id?: string;
  client_id?: string;
  unit_id?: string;
  status?: string;
  category_id?: string;
}

export function useDocuments(params: ListDocumentsParams = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: async () => {
      const { data } = await api.get('/documents', { params });
      return data as { data: Document[]; meta: { total: number; page: number; per_page: number; total_pages: number } };
    },
  });
}

export function useDocument(id?: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: async () => {
      const { data } = await api.get(`/documents/${id}`);
      return data as Document;
    },
    enabled: !!id,
  });
}

export function useDocumentCategories() {
  return useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const { data } = await api.get('/document-categories');
      return data as DocumentCategory[];
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<Document>) => {
      const { data } = await api.post('/documents', dto);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...meta }: { file: File; process_id?: string; client_id?: string; unit_id?: string; category_id?: string; title?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(meta).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useValidateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: 'validated' | 'rejected'; rejection_reason?: string }) => {
      const { data } = await api.post(`/documents/${id}/validate`, { status, rejection_reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/documents/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
