require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMembers() {
  const { data, count, error } = await supabase
    .from('members')
    .select('full_name, nim, department, role', { count: 'exact' });

  if (error) {
    console.error('Error fetching members:', error);
    return;
  }

  console.log(`Total members in DB: ${count}`);
  console.log('-----------------------------------');
  data.sort((a, b) => a.full_name.localeCompare(b.full_name)).forEach((m, i) => {
    console.log(`${i + 1}. [${m.nim || 'NO NIM'}] ${m.full_name} (${m.department} - ${m.role})`);
  });
}

checkMembers();
