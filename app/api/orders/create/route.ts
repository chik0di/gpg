import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'
import { rateLimit, getClientIp, RateLimitPresets, getRateLimitErrorMessage } from '@/lib/rate-limit'
import { getOriginFromRequest } from '@/lib/utils/request-origin'
import {
  calcOrderTotal,
  WORDS_PER_PAGE,
  PRACTICAL_ITEMS,
} from '@/lib/pricing'
import {
  calcWrittenPricePence,
  calcPresentationPricePence,
  validateTechnicalPricePence,
  applyAcademicMultiplier,
  applyDeadlineMultiplier,
  TECHNICAL_SIMPLE,
  TECHNICAL_MODERATE,
  TECHNICAL_COMPLEX,
  TECHNICAL_EXPERT,
  WRITTEN_RATE_AI,
  SLIDE_RATE_AI,
  ORIGINALITY_REPORT_PENCE,
  ACADEMIC_MULTIPLIERS,
} from '@/lib/pricing-pence'
import { sendOrderConfirmation, sendAdminNewOrderAlert } from '@/lib/resend'
import type { Deliverable } from '@/types/order-form'

interface OrderData {
  moduleName?: string | null
  subjectField: string
  academicLevel: string
  academicLevelRaw?: string | null
  deadline: string
  country?: string
  deliverables: Deliverable[]
  instructions: string
  includeOriginalityReport: boolean
  fileName?: string | null
  usedAIExtraction?: boolean
  briefTempPath?: string | null
  isOutsideStandardFields?: boolean
}

/**
 * Calculate deliverable base price in PENCE from raw inputs
 * NEVER trust client-sent prices - always recalculate server-side
 */
function deliverableBasePricePence(d: Deliverable, isManual: boolean = false): number {
  // SECURITY: Ignore client-sent basePrice, always recalculate from raw inputs

  if (d.type === 'written') {
    const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return calcWrittenPricePence(pages, isManual)
  }

  if (d.type === 'presentation') {
    const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
    return calcPresentationPricePence(slideCount, isManual)
  }

  if (d.type === 'practical') {
    // Map practicalKey to technical price in pence
    const priceMap: Record<string, number> = {
      'flowchart': TECHNICAL_SIMPLE,
      'python': TECHNICAL_MODERATE,
      'database': TECHNICAL_MODERATE,
      'data_analysis': TECHNICAL_MODERATE,
      'network': TECHNICAL_COMPLEX,
      'web_dev': TECHNICAL_COMPLEX,
      'security': TECHNICAL_EXPERT,
      'bi_dashboard': TECHNICAL_EXPERT,
    }
    const pricePence = priceMap[d.practicalKey] || TECHNICAL_MODERATE
    return validateTechnicalPricePence(pricePence)
  }

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

export async function POST(request: NextRequest) {
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

    console.log('========================================')
    console.log('[orders/create] 📥 INCOMING REQUEST')
    console.log('[orders/create] Payment Intent ID:', paymentIntentId)
    console.log('[orders/create] Has orderData:', !!orderDataRaw)
    console.log('[orders/create] Has file:', !!uploadedFile)
    if (uploadedFile) {
      console.log('[orders/create] File name:', uploadedFile.name)
      console.log('[orders/create] File size:', uploadedFile.size)
    }
    console.log('========================================')

    if (!paymentIntentId || !orderDataRaw) {
      console.error('[orders/create] ❌ Missing required fields')
      console.error('[orders/create] paymentIntentId present:', !!paymentIntentId)
      console.error('[orders/create] orderDataRaw present:', !!orderDataRaw)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let orderData: OrderData
    try {
      orderData = JSON.parse(orderDataRaw)
      console.log('========================================')
      console.log('[orders/create] 📋 PARSED ORDER DATA')
      console.log('[orders/create] Full orderData:', JSON.stringify(orderData, null, 2))
      console.log('[orders/create] subjectField:', orderData.subjectField)
      console.log('[orders/create] academicLevel:', orderData.academicLevel)
      console.log('[orders/create] academicLevelRaw:', orderData.academicLevelRaw)
      console.log('[orders/create] deadline:', orderData.deadline)
      console.log('[orders/create] country:', orderData.country)
      console.log('[orders/create] deliverables count:', orderData.deliverables?.length)
      console.log('[orders/create] includeOriginalityReport:', orderData.includeOriginalityReport)
      console.log('[orders/create] moduleName:', orderData.moduleName)
      console.log('[orders/create] usedAIExtraction:', orderData.usedAIExtraction)
      console.log('[orders/create] briefTempPath:', orderData.briefTempPath)
      console.log('[orders/create] isOutsideStandardFields:', orderData.isOutsideStandardFields)
      console.log('========================================')
    } catch (parseError) {
      console.error('========================================')
      console.error('[orders/create] ❌ JSON PARSE ERROR')
      console.error('[orders/create] Parse error:', parseError)
      console.error('[orders/create] Raw orderData string:', orderDataRaw)
      console.error('========================================')
      return NextResponse.json({ error: 'Invalid order data format' }, { status: 400 })
    }

    // 1. Verify the payment actually succeeded on Stripe's side
    console.log('[orders/create] 💳 Verifying payment intent:', paymentIntentId)
    let pi
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      console.log('[orders/create] Payment Intent retrieved successfully')
      console.log('[orders/create] PI status:', pi.status)
      console.log('[orders/create] PI amount:', pi.amount, 'pence')
      console.log('[orders/create] PI currency:', pi.currency)
    } catch (stripeError) {
      console.error('========================================')
      console.error('[orders/create] ❌ STRIPE API ERROR')
      console.error('[orders/create] Error retrieving payment intent:', stripeError)
      console.error('========================================')
      return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
    }

    if (pi.status !== 'succeeded') {
      console.error('========================================')
      console.error('[orders/create] ❌ PAYMENT NOT CONFIRMED')
      console.error('[orders/create] Expected status: succeeded')
      console.error('[orders/create] Actual status:', pi.status)
      console.error('========================================')
      return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 })
    }

    // 2. Idempotency: don't create a duplicate order for the same payment
    console.log('[orders/create] 🔍 Checking for existing order with this payment intent')
    const { data: existing, error: existingError } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (existingError) {
      console.error('========================================')
      console.error('[orders/create] ❌ DATABASE ERROR - existing order check')
      console.error('[orders/create] Error:', existingError)
      console.error('========================================')
      return NextResponse.json({ error: 'Database error checking existing order' }, { status: 500 })
    }

    if (existing) {
      console.log('[orders/create] ✅ Order already exists for this payment, returning existing ID:', existing.id)
      return NextResponse.json({ orderId: existing.id })
    }

    console.log('[orders/create] No existing order found, proceeding to create new order')

    // 3. Recalculate total server-side in PENCE (prevents client tampering)
    console.log('========================================')
    console.log('[orders/create] 💰 CALCULATING PRICE SERVER-SIDE')
    console.log('[orders/create] Deliverables to price:', orderData.deliverables.length)

    // Calculate base prices for all deliverables
    const deliverablesPence = orderData.deliverables.map((d, idx) => {
      console.log(`[orders/create] Deliverable ${idx + 1}:`, {
        type: d.type,
        sizeMode: d.sizeMode,
        quantity: d.quantity,
        slideCount: d.slideCount,
        practicalKey: d.practicalKey
      })

      let basePence
      try {
        basePence = deliverableBasePricePence(d, false) // AI path always non-manual
        console.log(`[orders/create] Base price for deliverable ${idx + 1}:`, basePence, 'pence')
      } catch (calcError) {
        console.error(`[orders/create] ❌ Error calculating base price for deliverable ${idx + 1}:`, calcError)
        throw calcError
      }

      // Apply multipliers
      let finalPence = basePence
      const beforeAcademic = finalPence
      finalPence = applyAcademicMultiplier(finalPence, orderData.academicLevel)
      console.log(`[orders/create] After academic multiplier (${orderData.academicLevel}):`, finalPence, 'pence (was', beforeAcademic, ')')

      const beforeDeadline = finalPence
      finalPence = applyDeadlineMultiplier(finalPence, orderData.deadline)
      console.log(`[orders/create] After deadline multiplier (${orderData.deadline}):`, finalPence, 'pence (was', beforeDeadline, ')')

      return finalPence
    })

    const subtotalPence = deliverablesPence.reduce((sum, price) => sum + price, 0)
    const reportPence = orderData.includeOriginalityReport ? ORIGINALITY_REPORT_PENCE : 0
    const totalPence = subtotalPence + reportPence

    console.log('[orders/create] Subtotal:', subtotalPence, 'pence (£' + (subtotalPence / 100).toFixed(2) + ')')
    console.log('[orders/create] Originality report:', reportPence, 'pence')
    console.log('[orders/create] Total calculated:', totalPence, 'pence (£' + (totalPence / 100).toFixed(2) + ')')
    console.log('[orders/create] Payment Intent amount:', pi.amount, 'pence (£' + (pi.amount / 100).toFixed(2) + ')')
    console.log('========================================')

    // Verify the payment intent amount matches our server-side calculation
    if (pi.amount !== totalPence) {
      console.error('========================================')
      console.error('[orders/create] ❌ PRICE MISMATCH')
      console.error(`[orders/create] Payment Intent amount: ${pi.amount} pence (£${(pi.amount / 100).toFixed(2)})`)
      console.error(`[orders/create] Server calculated: ${totalPence} pence (£${(totalPence / 100).toFixed(2)})`)
      console.error(`[orders/create] Difference: ${pi.amount - totalPence} pence`)
      console.error('========================================')
      // Allow a 1 pence tolerance for rounding differences
      if (Math.abs(pi.amount - totalPence) > 1) {
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 })
      }
    }

    // Create pricing snapshot for this order
    const pricingSnapshot = {
      written_rate_pence: WRITTEN_RATE_AI,
      slide_rate_pence: SLIDE_RATE_AI,
      technical_simple_pence: TECHNICAL_SIMPLE,
      technical_moderate_pence: TECHNICAL_MODERATE,
      technical_complex_pence: TECHNICAL_COMPLEX,
      technical_expert_pence: TECHNICAL_EXPERT,
      academic_multipliers: ACADEMIC_MULTIPLIERS,
      deadline_multipliers: {
        '2-3d': 180,
        '4-6d': 150,
        '7-13d': 120,
        '14+d': 100,
      },
      originality_report_pence: ORIGINALITY_REPORT_PENCE,
      calculated_at: new Date().toISOString(),
    }

    // 4. Create order row with pricing snapshot
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id:                   user.id,
        status:                    'pending',
        total_amount:              totalPence / 100, // Store as pounds for display
        academic_level:            orderData.academicLevel,
        academic_level_raw:        orderData.academicLevelRaw || null,
        module_name:               orderData.moduleName || null,
        subject_field:             orderData.subjectField,
        deadline:                  orderData.deadline,
        country:                   orderData.country || 'United Kingdom',
        additional_instructions:   orderData.instructions || null,
        originality_report:        orderData.includeOriginalityReport,
        stripe_payment_intent_id:  paymentIntentId,
        is_outside_standard_fields: orderData.isOutsideStandardFields || false,
        pricing_snapshot:          pricingSnapshot,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      console.error('Order insert failed:', orderErr)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // 5. Insert deliverables with recalculated prices in pence
    const deliverableRows = orderData.deliverables.map((d, index) => {
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

      // Use server-calculated price in pence (already has multipliers applied)
      const pricePence = deliverablesPence[index]

      return {
        order_id:  order.id,
        type:      d.type,
        subtype,
        size_band,
        price:     pricePence / 100, // Store as pounds for backward compat
        price_pence: pricePence,     // Store exact pence
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

    // 7b. If this order used AI extraction, move the brief file from temp storage to assignments/
    if (orderData.usedAIExtraction && orderData.briefTempPath) {
      try {
        console.log('[orders/create] AI extraction order detected - moving brief to assignments/')
        console.log('[orders/create] Brief temp path:', orderData.briefTempPath)

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

          // Build brief filename: SubjectField_FirstName_LastName_OrderID.ext
          const nameParts = [
            seg(orderData.subjectField),
            seg(firstName),
          ]
          if (lastName) {
            nameParts.push(seg(lastName))
          }
          nameParts.push(order.id)

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
                file_type: 'assignment',
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
              console.log('[orders/create] ✅ Successfully moved brief:')
              console.log('[orders/create]    From:', orderData.briefTempPath)
              console.log('[orders/create]    To:', briefPath)
              console.log('[orders/create]    File type in order_files: assignment')
            }
          }
        }
      } catch (err) {
        console.error('[orders/create] Brief file move error:', err)
        // Non-fatal — order is created, brief is still in temp location
      }
    }

    // 8. Send notification emails (fire-and-forget)
    // Build deliverable summary for admin email and itemized list for client receipt
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

    // Build itemized deliverable list with individual prices for client receipt
    const deliverableItems = orderData.deliverables.map((d, index) => {
      const basePence = deliverableBasePricePence(d, false)
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

      return {
        description,
        basePrice: basePence / 100, // Convert to pounds
      }
    })

    // Calculate academic level adjustment and urgency premium
    const baseTotalPence = orderData.deliverables.reduce((sum, d) => {
      return sum + deliverableBasePricePence(d, false)
    }, 0)

    // Get multipliers to calculate adjustments
    const academicMultPct = ACADEMIC_MULTIPLIERS[orderData.academicLevel as keyof typeof ACADEMIC_MULTIPLIERS] ?? 100
    const academicMult = academicMultPct / 100
    const academicAdjustmentPence = baseTotalPence * (academicMult - 1) // Can be negative for A-Level

    // Apply academic multiplier first, then deadline multiplier
    const afterAcademicPence = baseTotalPence * academicMult

    // Calculate days until deadline
    const deadlineDate = new Date(orderData.deadline)
    const now = new Date()
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let deadlineMult = 1.0
    if (daysUntil >= 14) deadlineMult = 1.0
    else if (daysUntil >= 7) deadlineMult = 1.2
    else if (daysUntil >= 4) deadlineMult = 1.5
    else deadlineMult = 1.8

    const urgencyPremiumPence = afterAcademicPence * (deadlineMult - 1)

    const clientEmail = profile?.email ?? user.email ?? ''
    const clientName  = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Customer'
    const origin = getOriginFromRequest(request)

    // Send emails (fire-and-forget with comprehensive error logging)
    console.log('========================================')
    console.log('[orders/create] 📧 SENDING CONFIRMATION EMAILS')
    console.log('[orders/create] Client email:', clientEmail)
    console.log('[orders/create] Admin email:', 'admin@getprimegrade.com')
    console.log('[orders/create] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
    console.log('[orders/create] RESEND_API_KEY prefix:', process.env.RESEND_API_KEY?.substring(0, 10) + '...')
    console.log('========================================')

    sendOrderConfirmation({
      origin,
      to:                 clientEmail,
      firstName:          profile?.first_name ?? '',
      orderId:            order.id,
      moduleName:         orderData.moduleName || null,
      subjectField:       orderData.subjectField,
      academicLevel:      orderData.academicLevel,
      deadline:           orderData.deadline,
      totalAmount:        totalPence / 100,
      deliverableItems,
      academicLevelAdjustment: academicAdjustmentPence !== 0 ? academicAdjustmentPence / 100 : null,
      urgencyPremium: urgencyPremiumPence > 0 ? urgencyPremiumPence / 100 : null,
      originalityReportPrice: orderData.includeOriginalityReport ? (ORIGINALITY_REPORT_PENCE / 100) : null,
      isOutsideStandardFields: orderData.isOutsideStandardFields || false,
    })
      .then((result) => {
        console.log('========================================')
        console.log('[orders/create] ✅ CLIENT CONFIRMATION EMAIL SENT')
        console.log('[orders/create] Resend response:', result)
        console.log('[orders/create] Email ID:', result?.data?.id)
        console.log('========================================')
      })
      .catch((emailError) => {
        console.error('========================================')
        console.error('[orders/create] ❌ CLIENT CONFIRMATION EMAIL FAILED')
        console.error('[orders/create] Error type:', emailError?.constructor?.name)
        console.error('[orders/create] Error message:', emailError?.message)
        console.error('[orders/create] Error stack:', emailError?.stack)
        console.error('[orders/create] Resend error response:', emailError?.response)
        console.error('[orders/create] Resend error data:', emailError?.response?.data)
        console.error('[orders/create] Resend status code:', emailError?.statusCode || emailError?.response?.status)
        console.error('[orders/create] Full error object:', JSON.stringify(emailError, null, 2))
        console.error('========================================')
      })

    sendAdminNewOrderAlert({
      origin,
      orderId:            order.id,
      clientName,
      clientEmail,
      moduleName:         orderData.moduleName || null,
      subjectField:       orderData.subjectField,
      academicLevel:      orderData.academicLevel,
      deadline:           orderData.deadline,
      totalAmount:        totalPence / 100,
      deliverableSummary,
      instructions:       orderData.instructions || null,
    })
      .then((result) => {
        console.log('========================================')
        console.log('[orders/create] ✅ ADMIN NOTIFICATION EMAIL SENT')
        console.log('[orders/create] Resend response:', result)
        console.log('[orders/create] Email ID:', result?.data?.id)
        console.log('========================================')
      })
      .catch((emailError) => {
        console.error('========================================')
        console.error('[orders/create] ❌ ADMIN NOTIFICATION EMAIL FAILED')
        console.error('[orders/create] Error type:', emailError?.constructor?.name)
        console.error('[orders/create] Error message:', emailError?.message)
        console.error('[orders/create] Error stack:', emailError?.stack)
        console.error('[orders/create] Resend error response:', emailError?.response)
        console.error('[orders/create] Resend error data:', emailError?.response?.data)
        console.error('[orders/create] Resend status code:', emailError?.statusCode || emailError?.response?.status)
        console.error('[orders/create] Full error object:', JSON.stringify(emailError, null, 2))
        console.error('========================================')
      })

    // 9. Clean up pending orders for this user (fire-and-forget)
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

    console.log('========================================')
    console.log('[orders/create] ✅ ORDER CREATED SUCCESSFULLY')
    console.log('[orders/create] Order ID:', order.id)
    console.log('[orders/create] User ID:', user.id)
    console.log('[orders/create] Total amount:', totalPence / 100, 'GBP')
    console.log('[orders/create] Returning success response')
    console.log('========================================')

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('========================================')
    console.error('[orders/create] ❌ UNHANDLED ERROR IN ORDER CREATION')
    console.error('[orders/create] Error type:', err instanceof Error ? err.constructor.name : typeof err)
    console.error('[orders/create] Error message:', err instanceof Error ? err.message : String(err))
    console.error('[orders/create] Error stack:', err instanceof Error ? err.stack : 'N/A')
    console.error('[orders/create] Full error object:', err)
    console.error('========================================')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
