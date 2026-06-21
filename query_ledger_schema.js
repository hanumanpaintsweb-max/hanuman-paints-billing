import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('ledger').select('*').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // try inserting a dummy to see what fails
    console.log("No data");
    
    // let's fetch one bill that has payment_status='unpaid'
    const { data: bData } = await supabase.from('bills').select('*').in('payment_status', ['unpaid', 'partial']).limit(2);
    console.log("Bills with unpaid/partial:", JSON.stringify(bData?.map(b => ({id: b.id, payment_status: b.payment_status})), null, 2));
  }
}
run();
