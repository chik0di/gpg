import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Client Reviews — GetPrimeGrade',
  description: 'Read what our clients say about our model answers and study materials',
}

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
          className="w-5 h-5"
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

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60)
    return `${mins} minute${mins > 1 ? 's' : ''} ago`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000)
    return `${months} month${months > 1 ? 's' : ''} ago`
  }
  const years = Math.floor(diffInSeconds / 31536000)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

export default async function ReviewsPage() {
  // Create anon client for public access to approved reviews
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, review_text, display_name, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false }) as { data: Review[] | null }

  const totalReviews = reviews?.length ?? 0
  const averageRating = totalReviews > 0
    ? (reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews)
    : 0

  return (
    <>
      <Navbar />
      <main className="min-h-screen" style={{ background: '#F5F0E8' }}>
        {/* Header */}
        <section className="border-b border-[#E8E2D9]" style={{ background: '#FDFAF6' }}>
          <div className="container-narrow py-16 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E8A020] mb-4">
              Reviews
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1B2E4B] mb-4">
              What our clients say
            </h1>

            {totalReviews > 0 && (
              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-4xl font-extrabold text-[#E8A020]">
                      {averageRating.toFixed(1)}
                    </span>
                    <StarRating rating={Math.round(averageRating)} />
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
        <section className="container-narrow py-16">
          {totalReviews === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#6B7280] mb-6">
                No reviews yet. Be the first to share your experience!
              </p>
              <Link
                href="/order"
                className="inline-flex items-center gap-2 bg-[#E8A020] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#C4861A] transition-colors"
              >
                Place an order
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {reviews!.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-[#E8E2D9] rounded-2xl p-6"
                  style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-[#9CA3AF]">
                      {getRelativeTime(review.created_at)}
                    </span>
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
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
