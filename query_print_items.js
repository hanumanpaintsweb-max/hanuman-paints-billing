import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('bills').select('items').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) {
    console.log(JSON.stringify(data[0].items[0], null, 2));
  }
}
run();
