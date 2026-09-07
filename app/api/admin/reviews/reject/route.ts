import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'

export async function POST(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()

    const { reviewId } = await request.json()

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 })
    }

    // Use regular client - RLS policy will enforce admin access
    const supabase = createServerClient()
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)

    if (error) {
      console.error('Failed to reject review:', error)
      return NextResponse.json({ error: 'Failed to reject review' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // requireAdmin throws Response with 403
    if (error instanceof Response) {
      return error
    }
    console.error('Reject review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
