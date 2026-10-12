import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'
import { checkoutOrderSchema, calculateOrderQuote, assertCheckoutDeadline } from '@/lib/order-quote'
import { assertAssignmentScope } from '@/lib/order-scope'
import { checkoutDigest } from '@/lib/checkout-integrity'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    if (!rateLimit(`checkout:${user.id}`, { limit: 20, windowSeconds: 3600 }).success)
      return NextResponse.json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429 })

    const { amountPence, orderData: input, fileData, checkoutKey } = await request.json()
    if (typeof checkoutKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutKey))
      return NextResponse.json({ error: 'Invalid checkout session. Return to your order and try again.' }, { status: 400 })
    const parsed = checkoutOrderSchema.safeParse(input)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid order details.' }, { status: 400 })
    const orderData = parsed.data
    try {
      assertAssignmentScope(orderData)
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
    if (!Number.isSafeInteger(amountPence) || amountPence < 100)
      return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 })
    if (fileData != null && (typeof fileData !== 'string' || fileData.length > 30 * 1024 * 1024))
      return NextResponse.json({ error: 'Invalid assignment attachment.' }, { status: 400 })

    const lookup = () => supabaseAdmin.from('pending_orders').select('id, order_data, payment_intent_id, expires_at')
      .eq('user_id', user.id).eq('checkout_key', checkoutKey).maybeSingle()
    let loaded = await lookup()
    if (loaded.error) throw new Error('Could not look up checkout.')
    let pendingOrder = loaded.data
    if (!pendingOrder) {
      try { assertCheckoutDeadline(orderData.deadline) }
      catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
    }
    // Existing checkouts keep their accepted quote across pricing boundaries.
    const checkoutQuote = pendingOrder?.order_data.checkoutQuote ?? calculateOrderQuote(orderData)
    if (amountPence !== checkoutQuote.totalPence)
      return NextResponse.json({ error: `Review the checkout total of £${(checkoutQuote.totalPence / 100).toFixed(2)} before paying.`, code: 'PRICE_CHANGED', amountPence: checkoutQuote.totalPence, checkoutQuote }, { status: 409 })

    if (!pendingOrder) {
      const reserved = await supabaseAdmin.from('pending_orders').insert({
        user_email: user.email?.toLowerCase(), user_id: user.id, checkout_key: checkoutKey,
        order_data: { ...orderData, checkoutQuote }, file_data: fileData || null,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      }).select('id, order_data, payment_intent_id, expires_at').single()
      if (reserved.error?.code === '23505') {
        loaded = await lookup()
        if (loaded.error) throw new Error('Could not recover checkout reservation.')
        pendingOrder = loaded.data
      } else if (reserved.error) throw new Error('Could not reserve checkout.')
      else pendingOrder = reserved.data
    }
    if (!pendingOrder) throw new Error('Checkout reservation unavailable.')
    const saved = pendingOrder.order_data as typeof orderData & { checkoutQuote: typeof checkoutQuote }
    if (checkoutDigest(checkoutOrderSchema.parse(saved)) !== checkoutDigest(orderData))
      return NextResponse.json({ error: 'Checkout details changed. Return to your order to start a new checkout.' }, { status: 409 })
    if (!pendingOrder.payment_intent_id && Date.parse(pendingOrder.expires_at) <= Date.now())
      return NextResponse.json({ error: 'This checkout has expired. Check your orders before starting another payment.' }, { status: 409 })
    if (saved.checkoutQuote.totalPence !== amountPence)
      return NextResponse.json({ error: 'Review the accepted checkout amount before paying.', code: 'PRICE_CHANGED', amountPence: saved.checkoutQuote.totalPence }, { status: 409 })
    const pi = pendingOrder.payment_intent_id
      ? await stripe.paymentIntents.retrieve(pendingOrder.payment_intent_id)
      : await stripe.paymentIntents.create({
        amount: saved.checkoutQuote.totalPence, currency: 'gbp', payment_method_types: ['card'],
        metadata: { userId: user.id, pendingOrderId: pendingOrder.id, orderHash: checkoutDigest(saved) },
      }, { idempotencyKey: `checkout-${pendingOrder.id}` })
    if (pi.metadata.userId !== user.id || pi.amount !== saved.checkoutQuote.totalPence || pi.currency !== 'gbp')
      throw new Error('Stored payment does not match checkout.')
    const persisted = await supabaseAdmin.from('pending_orders').update({ payment_intent_id: pi.id }).eq('id', pendingOrder.id).eq('user_id', user.id)
    if (persisted.error) throw new Error('Could not record payment reference.')
    if (pi.status === 'succeeded' || pi.status === 'processing')
      return NextResponse.json({ paymentIntentId: pi.id, paymentStatus: pi.status })
    if (Date.parse(pendingOrder.expires_at) <= Date.now()) return NextResponse.json({ error: 'This checkout has expired. Check your orders before starting another payment.' }, { status: 409 })
    if (pi.status === 'canceled') return NextResponse.json({ error: 'This payment was cancelled. Return to your order to start again.' }, { status: 409 })
    return NextResponse.json({ clientSecret: pi.client_secret, amountPence: pi.amount, checkoutQuote: saved.checkoutQuote })

  } catch (error) {
    console.error('[checkout] Payment initialisation failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Could not initialise payment. Please try again.' }, { status: 500 })
  }
}
