'use client'

import { useState } from 'react'

interface ReviewPopupProps {
  orderId: string
  moduleName: string | null
  onClose: () => void
  onSubmit: (data: {
    rating: number
    reviewText: string
    displayPreference: 'anonymous' | 'first_name' | 'first_name_module'
  }) => Promise<void>
}

export default function ReviewPopup({ orderId, moduleName, onClose, onSubmit }: ReviewPopupProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [displayPreference, setDisplayPreference] = useState<'anonymous' | 'first_name' | 'first_name_module'>('first_name_module')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) return

    setIsSubmitting(true)
    try {
      await onSubmit({ rating, reviewText, displayPreference })
      // Mark as reviewed in localStorage
      localStorage.setItem(`reviewed_order_${orderId}`, 'true')
      onClose()
    } catch (error) {
      console.error('Failed to submit review:', error)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    localStorage.setItem(`reviewed_order_${orderId}`, 'true')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="relative w-full max-w-md bg-[#FDFAF6] rounded-3xl border border-[#E8E2D9] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-[#6B7280] hover:text-[#1B2E4B] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-[#1B2E4B] mb-2">
            How was your experience?
          </h2>
          <p className="text-sm text-[#6B7280]">
            Your feedback helps us improve our service
          </p>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <svg
                className="w-10 h-10"
                fill={star <= (hoveredRating || rating) ? '#E8A020' : 'none'}
                stroke={star <= (hoveredRating || rating) ? '#E8A020' : '#D1D5DB'}
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Review text */}
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Tell us more (optional)"
          rows={4}
          className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm text-[#1B2E4B] placeholder-[#9CA3AF] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30 focus:border-[#E8A020] mb-6 resize-none"
        />

        {/* Display preference */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">
            Display as
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="display"
                value="anonymous"
                checked={displayPreference === 'anonymous'}
                onChange={(e) => setDisplayPreference(e.target.value as any)}
                className="w-4 h-4 text-[#E8A020] border-[#D1D5DB] focus:ring-[#E8A020]"
              />
              <span className="text-sm text-[#1B2E4B]">Anonymous</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="display"
                value="first_name"
                checked={displayPreference === 'first_name'}
                onChange={(e) => setDisplayPreference(e.target.value as any)}
                className="w-4 h-4 text-[#E8A020] border-[#D1D5DB] focus:ring-[#E8A020]"
              />
              <span className="text-sm text-[#1B2E4B]">First name only</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="display"
                value="first_name_module"
                checked={displayPreference === 'first_name_module'}
                onChange={(e) => setDisplayPreference(e.target.value as any)}
                className="w-4 h-4 text-[#E8A020] border-[#D1D5DB] focus:ring-[#E8A020]"
              />
              <span className="text-sm text-[#1B2E4B]">
                First name + module
                {!moduleName && <span className="text-[#9CA3AF] ml-1">(no module name)</span>}
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-[#6B7280] hover:text-[#1B2E4B] transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="px-6 py-2.5 bg-[#E8A020] text-white font-bold text-sm rounded-xl hover:bg-[#C4861A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  )
}
