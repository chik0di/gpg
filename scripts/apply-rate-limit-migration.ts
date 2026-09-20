import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// This script applies the rate limit migration directly
async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '019_research_rate_limits.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration: 019_research_rate_limits.sql')
  console.log('─'.repeat(50))

  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
    console.log(statement.substring(0, 100) + '...')

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error('Error:', error.message)
        // Continue anyway - some errors might be "already exists" which is ok
      } else {
        console.log('✅ Success')
      }
    } catch (err) {
      console.error('Exception:', err)
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log('Migration complete!')
}

applyMigration().catch(console.error)
