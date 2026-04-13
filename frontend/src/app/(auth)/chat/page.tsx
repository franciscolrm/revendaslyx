'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Send,
  MessageCircle,
  Phone,
  User,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  X,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  useMyWhatsAppInstance,
  useWhatsAppConversations,
  useWhatsAppMessages,
  useSendWhatsApp,
  type Conversation,
  type Message,
} from '@/hooks/use-whatsapp';
import Link from 'next/link';

// ── Time formatting ─────────────────────────────────────

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatPhone(phone: string) {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

// ── Message status icon ─────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'sent': return <Check className="h-3 w-3 text-[rgb(var(--muted-foreground))]" />;
    case 'delivered': return <CheckCheck className="h-3 w-3 text-[rgb(var(--muted-foreground))]" />;
    case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'failed': case 'error': return <AlertCircle className="h-3 w-3 text-red-500" />;
    default: return <Clock className="h-3 w-3 text-[rgb(var(--muted-foreground))]" />;
  }
}

// ── Conversation list item ──────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const name = conversation.client?.full_name ?? conversation.remote_name ?? formatPhone(conversation.remote_phone);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-100',
        isActive
          ? 'bg-primary-50 dark:bg-primary-500/10'
          : 'hover:bg-[rgb(var(--muted))]/50',
      )}
    >
      <Avatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className={cn('truncate text-[13px] font-medium', isActive ? 'text-primary-700 dark:text-primary-400' : 'text-[rgb(var(--foreground))]')}>
            {name}
          </span>
          {conversation.last_message_at && (
            <span className="shrink-0 text-[10px] text-[rgb(var(--muted-foreground))]">
              {formatTime(conversation.last_message_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="truncate text-[12px] text-[rgb(var(--muted-foreground))]">
            {formatPhone(conversation.remote_phone)}
          </span>
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message bubble ──────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isOutbound
            ? 'rounded-br-md bg-emerald-500 text-white'
            : 'rounded-bl-md bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--foreground))]',
        )}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
          {message.message_text}
        </p>
        <div className={cn('mt-1 flex items-center justify-end gap-1', isOutbound ? 'text-white/70' : 'text-[rgb(var(--muted-foreground))]')}>
          <span className="text-[10px]">{formatMessageTime(message.created_at)}</span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
        {message.error_message && (
          <p className="mt-1 text-[10px] text-red-300">{message.error_message}</p>
        )}
      </div>
    </div>
  );
}

// ── Main chat page ──────────────────────────────────────

export default function ChatPage() {
  const { data: instance, isLoading: loadingInstance } = useMyWhatsAppInstance();
  const { data: conversations, isLoading: loadingConvs } = useWhatsAppConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');

  const { data: messages, isLoading: loadingMessages } = useWhatsAppMessages(activeConvId ?? undefined);
  const sendMutation = useSendWhatsApp();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations?.find((c) => c.id === activeConvId);

  // Filter conversations
  const filtered = useMemo(() => {
    if (!conversations) return [];
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.client?.full_name?.toLowerCase().includes(q) ||
        c.remote_phone?.includes(q) ||
        c.remote_name?.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation changes
  useEffect(() => {
    if (activeConvId) inputRef.current?.focus();
  }, [activeConvId]);

  async function handleSend() {
    if (!messageText.trim() || !activeConversation) return;
    const text = messageText;
    setMessageText('');

    await sendMutation.mutateAsync({
      phone: activeConversation.remote_phone,
      message: text,
      client_id: activeConversation.client?.id,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Not configured state
  if (!loadingInstance && (!instance?.configured || !instance?.is_active)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
            <WifiOff className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="mt-4 text-[15px] font-semibold text-[rgb(var(--foreground))]">WhatsApp não conectado</h2>
          <p className="mt-2 text-[13px] text-[rgb(var(--muted-foreground))]">
            Conecte seu número de WhatsApp para começar a conversar com clientes.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Wifi className="h-4 w-4" />
            Conectar WhatsApp
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
      {/* Left: Conversation list */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-[rgb(var(--border))]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-[14px] font-semibold text-[rgb(var(--foreground))]">Conversas</h2>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn('h-2 w-2 rounded-full', instance?.is_active ? 'bg-emerald-500' : 'bg-gray-400')} />
            <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
              {instance?.is_active ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="h-9 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-9 pr-3 text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageCircle className="h-10 w-10 text-[rgb(var(--muted-foreground))]/30" />
              <p className="mt-3 text-[13px] text-[rgb(var(--muted-foreground))]">
                {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              <p className="mt-1 text-[11px] text-[rgb(var(--muted-foreground))]/70">
                Envie uma mensagem a partir de um cliente para iniciar
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[rgb(var(--border))]/50">
              {filtered.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConvId === conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat area */}
      <div className="flex flex-1 flex-col">
        {!activeConvId ? (
          /* No conversation selected */
          <div className="flex flex-1 items-center justify-center bg-[rgb(var(--muted))]/20">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[rgb(var(--muted))]/50">
                <MessageCircle className="h-10 w-10 text-[rgb(var(--muted-foreground))]/40" />
              </div>
              <h3 className="mt-4 text-[15px] font-medium text-[rgb(var(--foreground))]">LYX WhatsApp</h3>
              <p className="mt-1 text-[13px] text-[rgb(var(--muted-foreground))]">
                Selecione uma conversa para começar
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={activeConversation?.client?.full_name ?? activeConversation?.remote_phone ?? '?'} size="md" />
                <div>
                  <h3 className="text-[14px] font-semibold text-[rgb(var(--foreground))]">
                    {activeConversation?.client?.full_name ?? formatPhone(activeConversation?.remote_phone ?? '')}
                  </h3>
                  <p className="text-[11px] text-[rgb(var(--muted-foreground))]">
                    {formatPhone(activeConversation?.remote_phone ?? '')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConversation?.client?.id && (
                  <Link
                    href={`/clients/${activeConversation.client.id}`}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 text-[11px] font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver cliente
                  </Link>
                )}
                <button
                  onClick={() => setActiveConvId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] md:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-[rgb(var(--muted))]/10 px-5 py-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : !messages?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageCircle className="h-10 w-10 text-[rgb(var(--muted-foreground))]/30" />
                  <p className="mt-3 text-[13px] text-[rgb(var(--muted-foreground))]">Nenhuma mensagem ainda</p>
                  <p className="mt-1 text-[11px] text-[rgb(var(--muted-foreground))]/70">Envie a primeira mensagem abaixo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[rgb(var(--border))] px-4 py-3">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite uma mensagem..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-[13px] text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ maxHeight: '120px' }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {sendMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
