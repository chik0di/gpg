import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ReviewCard, { ReviewStars } from '@/components/reviews/review-card'
import { publicReviewSummary } from '@/lib/public-review-summary'

export default async function ReviewsPreview() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  // Public reads use the anon client and the approved-review RLS policy (migration 021).
  const [summary, { data, error }] = await Promise.all([
    publicReviewSummary(supabase),
    supabase.from('reviews').select('id, rating, review_text, display_name, created_at')
      .eq('is_approved', true).not('review_text', 'is', null).neq('review_text', '')
      .order('created_at', { ascending: false }).limit(20),
  ])
  const reviews = (data || []).filter(review => review.review_text?.trim()).slice(0, 4)
  if (error || (!reviews.length && !summary?.total)) return null
  return <section id="student-reviews" className="bg-white border-b border-[#E8E2D9] py-12 sm:py-16">
    <div className="container-narrow grid lg:grid-cols-[0.8fr_1.6fr] gap-8 lg:gap-12 items-start">
      <div>
        <p className="section-eyebrow mb-3">Student reviews</p>
        <h2 className="page-heading text-3xl sm:text-4xl text-[#1B2E4B] mb-4">In our clients’ words</h2>
        {summary && summary.total > 0 && <div className="mb-5">
          <div className="flex items-center gap-3"><span className="text-3xl font-semibold text-[#1B2E4B] tabular-nums">{summary.average.toFixed(1)}<span className="text-sm font-normal text-[#64748B]"> / 5</span></span><ReviewStars rating={Math.round(summary.average)} /></div>
          <p className="text-sm text-[#64748B] mt-2">Based on {summary.total} {summary.total === 1 ? 'review' : 'reviews'}</p>
        </div>}
        <Link href="/reviews" className="ui-button-secondary">Read all reviews <span aria-hidden="true">→</span></Link>
      </div>
      {reviews.length > 0 && <div className="grid sm:grid-cols-2 gap-4">{reviews.map(review => <ReviewCard key={review.id} review={review} />)}</div>}
    </div>
  </section>
}
