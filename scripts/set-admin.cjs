const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {};
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const localEnv = loadEnvFile(path.join(process.cwd(), '.env.local'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const emailArg = process.argv.find((arg) => arg.includes('@'));
const email = emailArg ? emailArg.trim().toLowerCase() : '';

if (!email) {
  console.error('Usage: node scripts/set-admin.cjs user@example.com');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) {
      throw new Error(result.error.message);
    }
    const users = result.data?.users || [];
    const match = users.find((user) => (user.email || '').toLowerCase() === targetEmail);
    if (match) return match;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function run() {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user found for email: ${email}`);
    process.exit(1);
  }

  const result = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, role: 'admin' })
    .select('user_id, role')
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log(`Updated role for ${email}: ${result.data.role}`);
}

run().catch((error) => {
  console.error(`Failed to set admin role: ${error.message}`);
  process.exit(1);
});
