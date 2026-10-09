import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmailChangeSecurityNotification } from '@/lib/resend'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(_request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let claimedId: string | null = null
  const claimedAt = new Date().toISOString()
  try {
    // Only the Auth database trigger can record a change and its previous address.
    const { data: change, error } = await supabaseAdmin.from('account_email_changes')
      .select('id, old_email, new_email, created_at, notification_sent_at')
      .eq('user_id', user.id).eq('new_email', user.email)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return NextResponse.json({ error: 'Account email synchronisation is unavailable.' }, { status: 503 })
    if (!change) return NextResponse.json({ changed: false })
    const recentlyChanged = Date.now() - new Date(change.created_at).getTime() < 86400000
    if (change.notification_sent_at) return NextResponse.json({ changed: recentlyChanged })
    if (!rateLimit(`email-change-notice:${user.id}`, { limit: 5, windowSeconds: 3600 }).success)
      return NextResponse.json({ error: 'Please try again later.' }, { status: 429 })

    // A short claim prevents duplicate sends from concurrent page loads; abandoned claims can retry.
    const staleBefore = new Date(Date.now() - 5 * 60000).toISOString()
    const { data: claimed, error: claimError } = await supabaseAdmin.from('account_email_changes')
      .update({ notification_claimed_at: claimedAt })
      .eq('id', change.id).eq('user_id', user.id).is('notification_sent_at', null)
      .or(`notification_claimed_at.is.null,notification_claimed_at.lt.${staleBefore}`)
      .select('id').maybeSingle()
    if (claimError) throw new Error('Could not claim the security notification.')
    if (!claimed) return NextResponse.json({ changed: recentlyChanged })
    claimedId = change.id

    const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle()
    const result = await sendEmailChangeSecurityNotification({
      to: change.old_email, newEmail: change.new_email, firstName: profile?.first_name ?? null,
      idempotencyKey: `account-email-change-${change.id}`,
    })
    if (result.error) throw new Error('Email provider rejected the security notification.')
    const { error: sentError } = await supabaseAdmin.from('account_email_changes')
      .update({ notification_sent_at: new Date().toISOString(), notification_claimed_at: null })
      .eq('id', change.id).eq('user_id', user.id).eq('notification_claimed_at', claimedAt)
    if (sentError) throw new Error('Could not record the security notification.')
    return NextResponse.json({ changed: recentlyChanged })
  } catch (error) {
    if (claimedId) await supabaseAdmin.from('account_email_changes')
      .update({ notification_claimed_at: null }).eq('id', claimedId).eq('user_id', user.id)
      .eq('notification_claimed_at', claimedAt)
    console.error('[email-change-notification] Notification failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to send security notification. Please try again later.' }, { status: 500 })
  }
}
