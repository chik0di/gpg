import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { isEligibleForFirstOrderDiscount, isWithinDiscountWindow } from '@/lib/discount'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { amountPence } = await request.json()

    if (typeof amountPence !== 'number' || amountPence < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Check if user is eligible for first-time order discount
    const isEligible = await isEligibleForFirstOrderDiscount(supabase, user.id)
    const isInWindow = await isWithinDiscountWindow(supabase, user.id)
    const shouldApplyDiscount = isEligible && isInWindow

    // The amountPence already has the discount applied if eligible
    // (calculated on client with applyFirstOrderDiscount flag in calcOrderTotal)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      metadata: {
        userId: user.id,
        firstOrderDiscount: shouldApplyDiscount ? 'true' : 'false',
      },
      payment_method_types: ['card'],
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      firstOrderDiscount: shouldApplyDiscount,
    })
  } catch (err) {
    console.error('create-payment-intent:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
