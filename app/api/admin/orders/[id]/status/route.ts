import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendOrderCompletedEmail } from '@/lib/resend'
import { rateLimit, getClientIp, RateLimitPresets } from '@/lib/rate-limit'

const VALID_STATUSES = ['pending', 'in_progress', 'completed']

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting - 30 requests per minute for admin operations
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(clientIp, RateLimitPresets.relaxed)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
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

    // Update the order status
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // If marking completed, send the client a notification email
    if (status === 'completed') {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('subject_field, user_id')
        .eq('id', orderId)
        .single()

      if (order) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name')
          .eq('id', order.user_id)
          .single()

        if (profile?.email) {
          const { error: emailErr } = await sendOrderCompletedEmail({
            to:           profile.email,
            firstName:    profile.first_name ?? '',
            orderId,
            subjectField: order.subject_field,
          })
          if (emailErr) {
            console.error('[status] completion email failed:', emailErr)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/admin/orders/[id]/status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
