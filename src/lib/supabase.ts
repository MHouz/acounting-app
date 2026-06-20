import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://nynkicgapwzcpogdzxyc.supabase.co';
const supabaseKey = 'sb_publishable_j84YxcMWFEa2fQgiONqjww_7Xbl_ct1';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
