import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import {
  calcWrittenPricePence,
  calcPresentationPricePence,
  validateTechnicalPricePence,
  applyAcademicMultiplier,
  applyDeadlineMultiplier,
  getDeadlineMultiplierPct,
  TECHNICAL_SIMPLE,
  TECHNICAL_MODERATE,
  TECHNICAL_COMPLEX,
  TECHNICAL_EXPERT,
  ORIGINALITY_REPORT_PENCE,
} from '@/lib/pricing-pence'
import { WORDS_PER_PAGE } from '@/lib/pricing'

const QUOTE_EXPIRY_MINUTES = 60
const ONE_TIER_THRESHOLD_PCT = 30 // Multiplier change > 30% = more than one tier

/**
 * Calculate total in pence from order data
 */
function calculateTotalPence(orderData: any): number {
  console.log('[calculateTotalPence] Starting calculation...')
  console.log('[calculateTotalPence] orderData.deliverables:', orderData.deliverables)
  console.log('[calculateTotalPence] orderData.academicLevel:', orderData.academicLevel)
  console.log('[calculateTotalPence] orderData.deadline:', orderData.deadline)
  console.log('[calculateTotalPence] orderData.includeOriginalityReport:', orderData.includeOriginalityReport)

  if (!orderData.deliverables || !Array.isArray(orderData.deliverables)) {
    console.error('[calculateTotalPence] ❌ ERROR: deliverables is not an array')
    throw new Error('Invalid orderData: deliverables must be an array')
  }

  const deliverablesPence = orderData.deliverables.map((d: any, index: number) => {
    console.log(`[calculateTotalPence] Processing deliverable ${index}:`, d)
    let basePence: number

    if (d.type === 'written') {
      const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
      console.log(`[calculateTotalPence] Written work: ${pages} pages`)
      basePence = calcWrittenPricePence(pages, false)
    } else if (d.type === 'presentation') {
      const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
      console.log(`[calculateTotalPence] Presentation: ${slideCount} slides`)
      basePence = calcPresentationPricePence(slideCount, false)
    } else if (d.type === 'practical') {
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
      console.log(`[calculateTotalPence] Practical: ${d.practicalKey}`)
      basePence = validateTechnicalPricePence(priceMap[d.practicalKey] || TECHNICAL_MODERATE)
    } else {
      console.log(`[calculateTotalPence] Unknown type: ${d.type}`)
      basePence = 0
    }

    console.log(`[calculateTotalPence] Base price for deliverable ${index}:`, basePence, 'pence')

    let finalPence = basePence
    finalPence = applyAcademicMultiplier(finalPence, orderData.academicLevel)
    console.log(`[calculateTotalPence] After academic multiplier (${orderData.academicLevel}):`, finalPence, 'pence')

    finalPence = applyDeadlineMultiplier(finalPence, orderData.deadline)
    console.log(`[calculateTotalPence] After deadline multiplier (${orderData.deadline}):`, finalPence, 'pence')

    return finalPence
  })

  console.log('[calculateTotalPence] All deliverable prices:', deliverablesPence)

  let totalPence = deliverablesPence.reduce((sum: number, price: number) => sum + price, 0)
  console.log('[calculateTotalPence] Total before originality report:', totalPence, 'pence')

  if (orderData.includeOriginalityReport) {
    console.log('[calculateTotalPence] Adding originality report:', ORIGINALITY_REPORT_PENCE, 'pence')
    totalPence += ORIGINALITY_REPORT_PENCE
  }

  console.log('[calculateTotalPence] ✅ Final total:', totalPence, 'pence (£' + (totalPence / 100).toFixed(2) + ')')

  return totalPence
}

export async function POST(request: Request) {
  try {
    console.log('========================================')
    console.log('[stripe/create-payment-intent] 🚀 REQUEST START')
    console.log('[stripe/create-payment-intent] Timestamp:', new Date().toISOString())
    console.log('========================================')

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[stripe/create-payment-intent] Auth check:', user ? 'Authenticated' : 'Not authenticated')
    console.log('[stripe/create-payment-intent] User ID:', user?.id)

    if (!user) {
      console.log('[stripe/create-payment-intent] ❌ BLOCKED: Not authenticated')
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    console.log('[stripe/create-payment-intent] Parsing request body...')
    const { amountPence, orderData, fileData } = await request.json()
    console.log('[stripe/create-payment-intent] amountPence received:', amountPence)
    console.log('[stripe/create-payment-intent] orderData received:', orderData ? 'Present' : 'Missing')
    console.log('[stripe/create-payment-intent] orderData keys:', orderData ? Object.keys(orderData) : 'N/A')
    console.log('[stripe/create-payment-intent] fileData received:', fileData ? 'Present' : 'Missing')

    if (typeof amountPence !== 'number' || amountPence < 100) {
      console.log('[stripe/create-payment-intent] ❌ BLOCKED: Invalid amount')
      console.log('[stripe/create-payment-intent] Amount type:', typeof amountPence)
      console.log('[stripe/create-payment-intent] Amount value:', amountPence)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    console.log('[stripe/create-payment-intent] ✅ Amount validation passed')

    // Save order data to pending_orders table to avoid Stripe metadata 500-char limit
    console.log('[stripe/create-payment-intent] 💾 Saving order to pending_orders table...')
    const { data: pendingOrder, error: pendingError } = await supabase
      .from('pending_orders')
      .insert({
        user_email: user.email!,
        order_data: orderData,
        file_data: fileData || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select('id')
      .single()

    if (pendingError || !pendingOrder) {
      console.error('[stripe/create-payment-intent] ❌ Failed to save pending order')
      console.error('[stripe/create-payment-intent] Error:', pendingError)
      return NextResponse.json({ error: 'Failed to save order data' }, { status: 500 })
    }

    const pendingOrderId = pendingOrder.id
    console.log('[stripe/create-payment-intent] ✅ Pending order saved with ID:', pendingOrderId)

    // Check quote expiry (60 minutes)
    console.log('[stripe/create-payment-intent] Checking quote expiry...')
    const quoteGeneratedAt = orderData.quoteGeneratedAt
      ? new Date(orderData.quoteGeneratedAt)
      : new Date()
    console.log('[stripe/create-payment-intent] Quote generated at:', quoteGeneratedAt.toISOString())

    const now = new Date()
    const minutesElapsed = (now.getTime() - quoteGeneratedAt.getTime()) / (1000 * 60)

    if (minutesElapsed > QUOTE_EXPIRY_MINUTES && orderData.deadline) {
      console.log(`[stripe/create-payment-intent] ⚠️ Quote expired (${minutesElapsed.toFixed(1)} minutes), checking for price changes`)
      console.log('[stripe/create-payment-intent] Recalculating price with current deadline proximity...')

      // Recalculate current total with current UTC server time
      try {
        console.log('[stripe/create-payment-intent] Calling calculateTotalPence...')
        const currentTotalPence = calculateTotalPence(orderData)
        console.log('[stripe/create-payment-intent] Recalculated price:', currentTotalPence, 'pence')
      const originalTotalPence = amountPence

      if (currentTotalPence < originalTotalPence) {
        // Price decreased - silently apply lower price
        console.log(`[stripe] Quote expired, price decreased from ${originalTotalPence} to ${currentTotalPence} pence`)

        const paymentIntent = await stripe.paymentIntents.create({
          amount: currentTotalPence,
          currency: 'gbp',
          metadata: {
            userId: user.id,
            pendingOrderId: pendingOrderId,
            quoteAdjusted: 'decreased',
          },
          payment_method_types: ['card'],
        })

        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
          adjustedAmount: currentTotalPence,
        })
      }

      if (currentTotalPence > originalTotalPence) {
        // Price increased - check tier jump
        const originalMultiplierPct = getDeadlineMultiplierPct(orderData.deadline)
        // For current multiplier, we need to recalculate based on current server time
        // But orderData.deadline is the same - what changed is how close we are to it
        // We need to use current UTC time to determine days until deadline
        const deadlineDate = new Date(orderData.deadline)
        const daysUntilNow = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        let currentMultiplierPct: number
        if (daysUntilNow >= 14) currentMultiplierPct = 100
        else if (daysUntilNow >= 7) currentMultiplierPct = 120
        else if (daysUntilNow >= 4) currentMultiplierPct = 150
        else currentMultiplierPct = 180

        const tierJump = currentMultiplierPct - originalMultiplierPct

        if (tierJump > ONE_TIER_THRESHOLD_PCT) {
          // More than one tier - require client confirmation
          console.log(`[stripe] Quote expired, price increased by ${tierJump}% (> 1 tier), requiring confirmation`)

          return NextResponse.json({
            error: 'QUOTE_EXPIRED',
            originalAmountPence: originalTotalPence,
            newAmountPence: currentTotalPence,
            message: `Your quoted price was £${(originalTotalPence / 100).toFixed(2)}. Because your deadline is now closer, the price is £${(currentTotalPence / 100).toFixed(2)}. Please review before paying.`,
          }, { status: 409 })
        }

        // Within one tier - honour original quote
        console.log(`[stripe/create-payment-intent] Quote expired, price increased by ${tierJump}% (≤ 1 tier), honouring original price`)
        // Continue with original amount below
      }
      } catch (calcError) {
        console.error('========================================')
        console.error('[stripe/create-payment-intent] ❌ ERROR during price recalculation')
        console.error('[stripe/create-payment-intent] Error name:', (calcError as Error).name)
        console.error('[stripe/create-payment-intent] Error message:', (calcError as Error).message)
        console.error('[stripe/create-payment-intent] Error stack:', (calcError as Error).stack)
        console.error('[stripe/create-payment-intent] orderData structure:', JSON.stringify(orderData, null, 2))
        console.error('========================================')
        throw calcError
      }
    }

    // Quote valid or within acceptable increase range
    console.log('[stripe/create-payment-intent] Creating Stripe payment intent...')
    console.log('[stripe/create-payment-intent] Amount:', amountPence, 'pence (£' + (amountPence / 100).toFixed(2) + ')')
    console.log('[stripe/create-payment-intent] User ID:', user.id)
    console.log('[stripe/create-payment-intent] Pending order ID to store in metadata:', pendingOrderId)

    try {
      console.log('[stripe/create-payment-intent] Calling stripe.paymentIntents.create...')
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountPence,
        currency: 'gbp',
        metadata: {
          userId: user.id,
          pendingOrderId: pendingOrderId,
        },
        payment_method_types: ['card'],
      })

      console.log('[stripe/create-payment-intent] ✅ Payment intent created successfully')
      console.log('[stripe/create-payment-intent] Payment intent ID:', paymentIntent.id)
      console.log('[stripe/create-payment-intent] Client secret length:', paymentIntent.client_secret?.length)
      console.log('========================================')
      console.log('[stripe/create-payment-intent] 🎉 REQUEST COMPLETE - SUCCESS')
      console.log('========================================')

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
      })
    } catch (stripeError) {
      console.error('========================================')
      console.error('[stripe/create-payment-intent] ❌ STRIPE API ERROR')
      console.error('[stripe/create-payment-intent] Error name:', (stripeError as Error).name)
      console.error('[stripe/create-payment-intent] Error message:', (stripeError as Error).message)
      console.error('[stripe/create-payment-intent] Error stack:', (stripeError as Error).stack)
      console.error('[stripe/create-payment-intent] Stripe error object:', stripeError)
      console.error('========================================')
      throw stripeError
    }
  } catch (err) {
    console.error('========================================')
    console.error('[stripe/create-payment-intent] ❌❌❌ UNHANDLED ERROR IN ROUTE ❌❌❌')
    console.error('[stripe/create-payment-intent] Error caught at top level')
    console.error('[stripe/create-payment-intent] Error type:', typeof err)
    console.error('[stripe/create-payment-intent] Error name:', (err as Error).name)
    console.error('[stripe/create-payment-intent] Error message:', (err as Error).message)
    console.error('[stripe/create-payment-intent] Error stack:', (err as Error).stack)

    // Log full error object for debugging
    if (err && typeof err === 'object') {
      console.error('[stripe/create-payment-intent] Full error object:')
      console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    } else {
      console.error('[stripe/create-payment-intent] Error value:', err)
    }

    console.error('========================================')
    console.error('[stripe/create-payment-intent] 💥 REQUEST FAILED')
    console.error('========================================')

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
