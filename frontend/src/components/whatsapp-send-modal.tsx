'use client';

import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSendWhatsApp, useMyWhatsAppInstance } from '@/hooks/use-whatsapp';

interface WhatsAppSendModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  clientName?: string;
  clientId?: string;
}

export function WhatsAppSendModal({ open, onClose, phone, clientName, clientId }: WhatsAppSendModalProps) {
  const [message, setMessage] = useState('');
  const send = useSendWhatsApp();
  const { data: instance } = useMyWhatsAppInstance();

  if (!open) return null;

  const isConfigured = instance?.configured && instance?.is_active;

  async function handleSend() {
    if (!message.trim() || !phone) return;
    await send.mutateAsync({ phone, message, client_id: clientId });
    setMessage('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[rgb(var(--foreground))]">Enviar WhatsApp</h3>
              <p className="text-[12px] text-[rgb(var(--muted-foreground))]">
                {clientName ? `Para: ${clientName}` : phone}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {!isConfigured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              WhatsApp não configurado. Vá em Configurações → Integrações para conectar seu número.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))]/30 px-3 py-2 text-[12px] text-[rgb(var(--muted-foreground))]">
                Enviando do número: <strong className="text-[rgb(var(--foreground))]">{instance.phone_number}</strong>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
              />

              {send.isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
                  Erro ao enviar. Tente novamente.
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={!message.trim() || send.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {send.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {send.isPending ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Botão reutilizável para colocar em qualquer página
export function WhatsAppButton({ phone, clientName, clientId }: { phone?: string; clientName?: string; clientId?: string }) {
  const [open, setOpen] = useState(false);

  if (!phone) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-[12px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        title="Enviar WhatsApp"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </button>
      <WhatsAppSendModal
        open={open}
        onClose={() => setOpen(false)}
        phone={phone}
        clientName={clientName}
        clientId={clientId}
      />
    </>
  );
}
