import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nynkicgapwzcpogdzxyc.supabase.co';
const supabaseKey = 'sb_publishable_j84YxcMWFEa2fQgiONqjww_7Xbl_ct1';

export const supabase = createClient(supabaseUrl, supabaseKey);
