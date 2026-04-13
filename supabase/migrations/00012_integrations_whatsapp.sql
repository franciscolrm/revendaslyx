-- ============================================================
-- MIGRATION 00012: WhatsApp por vendedor + conversas
-- ============================================================

-- Instâncias de WhatsApp por usuário (cada vendedor tem seu número)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number    TEXT NOT NULL,
  instance_id     TEXT NOT NULL,
  token           TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'z-api',
  api_url         TEXT DEFAULT 'https://api.z-api.io',
  status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  is_active       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user ON whatsapp_instances(user_id);

-- Conversas (agrupamento de mensagens por cliente)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  remote_phone    TEXT NOT NULL,
  remote_name     TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count    INT DEFAULT 0,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(instance_id, remote_phone)
);

CREATE INDEX IF NOT EXISTS idx_conversations_instance ON whatsapp_conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client ON whatsapp_conversations(client_id);

-- Mensagens individuais
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message_text    TEXT,
  message_type    TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'contact')),
  media_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'error')),
  error_message   TEXT,
  external_id     TEXT,
  sent_by         UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON whatsapp_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_external ON whatsapp_messages(external_id);

-- Triggers
CREATE TRIGGER trg_whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Disable RLS (backend uses service_role)
ALTER TABLE whatsapp_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
