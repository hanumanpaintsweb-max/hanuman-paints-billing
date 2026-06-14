import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://cbkduvrkyzpzvdpgzrdq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNia2R1dnJreXpwenZkcGd6cmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM2NTAsImV4cCI6MjA5NjA4OTY1MH0.YD-zqJppyZJdFWrVKbg9bmYnQI6aBVwIFG0uJMo4o-E')
async function run() {
  const { data, error } = await supabase.from('products').select('mrp:base_mrp, name').limit(1)
  console.log('Error:', error)
  console.log('Data:', data)
}
run()
