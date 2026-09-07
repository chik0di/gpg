import { createServerClient } from '@/lib/supabase/server'

/**
 * Check if the current user is an admin
 * @returns {Promise<{ isAdmin: boolean, userId: string | null }>}
 */
export async function checkIsAdmin() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false, userId: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return {
    isAdmin: profile?.is_admin ?? false,
    userId: user.id
  }
}

/**
 * Require admin access or throw 403
 * @returns {Promise<string>} userId if admin
 * @throws {Response} 403 if not admin
 */
export async function requireAdmin() {
  const { isAdmin, userId } = await checkIsAdmin()

  if (!isAdmin || !userId) {
    throw new Response(
      JSON.stringify({ error: 'Forbidden - Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return userId
}
