import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'
import {
  calcOrderTotal,
  calcWrittenPrice,
  getSlideBandPrice,
  getPracticalPrice,
  WORDS_PER_PAGE,
  PRACTICAL_ITEMS,
  SLIDE_BANDS,
} from '@/lib/pricing'
import { sendOrderConfirmation, sendAdminNewOrderAlert } from '@/lib/resend'
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
  if (d.type === 'presentation') return getSlideBandPrice(d.slideBand)
  if (d.type === 'practical')    return getPracticalPrice(d.practicalKey)
  return 0
}

// Sanitise a name segment for use in a filename — spaces and non-alphanumerics → underscores
function seg(s: string | null | undefined): string {
  return (s ?? 'Unknown').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Request arrives as multipart/form-data so the file is transmitted as binary
    const form            = await request.formData()
    const paymentIntentId = form.get('paymentIntentId') as string | null
    const orderDataRaw    = form.get('orderData')       as string | null
    const uploadedFile    = form.get('file')            as File   | null

    if (!paymentIntentId || !orderDataRaw) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const orderData: OrderData = JSON.parse(orderDataRaw)

    // 1. Verify the payment actually succeeded on Stripe's side
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 })
    }

    // 2. Idempotency: don't create a duplicate order for the same payment
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ orderId: existing.id })
    }

    // 3. Recalculate total server-side (prevents client tampering)
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

    // 4. Create order row
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id:                   user.id,
        status:                    'pending',
        total_amount:              total,
        academic_level:            orderData.academicLevel,
        subject_field:             orderData.subjectField,
        deadline:                  orderData.deadline,
        additional_instructions:   orderData.instructions || null,
        originality_report:        orderData.includeOriginalityReport,
        stripe_payment_intent_id:  paymentIntentId,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      console.error('Order insert failed:', orderErr)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // 5. Insert deliverables
    const deliverableRows = orderData.deliverables.map((d) => {
      const pages = d.type === 'written'
        ? (d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE))
        : null

      return {
        order_id:  order.id,
        type:      d.type,
        subtype:   d.type === 'practical' ? d.practicalKey : d.type === 'presentation' ? d.slideBand : null,
        size_band: pages != null ? String(pages) : null,
        price:     deliverableBasePrice(d),
      }
    })

    const { error: delivErr } = await supabase
      .from('deliverables')
      .insert(deliverableRows)

    if (delivErr) {
      console.error('Deliverables insert failed:', delivErr)
    }

    // 6. Fetch profile — needed for the filename and for notification emails
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    // 7. Upload the assignment file and link it to the order
    //    Filename format: SubjectField_FirstName_LastName_OrderID.ext
    if (uploadedFile && uploadedFile.size > 0) {
      try {
        const rawName  = uploadedFile.name
        const dotIndex = rawName.lastIndexOf('.')
        const ext      = dotIndex !== -1 ? rawName.slice(dotIndex).toLowerCase() : ''

        const filename = [
          seg(orderData.subjectField),
          seg(profile?.first_name),
          seg(profile?.last_name),
          order.id,
        ].join('_') + ext

        const path  = `assignments/${filename}`
        const bytes = await uploadedFile.arrayBuffer()

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('order-files')
          .upload(path, Buffer.from(bytes), {
            contentType: uploadedFile.type || 'application/octet-stream',
            upsert: false,
          })

        if (uploadErr) {
          console.error('[orders/create] storage upload failed:', uploadErr.message)
        } else {
          const { error: fileErr } = await supabaseAdmin
            .from('order_files')
            .insert({
              order_id:  order.id,
              file_url:  path,
              file_type: 'assignment',
            })
          if (fileErr) {
            console.error('[orders/create] order_files insert failed:', fileErr.message)
          }
        }
      } catch (err) {
        console.error('[orders/create] file upload error:', err)
        // Non-fatal — order is created, admin can obtain file manually if needed
      }
    }

    // 8. Send notification emails (fire-and-forget)
    const deliverableSummary = orderData.deliverables.map((d) => {
      if (d.type === 'written') {
        const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
        return `Written (${pages} pages)`
      }
      if (d.type === 'presentation') {
        return `Presentation (${SLIDE_BANDS.find((b) => b.key === d.slideBand)?.label ?? d.slideBand})`
      }
      if (d.type === 'practical') {
        return `Practical — ${PRACTICAL_ITEMS.find((p) => p.key === d.practicalKey)?.label ?? d.practicalKey}`
      }
      return d.type
    }).join(', ')

    const clientEmail = profile?.email ?? user.email ?? ''
    const clientName  = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Customer'

    sendOrderConfirmation({
      to:                 clientEmail,
      firstName:          profile?.first_name ?? '',
      orderId:            order.id,
      subjectField:       orderData.subjectField,
      academicLevel:      orderData.academicLevel,
      deadline:           orderData.deadline,
      totalAmount:        total,
      deliverableSummary,
    }).catch((e) => console.error('[email] client confirmation failed:', e))

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
    }).catch((e) => console.error('[email] admin alert failed:', e))

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/orders/create:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
