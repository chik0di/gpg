import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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
      .update({ is_approved: true })
      .eq('id', reviewId)

    if (error) {
      console.error('Failed to approve review:', error)
      return NextResponse.json({ error: 'Failed to approve review' }, { status: 500 })
    }

    // Immediately revalidate pages that display reviews
    // This ensures newly approved reviews appear on landing page and /reviews within seconds
    try {
      revalidatePath('/', 'page')
      revalidatePath('/reviews', 'page')
      console.log('[Approve Review] Revalidated / and /reviews pages for review:', reviewId)
    } catch (revalError) {
      // Don't fail the approval if revalidation fails
      console.error('[Approve Review] Revalidation failed (review still approved):', revalError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    // requireAdmin throws Response with 403
    if (error instanceof Response) {
      return error
    }
    console.error('Approve review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
