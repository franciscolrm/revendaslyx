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
