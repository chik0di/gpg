'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Sign out the current user and redirect to the homepage.
 * This is a client-side sign out that works reliably on first click.
 */
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()

  // Redirect to homepage
  window.location.href = '/'
}
