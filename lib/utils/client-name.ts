import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Three-tier fallback for client name display:
 * 1. Profile first_name/last_name
 * 2. Auth metadata given_name/family_name (or full_name split)
 * 3. Email prefix
 */
export async function getClientDisplayName(
  userId: string,
  profile: { first_name: string | null; last_name: string | null; email: string } | null
): Promise<string> {
  let firstName = profile?.first_name?.trim() || ''
  let lastName = profile?.last_name?.trim() || ''

  // If profile is empty, try auth metadata
  if (!firstName && !lastName) {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authUser?.user_metadata) {
      const meta = authUser.user_metadata
      firstName = meta.given_name || meta.first_name || ''
      lastName = meta.family_name || meta.last_name || ''

      // Try splitting full_name if available
      if (!firstName && !lastName && typeof meta.full_name === 'string') {
        const parts = meta.full_name.trim().split(' ')
        firstName = parts[0] || ''
        lastName = parts.slice(1).join(' ') || ''
      }
    }
  }

  // Final fallback: use email prefix
  if (!firstName && !lastName && profile?.email) {
    const emailPrefix = profile.email.split('@')[0]
    const parts = emailPrefix.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) {
      firstName = parts[0]
      lastName = parts.slice(1).join(' ')
    } else {
      firstName = parts[0] || 'Client'
    }
  }

  // Build display name
  const nameParts = [firstName, lastName].filter(Boolean)
  return nameParts.length > 0 ? nameParts.join(' ') : 'Client'
}

/**
 * Get first initial for avatar, using same three-tier fallback
 */
export async function getClientInitial(
  userId: string,
  profile: { first_name: string | null; last_name: string | null; email: string } | null
): Promise<string> {
  let firstName = profile?.first_name?.trim() || ''

  // If profile is empty, try auth metadata
  if (!firstName) {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authUser?.user_metadata) {
      const meta = authUser.user_metadata
      firstName = meta.given_name || meta.first_name || ''

      // Try splitting full_name if available
      if (!firstName && typeof meta.full_name === 'string') {
        const parts = meta.full_name.trim().split(' ')
        firstName = parts[0] || ''
      }
    }
  }

  // Final fallback: use email prefix first letter
  if (!firstName && profile?.email) {
    const emailPrefix = profile.email.split('@')[0]
    firstName = emailPrefix[0] || '?'
  }

  return (firstName[0] ?? '?').toUpperCase()
}
