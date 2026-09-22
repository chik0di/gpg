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

    // Update the order status
    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Send notification emails based on status change
    if (status === 'in_progress' || status === 'completed') {
      console.log('========================================')
      console.log('[status] 📧 Preparing to send status update email')
      console.log('[status] Order ID:', orderId)
      console.log('[status] New status:', status)
      console.log('========================================')

      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('module_name, subject_field, user_id, deadline')
        .eq('id', orderId)
        .single()

      if (orderError) {
        console.error('[status] ❌ Failed to fetch order:', orderError)
        return NextResponse.json({ ok: true }) // Still return success for status update
      }

      console.log('[status] Order fetched:', {
        user_id: order?.user_id,
        module_name: order?.module_name,
        subject_field: order?.subject_field
      })

      if (order) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name')
          .eq('id', order.user_id)
          .single()

        if (profileError) {
          console.error('[status] ❌ Failed to fetch profile for user:', order.user_id, profileError)
          return NextResponse.json({ ok: true })
        }

        console.log('========================================')
        console.log('[status] 👤 Profile fetched for user:', order.user_id)
        console.log('[status] Email:', profile?.email)
        console.log('[status] First name:', profile?.first_name)
        console.log('[status] First name type:', typeof profile?.first_name)
        console.log('[status] First name is null:', profile?.first_name === null)
        console.log('[status] First name is undefined:', profile?.first_name === undefined)
        console.log('[status] First name is empty string:', profile?.first_name === '')
        console.log('[status] First name after ?? \'\':', profile?.first_name ?? '')
        console.log('========================================')

        if (profile?.email) {
          const firstName = profile.first_name ?? ''
          console.log('[status] firstName variable set to:', firstName, '(length:', firstName.length, ')')

          if (status === 'in_progress') {
            console.log('[status] Sending in-progress email with firstName:', firstName)
            const { error: emailErr } = await sendOrderInProgressEmail({
              origin,
              to:           profile.email,
              firstName:    firstName,
              orderId,
              moduleName:   order.module_name,
              subjectField: order.subject_field,
              deadline:     order.deadline,
            })
            if (emailErr) {
              console.error('[status] in-progress email failed:', emailErr)
            }
          } else if (status === 'completed') {
            console.log('[status] Sending completed email with firstName:', firstName)
            const { error: emailErr } = await sendOrderCompletedEmail({
              origin,
              to:           profile.email,
              firstName:    firstName,
              orderId,
              moduleName:   order.module_name,
              subjectField: order.subject_field,
            })
            if (emailErr) {
              console.error('[status] completion email failed:', emailErr)
            }
          }
        } else {
          console.error('[status] ❌ No email found for user:', order.user_id)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/admin/orders/[id]/status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
