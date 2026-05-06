const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://clujmuvqgffezhmvetqm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWptdXZxZ2ZmZXpobXZldHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY2NjUsImV4cCI6MjA4Nzk4MjY2NX0.-BGt-i0INR3xr-_aJAqsmAAXasvSXK_pi9Txhn-12X4');

async function test() {
  console.log('advocacy_aspirations:');
  const a = await supabase.from('advocacy_aspirations').select('*, member:members!advocacy_aspirations_member_id_fkey(id,full_name)').limit(1);
  console.log(a.error);
  
  console.log('logbook_entries:');
  const b = await supabase.from('logbook_entries').select('*, member:members(id,full_name)').limit(1);
  console.log(b.error);

  console.log('counseling_requests:');
  const c = await supabase.from('counseling_requests').select('*, member:members(id,full_name)').limit(1);
  console.log(c.error);
}
test();
