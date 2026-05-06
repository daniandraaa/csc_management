const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://clujmuvqgffezhmvetqm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWptdXZxZ2ZmZXpobXZldHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY2NjUsImV4cCI6MjA4Nzk4MjY2NX0.-BGt-i0INR3xr-_aJAqsmAAXasvSXK_pi9Txhn-12X4');

async function test() {
  const { data, error } = await supabase.from('content_requests').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || {}));
}
test();
