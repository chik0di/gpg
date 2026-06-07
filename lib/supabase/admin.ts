import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS entirely.
// ONLY ever imported in server-side code (API routes, server components).
// NEVER import this in client components or expose the key to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
