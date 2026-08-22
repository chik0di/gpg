import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendOrderConfirmation, sendAdminNewOrderAlert } from '@/lib/resend'
import {
  calcOrderTotal,
  calcWrittenPrice,
  calcPresentationPrice,
  getPracticalPrice,
  getAcademicMultiplier,
  getDeadlineMultiplier,
  WORDS_PER_PAGE,
  PRACTICAL_ITEMS,
  ORIGINALITY_REPORT_PRICE,
} from '@/lib/pricing'
import type Stripe from 'stripe'
import type { Deliverable } from '@/types/order-form'

interface OrderData {
  subjectField: string
  academicLevel: string
  deadline: string
  deliverables: Deliverable[]
  instructions: string
  includeOriginalityReport: boolean
  fileName?: string | null
}

function deliverableBasePrice(d: Deliverable): number {
  if (d.type === 'written') {
    const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return calcWrittenPrice(pages)
  }
  if (d.type === 'presentation') {
    const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
    return calcPresentationPrice(slideCount)
  }
  if (d.type === 'practical')    return getPracticalPrice(d.practicalKey)
  return 0
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { orderId, userId, orderData: orderDataRaw } = pi.metadata

      console.log('[webhook] payment_intent.succeeded:', pi.id, '| orderId:', orderId)

      // Check if order already exists (created by client-side flow)
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('stripe_payment_intent_id', pi.id)
        .maybeSingle()

      if (existing) {
        console.log('[webhook] Order already exists:', existing.id, '| status:', existing.status)

        // Update to paid if not already
        if (existing.status !== 'paid') {
          await supabaseAdmin
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', existing.id)

          console.log('[webhook] Updated order status to paid:', existing.id)
        }
      } else {
        console.log('[webhook] No existing order found. Creating order as safety net...')

        // Safety net: create the order from metadata if client failed to create it
        // NOTE: The uploaded file won't be attached since it's in client sessionStorage.
        // This is acceptable — the order is created with payment confirmed, and admin
        // can request the file from the customer manually if needed.
        if (!userId || !orderDataRaw) {
          console.error('[webhook] Cannot create order: missing userId or orderData in metadata')
          return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
        }

        try {
          const orderData: OrderData = JSON.parse(orderDataRaw)

          // Recalculate total server-side
          const subtotal = orderData.deliverables.reduce(
            (sum, d) => sum + deliverableBasePrice(d),
            0
          )

          const { total } = calcOrderTotal({
            deliverableSubtotal: subtotal,
            academicLevel: orderData.academicLevel,
            deadline: orderData.deadline,
            includeOriginalityReport: orderData.includeOriginalityReport,
          })

          // Create order
          const { data: order, error: orderErr } = await supabaseAdmin
            .from('orders')
            .insert({
              user_id:                   userId,
              status:                    'paid',
              total_amount:              total,
              academic_level:            orderData.academicLevel,
              subject_field:             orderData.subjectField,
              deadline:                  orderData.deadline,
              additional_instructions:   orderData.instructions || null,
              originality_report:        orderData.includeOriginalityReport,
              stripe_payment_intent_id:  pi.id,
            })
            .select('id')
            .single()

          if (orderErr || !order) {
            console.error('[webhook] Order insert failed:', orderErr)
            throw new Error('Failed to create order')
          }

          console.log('[webhook] Created order:', order.id)

          // Insert deliverables
          const deliverableRows = orderData.deliverables.map((d) => {
            let subtype: string | null = null
            let size_band: string | null = null

            if (d.type === 'written') {
              const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
              size_band = String(pages)
            } else if (d.type === 'presentation') {
              // Store slide data in subtype field: 'exact:18' or 'between:15:20'
              if (d.slideInputMode === 'exact') {
                subtype = `exact:${d.slideCount}`
              } else {
                subtype = `between:${d.slideMin}:${d.slideMax}`
              }
            } else if (d.type === 'practical') {
              subtype = d.practicalKey
            }

            return {
              order_id:  order.id,
              type:      d.type,
              subtype,
              size_band,
              price:     deliverableBasePrice(d),
            }
          })

          const { error: delivErr } = await supabaseAdmin
            .from('deliverables')
            .insert(deliverableRows)

          if (delivErr) {
            console.error('[webhook] Deliverables insert failed:', delivErr)
          }

          // Fetch profile for emails
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', userId)
            .single()

          // Send notification emails
          const deliverableSummary = orderData.deliverables.map((d) => {
            if (d.type === 'written') {
              const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
              return `Written (${pages} pages)`
            }
            if (d.type === 'presentation') {
              if (d.slideInputMode === 'exact') {
                return `Presentation (${d.slideCount} slides)`
              } else {
                return `Presentation (${d.slideMin}–${d.slideMax} slides)`
              }
            }
            if (d.type === 'practical') {
              return `Practical — ${PRACTICAL_ITEMS.find((p) => p.key === d.practicalKey)?.label ?? d.practicalKey}`
            }
            return d.type
          }).join(', ')

          // Build itemized deliverable list for client receipt
          const deliverableItems = orderData.deliverables.map((d) => {
            const basePrice = deliverableBasePrice(d)
            let description = ''

            if (d.type === 'written') {
              const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
              description = `Written assignment (${pages} page${pages !== 1 ? 's' : ''})`
            } else if (d.type === 'presentation') {
              if (d.slideInputMode === 'exact') {
                description = `Presentation (${d.slideCount} slide${d.slideCount !== 1 ? 's' : ''})`
              } else {
                description = `Presentation (${d.slideMin}–${d.slideMax} slides, charged at ${d.slideMax})`
              }
            } else if (d.type === 'practical') {
              const practicalItem = PRACTICAL_ITEMS.find((p) => p.key === d.practicalKey)
              description = `Practical work: ${practicalItem?.label ?? d.practicalKey}`
            }

            return { description, basePrice }
          })

          // Calculate adjustments using the calcOrderTotal breakdown
          const academicMult = getAcademicMultiplier(orderData.academicLevel)
          const deadlineMult = getDeadlineMultiplier(orderData.deadline)

          const academicAdjustment = subtotal * (academicMult - 1)
          const urgencyPremium = subtotal * academicMult * (deadlineMult - 1)

          const clientEmail = profile?.email ?? ''
          const clientName  = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Customer'

          sendOrderConfirmation({
            to:                 clientEmail,
            firstName:          profile?.first_name ?? '',
            orderId:            order.id,
            moduleName:         null,
            subjectField:       orderData.subjectField,
            academicLevel:      orderData.academicLevel,
            deadline:           orderData.deadline,
            totalAmount:        total,
            deliverableItems,
            academicLevelAdjustment: academicAdjustment !== 0 ? academicAdjustment : null,
            urgencyPremium: urgencyPremium > 0 ? urgencyPremium : null,
            originalityReportPrice: orderData.includeOriginalityReport ? ORIGINALITY_REPORT_PRICE : null,
            isOutsideStandardFields: false,
          }).catch((e) => console.error('[webhook] client confirmation email failed:', e))

          sendAdminNewOrderAlert({
            orderId:            order.id,
            clientName,
            clientEmail,
            subjectField:       orderData.subjectField,
            academicLevel:      orderData.academicLevel,
            deadline:           orderData.deadline,
            totalAmount:        total,
            deliverableSummary,
            instructions:       orderData.instructions || null,
          }).catch((e) => console.error('[webhook] admin alert email failed:', e))

          console.log('[webhook] Order creation complete:', order.id)
        } catch (err) {
          console.error('[webhook] Safety net order creation failed:', err)
          return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { orderId } = pi.metadata

      await supabaseAdmin
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
