import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'admin@getprimegrade.com') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { reviewId } = await request.json()

    const { error } = await supabaseAdmin
      .from('reviews')
      .update({ is_approved: true })
      .eq('id', reviewId)

    if (error) {
      console.error('Failed to approve review:', error)
      return NextResponse.json({ error: 'Failed to approve review' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
