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

    // Validate review text length
    if (reviewText && reviewText.length > 2000) {
      return NextResponse.json({ error: 'Review text must be 2000 characters or less' }, { status: 400 })
    }

    // Sanitize inputs - remove potential XSS
    const sanitizedReviewText = reviewText ? reviewText.trim().slice(0, 2000) : null

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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()

    console.log('========================================')
    console.log('[reviews/submit] 👤 PROFILE FETCH')
    console.log('[reviews/submit] User ID:', user.id)
    console.log('[reviews/submit] Profile data:', profile)
    console.log('[reviews/submit] Profile error:', profileError)
    console.log('[reviews/submit] First name:', profile?.first_name)
    console.log('========================================')

    // Determine display name based on preference
    let displayName: string | null = null
    let isAnonymous = false
    let showModule = false

    console.log('========================================')
    console.log('[reviews/submit] 🏷️  DISPLAY NAME LOGIC START')
    console.log('[reviews/submit] Display preference:', displayPreference)
    console.log('[reviews/submit] Has review text:', !!sanitizedReviewText)
    console.log('[reviews/submit] Review text length:', sanitizedReviewText?.length || 0)
    console.log('[reviews/submit] Order module name:', order.module_name)
    console.log('[reviews/submit] Profile first name:', profile?.first_name)
    console.log('========================================')

    switch (displayPreference) {
      case 'anonymous':
        displayName = null
        isAnonymous = true
        console.log('[reviews/submit] ✅ Case: anonymous')
        console.log('[reviews/submit]   → displayName = null')
        console.log('[reviews/submit]   → isAnonymous = true')
        break
      case 'first_name':
        displayName = profile?.first_name ? profile.first_name.trim().slice(0, 100) : 'Anonymous'
        console.log('[reviews/submit] ✅ Case: first_name')
        console.log('[reviews/submit]   → displayName =', displayName)
        break
      case 'first_name_module':
        console.log('[reviews/submit] ✅ Case: first_name_module')
        console.log('[reviews/submit]   Checking conditions:')
        console.log('[reviews/submit]   - profile?.first_name:', !!profile?.first_name, '→', profile?.first_name)
        console.log('[reviews/submit]   - order.module_name:', !!order.module_name, '→', order.module_name)

        if (profile?.first_name && order.module_name) {
          const firstName = profile.first_name.trim().slice(0, 50)
          const moduleName = order.module_name.trim().slice(0, 100)
          displayName = `${firstName} — ${moduleName}`
          showModule = true
          console.log('[reviews/submit]   ✅ Both exist → Full format')
          console.log('[reviews/submit]   → firstName:', firstName)
          console.log('[reviews/submit]   → moduleName:', moduleName)
          console.log('[reviews/submit]   → displayName:', displayName)
          console.log('[reviews/submit]   → showModule:', showModule)
        } else if (profile?.first_name) {
          displayName = profile.first_name.trim().slice(0, 100)
          console.log('[reviews/submit]   ⚠️  Only first name → First name only')
          console.log('[reviews/submit]   → displayName:', displayName)
        } else {
          displayName = 'Anonymous'
          console.log('[reviews/submit]   ❌ No first name → Anonymous')
          console.log('[reviews/submit]   → displayName:', displayName)
        }
        break
      default:
        displayName = profile?.first_name ? profile.first_name.trim().slice(0, 100) : 'Anonymous'
        console.log('[reviews/submit] ⚠️  Case: default (unexpected)')
        console.log('[reviews/submit]   → displayName =', displayName)
    }

    console.log('========================================')
    console.log('[reviews/submit] 🏷️  DISPLAY NAME LOGIC COMPLETE')
    console.log('[reviews/submit] Final values:')
    console.log('[reviews/submit]   - displayName:', displayName)
    console.log('[reviews/submit]   - isAnonymous:', isAnonymous)
    console.log('[reviews/submit]   - showModule:', showModule)
    console.log('========================================')

    // Insert review
    const reviewData = {
      user_id: user.id,
      order_id: orderId,
      rating,
      review_text: sanitizedReviewText,
      display_name: displayName,
      is_anonymous: isAnonymous,
      show_module: showModule,
      module_name: showModule ? order.module_name?.trim().slice(0, 200) : null,
      is_approved: false,
    }

    console.log('========================================')
    console.log('[reviews/submit] 💾 INSERTING REVIEW INTO DATABASE')
    console.log('[reviews/submit] Review data being inserted:')
    console.log(JSON.stringify(reviewData, null, 2))
    console.log('========================================')

    const { error: insertError } = await supabase
      .from('reviews')
      .insert(reviewData)

    if (insertError) {
      console.error('========================================')
      console.error('[reviews/submit] ❌ DATABASE INSERT FAILED')
      console.error('[reviews/submit] Error:', insertError)
      console.error('========================================')
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }

    console.log('========================================')
    console.log('[reviews/submit] ✅ REVIEW INSERTED SUCCESSFULLY')
    console.log('[reviews/submit] User:', user.id)
    console.log('[reviews/submit] Order:', orderId)
    console.log('[reviews/submit] Display name stored:', displayName)
    console.log('========================================')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
