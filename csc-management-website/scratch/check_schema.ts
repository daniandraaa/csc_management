import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function checkSchema() {
    console.log('Checking media_partners...')
    const { data: mp, error: e1 } = await supabase.from('media_partners').select('*').limit(1)
    if (e1) console.error('Media Partners error:', e1)
    else console.log('Media Partners ok. Columns:', Object.keys(mp[0] || {}))

    console.log('Checking content_plans...')
    const { data: cp, error: e2 } = await supabase.from('content_plans').select('*').limit(1)
    if (e2) console.error('Content Plans error:', e2)
    else console.log('Content Plans ok. Columns:', Object.keys(cp[0] || {}))
}

checkSchema()
