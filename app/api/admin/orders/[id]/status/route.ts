import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendOrderCompletedEmail, sendOrderInProgressEmail } from '@/lib/resend'
import { rateLimit, getClientIp, RateLimitPresets, getRateLimitErrorMessage } from '@/lib/rate-limit'
import { getOriginFromRequest } from '@/lib/utils/request-origin'

const VALID_STATUSES = ['pending', 'in_progress', 'completed']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const origin = getOriginFromRequest(request)
  try {
    // Rate limiting - 30 requests per minute for admin operations
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(clientIp, RateLimitPresets.admin)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetAt) },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      )
    }

    // Verify admin
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'admin@getprimegrade.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { status } = await request.json()
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const orderId = params.id

    const { data: order, error: orderError } = await supabaseAdmin.from('orders')
      .select('status, module_name, subject_field, user_id, deadline').eq('id', orderId).maybeSingle()
    if (orderError) return NextResponse.json({ error: 'Could not load order.' }, { status: 503 })
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.status === status) return NextResponse.json({ ok: true, status, notification: 'not_needed' })
    if (order.status === 'completed') {
      return NextResponse.json({ error: 'Delivered orders remain completed. Handle further work through a revision request.' }, { status: 409 })
    }

    const { data: revision, error: revisionError } = await supabaseAdmin.from('order_revisions')
      .select('id').eq('order_id', orderId).in('status', ['requested', 'in_progress']).maybeSingle()
    if (revisionError) return NextResponse.json({ error: 'Could not check revision requests.' }, { status: 503 })
    if (revision) return NextResponse.json({ error: 'Manage this order through its active revision request.' }, { status: 409 })

    // Compare the stored status so two simultaneous saves cannot both notify.
    const { data: updated, error: updateErr } = await supabaseAdmin.from('orders')
      .update({ status }).eq('id', orderId).eq('status', order.status).select('id').maybeSingle()
    if (updateErr) {
      if (updateErr.message === 'Upload completed work before marking the order completed') {
        return NextResponse.json({ error: updateErr.message }, { status: 409 })
      }
      return NextResponse.json({ error: 'Could not update order status.' }, { status: 500 })
    }
    if (!updated) return NextResponse.json({ error: 'This order changed while you were saving. Refresh and try again.' }, { status: 409 })

    let notification = 'not_needed'
    let warning: string | undefined
    if (status === 'in_progress' || status === 'completed') {
      notification = 'failed'
      try {
        const { data: profile, error: profileError } = await supabaseAdmin.from('profiles')
          .select('email, first_name').eq('id', order.user_id).single()
        if (profileError || !profile?.email) throw new Error('Client email unavailable')
        const common = { origin, to: profile.email, firstName: profile.first_name ?? '', orderId,
          moduleName: order.module_name, subjectField: order.subject_field }
        const result = status === 'completed'
          ? await sendOrderCompletedEmail(common)
          : await sendOrderInProgressEmail({ ...common, deadline: order.deadline })
        if (result.error) throw new Error('Email provider rejected notification')
        notification = 'sent'
      } catch {
        console.error('[status] Order saved but notification could not be sent:', orderId)
        warning = 'Order status saved, but the notification email could not be sent. Contact the client separately.'
      }
    }
    return NextResponse.json({ ok: true, status, notification, ...(warning ? { warning } : {}) })

  } catch (err) {
    console.error('PATCH /api/admin/orders/[id]/status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
