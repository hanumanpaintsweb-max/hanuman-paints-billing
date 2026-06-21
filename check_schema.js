import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function run() {
  const { data, error } = await supabase
    .from('customers')
    .insert([{
      name: 'Test Customer',
      phone: '9999999999',
      total_orders: 1,
      total_value: 100
    }])
    .select();
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
