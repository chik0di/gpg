import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { getBestDiscount } from '@/lib/discount'
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
  const deliverablesPence = orderData.deliverables.map((d: any) => {
    let basePence: number

    if (d.type === 'written') {
      const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
      basePence = calcWrittenPricePence(pages, false)
    } else if (d.type === 'presentation') {
      const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
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
      basePence = validateTechnicalPricePence(priceMap[d.practicalKey] || TECHNICAL_MODERATE)
    } else {
      basePence = 0
    }

    let finalPence = basePence
    finalPence = applyAcademicMultiplier(finalPence, orderData.academicLevel)
    finalPence = applyDeadlineMultiplier(finalPence, orderData.deadline)
    return finalPence
  })

  let totalPence = deliverablesPence.reduce((sum: number, price: number) => sum + price, 0)

  if (orderData.includeOriginalityReport) {
    totalPence += ORIGINALITY_REPORT_PENCE
  }

  return totalPence
}

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

    // Check quote expiry (60 minutes)
    const quoteGeneratedAt = orderData.quoteGeneratedAt
      ? new Date(orderData.quoteGeneratedAt)
      : new Date()

    const now = new Date()
    const minutesElapsed = (now.getTime() - quoteGeneratedAt.getTime()) / (1000 * 60)

    if (minutesElapsed > QUOTE_EXPIRY_MINUTES && orderData.deadline) {
      console.log(`[stripe] Quote expired (${minutesElapsed.toFixed(1)} minutes), checking for price changes`)

      // Recalculate current total with current UTC server time
      const currentTotalPence = calculateTotalPence(orderData)

      // Apply discount
      let currentTotalWithDiscount = currentTotalPence
      if (discount.percent > 0) {
        const discountAmount = Math.round((currentTotalPence * discount.percent) / 100)
        currentTotalWithDiscount = currentTotalPence - discountAmount
      }

      const originalTotalPence = amountPence

      if (currentTotalWithDiscount < originalTotalPence) {
        // Price decreased - silently apply lower price
        console.log(`[stripe] Quote expired, price decreased from ${originalTotalPence} to ${currentTotalWithDiscount} pence`)

        const paymentIntent = await stripe.paymentIntents.create({
          amount: currentTotalWithDiscount,
          currency: 'gbp',
          metadata: {
            userId: user.id,
            orderData: JSON.stringify(orderData).slice(0, 4500),
            discountType: discount.type,
            discountPercent: String(discount.percent),
            creditId: discount.creditId || '',
            quoteAdjusted: 'decreased',
          },
          payment_method_types: ['card'],
        })

        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
          firstOrderDiscount: discount.percent > 0,
          adjustedAmount: currentTotalWithDiscount,
        })
      }

      if (currentTotalWithDiscount > originalTotalPence) {
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
            newAmountPence: currentTotalWithDiscount,
            message: `Your quoted price was £${(originalTotalPence / 100).toFixed(2)}. Because your deadline is now closer, the price is £${(currentTotalWithDiscount / 100).toFixed(2)}. Please review before paying.`,
          }, { status: 409 })
        }

        // Within one tier - honour original quote
        console.log(`[stripe] Quote expired, price increased by ${tierJump}% (≤ 1 tier), honouring original price`)
        // Continue with original amount below
      }
    }

    // Quote valid or within acceptable increase range
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
