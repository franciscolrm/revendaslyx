-- ============================================================
-- REVENDAS — Schema Inicial
-- Supabase / PostgreSQL
-- ============================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BLOCO 1 — Segurança e Acesso
-- ============================================================

CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    document    TEXT UNIQUE,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE regions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    name        TEXT NOT NULL,
    code        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    region_id   UUID NOT NULL REFERENCES regions(id),
    name        TEXT NOT NULL,
    code        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id       UUID NOT NULL REFERENCES branches(id),
    name            TEXT NOT NULL,
    leader_user_id  UUID, -- FK adicionada após criação de users
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id         UUID UNIQUE, -- referência ao Supabase Auth (auth.users.id)
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blocked')),
    company_id      UUID REFERENCES companies(id),
    region_id       UUID REFERENCES regions(id),
    branch_id       UUID REFERENCES branches(id),
    team_id         UUID REFERENCES teams(id),
    manager_user_id UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK pendente de teams.leader_user_id
ALTER TABLE teams
    ADD CONSTRAINT fk_teams_leader FOREIGN KEY (leader_user_id) REFERENCES users(id);

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module      TEXT NOT NULL,
    action      TEXT NOT NULL,
    description TEXT,
    UNIQUE (module, action)
);

CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE (role_id, permission_id)
);

CREATE TABLE user_roles (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE (user_id, role_id)
);

CREATE TABLE access_scopes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_type  TEXT NOT NULL CHECK (scope_type IN ('own','team','branch','region','global')),
    region_id   UUID REFERENCES regions(id),
    branch_id   UUID REFERENCES branches(id),
    team_id     UUID REFERENCES teams(id)
);

-- ============================================================
-- BLOCO 3 — Revendas e Operação
-- ============================================================

CREATE TABLE resale_statuses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    stage_group TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE resales (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_code       TEXT,
    title               TEXT,
    customer_name       TEXT,
    document            TEXT,
    phone               TEXT,
    email               TEXT,
    region_id           UUID REFERENCES regions(id),
    branch_id           UUID REFERENCES branches(id),
    team_id             UUID REFERENCES teams(id),
    assigned_user_id    UUID REFERENCES users(id),
    current_status_id   UUID REFERENCES resale_statuses(id),
    source              TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resale_status_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resale_id   UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
    status_id   UUID NOT NULL REFERENCES resale_statuses(id),
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes       TEXT
);

CREATE TABLE resale_interactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resale_id           UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
    interaction_type    TEXT NOT NULL CHECK (interaction_type IN ('call','whatsapp','email','visit','note')),
    performed_by        UUID REFERENCES users(id),
    interaction_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    result              TEXT,
    notes               TEXT
);

-- ============================================================
-- BLOCO 4 — Snapshot Diário (Relatório)
-- ============================================================

CREATE TABLE snapshot_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name     TEXT,
    reference_date  DATE NOT NULL,
    uploaded_by     UUID REFERENCES users(id),
    file_path       TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_status_snapshots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id            UUID NOT NULL REFERENCES snapshot_batches(id) ON DELETE CASCADE,
    operation_name      TEXT NOT NULL,
    snapshot_date       DATE NOT NULL,
    status_name_raw     TEXT NOT NULL,
    status_id           UUID REFERENCES resale_statuses(id),
    quantity            INT NOT NULL DEFAULT 0,
    call_quantity       INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCO 5 — Financeiro da Revenda
-- ============================================================

CREATE TABLE resale_financial_components (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    component_type  TEXT,
    default_order   INT NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE resale_financial_values (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resale_id       UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
    component_id    UUID NOT NULL REFERENCES resale_financial_components(id),
    amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    reference_date  DATE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCO 6 — Importação de Dados
-- ============================================================

CREATE TABLE data_sources (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    type        TEXT,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE uploaded_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID REFERENCES data_sources(id),
    file_name       TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    mime_type       TEXT,
    uploaded_by     UUID REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_batches (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id           UUID REFERENCES data_sources(id),
    uploaded_file_id    UUID REFERENCES uploaded_files(id),
    import_type         TEXT,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
    total_rows          INT DEFAULT 0,
    valid_rows          INT DEFAULT 0,
    invalid_rows        INT DEFAULT 0,
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE import_errors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id        UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number      INT,
    field_name      TEXT,
    error_message   TEXT NOT NULL,
    raw_payload     JSONB
);

CREATE TABLE staging_raw_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id            UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    source_table_name   TEXT,
    raw_payload         JSONB NOT NULL,
    processed           BOOLEAN NOT NULL DEFAULT false,
    processed_at        TIMESTAMPTZ
);

-- ============================================================
-- BLOCO 7 — Auditoria
-- ============================================================

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id),
    entity_name TEXT NOT NULL,
    entity_id   UUID,
    action      TEXT NOT NULL,
    old_data    JSONB,
    new_data    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Organograma
CREATE INDEX idx_regions_company       ON regions(company_id);
CREATE INDEX idx_branches_region       ON branches(region_id);
CREATE INDEX idx_teams_branch          ON teams(branch_id);
CREATE INDEX idx_users_company         ON users(company_id);
CREATE INDEX idx_users_team            ON users(team_id);
CREATE INDEX idx_users_manager         ON users(manager_user_id);

-- Revendas
CREATE INDEX idx_resales_assigned      ON resales(assigned_user_id);
CREATE INDEX idx_resales_status        ON resales(current_status_id);
CREATE INDEX idx_resales_branch        ON resales(branch_id);
CREATE INDEX idx_resales_team          ON resales(team_id);
CREATE INDEX idx_resale_history_resale ON resale_status_history(resale_id);
CREATE INDEX idx_resale_interact_resale ON resale_interactions(resale_id);

-- Snapshots
CREATE INDEX idx_snapshots_date        ON daily_status_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_batch       ON daily_status_snapshots(batch_id);
CREATE INDEX idx_snapshots_operation   ON daily_status_snapshots(operation_name);

-- Financeiro
CREATE INDEX idx_fin_values_resale     ON resale_financial_values(resale_id);
CREATE INDEX idx_fin_values_component  ON resale_financial_values(component_id);

-- Importação
CREATE INDEX idx_staging_batch         ON staging_raw_records(batch_id);
CREATE INDEX idx_staging_processed     ON staging_raw_records(processed);
CREATE INDEX idx_import_errors_batch   ON import_errors(batch_id);

-- Auditoria
CREATE INDEX idx_audit_entity          ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_user            ON audit_logs(user_id);
CREATE INDEX idx_audit_created         ON audit_logs(created_at);
-- ============================================================
-- SEED — Dados iniciais
-- ============================================================

-- ----------------------------------------
-- Roles (perfis macro)
-- ----------------------------------------
INSERT INTO roles (name, description) VALUES
    ('super_admin',       'Acesso total ao sistema'),
    ('admin_pyx',         'Administrador PYX'),
    ('diretoria',         'Diretoria executiva'),
    ('gerente_regional',  'Gerente de região'),
    ('supervisor',        'Supervisor de equipe'),
    ('revendedor',        'Revendedor / operador'),
    ('financeiro',        'Equipe financeira'),
    ('backoffice',        'Backoffice operacional'),
    ('auditoria',         'Auditoria e compliance');

-- ----------------------------------------
-- Permissions (granulares)
-- ----------------------------------------
INSERT INTO permissions (module, action, description) VALUES
    -- users
    ('users',      'view',    'Visualizar usuários'),
    ('users',      'create',  'Criar usuários'),
    ('users',      'edit',    'Editar usuários'),
    ('users',      'delete',  'Remover usuários'),
    -- resales
    ('resales',    'view',    'Visualizar revendas'),
    ('resales',    'create',  'Criar revendas'),
    ('resales',    'edit',    'Editar revendas'),
    ('resales',    'delete',  'Remover revendas'),
    ('resales',    'assign',  'Atribuir revendas'),
    -- dashboard
    ('dashboard',  'view',    'Visualizar dashboard'),
    ('dashboard',  'export',  'Exportar dashboard'),
    -- financial
    ('financial',  'view',    'Visualizar financeiro'),
    ('financial',  'edit',    'Editar financeiro'),
    ('financial',  'export',  'Exportar financeiro'),
    -- imports
    ('imports',    'upload',  'Fazer upload de arquivos'),
    ('imports',    'process', 'Processar importações'),
    ('imports',    'view',    'Visualizar importações'),
    -- reports
    ('reports',    'view',    'Visualizar relatórios'),
    ('reports',    'export',  'Exportar relatórios'),
    -- audit
    ('audit',      'view',    'Visualizar logs de auditoria'),
    -- settings
    ('settings',   'manage',  'Gerenciar configurações do sistema');

-- ----------------------------------------
-- Role ↔ Permissions (super_admin recebe tudo)
-- ----------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- revendedor: apenas visualizar e interagir com revendas atribuídas
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'resales'   AND p.action IN ('view','edit'))
    OR (p.module = 'dashboard' AND p.action = 'view')
)
WHERE r.name = 'revendedor';

-- supervisor: revendas + dashboard + relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'resales'   AND p.action IN ('view','edit','assign'))
    OR (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'reports'   AND p.action = 'view')
)
WHERE r.name = 'supervisor';

-- gerente_regional: tudo do supervisor + financeiro view + export relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'resales'   AND p.action IN ('view','edit','assign','create'))
    OR (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'reports'   AND p.action IN ('view','export'))
    OR (p.module = 'financial' AND p.action = 'view')
)
WHERE r.name = 'gerente_regional';

-- financeiro: financeiro completo + dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'financial' AND p.action IN ('view','edit','export'))
    OR (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'resales'   AND p.action = 'view')
)
WHERE r.name = 'financeiro';

-- backoffice: imports + resales + relatórios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'imports'   AND p.action IN ('upload','process','view'))
    OR (p.module = 'resales'   AND p.action IN ('view','edit','create'))
    OR (p.module = 'reports'   AND p.action IN ('view','export'))
    OR (p.module = 'dashboard' AND p.action = 'view')
)
WHERE r.name = 'backoffice';

-- auditoria: read-only em tudo
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.action IN ('view')
WHERE r.name = 'auditoria';

-- ----------------------------------------
-- Resale Statuses (status padronizados)
-- ----------------------------------------
INSERT INTO resale_statuses (code, name, stage_group, sort_order) VALUES
    ('01_angariacao',             '01. Angariação',                    'captacao',     1),
    ('01_vendida',                '01. Vendida',                       'captacao',     2),
    ('02_liberada_pra_venda',     '02. Liberada pra Venda',            'comercial',    3),
    ('02_cancelada',              '02. Cancelada',                     'comercial',    4),
    ('03_agendada_cartorio',      '03. Agendada Cartório',             'cartorio',     5),
    ('03_analise_juridica',       '03. Análise Jurídica',              'cartorio',     6),
    ('04_escritura_assinada',     '04. Escritura Assinada',            'cartorio',     7),
    ('05_registro_andamento',     '05. Registro em Andamento',         'registro',     8),
    ('06_registrada',             '06. Registrada',                    'registro',     9),
    ('07_concluida',              '07. Concluída',                     'finalizado',  10),
    ('08_distrato',               '08. Distrato',                      'finalizado',  11);

-- ----------------------------------------
-- Componentes financeiros (catálogo)
-- ----------------------------------------
INSERT INTO resale_financial_components (code, name, component_type, default_order, is_required) VALUES
    ('financiamento',   'Financiamento',          'receita',    1,  true),
    ('subsidio',        'Subsídio',               'receita',    2,  false),
    ('fgts',            'FGTS',                   'receita',    3,  false),
    ('endividamento',   'Endividamento',           'despesa',    4,  false),
    ('jdo',             'JDO',                    'despesa',    5,  false),
    ('documentacao',    'Documentação',            'despesa',    6,  false),
    ('laudo',           'Laudo',                  'despesa',    7,  false),
    ('iptu',            'IPTU',                   'despesa',    8,  false),
    ('comissao',        'Comissão',                'despesa',    9,  true),
    ('valor_venda',     'Valor de Venda',          'referencia', 0,  true),
    ('valor_avaliacao', 'Valor de Avaliação',      'referencia', 0,  false);
-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resales                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE resale_financial_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_status_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: função para buscar o user.id a partir do auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- Helper: verifica se o usuário tem uma permission específica
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = public.current_app_user_id()
          AND p.module = p_module
          AND p.action = p_action
    );
$$;

-- ============================================================
-- Helper: verifica scope do usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_scope_type()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT scope_type
    FROM public.access_scopes
    WHERE user_id = public.current_app_user_id()
    ORDER BY
        CASE scope_type
            WHEN 'global' THEN 1
            WHEN 'region' THEN 2
            WHEN 'branch' THEN 3
            WHEN 'team'   THEN 4
            WHEN 'own'    THEN 5
        END
    LIMIT 1;
$$;

-- ============================================================
-- RESALES — Policies
-- ============================================================

-- SELECT: baseado no scope
CREATE POLICY resales_select ON resales
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
        AND (
            public.user_scope_type() = 'global'
            OR (
                public.user_scope_type() = 'region'
                AND region_id IN (
                    SELECT region_id FROM access_scopes
                    WHERE user_id = public.current_app_user_id()
                )
            )
            OR (
                public.user_scope_type() = 'branch'
                AND branch_id IN (
                    SELECT branch_id FROM access_scopes
                    WHERE user_id = public.current_app_user_id()
                )
            )
            OR (
                public.user_scope_type() = 'team'
                AND team_id IN (
                    SELECT team_id FROM access_scopes
                    WHERE user_id = public.current_app_user_id()
                )
            )
            OR (
                public.user_scope_type() = 'own'
                AND assigned_user_id = public.current_app_user_id()
            )
        )
    );

-- INSERT
CREATE POLICY resales_insert ON resales
    FOR INSERT WITH CHECK (
        public.user_has_permission('resales', 'create')
    );

-- UPDATE
CREATE POLICY resales_update ON resales
    FOR UPDATE USING (
        public.user_has_permission('resales', 'edit')
    );

-- ============================================================
-- RESALE FINANCIAL VALUES — Policies
-- ============================================================

CREATE POLICY fin_values_select ON resale_financial_values
    FOR SELECT USING (
        public.user_has_permission('financial', 'view')
    );

CREATE POLICY fin_values_insert ON resale_financial_values
    FOR INSERT WITH CHECK (
        public.user_has_permission('financial', 'edit')
    );

CREATE POLICY fin_values_update ON resale_financial_values
    FOR UPDATE USING (
        public.user_has_permission('financial', 'edit')
    );

-- ============================================================
-- AUDIT LOGS — somente leitura para quem tem permissão
-- ============================================================

CREATE POLICY audit_select ON audit_logs
    FOR SELECT USING (
        public.user_has_permission('audit', 'view')
    );

-- ============================================================
-- DAILY STATUS SNAPSHOTS — Policies
-- ============================================================

CREATE POLICY snapshots_select ON daily_status_snapshots
    FOR SELECT USING (
        public.user_has_permission('reports', 'view')
    );

-- ============================================================
-- RESALE STATUS HISTORY — segue a mesma lógica de resales
-- ============================================================

CREATE POLICY status_history_select ON resale_status_history
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
    );

-- ============================================================
-- RESALE INTERACTIONS — segue a mesma lógica de resales
-- ============================================================

CREATE POLICY interactions_select ON resale_interactions
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
    );

CREATE POLICY interactions_insert ON resale_interactions
    FOR INSERT WITH CHECK (
        public.user_has_permission('resales', 'edit')
    );

-- ============================================================
-- USERS — cada um vê a si mesmo, admin vê todos
-- ============================================================

CREATE POLICY users_select ON users
    FOR SELECT USING (
        id = public.current_app_user_id()
        OR public.user_has_permission('users', 'view')
    );
-- ============================================================
-- FIX 1 — RLS: resale_status_history e interactions com scope
-- ============================================================

-- Dropar policies antigas sem filtro de scope
DROP POLICY IF EXISTS status_history_select ON resale_status_history;
DROP POLICY IF EXISTS interactions_select ON resale_interactions;
DROP POLICY IF EXISTS interactions_insert ON resale_interactions;

-- Helper: verifica se o usuário pode ver determinada revenda (respeita scope)
CREATE OR REPLACE FUNCTION public.user_can_access_resale(p_resale_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.resales r
        WHERE r.id = p_resale_id
          AND (
              public.user_scope_type() = 'global'
              OR (
                  public.user_scope_type() = 'region'
                  AND r.region_id IN (
                      SELECT region_id FROM public.access_scopes
                      WHERE user_id = public.current_app_user_id()
                  )
              )
              OR (
                  public.user_scope_type() = 'branch'
                  AND r.branch_id IN (
                      SELECT branch_id FROM public.access_scopes
                      WHERE user_id = public.current_app_user_id()
                  )
              )
              OR (
                  public.user_scope_type() = 'team'
                  AND r.team_id IN (
                      SELECT team_id FROM public.access_scopes
                      WHERE user_id = public.current_app_user_id()
                  )
              )
              OR (
                  public.user_scope_type() = 'own'
                  AND r.assigned_user_id = public.current_app_user_id()
              )
          )
    );
$$;

-- resale_status_history: SELECT com scope
CREATE POLICY status_history_select ON resale_status_history
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_interactions: SELECT com scope
CREATE POLICY interactions_select ON resale_interactions
    FOR SELECT USING (
        public.user_has_permission('resales', 'view')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_interactions: INSERT com scope
CREATE POLICY interactions_insert ON resale_interactions
    FOR INSERT WITH CHECK (
        public.user_has_permission('resales', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- ============================================================
-- FIX 2 — RLS: financial_values herda scope da revenda
-- ============================================================

DROP POLICY IF EXISTS fin_values_select ON resale_financial_values;
DROP POLICY IF EXISTS fin_values_insert ON resale_financial_values;
DROP POLICY IF EXISTS fin_values_update ON resale_financial_values;

CREATE POLICY fin_values_select ON resale_financial_values
    FOR SELECT USING (
        public.user_has_permission('financial', 'view')
        AND public.user_can_access_resale(resale_id)
    );

CREATE POLICY fin_values_insert ON resale_financial_values
    FOR INSERT WITH CHECK (
        public.user_has_permission('financial', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

CREATE POLICY fin_values_update ON resale_financial_values
    FOR UPDATE USING (
        public.user_has_permission('financial', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- ============================================================
-- FIX 3 — RLS: users INSERT/UPDATE para admins
-- ============================================================

CREATE POLICY users_insert ON users
    FOR INSERT WITH CHECK (
        public.user_has_permission('users', 'create')
    );

CREATE POLICY users_update ON users
    FOR UPDATE USING (
        id = public.current_app_user_id()
        OR public.user_has_permission('users', 'edit')
    );

-- ============================================================
-- FIX 4 — Permissions para diretoria e admin_pyx
-- ============================================================

-- diretoria: visão ampla (dashboard, relatórios, financeiro, revendas, auditoria)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (p.module = 'dashboard' AND p.action IN ('view','export'))
    OR (p.module = 'reports'   AND p.action IN ('view','export'))
    OR (p.module = 'financial' AND p.action IN ('view','export'))
    OR (p.module = 'resales'   AND p.action IN ('view','edit','create','assign'))
    OR (p.module = 'audit'     AND p.action = 'view')
)
WHERE r.name = 'diretoria';

-- admin_pyx: tudo (igual super_admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin_pyx';

-- ============================================================
-- FIX 6 — Trigger automático de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_resales_updated_at
    BEFORE UPDATE ON resales
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ============================================================
-- FUNCTIONS E TRIGGERS DE NEGÓCIO
-- ============================================================

-- ============================================================
-- 1. AUDITORIA AUTOMÁTICA
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_action TEXT;
    v_entity_id UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    IF TG_OP = 'INSERT' THEN
        v_action := 'insert';
        v_new := to_jsonb(NEW);
        v_entity_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
        v_entity_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_old := to_jsonb(OLD);
        v_entity_id := OLD.id;
    END IF;

    INSERT INTO public.audit_logs (user_id, entity_name, entity_id, action, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_entity_id, v_action, v_old, v_new);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Aplicar trigger de auditoria nas tabelas principais
CREATE TRIGGER trg_audit_resales
    AFTER INSERT OR UPDATE OR DELETE ON resales
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_resale_financial_values
    AFTER INSERT OR UPDATE OR DELETE ON resale_financial_values
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_resale_interactions
    AFTER INSERT OR UPDATE OR DELETE ON resale_interactions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_teams
    AFTER INSERT OR UPDATE OR DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_branches
    AFTER INSERT OR UPDATE OR DELETE ON branches
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_regions
    AFTER INSERT OR UPDATE OR DELETE ON regions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_access_scopes
    AFTER INSERT OR UPDATE OR DELETE ON access_scopes
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ============================================================
-- 2. MUDANÇA DE STATUS DE REVENDA
--    Atualiza resales.current_status_id e registra no histórico
-- ============================================================

CREATE OR REPLACE FUNCTION public.change_resale_status(
    p_resale_id   UUID,
    p_new_status  TEXT,   -- code do resale_statuses
    p_notes       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID;
    v_status_id  UUID;
    v_current    UUID;
    v_history_id UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Validar status
    SELECT id INTO v_status_id
    FROM public.resale_statuses
    WHERE code = p_new_status AND is_active = true;

    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Status "%" não encontrado ou inativo', p_new_status;
    END IF;

    -- Verificar se a revenda existe e pegar status atual
    SELECT current_status_id INTO v_current
    FROM public.resales
    WHERE id = p_resale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    -- Não duplicar se já está no mesmo status
    IF v_current = v_status_id THEN
        RAISE EXCEPTION 'Revenda já está no status "%"', p_new_status;
    END IF;

    -- Atualizar status atual
    UPDATE public.resales
    SET current_status_id = v_status_id
    WHERE id = p_resale_id;

    -- Registrar no histórico
    INSERT INTO public.resale_status_history (resale_id, status_id, changed_by, notes)
    VALUES (p_resale_id, v_status_id, v_user_id, p_notes)
    RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$;

-- ============================================================
-- 3. REGISTRAR INTERAÇÃO COM REVENDA
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_resale_interaction(
    p_resale_id        UUID,
    p_interaction_type TEXT,
    p_result           TEXT DEFAULT NULL,
    p_notes            TEXT DEFAULT NULL,
    p_interaction_date TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_id      UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Validar que a revenda existe
    IF NOT EXISTS (SELECT 1 FROM public.resales WHERE id = p_resale_id) THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    INSERT INTO public.resale_interactions
        (resale_id, interaction_type, performed_by, interaction_date, result, notes)
    VALUES
        (p_resale_id, p_interaction_type, v_user_id, p_interaction_date, p_result, p_notes)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================================
-- 4. PROCESSAMENTO DE IMPORTAÇÃO
--    Processa staging_raw_records → resales
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_import_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec        RECORD;
    v_total      INT := 0;
    v_valid      INT := 0;
    v_invalid    INT := 0;
    v_payload    JSONB;
    v_resale_id  UUID;
    v_status_id  UUID;
BEGIN
    -- Marcar batch como processing
    UPDATE public.import_batches
    SET status = 'processing', started_at = now()
    WHERE id = p_batch_id;

    FOR v_rec IN
        SELECT id, raw_payload
        FROM public.staging_raw_records
        WHERE batch_id = p_batch_id AND processed = false
    LOOP
        v_total := v_total + 1;
        v_payload := v_rec.raw_payload;

        BEGIN
            -- Resolver status pelo code (se fornecido)
            v_status_id := NULL;
            IF v_payload->>'status_code' IS NOT NULL THEN
                SELECT id INTO v_status_id
                FROM public.resale_statuses
                WHERE code = v_payload->>'status_code';
            END IF;

            -- Upsert na resales (external_code como chave de dedup)
            IF v_payload->>'external_code' IS NOT NULL
               AND EXISTS (
                   SELECT 1 FROM public.resales
                   WHERE external_code = v_payload->>'external_code'
               )
            THEN
                UPDATE public.resales SET
                    customer_name     = COALESCE(v_payload->>'customer_name', customer_name),
                    document          = COALESCE(v_payload->>'document', document),
                    phone             = COALESCE(v_payload->>'phone', phone),
                    email             = COALESCE(v_payload->>'email', email),
                    source            = COALESCE(v_payload->>'source', source),
                    notes             = COALESCE(v_payload->>'notes', notes),
                    current_status_id = COALESCE(v_status_id, current_status_id),
                    title             = COALESCE(v_payload->>'title', title)
                WHERE external_code = v_payload->>'external_code'
                RETURNING id INTO v_resale_id;
            ELSE
                INSERT INTO public.resales (
                    external_code, title, customer_name, document,
                    phone, email, source, notes, current_status_id
                ) VALUES (
                    v_payload->>'external_code',
                    v_payload->>'title',
                    v_payload->>'customer_name',
                    v_payload->>'document',
                    v_payload->>'phone',
                    v_payload->>'email',
                    v_payload->>'source',
                    v_payload->>'notes',
                    v_status_id
                )
                RETURNING id INTO v_resale_id;
            END IF;

            -- Marcar staging como processado
            UPDATE public.staging_raw_records
            SET processed = true, processed_at = now()
            WHERE id = v_rec.id;

            v_valid := v_valid + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Registrar erro e continuar
            INSERT INTO public.import_errors (batch_id, row_number, error_message, raw_payload)
            VALUES (p_batch_id, v_total, SQLERRM, v_payload);

            v_invalid := v_invalid + 1;
        END;
    END LOOP;

    -- Finalizar batch
    UPDATE public.import_batches
    SET status      = CASE WHEN v_invalid > 0 AND v_valid = 0 THEN 'error' ELSE 'done' END,
        total_rows  = v_total,
        valid_rows  = v_valid,
        invalid_rows = v_invalid,
        finished_at = now()
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
        'batch_id',     p_batch_id,
        'total_rows',   v_total,
        'valid_rows',   v_valid,
        'invalid_rows', v_invalid
    );
END;
$$;

-- ============================================================
-- 5. SNAPSHOT DIÁRIO
--    Gera snapshot de contagens por status para uma data
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_daily_snapshot(
    p_reference_date DATE DEFAULT CURRENT_DATE,
    p_source_name    TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_user_id  UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Criar batch
    INSERT INTO public.snapshot_batches (source_name, reference_date, uploaded_by, status)
    VALUES (p_source_name, p_reference_date, v_user_id, 'processing')
    RETURNING id INTO v_batch_id;

    -- Gerar snapshots agrupados por branch (operation) e status
    INSERT INTO public.daily_status_snapshots
        (batch_id, operation_name, snapshot_date, status_name_raw, status_id, quantity)
    SELECT
        v_batch_id,
        COALESCE(b.name, 'Sem Filial'),
        p_reference_date,
        COALESCE(rs.name, 'Sem Status'),
        r.current_status_id,
        COUNT(*)
    FROM public.resales r
    LEFT JOIN public.branches b ON b.id = r.branch_id
    LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
    GROUP BY b.name, rs.name, r.current_status_id;

    -- Finalizar batch
    UPDATE public.snapshot_batches
    SET status = 'done'
    WHERE id = v_batch_id;

    RETURN v_batch_id;
END;
$$;
-- ============================================================
-- VIEWS E RELATÓRIOS
-- ============================================================

-- ============================================================
-- 1. PIPELINE — Contagem de revendas por status/stage
-- ============================================================

CREATE OR REPLACE VIEW public.vw_pipeline AS
SELECT
    rs.stage_group,
    rs.code         AS status_code,
    rs.name         AS status_name,
    rs.sort_order,
    COUNT(r.id)     AS total_resales
FROM public.resale_statuses rs
LEFT JOIN public.resales r ON r.current_status_id = rs.id
WHERE rs.is_active = true
GROUP BY rs.id, rs.stage_group, rs.code, rs.name, rs.sort_order
ORDER BY rs.sort_order;

-- ============================================================
-- 2. PIPELINE POR FILIAL — Detalhamento regional
-- ============================================================

CREATE OR REPLACE VIEW public.vw_pipeline_by_branch AS
SELECT
    c.name          AS company_name,
    reg.name        AS region_name,
    b.name          AS branch_name,
    rs.stage_group,
    rs.code         AS status_code,
    rs.name         AS status_name,
    rs.sort_order,
    COUNT(r.id)     AS total_resales
FROM public.resales r
JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.branches b   ON b.id = r.branch_id
LEFT JOIN public.regions reg  ON reg.id = r.region_id
LEFT JOIN public.companies c  ON c.id = COALESCE(b.company_id, reg.company_id)
GROUP BY c.name, reg.name, b.name, rs.id, rs.stage_group, rs.code, rs.name, rs.sort_order
ORDER BY c.name, reg.name, b.name, rs.sort_order;

-- ============================================================
-- 3. PERFORMANCE POR EQUIPE
-- ============================================================

CREATE OR REPLACE VIEW public.vw_team_performance AS
SELECT
    t.id            AS team_id,
    t.name          AS team_name,
    b.name          AS branch_name,
    reg.name        AS region_name,
    leader.full_name AS leader_name,
    COUNT(DISTINCT r.id)                                             AS total_resales,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.stage_group = 'finalizado')  AS concluidas,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.code = '08_distrato')      AS distratos,
    COUNT(DISTINCT ri.id)                                            AS total_interactions,
    COUNT(DISTINCT ri.id) FILTER (
        WHERE ri.interaction_date >= date_trunc('month', CURRENT_DATE)
    ) AS interactions_mes_atual
FROM public.teams t
LEFT JOIN public.branches b    ON b.id = t.branch_id
LEFT JOIN public.regions reg   ON reg.id = b.region_id
LEFT JOIN public.users leader  ON leader.id = t.leader_user_id
LEFT JOIN public.resales r     ON r.team_id = t.id
LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.resale_interactions ri ON ri.resale_id = r.id
GROUP BY t.id, t.name, b.name, reg.name, leader.full_name;

-- ============================================================
-- 4. PERFORMANCE POR USUÁRIO (REVENDEDOR)
-- ============================================================

CREATE OR REPLACE VIEW public.vw_user_performance AS
SELECT
    u.id            AS user_id,
    u.full_name,
    t.name          AS team_name,
    b.name          AS branch_name,
    COUNT(DISTINCT r.id)                                               AS total_resales,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.stage_group = 'finalizado')    AS concluidas,
    COUNT(DISTINCT r.id) FILTER (WHERE rs.code = '08_distrato')        AS distratos,
    COUNT(DISTINCT ri.id)                                              AS total_interactions,
    COUNT(DISTINCT ri.id) FILTER (
        WHERE ri.interaction_date >= date_trunc('month', CURRENT_DATE)
    ) AS interactions_mes_atual,
    MAX(ri.interaction_date)                                           AS ultima_interacao
FROM public.users u
LEFT JOIN public.teams t       ON t.id = u.team_id
LEFT JOIN public.branches b    ON b.id = u.branch_id
LEFT JOIN public.resales r     ON r.assigned_user_id = u.id
LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.resale_interactions ri ON ri.resale_id = r.id AND ri.performed_by = u.id
WHERE u.status = 'active'
GROUP BY u.id, u.full_name, t.name, b.name;

-- ============================================================
-- 5. FINANCEIRO CONSOLIDADO POR REVENDA
-- ============================================================

CREATE OR REPLACE VIEW public.vw_resale_financial_summary AS
SELECT
    r.id             AS resale_id,
    r.external_code,
    r.customer_name,
    rs.name          AS status_name,
    b.name           AS branch_name,
    -- Pivot dos componentes principais
    SUM(fv.amount) FILTER (WHERE fc.code = 'valor_venda')     AS valor_venda,
    SUM(fv.amount) FILTER (WHERE fc.code = 'valor_avaliacao') AS valor_avaliacao,
    SUM(fv.amount) FILTER (WHERE fc.code = 'financiamento')   AS financiamento,
    SUM(fv.amount) FILTER (WHERE fc.code = 'subsidio')        AS subsidio,
    SUM(fv.amount) FILTER (WHERE fc.code = 'fgts')            AS fgts,
    SUM(fv.amount) FILTER (WHERE fc.code = 'comissao')        AS comissao,
    -- Totais por tipo
    SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita')    AS total_receitas,
    SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa')    AS total_despesas,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita'), 0)
    - COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa'), 0)
                                                                   AS resultado_liquido
FROM public.resales r
LEFT JOIN public.resale_statuses rs        ON rs.id = r.current_status_id
LEFT JOIN public.branches b                ON b.id = r.branch_id
LEFT JOIN public.resale_financial_values fv ON fv.resale_id = r.id
LEFT JOIN public.resale_financial_components fc ON fc.id = fv.component_id
GROUP BY r.id, r.external_code, r.customer_name, rs.name, b.name;

-- ============================================================
-- 6. FINANCEIRO AGREGADO POR FILIAL
-- ============================================================

CREATE OR REPLACE VIEW public.vw_financial_by_branch AS
SELECT
    c.name           AS company_name,
    reg.name         AS region_name,
    b.id             AS branch_id,
    b.name           AS branch_name,
    COUNT(DISTINCT r.id)                                              AS total_resales,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.code = 'valor_venda'), 0)   AS total_valor_venda,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.code = 'comissao'), 0)      AS total_comissao,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita'), 0)  AS total_receitas,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa'), 0)  AS total_despesas,
    COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'receita'), 0)
    - COALESCE(SUM(fv.amount) FILTER (WHERE fc.component_type = 'despesa'), 0)
                                                                          AS resultado_liquido
FROM public.branches b
JOIN public.regions reg    ON reg.id = b.region_id
JOIN public.companies c    ON c.id = b.company_id
LEFT JOIN public.resales r ON r.branch_id = b.id
LEFT JOIN public.resale_financial_values fv    ON fv.resale_id = r.id
LEFT JOIN public.resale_financial_components fc ON fc.id = fv.component_id
GROUP BY c.name, reg.name, b.id, b.name;

-- ============================================================
-- 7. HISTÓRICO DE SNAPSHOTS — Evolução temporal
-- ============================================================

CREATE OR REPLACE VIEW public.vw_snapshot_evolution AS
SELECT
    sb.reference_date,
    sb.source_name,
    ds.operation_name,
    ds.status_name_raw,
    rs.stage_group,
    ds.quantity,
    ds.call_quantity
FROM public.daily_status_snapshots ds
JOIN public.snapshot_batches sb    ON sb.id = ds.batch_id
LEFT JOIN public.resale_statuses rs ON rs.id = ds.status_id
WHERE sb.status = 'done'
ORDER BY sb.reference_date, ds.operation_name, rs.sort_order;

-- ============================================================
-- 8. RESALE COMPLETA — Visão unificada para listagem
-- ============================================================

CREATE OR REPLACE VIEW public.vw_resale_detail AS
SELECT
    r.id,
    r.external_code,
    r.title,
    r.customer_name,
    r.document,
    r.phone,
    r.email,
    r.source,
    r.notes,
    r.created_at,
    r.updated_at,
    -- Status
    rs.code         AS status_code,
    rs.name         AS status_name,
    rs.stage_group,
    -- Organograma
    reg.name        AS region_name,
    b.name          AS branch_name,
    t.name          AS team_name,
    u.full_name     AS assigned_user_name,
    -- Métricas rápidas
    (SELECT COUNT(*) FROM public.resale_interactions ri WHERE ri.resale_id = r.id)
                    AS total_interactions,
    (SELECT MAX(ri.interaction_date) FROM public.resale_interactions ri WHERE ri.resale_id = r.id)
                    AS last_interaction_at,
    (SELECT COUNT(*) FROM public.resale_financial_values fv WHERE fv.resale_id = r.id)
                    AS total_financial_entries
FROM public.resales r
LEFT JOIN public.resale_statuses rs ON rs.id = r.current_status_id
LEFT JOIN public.regions reg        ON reg.id = r.region_id
LEFT JOIN public.branches b         ON b.id = r.branch_id
LEFT JOIN public.teams t            ON t.id = r.team_id
LEFT JOIN public.users u            ON u.id = r.assigned_user_id;
-- ============================================================
-- STORAGE — Bucket para importações
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas usuários autenticados podem fazer upload
CREATE POLICY storage_imports_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'imports');

-- Apenas o uploader ou admins podem ler
CREATE POLICY storage_imports_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'imports'
        AND (
            (storage.foldername(name))[2] = auth.uid()::text
            OR public.user_has_permission('imports', 'view')
        )
    );
-- ============================================================
-- SECURITY HARDENING
-- ============================================================

-- ============================================================
-- 1. DELETE POLICIES — Tabelas com RLS que não tinham DELETE
-- ============================================================

-- resales: só quem tem permissão E está no scope
CREATE POLICY resales_delete ON resales
    FOR DELETE USING (
        public.user_has_permission('resales', 'delete')
        AND (
            public.user_scope_type() = 'global'
            OR (public.user_scope_type() = 'region' AND region_id IN (
                SELECT region_id FROM access_scopes WHERE user_id = public.current_app_user_id()
            ))
            OR (public.user_scope_type() = 'branch' AND branch_id IN (
                SELECT branch_id FROM access_scopes WHERE user_id = public.current_app_user_id()
            ))
            OR (public.user_scope_type() = 'team' AND team_id IN (
                SELECT team_id FROM access_scopes WHERE user_id = public.current_app_user_id()
            ))
            OR (public.user_scope_type() = 'own' AND assigned_user_id = public.current_app_user_id())
        )
    );

-- resale_financial_values: DELETE com scope
CREATE POLICY fin_values_delete ON resale_financial_values
    FOR DELETE USING (
        public.user_has_permission('financial', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_interactions: DELETE com scope
CREATE POLICY interactions_delete ON resale_interactions
    FOR DELETE USING (
        public.user_has_permission('resales', 'edit')
        AND public.user_can_access_resale(resale_id)
    );

-- resale_status_history: IMUTÁVEL — ninguém deleta
CREATE POLICY status_history_no_delete ON resale_status_history
    FOR DELETE USING (false);

CREATE POLICY status_history_no_update ON resale_status_history
    FOR UPDATE USING (false);

-- audit_logs: IMUTÁVEL — ninguém altera ou deleta
CREATE POLICY audit_no_insert ON audit_logs
    FOR INSERT WITH CHECK (false); -- Apenas o trigger SECURITY DEFINER insere

CREATE POLICY audit_no_update ON audit_logs
    FOR UPDATE USING (false);

CREATE POLICY audit_no_delete ON audit_logs
    FOR DELETE USING (false);

-- daily_status_snapshots: somente leitura
CREATE POLICY snapshots_no_delete ON daily_status_snapshots
    FOR DELETE USING (false);

CREATE POLICY snapshots_no_update ON daily_status_snapshots
    FOR UPDATE USING (false);

-- users: DELETE só para admin
CREATE POLICY users_delete ON users
    FOR DELETE USING (
        public.user_has_permission('users', 'delete')
    );

-- ============================================================
-- 2. RLS EM TABELAS SENSÍVEIS QUE FALTAVAM
-- ============================================================

-- uploaded_files
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY uploaded_files_select ON uploaded_files
    FOR SELECT USING (
        uploaded_by = public.current_app_user_id()
        OR public.user_has_permission('imports', 'view')
    );

CREATE POLICY uploaded_files_insert ON uploaded_files
    FOR INSERT WITH CHECK (
        public.user_has_permission('imports', 'upload')
    );

-- import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_batches_select ON import_batches
    FOR SELECT USING (
        public.user_has_permission('imports', 'view')
    );

CREATE POLICY import_batches_insert ON import_batches
    FOR INSERT WITH CHECK (
        public.user_has_permission('imports', 'upload')
    );

-- import_errors
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY import_errors_select ON import_errors
    FOR SELECT USING (
        public.user_has_permission('imports', 'view')
    );

-- staging_raw_records
ALTER TABLE staging_raw_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY staging_select ON staging_raw_records
    FOR SELECT USING (
        public.user_has_permission('imports', 'view')
    );

CREATE POLICY staging_insert ON staging_raw_records
    FOR INSERT WITH CHECK (
        public.user_has_permission('imports', 'upload')
    );

-- snapshot_batches
ALTER TABLE snapshot_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY snapshot_batches_select ON snapshot_batches
    FOR SELECT USING (
        public.user_has_permission('reports', 'view')
    );

-- user_roles — somente admin pode gerenciar
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_roles_select ON user_roles
    FOR SELECT USING (
        user_id = public.current_app_user_id()
        OR public.user_has_permission('users', 'view')
    );

CREATE POLICY user_roles_manage ON user_roles
    FOR ALL USING (
        public.user_has_permission('users', 'edit')
    );

-- access_scopes — somente admin pode gerenciar
ALTER TABLE access_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY access_scopes_select ON access_scopes
    FOR SELECT USING (
        user_id = public.current_app_user_id()
        OR public.user_has_permission('users', 'view')
    );

CREATE POLICY access_scopes_manage ON access_scopes
    FOR ALL USING (
        public.user_has_permission('users', 'edit')
    );

-- ============================================================
-- 3. SCOPE VALIDATION NAS FUNCTIONS SECURITY DEFINER
-- ============================================================

-- Reescrever change_resale_status com verificação de scope
CREATE OR REPLACE FUNCTION public.change_resale_status(
    p_resale_id   UUID,
    p_new_status  TEXT,
    p_notes       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID;
    v_status_id  UUID;
    v_current    UUID;
    v_history_id UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Validar acesso à revenda
    IF NOT public.user_can_access_resale(p_resale_id) THEN
        RAISE EXCEPTION 'Sem acesso a esta revenda';
    END IF;

    SELECT id INTO v_status_id
    FROM public.resale_statuses
    WHERE code = p_new_status AND is_active = true;

    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'Status "%" não encontrado ou inativo', p_new_status;
    END IF;

    SELECT current_status_id INTO v_current
    FROM public.resales
    WHERE id = p_resale_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    IF v_current = v_status_id THEN
        RAISE EXCEPTION 'Revenda já está no status "%"', p_new_status;
    END IF;

    UPDATE public.resales
    SET current_status_id = v_status_id
    WHERE id = p_resale_id;

    INSERT INTO public.resale_status_history (resale_id, status_id, changed_by, notes)
    VALUES (p_resale_id, v_status_id, v_user_id, p_notes)
    RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$;

-- Reescrever add_resale_interaction com verificação de scope
CREATE OR REPLACE FUNCTION public.add_resale_interaction(
    p_resale_id        UUID,
    p_interaction_type TEXT,
    p_result           TEXT DEFAULT NULL,
    p_notes            TEXT DEFAULT NULL,
    p_interaction_date TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_id      UUID;
BEGIN
    v_user_id := public.current_app_user_id();

    -- Validar acesso à revenda
    IF NOT public.user_can_access_resale(p_resale_id) THEN
        RAISE EXCEPTION 'Sem acesso a esta revenda';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.resales WHERE id = p_resale_id) THEN
        RAISE EXCEPTION 'Revenda % não encontrada', p_resale_id;
    END IF;

    INSERT INTO public.resale_interactions
        (resale_id, interaction_type, performed_by, interaction_date, result, notes)
    VALUES
        (p_resale_id, p_interaction_type, v_user_id, p_interaction_date, p_result, p_notes)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================================
-- 4. STORAGE — Restringir upload ao próprio folder
-- ============================================================

DROP POLICY IF EXISTS storage_imports_insert ON storage.objects;

CREATE POLICY storage_imports_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'imports'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- ============================================================
-- CRIAR USUARIO ADMIN
-- ============================================================
INSERT INTO users (auth_id, full_name, email, status)
VALUES ('9fa56967-d792-459a-85af-b480e1f75e35', 'Francisco Moreira', 'francisco.moreira@lyx.com.br', 'active');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'francisco.moreira@lyx.com.br' AND r.name = 'super_admin';

INSERT INTO access_scopes (user_id, scope_type)
SELECT id, 'global'
FROM users WHERE email = 'francisco.moreira@lyx.com.br';
