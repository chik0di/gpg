import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isEligibleForFirstOrderDiscount, isWithinDiscountWindow } from '@/lib/discount'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ eligible: false })
    }

    const isEligible = await isEligibleForFirstOrderDiscount(supabase, user.id)
    const isInWindow = await isWithinDiscountWindow(supabase, user.id)

    return NextResponse.json({
      eligible: isEligible && isInWindow,
    })
  } catch (err) {
    console.error('[discount/check-eligibility]:', err)
    return NextResponse.json({ eligible: false })
  }
}
