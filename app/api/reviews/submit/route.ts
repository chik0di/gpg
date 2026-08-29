import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { orderId, rating, reviewText, displayPreference } = await request.json()

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
    }

    // Check if user owns this order and it's completed
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, module_name, user_id')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Order must be completed to leave a review' }, { status: 400 })
    }

    // Check if user has already reviewed this order
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('order_id', orderId)
      .single()

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this order' }, { status: 400 })
    }

    // Get user profile for display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()

    // Determine display name based on preference
    let displayName: string | null = null
    let isAnonymous = false
    let showModule = false

    switch (displayPreference) {
      case 'anonymous':
        displayName = null
        isAnonymous = true
        break
      case 'first_name':
        displayName = profile?.first_name || 'Anonymous'
        break
      case 'first_name_module':
        if (profile?.first_name && order.module_name) {
          displayName = `${profile.first_name} — ${order.module_name}`
          showModule = true
        } else if (profile?.first_name) {
          displayName = profile.first_name
        } else {
          displayName = 'Anonymous'
        }
        break
      default:
        displayName = profile?.first_name || 'Anonymous'
    }

    // Insert review
    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        order_id: orderId,
        rating,
        review_text: reviewText || null,
        display_name: displayName,
        is_anonymous: isAnonymous,
        show_module: showModule,
        module_name: showModule ? order.module_name : null,
        is_approved: false,
      })

    if (insertError) {
      console.error('Failed to insert review:', insertError)
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
