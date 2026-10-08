export interface PublicReview {
  id: string
  rating: number
  review_text: string | null
  display_name: string | null
  created_at: string
}

export function ReviewStars({ rating }: { rating: number }) {
  return <div className="flex gap-1" role="img" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(star => <svg key={star} aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24" fill={star <= rating ? '#E8A020' : 'none'} stroke={star <= rating ? '#926314' : '#94A3B8'} strokeWidth={1.3}><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9L12 3Z" /></svg>)}
  </div>
}

export default function ReviewCard({ review }: { review: PublicReview }) {
  return <figure className="ui-card p-5 sm:p-6 flex flex-col h-full">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <ReviewStars rating={review.rating} />
      <time dateTime={review.created_at} className="text-xs text-[#64748B]">{new Date(review.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>
    </div>
    <blockquote className="text-base text-[#1B2E4B] leading-relaxed whitespace-pre-wrap break-words flex-1">“{review.review_text}”</blockquote>
    <figcaption className="mt-5 pt-4 border-t border-[#E8E2D9] text-sm font-semibold text-[#1B2E4B] break-words">{review.display_name || 'Anonymous'}</figcaption>
  </figure>
}
