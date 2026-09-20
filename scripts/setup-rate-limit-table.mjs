import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function setup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔧 Setting up rate limit table...')
  console.log('─'.repeat(60))

  // Read and execute the migration
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '019_research_rate_limits.sql')
  const sql = readFileSync(migrationPath, 'utf-8')

  // Note: Supabase client doesn't support raw SQL execution
  // You need to run this via the Supabase Dashboard SQL Editor
  // or use the Supabase CLI

  console.log('📋 Migration SQL ready. Please run this in Supabase Dashboard > SQL Editor:')
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
  console.log('\nOr copy from: supabase/migrations/019_research_rate_limits.sql')
  console.log('\n💡 Dashboard URL:', `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/project/_/sql`)
}

setup().catch(console.error)
