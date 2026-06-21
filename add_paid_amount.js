import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Oh wait, anon key cannot ALTER TABLE. I need to run raw SQL. Supabase doesn't let you run raw SQL from JS client easily without an RPC or postgres connection string.
// Let's check if the column exists first, maybe my query was cached?
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('bills').select('paid_amount').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
