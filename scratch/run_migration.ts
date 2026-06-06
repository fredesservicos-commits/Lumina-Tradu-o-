import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Supabase SQL endpoint - uses service role key
async function runRawSql(sql: string): Promise<void> {
  // Method 1: Try via supabase-js with raw query
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'public' }
  });

  // Try to use the management API style endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  console.log(`Status: ${res.status}`);
  const text = await res.text();
  console.log(`Resposta: ${text.slice(0, 1000)}`);
}

async function main() {
  const sql = `ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;`;
  console.log("Executando SQL:", sql);
  await runRawSql(sql);

  // Now try the update
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('id', '9fe59dfc-a364-4816-acd6-2d227b51a295');
  if (error) {
    console.log("Erro no update após migration:", error.message);
  } else {
    console.log("✅ Admin configurado com sucesso!");
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', '9fe59dfc-a364-4816-acd6-2d227b51a295').single();
    console.log("Perfil:", profile);
  }
}

main().catch(console.error);
