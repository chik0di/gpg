import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { CheckoutBusyError, fulfilPayment } from '@/lib/payment-fulfilment'
import { getOriginFromRequest } from '@/lib/utils/request-origin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await createServerClient().auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    if (!rateLimit(`payment-confirm:${user.id}`, { limit: 60, windowSeconds: 60 }).success)
      return NextResponse.json({ error: 'Please wait before checking your payment again.' }, { status: 429 })
    const form = await request.formData()
    const id = form.get('paymentIntentId')
    if (typeof id !== 'string' || !id.startsWith('pi_')) return NextResponse.json({ error: 'Invalid payment reference.' }, { status: 400 })
    const pi = await stripe.paymentIntents.retrieve(id)
    if (pi.metadata.userId !== user.id || pi.currency !== 'gbp') return NextResponse.json({ error: 'Payment does not belong to this account.' }, { status: 403 })
    if (pi.status === 'processing') return NextResponse.json({ processing: true }, { status: 202 })
    if (pi.status !== 'succeeded') return NextResponse.json({ error: 'Payment has not succeeded. Check its status before paying again.' }, { status: 402 })
    // Current checkouts are recovered from the server snapshot, without sessionStorage.
    const raw = form.get('orderData')
    const legacy = !pi.metadata.orderHash && typeof raw === 'string' ? JSON.parse(raw) : undefined
    const file = form.get('file')
    const result = await fulfilPayment(pi, getOriginFromRequest(request), legacy, file instanceof File ? file : null)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof CheckoutBusyError) return NextResponse.json({ processing: true }, { status: 202 })
    console.error('[payment-confirm] Order recovery failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Your payment could not be fully confirmed yet. Please retry confirmation or contact support before making another payment.' }, { status: 503 })
  }
}
