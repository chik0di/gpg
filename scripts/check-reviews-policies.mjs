import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔍 Checking RLS policies on reviews table...\n')

// Query pg_policies to see actual policies
const query = `
  SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  FROM pg_policies
  WHERE tablename = 'reviews'
  ORDER BY policyname;
`

try {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: query
  }).select()

  if (error) {
    // Try direct query instead
    console.log('Trying alternative query method...\n')

    // Use raw SQL query via service role
    const { data: policies, error: queryError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'reviews')

    if (queryError) {
      console.error('❌ Error querying policies:', queryError)
      console.log('\n⚠️  Cannot query pg_policies directly.')
      console.log('Please run this SQL in Supabase SQL Editor:\n')
      console.log(query)
    } else {
      console.log('✅ Found policies:', JSON.stringify(policies, null, 2))
    }
  } else {
    console.log('✅ Policies:', JSON.stringify(data, null, 2))
  }
} catch (err) {
  console.error('❌ Error:', err)
  console.log('\n📋 Please run this SQL in Supabase SQL Editor to check policies:\n')
  console.log('─'.repeat(60))
  console.log(query)
  console.log('─'.repeat(60))
}

console.log('\n📋 Also check reviews table grants:\n')
console.log(`
SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'reviews'
ORDER BY grantee, privilege_type;
`)

console.log('\n🔍 Test query approved reviews as anon:\n')
console.log(`
-- This should return approved reviews
SELECT id, rating, review_text, display_name, is_approved, created_at
FROM reviews
WHERE is_approved = true
ORDER BY created_at DESC
LIMIT 5;
`)

process.exit(0)
