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

    const { amountPence, orderData: input, fileData } = await request.json()
    const parsed = checkoutOrderSchema.safeParse(input)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid order details.' }, { status: 400 })
    const orderData = parsed.data
    try {
      assertAssignmentScope(orderData)
      assertCheckoutDeadline(orderData.deadline)
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
    if (!Number.isSafeInteger(amountPence) || amountPence < 100)
      return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 })
    if (fileData != null && (typeof fileData !== 'string' || fileData.length > 30 * 1024 * 1024))
      return NextResponse.json({ error: 'Invalid assignment attachment.' }, { status: 400 })

    // Prices, tiers and rounding are decided on the server for every checkout.
    const checkoutQuote = calculateOrderQuote(orderData)
    if (amountPence !== checkoutQuote.totalPence)
      return NextResponse.json({ error: `Your quote has changed to £${(checkoutQuote.totalPence / 100).toFixed(2)}. Return to your order summary to review it before paying.`, code: 'PRICE_CHANGED', amountPence: checkoutQuote.totalPence }, { status: 409 })

    const storedData = { ...orderData, checkoutQuote }
    const { data: pendingOrder, error } = await supabaseAdmin.from('pending_orders').insert({
      user_email: user.email?.toLowerCase(), user_id: user.id, order_data: storedData,
      file_data: fileData || null, expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
    }).select('id').single()
    if (error || !pendingOrder) return NextResponse.json({ error: 'Could not save checkout details.' }, { status: 500 })

    try {
      const pi = await stripe.paymentIntents.create({
        amount: checkoutQuote.totalPence, currency: 'gbp', payment_method_types: ['card'],
        metadata: { userId: user.id, pendingOrderId: pendingOrder.id, orderHash: checkoutDigest(storedData) },
      })
      return NextResponse.json({ clientSecret: pi.client_secret, amountPence: pi.amount, checkoutQuote })
    } catch (error) {
      await supabaseAdmin.from('pending_orders').delete().eq('id', pendingOrder.id)
      throw error
    }
  } catch (error) {
    console.error('[checkout] Payment initialisation failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Could not initialise payment. Please try again.' }, { status: 500 })
  }
}
