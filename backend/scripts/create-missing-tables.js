require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
-- Resale statuses
CREATE TABLE IF NOT EXISTS resale_statuses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    stage_group TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Resales
CREATE TABLE IF NOT EXISTS resales (
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

-- Resale status history
CREATE TABLE IF NOT EXISTS resale_status_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resale_id   UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
    status_id   UUID NOT NULL REFERENCES resale_statuses(id),
    changed_by  UUID REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes       TEXT
);

-- Resale interactions
CREATE TABLE IF NOT EXISTS resale_interactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resale_id           UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
    interaction_type    TEXT NOT NULL CHECK (interaction_type IN ('call','whatsapp','email','visit','note')),
    performed_by        UUID REFERENCES users(id),
    interaction_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    result              TEXT,
    notes               TEXT
);

-- Snapshot batches
CREATE TABLE IF NOT EXISTS snapshot_batches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name     TEXT,
    reference_date  DATE NOT NULL,
    uploaded_by     UUID REFERENCES users(id),
    file_path       TEXT,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily status snapshots
CREATE TABLE IF NOT EXISTS daily_status_snapshots (
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

-- Financial components
CREATE TABLE IF NOT EXISTS resale_financial_components (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    component_type  TEXT,
    default_order   INT NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true
);

-- Financial values
CREATE TABLE IF NOT EXISTS resale_financial_values (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resale_id       UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
    component_id    UUID NOT NULL REFERENCES resale_financial_components(id),
    amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    reference_date  DATE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data sources
CREATE TABLE IF NOT EXISTS data_sources (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    type        TEXT,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID REFERENCES data_sources(id),
    file_name       TEXT NOT NULL,
    storage_path    TEXT NOT NULL,
    mime_type       TEXT,
    uploaded_by     UUID REFERENCES users(id),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Import batches
CREATE TABLE IF NOT EXISTS import_batches (
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

-- Import errors
CREATE TABLE IF NOT EXISTS import_errors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id        UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    row_number      INT,
    field_name      TEXT,
    error_message   TEXT NOT NULL,
    raw_payload     JSONB
);

-- Staging raw records
CREATE TABLE IF NOT EXISTS staging_raw_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id            UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    source_table_name   TEXT,
    raw_payload         JSONB NOT NULL,
    processed           BOOLEAN NOT NULL DEFAULT false,
    processed_at        TIMESTAMPTZ
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id),
    entity_name TEXT NOT NULL,
    entity_id   UUID,
    action      TEXT NOT NULL,
    old_data    JSONB,
    new_data    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

async function run() {
  // Split into individual statements and run each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    const cleanStmt = stmt + ';';
    console.log('Running:', cleanStmt.substring(0, 60) + '...');

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({}),
    });
  }

  // Use the SQL editor endpoint instead
  const pgRes = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgRes.ok) {
    console.log('SUCCESS via /pg');
  } else {
    console.log('/pg status:', pgRes.status);

    // Try management API
    const mgmtRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    console.log('REST API status:', mgmtRes.status);
    console.log('\n--- You need to run the SQL manually in the Supabase Dashboard SQL Editor ---');
    console.log('Go to: https://supabase.com/dashboard → Your project → SQL Editor');
    console.log('Then paste and run the migration files that are missing.');
  }
}

run().catch(console.error);
