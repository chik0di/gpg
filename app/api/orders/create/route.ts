import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'
import { rateLimit, getClientIp, RateLimitPresets, getRateLimitErrorMessage } from '@/lib/rate-limit'
import {
  calcOrderTotal,
  calcWrittenPrice,
  calcPresentationPrice,
  getPracticalPrice,
  WORDS_PER_PAGE,
  PRACTICAL_ITEMS,
} from '@/lib/pricing'
import { getBestDiscount } from '@/lib/discount'
import { completeReferral, markCreditAsUsed } from '@/lib/referral'
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
  usedAIExtraction?: boolean
  briefTempPath?: string | null
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

// Sanitise a name segment for use in a filename — spaces and non-alphanumerics → underscores
function seg(s: string | null | undefined): string {
  return (s ?? 'Unknown').trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/**
 * Get meaningful name parts from user profile, auth metadata, or email
 * Returns [firstName, lastName] with fallbacks to ensure no 'Unknown' in filenames
 */
async function getUserNameForFilename(userId: string, userEmail: string): Promise<[string, string]> {
  // Try to get from profile first
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', userId)
    .single()

  let firstName = profile?.first_name?.trim() || ''
  let lastName = profile?.last_name?.trim() || ''

  // If profile is empty, try auth metadata
  if (!firstName && !lastName) {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authUser?.user_metadata) {
      const meta = authUser.user_metadata
      firstName = meta.given_name || meta.first_name || ''
      lastName = meta.family_name || meta.last_name || ''

      // Try splitting full_name if available
      if (!firstName && !lastName && typeof meta.full_name === 'string') {
        const parts = meta.full_name.trim().split(' ')
        firstName = parts[0] || ''
        lastName = parts.slice(1).join(' ') || ''
      }
    }
  }

  // Final fallback: use email prefix
  if (!firstName && !lastName) {
    const emailPrefix = userEmail.split('@')[0]
    // Split on common delimiters and capitalize
    const parts = emailPrefix.split(/[._-]/).filter(Boolean)
    if (parts.length >= 2) {
      firstName = parts[0]
      lastName = parts.slice(1).join('_')
    } else {
      firstName = parts[0] || 'User'
      lastName = ''
    }
  }

  // Ensure at least one part is not empty
  if (!firstName && !lastName) {
    firstName = 'User'
  }

  return [firstName, lastName]
}

export async function POST(request: Request) {
  try {
    // Rate limiting - 5 orders per 15 minutes per IP
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimit(clientIp, RateLimitPresets.orderCreation)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: getRateLimitErrorMessage(rateLimitResult.resetAt) },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      )
    }

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

    // Determine best discount to apply
    const discount = await getBestDiscount(supabase, user.id)
    const discountPercent = discount.percent

    const { total } = calcOrderTotal({
      deliverableSubtotal: subtotal,
      academicLevel: orderData.academicLevel,
      deadline: orderData.deadline,
      includeOriginalityReport: orderData.includeOriginalityReport,
      applyFirstOrderDiscount: discountPercent > 0,
      discountPercent,
    })

    // Verify the payment intent amount matches our server-side calculation
    const expectedAmount = Math.round(total * 100)
    if (pi.amount !== expectedAmount) {
      console.error(`[orders/create] amount mismatch: PI=${pi.amount}, expected=${expectedAmount}`)
      // Allow a 1 pence tolerance for rounding differences
      if (Math.abs(pi.amount - expectedAmount) > 1) {
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
      }
    }

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
        extracted_by_ai: orderData.usedAIExtraction || false,
      }
    })

    const { error: delivErr } = await supabase
      .from('deliverables')
      .insert(deliverableRows)

    if (delivErr) {
      console.error('Deliverables insert failed:', delivErr)
    }

    // 6. Fetch profile — needed for notification emails
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

        // Get meaningful name parts with fallbacks
        const [firstName, lastName] = await getUserNameForFilename(user.id, user.email ?? '')

        // Build filename parts, excluding empty lastName
        const nameParts = [
          seg(orderData.subjectField),
          seg(firstName),
        ]
        if (lastName) {
          nameParts.push(seg(lastName))
        }
        nameParts.push(order.id)

        const filename = nameParts.join('_') + ext

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

    // 7b. If this order used AI extraction, move the brief file from temp storage
    if (orderData.usedAIExtraction && orderData.briefTempPath) {
      try {
        console.log('[orders/create] Moving brief from temp storage:', orderData.briefTempPath)

        // Download from temp location
        const { data: tempFile, error: downloadErr } = await supabaseAdmin.storage
          .from('order-files')
          .download(orderData.briefTempPath)

        if (downloadErr || !tempFile) {
          console.error('[orders/create] Failed to download brief from temp:', downloadErr)
        } else {
          // Extract original filename and extension
          const tempFilename = orderData.briefTempPath.split('/').pop() || ''
          const sessionPrefix = tempFilename.split('_')[0] // Remove session ID prefix
          const originalName = tempFilename.substring(sessionPrefix.length + 1) // Skip "sessionID_"
          const dotIndex = originalName.lastIndexOf('.')
          const ext = dotIndex !== -1 ? originalName.slice(dotIndex).toLowerCase() : '.pdf'

          // Get meaningful name parts
          const [firstName, lastName] = await getUserNameForFilename(user.id, user.email ?? '')

          // Build brief filename: SubjectField_FirstName_LastName_OrderID_brief.ext
          const nameParts = [
            seg(orderData.subjectField),
            seg(firstName),
          ]
          if (lastName) {
            nameParts.push(seg(lastName))
          }
          nameParts.push(order.id, 'brief')

          const briefFilename = nameParts.join('_') + ext
          const briefPath = `assignments/${briefFilename}`

          // Upload to permanent location
          const bytes = await tempFile.arrayBuffer()
          const { error: uploadErr } = await supabaseAdmin.storage
            .from('order-files')
            .upload(briefPath, Buffer.from(bytes), {
              contentType: tempFile.type || 'application/pdf',
              upsert: false,
            })

          if (uploadErr) {
            console.error('[orders/create] Failed to upload brief to permanent location:', uploadErr)
          } else {
            // Record in order_files table
            const { error: fileErr } = await supabaseAdmin
              .from('order_files')
              .insert({
                order_id: order.id,
                file_url: briefPath,
                file_type: 'brief',
              })

            if (fileErr) {
              console.error('[orders/create] Failed to record brief in order_files:', fileErr)
            }

            // Delete temp file
            const { error: deleteErr } = await supabaseAdmin.storage
              .from('order-files')
              .remove([orderData.briefTempPath])

            if (deleteErr) {
              console.error('[orders/create] Failed to delete temp brief:', deleteErr)
            } else {
              console.log('[orders/create] Successfully moved brief from temp to:', briefPath)
            }
          }
        }
      } catch (err) {
        console.error('[orders/create] Brief file move error:', err)
        // Non-fatal — order is created, brief is still in temp location
      }
    }

    // 8. Send notification emails (fire-and-forget)
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

    // 9. Handle referral logic (fire-and-forget)
    if (discount.type === 'referred-friend') {
      // Complete referral and issue credit to referrer
      completeReferral(supabaseAdmin, user.id).catch((err) => {
        console.error('[orders/create] referral completion failed:', err)
      })
    } else if (discount.type === 'referral-credit' && discount.creditId) {
      // Mark referral credit as used
      markCreditAsUsed(supabaseAdmin, discount.creditId).catch((err) => {
        console.error('[orders/create] credit marking failed:', err)
      })
    }

    // 10. Clean up pending orders for this user (fire-and-forget)
    supabaseAdmin
      .from('pending_orders')
      .delete()
      .or(`user_id.eq.${user.id},user_email.eq.${user.email}`)
      .then(({ error: delError }) => {
        if (delError) {
          console.error('[orders/create] pending orders cleanup failed:', delError)
        } else {
          console.log('[orders/create] cleaned up pending orders for user:', user.id)
        }
      })

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/orders/create:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
