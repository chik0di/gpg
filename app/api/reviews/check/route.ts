import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    console.log('[reviews/check] Checking for review:', { userId: user.id, orderId })

    // Check if a review exists for this order by this user
    const { data: existingReview, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('order_id', orderId)
      .maybeSingle()

    if (error) {
      console.error('[reviews/check] Database error:', error)
      return NextResponse.json({ error: 'Failed to check review status' }, { status: 500 })
    }

    const hasReview = !!existingReview

    console.log('[reviews/check] Result:', { hasReview, reviewId: existingReview?.id })

    return NextResponse.json({ hasReview })
  } catch (err) {
    console.error('[reviews/check] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
