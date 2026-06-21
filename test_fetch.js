import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('ledger').select('*').eq('status', 'pending').order('due_date', { ascending: true });
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : null);
}
run();
