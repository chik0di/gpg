import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { fulfilPayment } from '@/lib/payment-fulfilment'
import { getOriginFromRequest } from '@/lib/utils/request-origin'

export async function POST(request: NextRequest) {
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') ?? '', process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  if (event.type === 'payment_intent.succeeded') {
    try {
      // Retrieve current state rather than depending on event delivery order.
      const pi = await stripe.paymentIntents.retrieve((event.data.object as Stripe.PaymentIntent).id)
      const result = await fulfilPayment(pi, getOriginFromRequest(request))
      if (result.notificationPending) return NextResponse.json({ error: 'Order saved; notifications pending retry.' }, { status: 503 })
    } catch (error) {
      console.error('[webhook] Fulfilment pending:', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.json({ error: 'Fulfilment pending retry.' }, { status: 503 })
    }
  }
  // A failed card attempt does not change an order's work status. A later success
  // for the same PaymentIntent is handled above, regardless of event ordering.
  return NextResponse.json({ received: true })
}
