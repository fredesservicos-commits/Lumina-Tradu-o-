import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const emails = ['alexandrem.f@live.com', 'desktoferreira@gmail.com'];
  console.log("--- Relatório de Contas no Supabase Auth ---");
  
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError);
    return;
  }
  
  const users = data.users;

  for (const email of emails) {
    const user = users.find(u => u.email === email);
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      console.log(`Email: ${email}`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Plano no Banco: ${profile?.plan_type}`);
      console.log(`  Quota Atual: ${profile?.quota_limit}`);
      console.log(`  Usado: ${profile?.characters_used}`);
      console.log('-------------------');
    } else {
      console.log(`Email: ${email} (Não cadastrado no Auth)`);
    }
  }
}
check();
