const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://clujmuvqgffezhmvetqm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWptdXZxZ2ZmZXpobXZldHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY2NjUsImV4cCI6MjA4Nzk4MjY2NX0.-BGt-i0INR3xr-_aJAqsmAAXasvSXK_pi9Txhn-12X4');

async function test() {
  const { data, error } = await supabase.from('admin_reviews').select('document_id').limit(1);
  console.log('document_id check:', {data, error});
  
  const { data: d2, error: e2 } = await supabase.from('admin_reviews').select('document:documents(title)').limit(1);
  console.log('relation check:', {d2, e2});
}
test();
