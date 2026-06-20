import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://nynkicgapwzcpogdzxyc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bmtpY2dhcHd6Y3BvZ2R6eHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NDQxNzEsImV4cCI6MjA5NzQyMDE3MX0.EtFsiHyC80fPkwyOZXZT6XQM_d1C4vfUlVJ1-kWDX9Y';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
