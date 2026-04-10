require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL(sql, label) {
  const res = await fetch(url + '/pg/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log(`[OK] ${label}`);
    return true;
  } else {
    const text = await res.text();
    // Ignore "already exists" errors
    if (text.includes('already exists')) {
      console.log(`[SKIP] ${label} (already exists)`);
      return true;
    }
    console.log(`[ERROR] ${label}: ${text.substring(0, 300)}`);
    return false;
  }
}

async function main() {
  console.log('=== Step 1: Create missing tables ===\n');

  const tables = [
    {
      name: 'resale_statuses',
      sql: `CREATE TABLE IF NOT EXISTS resale_statuses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        stage_group TEXT, sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true
      );`,
    },
    {
      name: 'resales',
      sql: `CREATE TABLE IF NOT EXISTS resales (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        external_code TEXT, title TEXT, customer_name TEXT, document TEXT,
        phone TEXT, email TEXT,
        region_id UUID REFERENCES regions(id), branch_id UUID REFERENCES branches(id),
        team_id UUID REFERENCES teams(id), assigned_user_id UUID REFERENCES users(id),
        current_status_id UUID REFERENCES resale_statuses(id),
        source TEXT, notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'resale_status_history',
      sql: `CREATE TABLE IF NOT EXISTS resale_status_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        resale_id UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
        status_id UUID NOT NULL REFERENCES resale_statuses(id),
        changed_by UUID REFERENCES users(id),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now(), notes TEXT
      );`,
    },
    {
      name: 'resale_interactions',
      sql: `CREATE TABLE IF NOT EXISTS resale_interactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        resale_id UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
        interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call','whatsapp','email','visit','note')),
        performed_by UUID REFERENCES users(id),
        interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(), result TEXT, notes TEXT
      );`,
    },
    {
      name: 'snapshot_batches',
      sql: `CREATE TABLE IF NOT EXISTS snapshot_batches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_name TEXT, reference_date DATE NOT NULL,
        uploaded_by UUID REFERENCES users(id), file_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'daily_status_snapshots',
      sql: `CREATE TABLE IF NOT EXISTS daily_status_snapshots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id UUID NOT NULL REFERENCES snapshot_batches(id) ON DELETE CASCADE,
        operation_name TEXT NOT NULL, snapshot_date DATE NOT NULL,
        status_name_raw TEXT NOT NULL, status_id UUID REFERENCES resale_statuses(id),
        quantity INT NOT NULL DEFAULT 0, call_quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'resale_financial_components',
      sql: `CREATE TABLE IF NOT EXISTS resale_financial_components (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, component_type TEXT,
        default_order INT NOT NULL DEFAULT 0, is_required BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true
      );`,
    },
    {
      name: 'resale_financial_values',
      sql: `CREATE TABLE IF NOT EXISTS resale_financial_values (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        resale_id UUID NOT NULL REFERENCES resales(id) ON DELETE CASCADE,
        component_id UUID NOT NULL REFERENCES resale_financial_components(id),
        amount NUMERIC(15,2) NOT NULL DEFAULT 0, notes TEXT, reference_date DATE,
        created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'data_sources',
      sql: `CREATE TABLE IF NOT EXISTS data_sources (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL, type TEXT, description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'uploaded_files',
      sql: `CREATE TABLE IF NOT EXISTS uploaded_files (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id UUID REFERENCES data_sources(id),
        file_name TEXT NOT NULL, storage_path TEXT NOT NULL, mime_type TEXT,
        uploaded_by UUID REFERENCES users(id), uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'import_batches',
      sql: `CREATE TABLE IF NOT EXISTS import_batches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id UUID REFERENCES data_sources(id),
        uploaded_file_id UUID REFERENCES uploaded_files(id),
        import_type TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error')),
        total_rows INT DEFAULT 0, valid_rows INT DEFAULT 0, invalid_rows INT DEFAULT 0,
        started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      name: 'import_errors',
      sql: `CREATE TABLE IF NOT EXISTS import_errors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
        row_number INT, field_name TEXT, error_message TEXT NOT NULL, raw_payload JSONB
      );`,
    },
    {
      name: 'staging_raw_records',
      sql: `CREATE TABLE IF NOT EXISTS staging_raw_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
        source_table_name TEXT, raw_payload JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT false, processed_at TIMESTAMPTZ
      );`,
    },
    {
      name: 'audit_logs',
      sql: `CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id), entity_name TEXT NOT NULL, entity_id UUID,
        action TEXT NOT NULL, old_data JSONB, new_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
  ];

  for (const t of tables) {
    await runSQL(t.sql, t.name);
  }

  console.log('\n=== Step 2: Seed data ===\n');

  await runSQL(`
    INSERT INTO resale_statuses (code, name, stage_group, sort_order) VALUES
      ('01_angariacao','01. Angariação','captacao',1),
      ('01_vendida','01. Vendida','captacao',2),
      ('02_liberada_pra_venda','02. Liberada pra Venda','comercial',3),
      ('02_cancelada','02. Cancelada','comercial',4),
      ('03_agendada_cartorio','03. Agendada Cartório','cartorio',5),
      ('03_analise_juridica','03. Análise Jurídica','cartorio',6),
      ('04_escritura_assinada','04. Escritura Assinada','cartorio',7),
      ('05_registro_andamento','05. Registro em Andamento','registro',8),
      ('06_registrada','06. Registrada','registro',9),
      ('07_concluida','07. Concluída','finalizado',10),
      ('08_distrato','08. Distrato','finalizado',11)
    ON CONFLICT (code) DO NOTHING;
  `, 'resale_statuses seed');

  await runSQL(`
    INSERT INTO resale_financial_components (code, name, component_type, default_order, is_required) VALUES
      ('financiamento','Financiamento','receita',1,true),
      ('subsidio','Subsídio','receita',2,false),
      ('fgts','FGTS','receita',3,false),
      ('endividamento','Endividamento','despesa',4,false),
      ('jdo','JDO','despesa',5,false),
      ('documentacao','Documentação','despesa',6,false),
      ('laudo','Laudo','despesa',7,false),
      ('iptu','IPTU','despesa',8,false),
      ('comissao','Comissão','despesa',9,true),
      ('valor_venda','Valor de Venda','referencia',0,true),
      ('valor_avaliacao','Valor de Avaliação','referencia',0,false)
    ON CONFLICT (code) DO NOTHING;
  `, 'financial_components seed');

  console.log('\n=== Step 3: Verify tables ===\n');

  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const checkTables = ['resales','resale_statuses','uploaded_files','import_batches','staging_raw_records','data_sources','audit_logs'];
  for (const t of checkTables) {
    const { status } = await sb.from(t).select('id').limit(0);
    console.log(`${t}: ${status === 200 ? 'OK' : 'MISSING (' + status + ')'}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
