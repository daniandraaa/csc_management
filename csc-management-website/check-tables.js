const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://clujmuvqgffezhmvetqm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWptdXZxZ2ZmZXpobXZldHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY2NjUsImV4cCI6MjA4Nzk4MjY2NX0.-BGt-i0INR3xr-_aJAqsmAAXasvSXK_pi9Txhn-12X4');

async function test() {
  const t1 = await supabase.from('pr_requests').select('count', { count: 'exact', head: true });
  const t2 = await supabase.from('pr_jobdesk').select('count', { count: 'exact', head: true });
  const t3 = await supabase.from('documents').select('count', { count: 'exact', head: true });
  
  console.log('pr_requests:', t1.error ? t1.error.message : 'Exists');
  console.log('pr_jobdesk:', t2.error ? t2.error.message : 'Exists');
  console.log('documents:', t3.error ? t3.error.message : 'Exists');
}
test();
