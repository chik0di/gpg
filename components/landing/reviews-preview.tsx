import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

interface Review {
  id: string
  rating: number
  review_text: string | null
  display_name: string | null
  created_at: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="w-4 h-4"
          fill={star <= rating ? '#E8A020' : 'none'}
          stroke={star <= rating ? '#E8A020' : '#D1D5DB'}
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      ))}
    </div>
  )
}

export default async function ReviewsPreview() {
  // Create anon client for public access to approved reviews
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, rating, review_text, display_name, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(4)

  console.log('[Reviews Preview] Query result:', {
    reviewCount: reviews?.length ?? 0,
    error: error?.message,
    reviews: reviews
  })

  // If no reviews exist, don't render this section at all
  if (!reviews || reviews.length === 0) {
    return null
  }

  const totalReviews = reviews.length
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews

  return (
    <section className="py-20 md:py-28 bg-[#FDFAF6]">
      <div className="container-narrow">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs font-bold text-[#E8A020] uppercase tracking-widest mb-3">
            Reviews
          </p>
          <h2 className="font-extrabold text-[#1B2E4B] text-3xl md:text-4xl leading-tight mb-4">
            Trusted by students like you
          </h2>

          {/* Overall rating */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-2xl font-extrabold text-[#E8A020]">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-6 h-6"
                  fill={star <= Math.round(averageRating) ? '#E8A020' : 'none'}
                  stroke={star <= Math.round(averageRating) ? '#E8A020' : '#D1D5DB'}
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-[#E8E2D9] rounded-2xl p-6 hover:border-[#E8A020]/30 transition-colors"
              style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}
            >
              <div className="mb-3">
                <StarRating rating={review.rating} />
              </div>

              {review.review_text && (
                <p className="text-sm text-[#6B7280] leading-relaxed mb-4">
                  "{review.review_text}"
                </p>
              )}

              <p className="text-sm font-semibold text-[#1B2E4B]">
                {review.display_name || 'Anonymous'}
              </p>
            </div>
          ))}
        </div>

        {/* See all link */}
        <div className="text-center">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 text-[#E8A020] hover:text-[#C4861A] font-bold text-sm transition-colors"
          >
            See all reviews
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
