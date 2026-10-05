import { supabaseAdmin } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import type { OrderRevision } from '@/lib/revisions'
import { sendRevisionNotification } from '@/lib/resend'

export async function revisionUser(admin = false) {
  const { data: { user } } = await createServerClient().auth.getUser()
  if (!user || (admin && user.email !== 'admin@getprimegrade.com')) return null
  if (admin) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return null
  }
  return user
}

export async function revisionsForOrder(orderId: string) {
  const { data, error } = await supabaseAdmin.from('order_revisions').select('*').eq('order_id', orderId).order('created_at', { ascending: false })
  if (error) {
    console.error('[revisions] Could not load revisions:', error.code)
    return null
  }
  return Promise.all((data as OrderRevision[]).map(async r => ({
    ...r,
    attachment_url: r.attachment_path
      ? (await supabaseAdmin.storage.from('order-files').createSignedUrl(r.attachment_path, 3600)).data?.signedUrl ?? null : null,
  })))
}

export async function notifyRevision(orderId: string, status: OrderRevision['status'], origin: string) {
  // A saved request/delivery remains successful if the email provider is unavailable.
  try {
    const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', orderId).single()
    if (!order) throw new Error('Order not found for notification')
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(order.user_id)
    if (!user?.email) throw new Error('Recipient not found')
    await sendRevisionNotification({ orderId, status, clientEmail: user.email, origin })
  } catch (error) {
    console.error('[revisions] Notification failed:', error instanceof Error ? error.message : 'Unknown error')
  }
}

export function revisionMutationError(message: string) {
  // Do not return SQL/schema errors or implementation details to clients.
  const expected = ['Order not found', 'Revision not found', 'Forbidden',
    'Revisions are available after your work is delivered', 'The revision request window has closed',
    'All three free revisions have been used', 'An active revision request already exists',
    'Only a request that has not started can be cancelled', 'This request has already been handled',
    'Start the revision before delivering or declining it', 'Upload revised work before delivering', 'Invalid revision action']
  return expected.includes(message) ? message : 'Could not save the revision. Please try again.'
}
