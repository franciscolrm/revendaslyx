import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '@/common/supabase/supabase.service';

interface SendParams {
  phone: string;
  message: string;
  clientId?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly evolutionUrl: string;
  private readonly evolutionKey: string;

  constructor(
    private supabase: SupabaseService,
    private config: ConfigService,
  ) {
    this.evolutionUrl = this.config.get('EVOLUTION_API_URL', 'http://localhost:8085');
    this.evolutionKey = this.config.get('EVOLUTION_API_KEY', 'LYX-EVOLUTION-API-KEY-2026');
  }

  // ── Evolution API helpers ─��───────────────────────────────

  private async evoFetch(path: string, method = 'GET', body?: any) {
    const url = `${this.evolutionUrl}${path}`;
    const opts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.evolutionKey,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    return resp.json().catch(() => null);
  }

  // ── Instance management ────────���──────────────────────────

  async getInstanceByUser(userId: string) {
    const { data } = await this.supabase.admin
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data;
  }

  async getFullInstanceStatus(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) return { configured: false, status: 'not_configured' };

    // Check real status from Evolution API
    try {
      const resp = await this.evoFetch(`/instance/connectionState/${instance.instance_id}`);
      const state = resp?.instance?.state ?? resp?.state ?? 'close';
      const connected = state === 'open';
      const status = connected ? 'connected' : 'disconnected';

      if (status !== instance.status) {
        await this.supabase.admin.from('whatsapp_instances')
          .update({ status, is_active: connected })
          .eq('id', instance.id);
      }

      return {
        configured: true,
        id: instance.id,
        phone_number: instance.phone_number || '',
        status,
        is_active: connected,
        instance_name: instance.instance_id,
      };
    } catch {
      return {
        configured: true,
        id: instance.id,
        phone_number: instance.phone_number || '',
        status: instance.status,
        is_active: instance.is_active,
        instance_name: instance.instance_id,
      };
    }
  }

  // ── Create instance + get QR ──────────────────────────────

  async createInstance(userId: string, instanceName: string) {
    // Create instance on Evolution API
    const resp = await this.evoFetch('/instance/create', 'POST', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });

    if (!resp || resp.error) {
      this.logger.error(`Create instance failed: ${JSON.stringify(resp)}`);
      throw new Error(resp?.message?.[0] ?? resp?.error ?? 'Erro ao criar instância');
    }

    const qrCode = resp.qrcode?.base64 ?? null;
    const token = resp.hash ?? resp.token ?? '';

    // Save to DB
    const existing = await this.getInstanceByUser(userId);

    if (existing) {
      await this.supabase.admin.from('whatsapp_instances')
        .update({
          instance_id: instanceName,
          token: token,
          status: 'disconnected',
          is_active: false,
          api_url: this.evolutionUrl,
          provider: 'evolution',
        })
        .eq('id', existing.id);
    } else {
      await this.supabase.admin.from('whatsapp_instances')
        .insert({
          user_id: userId,
          instance_id: instanceName,
          token: token,
          phone_number: '',
          status: 'disconnected',
          is_active: false,
          api_url: this.evolutionUrl,
          provider: 'evolution',
        });
    }

    return { success: true, qr_code: qrCode, instance_name: instanceName };
  }

  // ── Get QR Code ────────���──────────────────────────────────

  async getQrCode(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) return { error: 'Instância não configurada' };

    try {
      // First check if already connected
      const stateResp = await this.evoFetch(`/instance/connectionState/${instance.instance_id}`);
      const state = stateResp?.instance?.state ?? stateResp?.state ?? 'close';

      if (state === 'open') {
        return { connected: true, status: 'connected' };
      }

      // Try to connect and get QR
      const resp = await this.evoFetch(`/instance/connect/${instance.instance_id}`);

      if (resp?.base64) {
        return { qr_code: resp.base64, format: 'base64' };
      }
      if (resp?.code) {
        return { qr_code: resp.code, format: 'code' };
      }

      // Instance might need restart
      return { error: 'QR Code não disponível. Tente reconectar.' };
    } catch (err: any) {
      this.logger.error(`QR Code error: ${err.message}`);
      return { error: `Erro: ${err.message}` };
    }
  }

  // ── Connection status (for polling) ───────────────────────

  async getConnectionStatus(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) return { status: 'not_configured' };

    try {
      const resp = await this.evoFetch(`/instance/connectionState/${instance.instance_id}`);
      const state = resp?.instance?.state ?? resp?.state ?? 'close';
      const connected = state === 'open';

      // Get phone number if connected
      let phone = instance.phone_number;
      if (connected && !phone) {
        try {
          const infoResp = await this.evoFetch(`/instance/fetchInstances?instanceName=${instance.instance_id}`);
          const inst = Array.isArray(infoResp) ? infoResp[0] : infoResp;
          phone = inst?.instance?.owner ?? inst?.owner ?? '';
          if (phone) {
            await this.supabase.admin.from('whatsapp_instances')
              .update({ phone_number: phone })
              .eq('id', instance.id);
          }
        } catch {}
      }

      const status = connected ? 'connected' : 'disconnected';
      if (status !== instance.status) {
        await this.supabase.admin.from('whatsapp_instances')
          .update({ status, is_active: connected })
          .eq('id', instance.id);
      }

      return { status, phone, connected };
    } catch {
      return { status: instance.status, phone: instance.phone_number, connected: instance.status === 'connected' };
    }
  }

  // ── Disconnect ────────────────────────────────────────────

  async disconnect(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) throw new NotFoundException('Instância não encontrada');

    try {
      await this.evoFetch(`/instance/logout/${instance.instance_id}`, 'DELETE');
    } catch {}

    await this.supabase.admin.from('whatsapp_instances')
      .update({ status: 'disconnected', is_active: false })
      .eq('id', instance.id);

    return { status: 'disconnected' };
  }

  // ── Restart ───────────────────────────────────────────────

  async restart(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) throw new NotFoundException('Instância não encontrada');

    try {
      await this.evoFetch(`/instance/restart/${instance.instance_id}`, 'PUT');
    } catch {}

    await this.supabase.admin.from('whatsapp_instances')
      .update({ status: 'disconnected', is_active: false })
      .eq('id', instance.id);

    return { status: 'restarting' };
  }

  // ── Delete instance ───────────────────────────────────────

  async deleteInstance(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) return;

    try {
      await this.evoFetch(`/instance/delete/${instance.instance_id}`, 'DELETE');
    } catch {}

    await this.supabase.admin.from('whatsapp_instances')
      .delete()
      .eq('id', instance.id);

    return { deleted: true };
  }

  // ── Send message ─────���────────────────────────────���───────

  async sendMessage(userId: string, params: SendParams) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) throw new NotFoundException('WhatsApp não conectado.');
    if (!instance.is_active) throw new ForbiddenException('WhatsApp desconectado.');

    const phone = this.normalizePhone(params.phone);
    if (!phone) throw new ForbiddenException('Número de telefone inválido');

    const conversation = await this.getOrCreateConversation(instance.id, phone, params.clientId);

    const { data: msg } = await this.supabase.admin
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'outbound',
        message_text: params.message,
        status: 'pending',
        sent_by: userId,
      })
      .select('id')
      .single();

    this.logger.log(`WhatsApp [${instance.instance_id}] -> ${phone}`);

    try {
      const resp = await this.evoFetch(`/message/sendText/${instance.instance_id}`, 'POST', {
        number: phone,
        text: params.message,
      });

      if (resp?.key?.id) {
        if (msg?.id) {
          await this.supabase.admin.from('whatsapp_messages')
            .update({ status: 'sent', external_id: resp.key.id })
            .eq('id', msg.id);
        }
        await this.supabase.admin.from('whatsapp_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversation.id);

        return { success: true, messageId: resp.key.id, conversationId: conversation.id };
      }

      const errorMsg = resp?.error ?? resp?.message ?? 'Erro desconhecido';
      if (msg?.id) {
        await this.supabase.admin.from('whatsapp_messages')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', msg.id);
      }
      return { success: false, error: errorMsg };
    } catch (err: any) {
      if (msg?.id) {
        await this.supabase.admin.from('whatsapp_messages')
          .update({ status: 'error', error_message: err.message })
          .eq('id', msg.id);
      }
      return { success: false, error: err.message };
    }
  }

  // ── Conversations ─────────────────────────────────────────

  async getConversations(userId: string) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) return [];

    const { data } = await this.supabase.admin
      .from('whatsapp_conversations')
      .select('*, client:clients(id, full_name, document_number, phone)')
      .eq('instance_id', instance.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    return data ?? [];
  }

  async getMessages(userId: string, conversationId: string, limit = 50) {
    const instance = await this.getInstanceByUser(userId);
    if (!instance) throw new NotFoundException('WhatsApp não configurado');

    const { data: conv } = await this.supabase.admin
      .from('whatsapp_conversations')
      .select('instance_id')
      .eq('id', conversationId)
      .single();

    if (!conv || conv.instance_id !== instance.id) {
      throw new ForbiddenException('Conversa não pertence a este usuário');
    }

    const { data } = await this.supabase.admin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    await this.supabase.admin.from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    return data ?? [];
  }

  // ── Webhook ─────��─────────────────────────────────────────

  async handleWebhook(payload: any) {
    const event = payload.event;
    const instanceName = payload.instance;

    this.logger.log(`Webhook: ${event} from ${instanceName}`);

    if (event === 'messages.upsert') {
      return this.handleIncomingMessage(instanceName, payload.data);
    }

    if (event === 'connection.update') {
      return this.handleConnectionUpdate(instanceName, payload.data);
    }

    return { received: true };
  }

  private async handleIncomingMessage(instanceName: string, data: any) {
    const { data: instance } = await this.supabase.admin
      .from('whatsapp_instances')
      .select('id')
      .eq('instance_id', instanceName)
      .maybeSingle();

    if (!instance) return { received: false };

    const msg = data;
    if (!msg || msg.key?.fromMe) return { received: true }; // Skip own messages

    const phone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') ?? '';
    const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';

    if (!phone || !text) return { received: true };

    const conversation = await this.getOrCreateConversation(instance.id, phone);

    await this.supabase.admin.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_text: text,
      status: 'delivered',
      external_id: msg.key?.id,
    });

    await this.supabase.admin.from('whatsapp_conversations').update({
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count ?? 0) + 1,
      remote_name: msg.pushName ?? conversation.remote_name,
    }).eq('id', conversation.id);

    return { received: true, conversationId: conversation.id };
  }

  private async handleConnectionUpdate(instanceName: string, data: any) {
    const state = data?.state ?? data?.connection;
    if (!state) return;

    const connected = state === 'open';
    await this.supabase.admin.from('whatsapp_instances')
      .update({ status: connected ? 'connected' : 'disconnected', is_active: connected })
      .eq('instance_id', instanceName);
  }

  // ── Helpers ───────────────────────────────────────────────

  private async getOrCreateConversation(whatsappInstanceId: string, remotePhone: string, clientId?: string) {
    const { data: existing } = await this.supabase.admin
      .from('whatsapp_conversations')
      .select('*')
      .eq('instance_id', whatsappInstanceId)
      .eq('remote_phone', remotePhone)
      .maybeSingle();

    if (existing) {
      if (clientId && !existing.client_id) {
        await this.supabase.admin.from('whatsapp_conversations')
          .update({ client_id: clientId })
          .eq('id', existing.id);
      }
      return existing;
    }

    let resolvedClientId = clientId;
    if (!resolvedClientId) {
      const { data: client } = await this.supabase.admin
        .from('clients')
        .select('id')
        .eq('phone', remotePhone)
        .maybeSingle();
      if (client) resolvedClientId = client.id;
    }

    const { data } = await this.supabase.admin
      .from('whatsapp_conversations')
      .insert({
        instance_id: whatsappInstanceId,
        remote_phone: remotePhone,
        client_id: resolvedClientId,
      })
      .select('*')
      .single();

    return data;
  }

  private normalizePhone(phone: string): string | null {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
    if (digits.length < 12 || digits.length > 13) return null;
    return digits;
  }
}
