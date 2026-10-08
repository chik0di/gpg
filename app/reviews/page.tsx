import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import Link from 'next/link'
import ReviewCard, { ReviewStars } from '@/components/reviews/review-card'
import { publicReviewSummary } from '@/lib/public-review-summary'

export const metadata: Metadata = {
  title: 'Client Reviews — GetPrimeGrade',
  description: 'Read what our clients say about our model answers and study materials',
}

// Revalidate every 5 minutes to show newly approved reviews
export const revalidate = 300

export default async function ReviewsPage() {
  // ============================================================================
  // CRITICAL: This page queries the reviews table using the ANON (anonymous) key
  // ============================================================================
  // This is a PUBLIC page - users are NOT authenticated.
  //
  // RECURRING BUG (occurred 3 times):
  // Approved reviews exist in database but don't appear on this page.
  //
  // ROOT CAUSE:
  // Missing RLS policy: "Anyone can read approved reviews"
  // This policy MUST exist on the reviews table for SELECT with:
  // - TO: anon, authenticated
  // - USING: is_approved = true
  //
  // HOW TO FIX:
  // 1. Run migration 021_prevent_reviews_rls_regression.sql
  // 2. OR manually run in Supabase SQL Editor:
  //    CREATE POLICY 'Anyone can read approved reviews' ON reviews
  //    FOR SELECT TO anon, authenticated USING (is_approved = true);
  //    GRANT SELECT ON reviews TO anon;
  //
  // HOW TO VERIFY:
  // SET ROLE anon;
  // SELECT * FROM reviews WHERE is_approved = true;
  // RESET ROLE;
  //
  // If the above returns NO ROWS but approved reviews exist, the policy is broken!
  // ============================================================================

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [summary, { data: reviews, error }] = await Promise.all([
    publicReviewSummary(supabase),
    supabase.from('reviews').select('id, rating, review_text, display_name, created_at')
      .eq('is_approved', true).order('created_at', { ascending: false }),
  ])
  const totalReviews = summary?.total ?? 0
  const averageRating = summary?.average ?? 0

  // Filter for card display: only reviews with actual text content (not null, not empty, not whitespace)
  const reviewsWithText = reviews?.filter(review =>
    review.review_text && review.review_text.trim().length > 0
  ) ?? []

  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
        {/* Header */}
        <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
          <div className="container-narrow py-10 sm:py-14">
            <span className="section-eyebrow block mb-3">
              Reviews
            </span>
            <h1 className="page-heading text-3xl sm:text-4xl text-[#1B2E4B] mb-4">
              What our clients say
            </h1>

            {totalReviews > 0 && (
              <div className="flex items-center gap-6 mt-6">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl font-semibold text-[#1B2E4B]">
                      {averageRating.toFixed(1)}
                    </span>
                    <ReviewStars rating={Math.round(averageRating)} />
                  </div>
                  <p className="text-sm text-[#6B7280]">
                    Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        <section className="container-narrow py-10 sm:py-14">
          {reviewsWithText.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B7280] mb-6">
                {error ? 'Reviews are temporarily unavailable. Please try again later.' : 'No written reviews yet. Be the first to share your experience!'}
              </p>
              <Link
                href="/order"
                className="ui-button-primary "
              >
                Place an order
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {reviewsWithText.map(review => <ReviewCard key={review.id} review={review} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
