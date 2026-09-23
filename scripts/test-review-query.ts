import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testReviewQuery() {
  console.log('========================================')
  console.log('[Direct Query Test] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) + '...')
  console.log('[Direct Query Test] Anon key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  console.log('========================================')

  // EXACT QUERY FROM /reviews/page.tsx and components/landing/reviews-preview.tsx
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, rating, review_text, display_name, created_at, is_approved, module_name')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  console.log('========================================')
  console.log('[Direct Query Test] QUERY RESULT')
  console.log('[Direct Query Test] Error:', error)
  console.log('[Direct Query Test] Error message:', error?.message)
  console.log('[Direct Query Test] Error details:', error?.details)
  console.log('[Direct Query Test] Error code:', error?.code)
  console.log('[Direct Query Test] Reviews count:', reviews?.length ?? 0)
  console.log('[Direct Query Test] Reviews data:')
  console.log(JSON.stringify(reviews, null, 2))
  console.log('========================================')

  // Apply frontend filter: only reviews with text
  const reviewsWithText = reviews?.filter(review =>
    review.review_text && review.review_text.trim().length > 0
  ) ?? []

  console.log('========================================')
  console.log('[Direct Query Test] FRONTEND FILTER APPLIED')
  console.log('[Direct Query Test] Total approved reviews fetched:', reviews?.length ?? 0)
  console.log('[Direct Query Test] Reviews WITH text (after filter):', reviewsWithText.length)
  console.log('[Direct Query Test] Reviews WITHOUT text (filtered out):', (reviews?.length ?? 0) - reviewsWithText.length)
  console.log('========================================')

  if (reviews && reviews.length > 0) {
    console.log('[Direct Query Test] REVIEW DETAILS:')
    reviews.forEach((r, idx) => {
      console.log(`\nReview ${idx + 1}:`)
      console.log('  ID:', r.id)
      console.log('  Rating:', r.rating)
      console.log('  Display name:', r.display_name)
      console.log('  Module name:', r.module_name)
      console.log('  Review text (raw):', JSON.stringify(r.review_text))
      console.log('  Review text length:', r.review_text?.length ?? 0)
      console.log('  Review text trimmed length:', r.review_text?.trim().length ?? 0)
      console.log('  Is approved:', r.is_approved)
      console.log('  Created at:', r.created_at)
      console.log('  WOULD BE DISPLAYED:', !!(r.review_text && r.review_text.trim().length > 0))
    })
  }

  console.log('\n========================================')
  console.log('[Direct Query Test] DIAGNOSIS SUMMARY')
  console.log('========================================')
  if (error) {
    console.log('❌ FETCH PROBLEM: Database query returned error')
    console.log('   → This is a database/RLS policy issue')
    console.log('   → Need to check RLS policies on reviews table')
  } else if (!reviews || reviews.length === 0) {
    console.log('⚠️  FETCH PROBLEM: Query succeeded but returned 0 rows')
    console.log('   → Either no approved reviews exist, or RLS is blocking them')
    console.log('   → Check: SELECT * FROM reviews WHERE is_approved = true; with admin client')
  } else if (reviewsWithText.length === 0) {
    console.log('⚠️  RENDER PROBLEM: Query fetched reviews but all filtered out')
    console.log('   → All approved reviews have NULL or empty review_text')
    console.log('   → Frontend filter: review.review_text && review.review_text.trim().length > 0')
    console.log('   → This is expected if reviews have no text - not a bug')
  } else {
    console.log('✅ NO PROBLEM: Query fetched', reviews.length, 'reviews,', reviewsWithText.length, 'have text')
    console.log('   → These should be visible on /reviews and landing page')
  }
  console.log('========================================')
}

testReviewQuery().catch(console.error)
