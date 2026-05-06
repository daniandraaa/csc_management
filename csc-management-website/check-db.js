require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log("Checking if table external_orders exists...")
    const { data, error } = await supabase.from('external_orders').select('*').limit(1)
    if (error) {
        console.error("Error:", error.message)
    } else {
        console.log("Success! Data:", data)
    }
}
check()
