import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('bills').select('*').limit(5);
  if (error) console.error(error);
  console.log(JSON.stringify(data?.map(b => ({id: b.id, bill_number: b.bill_number, payment_status: b.payment_status, payment_method: b.payment_method})), null, 2));
}
run();
