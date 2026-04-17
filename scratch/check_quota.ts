
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  const email = 'desktoferreira@gmail.com';
  console.log(`Buscando usuário: ${email}`);
  
  // Encontrar o UID no Auth
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Erro ao listar usuários:', authError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.log('Usuário não encontrado no Auth.');
    return;
  }

  console.log(`UID encontrado: ${user.id}`);

  // Buscar perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil:', profileError);
    return;
  }

  console.log('--- Perfil Atual ---');
  console.log(`Plano: ${profile.plan_type}`);
  console.log(`Quota: ${profile.characters_used} / ${profile.quota_limit}`);
  console.log(`ID: ${profile.id}`);
}

checkUser();
