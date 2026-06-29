import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { getBestDiscount } from '@/lib/discount'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { amountPence, orderData } = await request.json()

    if (typeof amountPence !== 'number' || amountPence < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Get best discount for webhook safety net
    const discount = await getBestDiscount(supabase, user.id)

    // Stripe metadata has a 500-character limit per value, so we stringify orderData
    // and truncate if needed. The webhook will use this as a safety net.
    const orderDataStr = JSON.stringify(orderData || {})
    const truncatedOrderData = orderDataStr.length > 4500
      ? orderDataStr.slice(0, 4500) + '...'  // Leave room for other metadata
      : orderDataStr

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      metadata: {
        userId: user.id,
        orderData: truncatedOrderData,
        discountType: discount.type,
        discountPercent: String(discount.percent),
        creditId: discount.creditId || '',
      },
      payment_method_types: ['card'],
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      firstOrderDiscount: discount.percent > 0,
    })
  } catch (err) {
    console.error('create-payment-intent:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
