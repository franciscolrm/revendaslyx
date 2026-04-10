-- ============================================================
-- MIGRATION 00009: CRM Schema - Clientes, Unidades, Processos,
-- Documentos, Tarefas, Atividades, Notificações, Comentários, Tags
-- ============================================================

-- ============================================
-- 1. CLIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_type     TEXT NOT NULL CHECK (client_type IN ('seller', 'buyer', 'both')),
  full_name       TEXT NOT NULL,
  document_number TEXT,
  document_type   TEXT CHECK (document_type IN ('cpf', 'cnpj')),
  email           TEXT,
  phone           TEXT,
  phone_secondary TEXT,
  address_street  TEXT,
  address_number  TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city    TEXT,
  address_state   TEXT CHECK (LENGTH(address_state) = 2 OR address_state IS NULL),
  address_zip     TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_document ON clients(document_number);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_name ON clients(full_name);
CREATE INDEX idx_clients_status ON clients(status);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 2. CONTATOS DO CLIENTE
-- ============================================
CREATE TABLE IF NOT EXISTS client_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_type    TEXT NOT NULL CHECK (contact_type IN ('whatsapp', 'phone', 'email', 'visit', 'meeting', 'note')),
  contact_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  subject         TEXT,
  notes           TEXT,
  performed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX idx_client_contacts_date ON client_contacts(contact_date);

-- ============================================
-- 3. EMPREENDIMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS enterprises (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE,
  address_street  TEXT,
  address_number  TEXT,
  address_neighborhood TEXT,
  address_city    TEXT,
  address_state   TEXT CHECK (LENGTH(address_state) = 2 OR address_state IS NULL),
  address_zip     TEXT,
  total_units     INT DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_enterprises_updated_at
  BEFORE UPDATE ON enterprises
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_enterprises
  AFTER INSERT OR UPDATE OR DELETE ON enterprises
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 4. UNIDADES
-- ============================================
CREATE TABLE IF NOT EXISTS units (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id       UUID REFERENCES enterprises(id),
  block_tower         TEXT,
  unit_number         TEXT NOT NULL,
  floor               TEXT,
  unit_type           TEXT CHECK (unit_type IN ('apartment', 'house', 'commercial', 'land', 'other')),
  area_m2             NUMERIC(10,2),
  original_value      NUMERIC(15,2),
  current_value       NUMERIC(15,2),
  status              TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'in_resale', 'reserved', 'transferred', 'unavailable')),
  stock_available     BOOLEAN DEFAULT false,
  original_client_id  UUID REFERENCES clients(id),
  current_client_id   UUID REFERENCES clients(id),
  debts_cadin         NUMERIC(15,2) DEFAULT 0,
  debts_iptu          NUMERIC(15,2) DEFAULT 0,
  debts_condominio    NUMERIC(15,2) DEFAULT 0,
  debts_other         NUMERIC(15,2) DEFAULT 0,
  debts_description   TEXT,
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_enterprise ON units(enterprise_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_original_client ON units(original_client_id);
CREATE INDEX idx_units_current_client ON units(current_client_id);
CREATE INDEX idx_units_stock ON units(stock_available) WHERE stock_available = true;

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_units
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 5. TIPOS DE FLUXO DE REVENDA
-- ============================================
CREATE TABLE IF NOT EXISTS resale_flow_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  total_stages    INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. ETAPAS DO FLUXO
-- ============================================
CREATE TABLE IF NOT EXISTS flow_stages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type_id        UUID NOT NULL REFERENCES resale_flow_types(id) ON DELETE CASCADE,
  stage_order         INT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  stage_group         TEXT NOT NULL CHECK (stage_group IN (
    'prospeccao', 'contato', 'cartorio', 'comercial',
    'caixa', 'financiamento', 'transferencia', 'recebimento', 'encerramento'
  )),
  sla_days            INT DEFAULT 0,
  requires_documents  BOOLEAN DEFAULT false,
  requires_tasks      BOOLEAN DEFAULT false,
  auto_tasks          JSONB DEFAULT '[]'::jsonb,
  checklist           JSONB DEFAULT '[]'::jsonb,
  is_active           BOOLEAN DEFAULT true,
  UNIQUE(flow_type_id, stage_order)
);

CREATE INDEX idx_flow_stages_flow_type ON flow_stages(flow_type_id);

-- ============================================
-- 7. PROCESSOS DE REVENDA
-- ============================================
CREATE TABLE IF NOT EXISTS resale_processes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code      TEXT UNIQUE,
  flow_type_id      UUID NOT NULL REFERENCES resale_flow_types(id),
  unit_id           UUID REFERENCES units(id),
  seller_client_id  UUID REFERENCES clients(id),
  buyer_client_id   UUID REFERENCES clients(id),
  current_stage_id  UUID REFERENCES flow_stages(id),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  assigned_user_id  UUID REFERENCES users(id),
  region_id         UUID REFERENCES regions(id),
  branch_id         UUID REFERENCES branches(id),
  team_id           UUID REFERENCES teams(id),
  priority          TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  started_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_processes_flow_type ON resale_processes(flow_type_id);
CREATE INDEX idx_processes_unit ON resale_processes(unit_id);
CREATE INDEX idx_processes_seller ON resale_processes(seller_client_id);
CREATE INDEX idx_processes_buyer ON resale_processes(buyer_client_id);
CREATE INDEX idx_processes_stage ON resale_processes(current_stage_id);
CREATE INDEX idx_processes_status ON resale_processes(status);
CREATE INDEX idx_processes_assigned ON resale_processes(assigned_user_id);
CREATE INDEX idx_processes_branch ON resale_processes(branch_id);
CREATE INDEX idx_processes_team ON resale_processes(team_id);
CREATE INDEX idx_processes_priority ON resale_processes(priority) WHERE priority IN ('high', 'urgent');

CREATE TRIGGER trg_processes_updated_at
  BEFORE UPDATE ON resale_processes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_processes
  AFTER INSERT OR UPDATE OR DELETE ON resale_processes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Sequence para gerar process_code automaticamente
CREATE OR REPLACE FUNCTION generate_process_code()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(process_code FROM 'REV-\d{4}-(\d+)') AS INT)
  ), 0) + 1
  INTO v_seq
  FROM resale_processes
  WHERE process_code LIKE 'REV-' || v_year || '-%';

  NEW.process_code := 'REV-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_process_code
  BEFORE INSERT ON resale_processes
  FOR EACH ROW
  WHEN (NEW.process_code IS NULL)
  EXECUTE FUNCTION generate_process_code();

-- ============================================
-- 8. HISTÓRICO DE ETAPAS DO PROCESSO
-- ============================================
CREATE TABLE IF NOT EXISTS process_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID NOT NULL REFERENCES resale_processes(id) ON DELETE CASCADE,
  from_stage_id   UUID REFERENCES flow_stages(id),
  to_stage_id     UUID NOT NULL REFERENCES flow_stages(id),
  changed_by      UUID REFERENCES users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT,
  notes           TEXT
);

CREATE INDEX idx_stage_history_process ON process_stage_history(process_id);
CREATE INDEX idx_stage_history_date ON process_stage_history(changed_at);

-- ============================================
-- 9. CATEGORIAS DE DOCUMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS document_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 10. DOCUMENTOS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID REFERENCES document_categories(id),
  process_id      UUID REFERENCES resale_processes(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  unit_id         UUID REFERENCES units(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  file_name       TEXT,
  storage_path    TEXT,
  mime_type       TEXT,
  file_size       INT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'validated', 'rejected', 'expired')),
  version         INT DEFAULT 1,
  rejection_reason TEXT,
  validated_by    UUID REFERENCES users(id),
  validated_at    TIMESTAMPTZ,
  uploaded_by     UUID REFERENCES users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_process ON documents(process_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_unit ON documents(unit_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category_id);

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 11. TAREFAS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID REFERENCES resale_processes(id) ON DELETE CASCADE,
  stage_id        UUID REFERENCES flow_stages(id),
  title           TEXT NOT NULL,
  description     TEXT,
  task_type       TEXT NOT NULL DEFAULT 'manual' CHECK (task_type IN ('manual', 'automatic', 'checklist')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to     UUID REFERENCES users(id),
  due_date        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_process ON tasks(process_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_tasks_stage ON tasks(stage_id);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 12. COMENTÁRIOS DE TAREFAS
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- ============================================
-- 13. ATIVIDADES / AGENDA
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID REFERENCES resale_processes(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  activity_type   TEXT NOT NULL CHECK (activity_type IN (
    'whatsapp', 'call', 'meeting', 'cartorio', 'caixa_interview',
    'signing', 'uber', 'visit', 'note', 'email', 'other'
  )),
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  assigned_to     UUID REFERENCES users(id),
  location        TEXT,
  result          TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_process ON activities(process_id);
CREATE INDEX idx_activities_client ON activities(client_id);
CREATE INDEX idx_activities_scheduled ON activities(scheduled_at);
CREATE INDEX idx_activities_assigned ON activities(assigned_to);
CREATE INDEX idx_activities_status ON activities(status);

CREATE TRIGGER trg_audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 14. FINANCEIRO DO PROCESSO
-- ============================================
CREATE TABLE IF NOT EXISTS process_financial_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id          UUID NOT NULL REFERENCES resale_processes(id) ON DELETE CASCADE,
  component_id        UUID REFERENCES resale_financial_components(id),
  entry_type          TEXT NOT NULL CHECK (entry_type IN ('receivable', 'payable', 'received', 'paid', 'transfer')),
  description         TEXT,
  amount              NUMERIC(15,2) NOT NULL,
  due_date            DATE,
  paid_date           DATE,
  payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled', 'partial')),
  installment_number  INT,
  total_installments  INT,
  receipt_path        TEXT,
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_entries_process ON process_financial_entries(process_id);
CREATE INDEX idx_fin_entries_status ON process_financial_entries(payment_status);
CREATE INDEX idx_fin_entries_due_date ON process_financial_entries(due_date) WHERE payment_status IN ('pending', 'overdue');
CREATE INDEX idx_fin_entries_type ON process_financial_entries(entry_type);

CREATE TRIGGER trg_fin_entries_updated_at
  BEFORE UPDATE ON process_financial_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_fin_entries
  AFTER INSERT OR UPDATE OR DELETE ON process_financial_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ============================================
-- 15. NOTIFICAÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT,
  type            TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'task', 'stage', 'document')),
  reference_type  TEXT CHECK (reference_type IN ('process', 'task', 'document', 'activity', 'client', 'unit')),
  reference_id    UUID,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- 16. COMENTÁRIOS DO PROCESSO
-- ============================================
CREATE TABLE IF NOT EXISTS process_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID NOT NULL REFERENCES resale_processes(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  is_internal     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_process ON process_comments(process_id);
CREATE INDEX idx_comments_user ON process_comments(user_id);

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON process_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 17. TAGS
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT UNIQUE NOT NULL,
  color           TEXT DEFAULT '#3B82F6',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS process_tags (
  process_id      UUID NOT NULL REFERENCES resale_processes(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (process_id, tag_id)
);

-- ============================================
-- 18. NOVAS PERMISSÕES
-- ============================================
INSERT INTO permissions (id, module, action, description) VALUES
  (gen_random_uuid(), 'clients', 'view', 'Visualizar clientes'),
  (gen_random_uuid(), 'clients', 'create', 'Criar clientes'),
  (gen_random_uuid(), 'clients', 'edit', 'Editar clientes'),
  (gen_random_uuid(), 'clients', 'delete', 'Excluir clientes'),
  (gen_random_uuid(), 'units', 'view', 'Visualizar unidades'),
  (gen_random_uuid(), 'units', 'create', 'Criar unidades'),
  (gen_random_uuid(), 'units', 'edit', 'Editar unidades'),
  (gen_random_uuid(), 'units', 'delete', 'Excluir unidades'),
  (gen_random_uuid(), 'processes', 'view', 'Visualizar processos'),
  (gen_random_uuid(), 'processes', 'create', 'Criar processos'),
  (gen_random_uuid(), 'processes', 'edit', 'Editar processos'),
  (gen_random_uuid(), 'processes', 'delete', 'Excluir processos'),
  (gen_random_uuid(), 'processes', 'advance', 'Avançar/retornar etapa'),
  (gen_random_uuid(), 'documents', 'view', 'Visualizar documentos'),
  (gen_random_uuid(), 'documents', 'upload', 'Upload de documentos'),
  (gen_random_uuid(), 'documents', 'validate', 'Validar/rejeitar documentos'),
  (gen_random_uuid(), 'documents', 'delete', 'Excluir documentos'),
  (gen_random_uuid(), 'tasks', 'view', 'Visualizar tarefas'),
  (gen_random_uuid(), 'tasks', 'create', 'Criar tarefas'),
  (gen_random_uuid(), 'tasks', 'edit', 'Editar tarefas'),
  (gen_random_uuid(), 'tasks', 'complete', 'Concluir tarefas'),
  (gen_random_uuid(), 'activities', 'view', 'Visualizar atividades'),
  (gen_random_uuid(), 'activities', 'create', 'Criar atividades'),
  (gen_random_uuid(), 'notifications', 'view', 'Visualizar notificações')
ON CONFLICT (module, action) DO NOTHING;

-- Dar todas as novas permissões para super_admin e admin_pyx
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('super_admin', 'admin_pyx')
  AND p.module IN ('clients', 'units', 'processes', 'documents', 'tasks', 'activities', 'notifications')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para diretoria
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'diretoria'
  AND (
    (p.module = 'clients' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'units' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'processes' AND p.action IN ('view', 'create', 'edit', 'advance'))
    OR (p.module = 'documents' AND p.action IN ('view', 'upload', 'validate'))
    OR (p.module = 'tasks' AND p.action IN ('view', 'create', 'edit', 'complete'))
    OR (p.module = 'activities' AND p.action IN ('view', 'create'))
    OR (p.module = 'notifications' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para gerente_regional
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'gerente_regional'
  AND (
    (p.module = 'clients' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'units' AND p.action IN ('view'))
    OR (p.module = 'processes' AND p.action IN ('view', 'create', 'edit', 'advance'))
    OR (p.module = 'documents' AND p.action IN ('view', 'upload'))
    OR (p.module = 'tasks' AND p.action IN ('view', 'create', 'edit', 'complete'))
    OR (p.module = 'activities' AND p.action IN ('view', 'create'))
    OR (p.module = 'notifications' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para supervisor
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'supervisor'
  AND (
    (p.module = 'clients' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'units' AND p.action IN ('view'))
    OR (p.module = 'processes' AND p.action IN ('view', 'edit', 'advance'))
    OR (p.module = 'documents' AND p.action IN ('view', 'upload'))
    OR (p.module = 'tasks' AND p.action IN ('view', 'create', 'complete'))
    OR (p.module = 'activities' AND p.action IN ('view', 'create'))
    OR (p.module = 'notifications' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para revendedor
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'revendedor'
  AND (
    (p.module = 'clients' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'units' AND p.action IN ('view'))
    OR (p.module = 'processes' AND p.action IN ('view'))
    OR (p.module = 'documents' AND p.action IN ('view', 'upload'))
    OR (p.module = 'tasks' AND p.action IN ('view', 'complete'))
    OR (p.module = 'activities' AND p.action IN ('view', 'create'))
    OR (p.module = 'notifications' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para financeiro
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'financeiro'
  AND (
    (p.module = 'clients' AND p.action IN ('view'))
    OR (p.module = 'units' AND p.action IN ('view'))
    OR (p.module = 'processes' AND p.action IN ('view'))
    OR (p.module = 'documents' AND p.action IN ('view', 'upload', 'validate'))
    OR (p.module = 'tasks' AND p.action IN ('view'))
    OR (p.module = 'notifications' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para backoffice
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'backoffice'
  AND (
    (p.module = 'clients' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'units' AND p.action IN ('view', 'create', 'edit'))
    OR (p.module = 'processes' AND p.action IN ('view', 'create', 'edit', 'advance'))
    OR (p.module = 'documents' AND p.action IN ('view', 'upload', 'validate'))
    OR (p.module = 'tasks' AND p.action IN ('view', 'create', 'edit', 'complete'))
    OR (p.module = 'activities' AND p.action IN ('view', 'create'))
    OR (p.module = 'notifications' AND p.action = 'view')
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Permissões para auditoria (somente view)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'auditoria'
  AND p.action = 'view'
  AND p.module IN ('clients', 'units', 'processes', 'documents', 'tasks', 'activities', 'notifications')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 19. SEED: CATEGORIAS DE DOCUMENTOS
-- ============================================
INSERT INTO document_categories (id, name, code, description) VALUES
  (gen_random_uuid(), 'Procuração', 'procuracao', 'Procuração com intenção de venda'),
  (gen_random_uuid(), 'Contrato', 'contrato', 'Contrato particular de compra e venda'),
  (gen_random_uuid(), 'Formulário Caixa', 'formulario_caixa', 'Formulários para processo Caixa'),
  (gen_random_uuid(), 'Laudo', 'laudo', 'Laudo de avaliação da unidade'),
  (gen_random_uuid(), 'Minuta', 'minuta', 'Minuta do financiamento'),
  (gen_random_uuid(), 'Escritura', 'escritura', 'Escritura do imóvel'),
  (gen_random_uuid(), 'Comprovante', 'comprovante', 'Comprovante de pagamento'),
  (gen_random_uuid(), 'Identidade', 'identidade', 'Documento de identidade (RG/CNH)'),
  (gen_random_uuid(), 'CPF', 'cpf', 'Cadastro de Pessoa Física'),
  (gen_random_uuid(), 'Comprovante Residência', 'comp_residencia', 'Comprovante de residência'),
  (gen_random_uuid(), 'Certidão', 'certidao', 'Certidões diversas'),
  (gen_random_uuid(), 'CEHOP', 'cehop', 'Documentos CEHOP'),
  (gen_random_uuid(), 'Conformidade', 'conformidade', 'Recebimento de conformidade'),
  (gen_random_uuid(), 'Outros', 'outros', 'Outros documentos')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 20. SEED: TIPOS DE FLUXO + ETAPAS
-- ============================================

-- Fluxo 1: Reversão/Revenda Padrão
INSERT INTO resale_flow_types (id, name, code, description, total_stages)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Reversão / Revenda Padrão',
  'standard',
  'Fluxo padrão de reversão e revenda de unidades',
  24
);

INSERT INTO flow_stages (flow_type_id, stage_order, name, description, stage_group, sla_days, requires_documents, auto_tasks, checklist) VALUES
('11111111-1111-1111-1111-111111111111', 1, 'Venda original LYX', 'LYX vende unidade para Cliente 1', 'prospeccao', 0, false, '[]', '[]'),
('11111111-1111-1111-1111-111111111111', 2, 'Inadimplência do cliente', 'Cliente 1 torna-se inadimplente com a Caixa', 'prospeccao', 0, false, '[]', '[]'),
('11111111-1111-1111-1111-111111111111', 3, 'Solicitação Caixa', 'Caixa solicita revenda da unidade', 'prospeccao', 3, true, '[]', '["Receber notificação da Caixa"]'),
('11111111-1111-1111-1111-111111111111', 4, 'Proposta de revenda', 'Proposta de revenda do imóvel para o cliente 1', 'contato', 5, false, '[]', '["Enviar proposta ao cliente"]'),
('11111111-1111-1111-1111-111111111111', 5, 'Cliente aceita vender', 'Cliente aceita a proposta de venda', 'contato', 7, false, '[]', '["Registrar aceite do cliente"]'),
('11111111-1111-1111-1111-111111111111', 6, 'Contato WhatsApp', 'Entrar em contato via WhatsApp para agendamento', 'contato', 2, false, '[{"title":"Enviar mensagem WhatsApp","type":"automatic"}]', '["Contato realizado","Agendamento confirmado"]'),
('11111111-1111-1111-1111-111111111111', 7, 'Solicitação Uber', 'Solicitação de Uber de ida e volta para o cartório', 'cartorio', 2, false, '[{"title":"Solicitar Uber para cartório","type":"automatic"}]', '["Uber solicitado"]'),
('11111111-1111-1111-1111-111111111111', 8, 'Assinatura procuração', 'Cliente assina procuração com intenção de venda', 'cartorio', 3, true, '[]', '["Procuração assinada"]'),
('11111111-1111-1111-1111-111111111111', 9, 'Procuração recebida', 'Procuração recebida - cadastrar unidade no CRM', 'cartorio', 2, true, '[{"title":"Cadastrar unidade no sistema","type":"automatic"}]', '["Procuração digitalizada","Unidade cadastrada"]'),
('11111111-1111-1111-1111-111111111111', 10, 'Liberar no espelho', 'Liberar unidade no estoque/espelho para venda', 'comercial', 1, false, '[]', '["Unidade liberada no espelho"]'),
('11111111-1111-1111-1111-111111111111', 11, 'Captação comprador', 'Captação de novo comprador', 'comercial', 30, false, '[]', '["Comprador identificado"]'),
('11111111-1111-1111-1111-111111111111', 12, 'Venda comprador 2', 'Venda para comprador 2', 'comercial', 5, false, '[]', '["Venda acordada"]'),
('11111111-1111-1111-1111-111111111111', 13, 'Sinal de negócio', 'Pagamento de sinal de negócio do comprador 2', 'comercial', 3, true, '[]', '["Sinal recebido","Comprovante anexado"]'),
('11111111-1111-1111-1111-111111111111', 14, 'Contrato particular', 'Assinatura de contrato particular de compra e venda', 'comercial', 5, true, '[]', '["Contrato assinado por ambas as partes"]'),
('11111111-1111-1111-1111-111111111111', 15, 'Início processo Caixa', 'Início do processo Caixa', 'caixa', 5, true, '[]', '["Documentação inicial enviada"]'),
('11111111-1111-1111-1111-111111111111', 16, 'Internalização Caixa', 'Cliente internalizado / avaliação Caixa', 'caixa', 10, false, '[]', '["Cliente internalizado"]'),
('11111111-1111-1111-1111-111111111111', 17, 'Assinatura formulários', 'Assinatura de formulários', 'caixa', 5, true, '[]', '["Formulários assinados"]'),
('11111111-1111-1111-1111-111111111111', 18, 'Envio CEHOP', 'Envio para CEHOP', 'caixa', 5, true, '[]', '["Documentos enviados ao CEHOP"]'),
('11111111-1111-1111-1111-111111111111', 19, 'Conformidade', 'Recebimento de conformidade', 'caixa', 10, true, '[]', '["Conformidade recebida"]'),
('11111111-1111-1111-1111-111111111111', 20, 'Entrevista Caixa', 'Entrevista Caixa', 'financiamento', 5, false, '[{"title":"Agendar entrevista Caixa","type":"automatic"}]', '["Entrevista realizada"]'),
('11111111-1111-1111-1111-111111111111', 21, 'Assinatura minuta', 'Assinatura da minuta do financiamento', 'financiamento', 5, true, '[]', '["Minuta assinada"]'),
('11111111-1111-1111-1111-111111111111', 22, 'Transferência final', 'Transferência final da propriedade', 'transferencia', 10, true, '[]', '["Transferência registrada"]'),
('11111111-1111-1111-1111-111111111111', 23, 'Recebimento débitos SPE', 'Recebimento de débitos na conta da SPE', 'recebimento', 10, true, '[]', '["Valores recebidos na conta SPE"]'),
('11111111-1111-1111-1111-111111111111', 24, 'Recebimento parcelas', 'Recebimento de parcelas mensais do comprador 2', 'recebimento', 0, false, '[]', '["Parcelas em dia"]');

-- Fluxo 2: Revenda Usado (Jersey City)
INSERT INTO resale_flow_types (id, name, code, description, total_stages)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Revenda Usado - Jersey City',
  'jersey_city',
  'Fluxo de revenda de imóvel usado (Jersey City)',
  28
);

INSERT INTO flow_stages (flow_type_id, stage_order, name, description, stage_group, sla_days, requires_documents, auto_tasks, checklist) VALUES
('22222222-2222-2222-2222-222222222222', 1, 'Venda original LYX', 'LYX vende unidade para Cliente 1', 'prospeccao', 0, false, '[]', '[]'),
('22222222-2222-2222-2222-222222222222', 2, 'Inadimplência do cliente', 'Cliente 1 torna-se inadimplente com a Caixa', 'prospeccao', 0, false, '[]', '[]'),
('22222222-2222-2222-2222-222222222222', 3, 'Solicitação Caixa', 'Caixa solicita revenda da unidade', 'prospeccao', 3, true, '[]', '["Receber notificação da Caixa"]'),
('22222222-2222-2222-2222-222222222222', 4, 'Confirmação Caixa', 'Caixa confirma solicitação de revenda', 'prospeccao', 3, true, '[]', '["Confirmação recebida"]'),
('22222222-2222-2222-2222-222222222222', 5, 'Proposta de revenda', 'Proposta de revenda do imóvel para o cliente 1', 'contato', 5, false, '[]', '["Enviar proposta ao cliente"]'),
('22222222-2222-2222-2222-222222222222', 6, 'Cliente aceita vender', 'Cliente aceita a proposta de venda', 'contato', 7, false, '[]', '["Registrar aceite do cliente"]'),
('22222222-2222-2222-2222-222222222222', 7, 'Contato WhatsApp', 'Entrar em contato via WhatsApp para agendamento', 'contato', 2, false, '[{"title":"Enviar mensagem WhatsApp","type":"automatic"}]', '["Contato realizado","Agendamento confirmado"]'),
('22222222-2222-2222-2222-222222222222', 8, 'Solicitação Uber', 'Solicitação de Uber de ida e volta para o cartório', 'cartorio', 2, false, '[{"title":"Solicitar Uber para cartório","type":"automatic"}]', '["Uber solicitado"]'),
('22222222-2222-2222-2222-222222222222', 9, 'Assinatura procuração', 'Cliente assina procuração com intenção de venda', 'cartorio', 3, true, '[]', '["Procuração assinada"]'),
('22222222-2222-2222-2222-222222222222', 10, 'Procuração recebida', 'Procuração recebida - cadastrar unidade no CRM', 'cartorio', 2, true, '[{"title":"Cadastrar unidade no sistema","type":"automatic"}]', '["Procuração digitalizada","Unidade cadastrada"]'),
('22222222-2222-2222-2222-222222222222', 11, 'Liberar no espelho', 'Liberar unidade no estoque/espelho para venda', 'comercial', 1, false, '[]', '["Unidade liberada no espelho"]'),
('22222222-2222-2222-2222-222222222222', 12, 'Captação comprador', 'Captação de novo comprador', 'comercial', 30, false, '[]', '["Comprador identificado"]'),
('22222222-2222-2222-2222-222222222222', 13, 'Venda comprador 2', 'Venda para o comprador 2', 'comercial', 5, false, '[]', '["Venda acordada"]'),
('22222222-2222-2222-2222-222222222222', 14, 'Sinal de negócio', 'Pagamento de sinal de negócio do comprador 2', 'comercial', 3, true, '[]', '["Sinal recebido","Comprovante anexado"]'),
('22222222-2222-2222-2222-222222222222', 15, 'Contrato particular', 'Assinatura de contrato particular de compra e venda', 'comercial', 5, true, '[]', '["Contrato assinado por ambas as partes"]'),
('22222222-2222-2222-2222-222222222222', 16, 'Solicitar laudo', 'Solicitar laudo da unidade (R$ 750,00)', 'caixa', 5, true, '[{"title":"Solicitar laudo - R$ 750,00","type":"automatic"}]', '["Laudo solicitado","Pagamento do laudo realizado"]'),
('22222222-2222-2222-2222-222222222222', 17, 'Início processo Caixa', 'Início do processo Caixa', 'caixa', 5, true, '[]', '["Documentação inicial enviada"]'),
('22222222-2222-2222-2222-222222222222', 18, 'Assinatura formulários', 'Assinatura de formulários', 'caixa', 5, true, '[]', '["Formulários assinados"]'),
('22222222-2222-2222-2222-222222222222', 19, 'Envio CEHOP', 'Envio para CEHOP', 'caixa', 5, true, '[]', '["Documentos enviados ao CEHOP"]'),
('22222222-2222-2222-2222-222222222222', 20, 'Conformidade', 'Recebimento de conformidade', 'caixa', 10, true, '[]', '["Conformidade recebida"]'),
('22222222-2222-2222-2222-222222222222', 21, 'Entrevista Caixa', 'Entrevista Caixa', 'financiamento', 5, false, '[{"title":"Agendar entrevista Caixa","type":"automatic"}]', '["Entrevista realizada"]'),
('22222222-2222-2222-2222-222222222222', 22, 'Pagamento débitos', 'Pagamento de débitos da unidade (CADIN, IPTU, CONDOMÍNIO)', 'financiamento', 10, true, '[]', '["CADIN quitado","IPTU quitado","Condomínio quitado"]'),
('22222222-2222-2222-2222-222222222222', 23, 'Assinatura minuta', 'Assinatura da minuta do financiamento', 'financiamento', 5, true, '[]', '["Minuta assinada"]'),
('22222222-2222-2222-2222-222222222222', 24, 'Transferência final', 'Transferência final da propriedade', 'transferencia', 10, true, '[]', '["Transferência registrada"]'),
('22222222-2222-2222-2222-222222222222', 25, 'Conta comprador 1', 'Conta em nome do comprador 1 aberta', 'recebimento', 5, false, '[]', '["Conta aberta"]'),
('22222222-2222-2222-2222-222222222222', 26, 'Recebimento valores', 'Recebimento de valores na conta do comprador', 'recebimento', 10, true, '[]', '["Valores recebidos"]'),
('22222222-2222-2222-2222-222222222222', 27, 'Transferência SPE', 'Transferência de valores para conta da SPE', 'recebimento', 5, true, '[]', '["Transferência para SPE realizada"]'),
('22222222-2222-2222-2222-222222222222', 28, 'Encerramento conta', 'Encerramento da conta do comprador 1', 'encerramento', 5, false, '[]', '["Conta encerrada"]');

-- ============================================
-- 21. STORAGE BUCKET PARA DOCUMENTOS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Política de upload para bucket de documentos
CREATE POLICY "documents_upload_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
  );

-- Política de leitura para bucket de documentos
CREATE POLICY "documents_read_policy" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
  );

-- Política de delete para bucket de documentos
CREATE POLICY "documents_delete_policy" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
  );

-- ============================================
-- 22. RLS POLICIES PARA NOVAS TABELAS
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_flow_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_tags ENABLE ROW LEVEL SECURITY;

-- Clients
CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (user_has_permission('clients', 'view'));
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('clients', 'create'));
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (user_has_permission('clients', 'edit'));
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (user_has_permission('clients', 'delete'));

-- Client contacts
CREATE POLICY "client_contacts_select" ON client_contacts FOR SELECT TO authenticated
  USING (user_has_permission('clients', 'view'));
CREATE POLICY "client_contacts_insert" ON client_contacts FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('clients', 'edit'));

-- Enterprises
CREATE POLICY "enterprises_select" ON enterprises FOR SELECT TO authenticated
  USING (user_has_permission('units', 'view'));
CREATE POLICY "enterprises_insert" ON enterprises FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('units', 'create'));
CREATE POLICY "enterprises_update" ON enterprises FOR UPDATE TO authenticated
  USING (user_has_permission('units', 'edit'));

-- Units
CREATE POLICY "units_select" ON units FOR SELECT TO authenticated
  USING (user_has_permission('units', 'view'));
CREATE POLICY "units_insert" ON units FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('units', 'create'));
CREATE POLICY "units_update" ON units FOR UPDATE TO authenticated
  USING (user_has_permission('units', 'edit'));
CREATE POLICY "units_delete" ON units FOR DELETE TO authenticated
  USING (user_has_permission('units', 'delete'));

-- Flow types (read-only para todos autenticados)
CREATE POLICY "flow_types_select" ON resale_flow_types FOR SELECT TO authenticated
  USING (true);

-- Flow stages (read-only para todos autenticados)
CREATE POLICY "flow_stages_select" ON flow_stages FOR SELECT TO authenticated
  USING (true);

-- Resale processes
CREATE POLICY "processes_select" ON resale_processes FOR SELECT TO authenticated
  USING (user_has_permission('processes', 'view'));
CREATE POLICY "processes_insert" ON resale_processes FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('processes', 'create'));
CREATE POLICY "processes_update" ON resale_processes FOR UPDATE TO authenticated
  USING (user_has_permission('processes', 'edit'));
CREATE POLICY "processes_delete" ON resale_processes FOR DELETE TO authenticated
  USING (user_has_permission('processes', 'delete'));

-- Stage history
CREATE POLICY "stage_history_select" ON process_stage_history FOR SELECT TO authenticated
  USING (user_has_permission('processes', 'view'));
CREATE POLICY "stage_history_insert" ON process_stage_history FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('processes', 'advance'));

-- Document categories (read-only)
CREATE POLICY "doc_categories_select" ON document_categories FOR SELECT TO authenticated
  USING (true);

-- Documents
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated
  USING (user_has_permission('documents', 'view'));
CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('documents', 'upload'));
CREATE POLICY "documents_update" ON documents FOR UPDATE TO authenticated
  USING (user_has_permission('documents', 'validate'));
CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated
  USING (user_has_permission('documents', 'delete'));

-- Tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (user_has_permission('tasks', 'view'));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('tasks', 'create'));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (user_has_permission('tasks', 'edit') OR user_has_permission('tasks', 'complete'));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (user_has_permission('tasks', 'edit'));

-- Task comments
CREATE POLICY "task_comments_select" ON task_comments FOR SELECT TO authenticated
  USING (user_has_permission('tasks', 'view'));
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('tasks', 'view'));

-- Activities
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated
  USING (user_has_permission('activities', 'view'));
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('activities', 'create'));
CREATE POLICY "activities_update" ON activities FOR UPDATE TO authenticated
  USING (user_has_permission('activities', 'create'));

-- Financial entries
CREATE POLICY "fin_entries_select" ON process_financial_entries FOR SELECT TO authenticated
  USING (user_has_permission('financial', 'view'));
CREATE POLICY "fin_entries_insert" ON process_financial_entries FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('financial', 'edit'));
CREATE POLICY "fin_entries_update" ON process_financial_entries FOR UPDATE TO authenticated
  USING (user_has_permission('financial', 'edit'));
CREATE POLICY "fin_entries_delete" ON process_financial_entries FOR DELETE TO authenticated
  USING (user_has_permission('financial', 'edit'));

-- Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = current_app_user_id());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = current_app_user_id());

-- Process comments
CREATE POLICY "comments_select" ON process_comments FOR SELECT TO authenticated
  USING (user_has_permission('processes', 'view'));
CREATE POLICY "comments_insert" ON process_comments FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('processes', 'view'));

-- Tags (read/write para quem pode editar processos)
CREATE POLICY "tags_select" ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags_insert" ON tags FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('processes', 'edit'));

-- Process tags
CREATE POLICY "process_tags_select" ON process_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "process_tags_insert" ON process_tags FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('processes', 'edit'));
CREATE POLICY "process_tags_delete" ON process_tags FOR DELETE TO authenticated
  USING (user_has_permission('processes', 'edit'));

-- ============================================
-- 23. FUNCTION: AVANÇAR ETAPA DO PROCESSO
-- ============================================
CREATE OR REPLACE FUNCTION advance_process_stage(
  p_process_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_process resale_processes%ROWTYPE;
  v_current_stage flow_stages%ROWTYPE;
  v_next_stage flow_stages%ROWTYPE;
  v_user_id UUID;
  v_history_id UUID;
BEGIN
  v_user_id := current_app_user_id();

  SELECT * INTO v_process FROM resale_processes WHERE id = p_process_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado';
  END IF;

  IF v_process.status != 'active' THEN
    RAISE EXCEPTION 'Processo não está ativo';
  END IF;

  SELECT * INTO v_current_stage FROM flow_stages WHERE id = v_process.current_stage_id;

  SELECT * INTO v_next_stage FROM flow_stages
  WHERE flow_type_id = v_process.flow_type_id
    AND stage_order = v_current_stage.stage_order + 1
    AND is_active = true;

  IF NOT FOUND THEN
    -- Última etapa - marcar processo como concluído
    UPDATE resale_processes SET
      status = 'completed',
      completed_at = now()
    WHERE id = p_process_id;

    RETURN jsonb_build_object('status', 'completed', 'message', 'Processo concluído');
  END IF;

  -- Registrar histórico
  INSERT INTO process_stage_history (process_id, from_stage_id, to_stage_id, changed_by, notes)
  VALUES (p_process_id, v_current_stage.id, v_next_stage.id, v_user_id, p_notes)
  RETURNING id INTO v_history_id;

  -- Atualizar processo
  UPDATE resale_processes SET current_stage_id = v_next_stage.id WHERE id = p_process_id;

  RETURN jsonb_build_object(
    'status', 'advanced',
    'history_id', v_history_id,
    'from_stage', v_current_stage.name,
    'to_stage', v_next_stage.name,
    'stage_order', v_next_stage.stage_order
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 24. FUNCTION: RETORNAR ETAPA DO PROCESSO
-- ============================================
CREATE OR REPLACE FUNCTION revert_process_stage(
  p_process_id UUID,
  p_reason TEXT NOT NULL
) RETURNS JSONB AS $$
DECLARE
  v_process resale_processes%ROWTYPE;
  v_current_stage flow_stages%ROWTYPE;
  v_prev_stage flow_stages%ROWTYPE;
  v_user_id UUID;
  v_history_id UUID;
BEGIN
  v_user_id := current_app_user_id();

  SELECT * INTO v_process FROM resale_processes WHERE id = p_process_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Processo não encontrado';
  END IF;

  SELECT * INTO v_current_stage FROM flow_stages WHERE id = v_process.current_stage_id;

  IF v_current_stage.stage_order <= 1 THEN
    RAISE EXCEPTION 'Já está na primeira etapa';
  END IF;

  SELECT * INTO v_prev_stage FROM flow_stages
  WHERE flow_type_id = v_process.flow_type_id
    AND stage_order = v_current_stage.stage_order - 1
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Etapa anterior não encontrada';
  END IF;

  INSERT INTO process_stage_history (process_id, from_stage_id, to_stage_id, changed_by, reason, notes)
  VALUES (p_process_id, v_current_stage.id, v_prev_stage.id, v_user_id, p_reason, 'Retorno de etapa')
  RETURNING id INTO v_history_id;

  UPDATE resale_processes SET
    current_stage_id = v_prev_stage.id,
    status = 'active',
    completed_at = NULL
  WHERE id = p_process_id;

  RETURN jsonb_build_object(
    'status', 'reverted',
    'history_id', v_history_id,
    'from_stage', v_current_stage.name,
    'to_stage', v_prev_stage.name,
    'stage_order', v_prev_stage.stage_order
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 25. VIEWS DO CRM
-- ============================================

-- View: Pipeline de processos por etapa
CREATE OR REPLACE VIEW vw_crm_pipeline AS
SELECT
  fs.stage_group,
  fs.stage_order,
  fs.name AS stage_name,
  ft.code AS flow_type_code,
  ft.name AS flow_type_name,
  COUNT(rp.id) AS total_processes,
  COUNT(CASE WHEN rp.priority = 'urgent' THEN 1 END) AS urgent_count,
  COUNT(CASE WHEN rp.priority = 'high' THEN 1 END) AS high_count
FROM flow_stages fs
JOIN resale_flow_types ft ON ft.id = fs.flow_type_id
LEFT JOIN resale_processes rp ON rp.current_stage_id = fs.id AND rp.status = 'active'
WHERE fs.is_active = true AND ft.is_active = true
GROUP BY fs.id, fs.stage_group, fs.stage_order, fs.name, ft.code, ft.name
ORDER BY ft.code, fs.stage_order;

-- View: Detalhes do processo
CREATE OR REPLACE VIEW vw_process_detail AS
SELECT
  rp.id,
  rp.process_code,
  rp.status,
  rp.priority,
  rp.started_at,
  rp.completed_at,
  rp.created_at,
  rp.notes,
  ft.name AS flow_type_name,
  ft.code AS flow_type_code,
  ft.total_stages,
  fs.name AS current_stage_name,
  fs.stage_order AS current_stage_order,
  fs.stage_group AS current_stage_group,
  fs.sla_days,
  u.enterprise_id,
  e.name AS enterprise_name,
  un.unit_number,
  un.block_tower,
  un.status AS unit_status,
  sc.full_name AS seller_name,
  sc.document_number AS seller_document,
  sc.phone AS seller_phone,
  bc.full_name AS buyer_name,
  bc.document_number AS buyer_document,
  bc.phone AS buyer_phone,
  au.full_name AS assigned_user_name,
  r.name AS region_name,
  b.name AS branch_name,
  t.name AS team_name,
  (SELECT COUNT(*) FROM tasks tk WHERE tk.process_id = rp.id AND tk.status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM documents d WHERE d.process_id = rp.id AND d.status = 'pending') AS pending_documents,
  ROUND(CAST(fs.stage_order AS NUMERIC) / NULLIF(ft.total_stages, 0) * 100) AS progress_percent
FROM resale_processes rp
JOIN resale_flow_types ft ON ft.id = rp.flow_type_id
LEFT JOIN flow_stages fs ON fs.id = rp.current_stage_id
LEFT JOIN units un ON un.id = rp.unit_id
LEFT JOIN enterprises e ON e.id = un.enterprise_id
LEFT JOIN clients sc ON sc.id = rp.seller_client_id
LEFT JOIN clients bc ON bc.id = rp.buyer_client_id
LEFT JOIN users au ON au.id = rp.assigned_user_id
LEFT JOIN regions r ON r.id = rp.region_id
LEFT JOIN branches b ON b.id = rp.branch_id
LEFT JOIN teams t ON t.id = rp.team_id
-- Fix: units table alias conflict
WHERE true;

-- Fix the view - remove the ambiguous alias
DROP VIEW IF EXISTS vw_process_detail;
CREATE OR REPLACE VIEW vw_process_detail AS
SELECT
  rp.id,
  rp.process_code,
  rp.status,
  rp.priority,
  rp.started_at,
  rp.completed_at,
  rp.created_at,
  rp.notes,
  ft.name AS flow_type_name,
  ft.code AS flow_type_code,
  ft.total_stages,
  fs.name AS current_stage_name,
  fs.stage_order AS current_stage_order,
  fs.stage_group AS current_stage_group,
  fs.sla_days,
  un.id AS unit_id,
  ent.name AS enterprise_name,
  un.unit_number,
  un.block_tower,
  un.status AS unit_status,
  sc.full_name AS seller_name,
  sc.document_number AS seller_document,
  sc.phone AS seller_phone,
  bc.full_name AS buyer_name,
  bc.document_number AS buyer_document,
  bc.phone AS buyer_phone,
  au.full_name AS assigned_user_name,
  reg.name AS region_name,
  br.name AS branch_name,
  tm.name AS team_name,
  (SELECT COUNT(*) FROM tasks tk WHERE tk.process_id = rp.id AND tk.status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM documents doc WHERE doc.process_id = rp.id AND doc.status = 'pending') AS pending_documents,
  ROUND(CAST(fs.stage_order AS NUMERIC) / NULLIF(ft.total_stages, 0) * 100) AS progress_percent
FROM resale_processes rp
JOIN resale_flow_types ft ON ft.id = rp.flow_type_id
LEFT JOIN flow_stages fs ON fs.id = rp.current_stage_id
LEFT JOIN units un ON un.id = rp.unit_id
LEFT JOIN enterprises ent ON ent.id = un.enterprise_id
LEFT JOIN clients sc ON sc.id = rp.seller_client_id
LEFT JOIN clients bc ON bc.id = rp.buyer_client_id
LEFT JOIN users au ON au.id = rp.assigned_user_id
LEFT JOIN regions reg ON reg.id = rp.region_id
LEFT JOIN branches br ON br.id = rp.branch_id
LEFT JOIN teams tm ON tm.id = rp.team_id;

-- View: Dashboard financeiro dos processos
CREATE OR REPLACE VIEW vw_process_financial_summary AS
SELECT
  rp.id AS process_id,
  rp.process_code,
  rp.status,
  sc.full_name AS seller_name,
  bc.full_name AS buyer_name,
  br.name AS branch_name,
  COALESCE(SUM(CASE WHEN pfe.entry_type IN ('receivable', 'received') THEN pfe.amount ELSE 0 END), 0) AS total_receivable,
  COALESCE(SUM(CASE WHEN pfe.entry_type IN ('received') THEN pfe.amount ELSE 0 END), 0) AS total_received,
  COALESCE(SUM(CASE WHEN pfe.entry_type IN ('payable', 'paid') THEN pfe.amount ELSE 0 END), 0) AS total_payable,
  COALESCE(SUM(CASE WHEN pfe.entry_type IN ('paid') THEN pfe.amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN pfe.payment_status = 'overdue' THEN pfe.amount ELSE 0 END), 0) AS total_overdue,
  COUNT(CASE WHEN pfe.payment_status = 'pending' THEN 1 END) AS pending_entries
FROM resale_processes rp
LEFT JOIN process_financial_entries pfe ON pfe.process_id = rp.id
LEFT JOIN clients sc ON sc.id = rp.seller_client_id
LEFT JOIN clients bc ON bc.id = rp.buyer_client_id
LEFT JOIN branches br ON br.id = rp.branch_id
GROUP BY rp.id, rp.process_code, rp.status, sc.full_name, bc.full_name, br.name;

-- View: Dashboard operacional
CREATE OR REPLACE VIEW vw_crm_dashboard AS
SELECT
  COUNT(*) FILTER (WHERE rp.status = 'active') AS active_processes,
  COUNT(*) FILTER (WHERE rp.status = 'completed') AS completed_processes,
  COUNT(*) FILTER (WHERE rp.status = 'cancelled') AS cancelled_processes,
  COUNT(*) FILTER (WHERE rp.status = 'paused') AS paused_processes,
  COUNT(*) AS total_processes,
  COUNT(DISTINCT rp.seller_client_id) AS total_sellers,
  COUNT(DISTINCT rp.buyer_client_id) FILTER (WHERE rp.buyer_client_id IS NOT NULL) AS total_buyers,
  COUNT(DISTINCT rp.unit_id) FILTER (WHERE rp.unit_id IS NOT NULL) AS total_units,
  (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < now()) AS overdue_tasks,
  (SELECT COUNT(*) FROM documents WHERE status = 'pending') AS pending_documents
FROM resale_processes rp;
