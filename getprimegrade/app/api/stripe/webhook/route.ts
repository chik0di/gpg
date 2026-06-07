import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createServerClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServerClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { orderId } = pi.metadata

      await supabase
        .from('orders')
        .update({ status: 'paid', stripe_payment_intent_id: pi.id })
        .eq('id', orderId)
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { orderId } = pi.metadata

      await supabase
        .from('orders')
        .update({ status: 'payment_failed' })
        .eq('id', orderId)
      break
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
