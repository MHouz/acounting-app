import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nynkicgapwzcpogdzxyc.supabase.co';
const supabaseKey = 'sb_publishable_j84YxcMWFEa2fQgiONqjww_7Xbl_ct1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: user, error: userError } = await supabase.auth.getUser();
  console.log("Auth error:", userError);
  console.log("User:", user?.user?.id);

  const { data: clients, error: clientsError } = await supabase.from('clients').select('*');
  console.log("Clients error:", clientsError);
  console.log("Clients data:", clients);
  
  const { data: accountants, error: accError } = await supabase.from('accountants').select('*');
  console.log("Accountants error:", accError);
  console.log("Accountants data:", accountants);
}

checkData();
