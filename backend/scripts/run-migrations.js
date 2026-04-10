require('dotenv').config();
const fs = require('fs');
const path = require('path');

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
  } else {
    const text = await res.text();
    console.log(`[ERROR] ${label}: ${res.status} - ${text.substring(0, 200)}`);
  }
}

async function main() {
  const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`\nRunning ${file}...`);
    await runSQL(sql, file);
  }

  console.log('\nDone!');
}

main().catch(console.error);
