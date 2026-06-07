import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      metadata: { userId: user.id },
      payment_method_types: ['card'],
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error('create-payment-intent:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
