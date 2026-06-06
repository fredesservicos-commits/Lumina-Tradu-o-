import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function setAdmin() {
  const email = 'alexandrem.f@live.com';
  console.log(`Buscando usuário: ${email}`);

  // First try to find the user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error("Usuário não encontrado.");
    return;
  }

  console.log(`UID encontrado: ${user.id}. Aplicando is_admin=true...`);

  const { error } = await supabase.from('profiles').update({
    is_admin: true
  }).eq('id', user.id);

  if (error) {
    console.error("Erro ao atualizar. A coluna 'is_admin' pode não existir ainda.");
    console.log("\nExecute este SQL no Supabase Dashboard (SQL Editor):");
    console.log("--------------------------------------------------");
    console.log("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;");
    console.log("--------------------------------------------------");
    console.log("Depois execute este script novamente.");
    return;
  }

  console.log(`✅ ${email} agora é administrador!`);

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  console.log("Perfil atualizado:", profile);
}

setAdmin();
