import { createClient } from '@supabase/supabase-js'

async function createTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔧 Creating research_rate_limits table...\n')

  // Check if table exists
  const { data: existingTable, error: checkError } = await supabase
    .from('research_rate_limits')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('✅ Table already exists!')
    const { count } = await supabase
      .from('research_rate_limits')
      .select('*', { count: 'exact', head: true })
    console.log(`📊 Current records: ${count}`)
    return
  }

  console.log('📋 Table does not exist. Please run the following SQL in Supabase Dashboard:\n')
  console.log('─'.repeat(60))
  console.log(`
-- Create table for research finder rate limiting
CREATE TABLE IF NOT EXISTS public.research_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast IP lookups
CREATE INDEX IF NOT EXISTS research_rate_limits_ip_idx
  ON public.research_rate_limits(ip_address);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS research_rate_limits_window_start_idx
  ON public.research_rate_limits(window_start);

-- RLS policies
ALTER TABLE public.research_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.research_rate_limits
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.research_rate_limits
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public select" ON public.research_rate_limits
  FOR SELECT TO anon, authenticated
  USING (true);
  `)
  console.log('─'.repeat(60))
  console.log(`\n🔗 Dashboard: https://supabase.com/dashboard/project/${supabaseUrl.match(/\/\/([^.]+)/)[1]}/sql/new\n`)
}

createTable().catch(console.error)
