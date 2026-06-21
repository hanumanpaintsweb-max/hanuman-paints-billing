import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('ledger').insert([
    {
      customer_name: 'Test',
      customer_phone: '1234567890',
      type: 'receivable',
      amount: 100,
      description: 'Test',
      date: '2026-06-21',
      status: 'pending',
      due_date: null,
      bill_number: 'TEST-1'
    }
  ]).select('*');
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
