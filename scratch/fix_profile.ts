import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  const email = 'alexandrem.f@live.com';
  console.log(`Buscando usuário para reparo: ${email}`);
  
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError);
    return;
  }

  const user = users.find(u => u.email === email);
  
  if (user) {
    console.log(`UID encontrado: ${user.id}. Aplicando upgrade para Professional...`);
    const { error } = await supabase.from('profiles').update({
      plan_type: 'professional',
      quota_limit: 400000,
      characters_used: 201310, // Mantendo o uso atual conforme o relatório
      files_this_month: 0
    }).eq('id', user.id);
    
    if (error) {
      console.error("Erro ao atualizar tabela profiles:", error);
    } else {
      console.log("✅ Perfil de " + email + " corrigido para Professional com sucesso!");
    }
  } else {
    console.error("Usuário não encontrado.");
  }
}
fix();

