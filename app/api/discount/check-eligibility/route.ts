import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getBestDiscount } from '@/lib/discount'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        type: 'none',
        percent: 0,
        label: '',
      })
    }

    const discount = await getBestDiscount(supabase, user.id)

    return NextResponse.json(discount)
  } catch (err) {
    console.error('[discount/check-eligibility]:', err)
    return NextResponse.json({
      type: 'none',
      percent: 0,
      label: '',
    })
  }
}
