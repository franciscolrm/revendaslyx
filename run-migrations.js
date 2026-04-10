const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'supabase-revendas.lyxai.com.br',
  port: 55432,
  user: 'postgres',
  password: 'qob0zo03xlza9pi7hw9txreutyvixbrr',
  database: 'postgres',
  ssl: false,
});

const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');

const migrations = [
  '00001_initial_schema.sql',
  '00002_seed_data.sql',
  '00003_rls_policies.sql',
  '00004_fixes.sql',
  '00005_business_functions.sql',
  '00006_views.sql',
  '00007_storage_bucket.sql',
  '00008_security_hardening.sql',
];

async function run() {
  await client.connect();
  console.log('Conectado ao PostgreSQL');

  for (const file of migrations) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Rodando ${file}...`);
    try {
      await client.query(sql);
      console.log(`  OK: ${file}`);
    } catch (err) {
      console.error(`  ERRO em ${file}: ${err.message}`);
    }
  }

  // Criar app user para o auth user já existente
  console.log('\nCriando app user...');
  try {
    const res = await client.query(`
      INSERT INTO users (auth_id, full_name, email, status)
      VALUES ('9fa56967-d792-459a-85af-b480e1f75e35', 'Francisco Moreira', 'francisco.moreira@lyx.com.br', 'active')
      RETURNING id
    `);
    const userId = res.rows[0].id;
    console.log('User ID:', userId);

    // Atribuir role super_admin
    const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'super_admin'`);
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].id;
      await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
      console.log('Role super_admin atribuida');
    }

    // Atribuir scope global
    await client.query(`INSERT INTO access_scopes (user_id, scope_type) VALUES ($1, 'global')`, [userId]);
    console.log('Scope global atribuido');

    console.log('\nUsuario criado com sucesso!');
    console.log('Email: francisco.moreira@lyx.com.br');
    console.log('Senha: 957201-Leo@');
    console.log('Role: super_admin');
    console.log('Scope: global');
  } catch (err) {
    console.error('Erro ao criar usuario:', err.message);
  }

  await client.end();
}

run().catch(console.error);
