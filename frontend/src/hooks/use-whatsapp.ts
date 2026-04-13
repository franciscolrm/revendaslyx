import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface WhatsAppInstance {
  configured: boolean;
  id?: string;
  phone_number?: string;
  status?: string;
  is_active?: boolean;
  instance_name?: string;
}

export interface Conversation {
  id: string;
  remote_phone: string;
  remote_name?: string;
  last_message_at?: string;
  unread_count: number;
  status: string;
  client?: { id: string; full_name: string; phone?: string };
}

export interface Message {
  id: string;
  direction: 'outbound' | 'inbound';
  message_text: string;
  message_type: string;
  status: string;
  error_message?: string;
  created_at: string;
  sent_by?: string;
}

export function useMyWhatsAppInstance() {
  return useQuery({
    queryKey: ['whatsapp', 'my-instance'],
    queryFn: () => api.get('/integrations/whatsapp/my-instance').then((r) => r.data as WhatsAppInstance),
    refetchInterval: 5000,
  });
}

export function useCreateWhatsAppInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/integrations/whatsapp/create-instance').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp'] }),
  });
}

export function useWhatsAppQrCode(enabled: boolean) {
  return useQuery({
    queryKey: ['whatsapp', 'qr-code'],
    queryFn: () => api.get('/integrations/whatsapp/qr-code').then((r) => r.data),
    enabled,
    refetchInterval: 20000, // Refresh QR every 20s
  });
}

export function useDisconnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/integrations/whatsapp/disconnect').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp'] }),
  });
}

export function useRestartWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/integrations/whatsapp/restart').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp'] }),
  });
}

export function useDeleteWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/integrations/whatsapp/my-instance').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp'] }),
  });
}

export function useSendWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { phone: string; message: string; client_id?: string }) =>
      api.post('/integrations/whatsapp/send', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] }),
  });
}

export function useWhatsAppConversations() {
  return useQuery({
    queryKey: ['whatsapp', 'conversations'],
    queryFn: () => api.get('/integrations/whatsapp/conversations').then((r) => r.data as Conversation[]),
  });
}

export function useWhatsAppMessages(conversationId?: string) {
  return useQuery({
    queryKey: ['whatsapp', 'messages', conversationId],
    queryFn: () =>
      api.get(`/integrations/whatsapp/conversations/${conversationId}/messages`).then((r) => r.data as Message[]),
    enabled: !!conversationId,
  });
}
