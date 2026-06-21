import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('customers').select('*').limit(5);
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  if (data?.length > 0) console.log("Sample customer:", data[0].name);
}
run();
