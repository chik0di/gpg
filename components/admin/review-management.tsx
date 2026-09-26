'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Review {
  id: string
  rating: number
  review_text: string | null
  display_name: string | null
  module_name: string | null
  created_at: string
  order_id: string
  user_id: string
  is_approved: boolean
}

interface Props {
  pendingReviews: Review[]
  approvedReviews: Review[]
}

function StarRating({ rating, compact = false }: { rating: number; compact?: boolean }) {
  const size = compact ? 'w-4 h-4' : 'w-5 h-5'
  const gap = compact ? 'gap-0.5' : 'gap-1'

  return (
    <div className={`flex ${gap}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={size}
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

function ReviewRow({ review, onAction }: { review: Review; onAction: () => void }) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/reviews/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id }),
      })

      if (!response.ok) throw new Error('Failed to approve review')
      onAction()
    } catch (error) {
      console.error('Failed to approve review:', error)
      alert('Failed to approve review')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject and delete this review?')) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/reviews/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id }),
      })

      if (!response.ok) throw new Error('Failed to reject review')
      onAction()
    } catch (error) {
      console.error('Failed to reject review:', error)
      alert('Failed to reject review')
    } finally {
      setLoading(false)
    }
  }

  const reviewText = review.review_text || ''
  const isLong = reviewText.length > 80
  const displayText = !expanded && isLong ? reviewText.slice(0, 80) + '...' : reviewText

  return (
    <tr className="border-b border-[#E8E2D9] hover:bg-[#F5F0E8]/30 transition-colors">
      {/* Client/Module */}
      <td className="px-4 py-3">
        <div className="text-sm font-semibold text-[#1B2E4B]">
          {review.display_name || 'Anonymous'}
        </div>
        {review.module_name && (
          <div className="text-xs text-[#9CA3AF] mt-0.5">{review.module_name}</div>
        )}
      </td>

      {/* Star Rating */}
      <td className="px-4 py-3">
        <StarRating rating={review.rating} compact />
      </td>

      {/* Review Text */}
      <td className="px-4 py-3 max-w-md">
        {reviewText ? (
          <div>
            <p className="text-sm text-[#6B7280] leading-snug">
              "{displayText}"
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-[#E8A020] hover:text-[#d89518] mt-1 font-semibold"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-[#9CA3AF] italic">No text provided</span>
        )}
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-sm text-[#6B7280] whitespace-nowrap">
        {new Date(review.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {!review.is_approved ? (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-3 py-1.5 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-green-600 font-semibold">Approved</span>
        )}
      </td>
    </tr>
  )
}

export default function ReviewManagement({ pendingReviews, approvedReviews }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending')

  const handleAction = () => {
    router.refresh()
  }

  const reviews = activeTab === 'pending' ? pendingReviews : approvedReviews

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#E8E2D9]">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'pending'
              ? 'border-[#E8A020] text-[#E8A020]'
              : 'border-transparent text-[#6B7280] hover:text-[#1B2E4B]'
          }`}
        >
          Pending ({pendingReviews.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
            activeTab === 'approved'
              ? 'border-[#E8A020] text-[#E8A020]'
              : 'border-transparent text-[#6B7280] hover:text-[#1B2E4B]'
          }`}
        >
          Approved ({approvedReviews.length})
        </button>
      </div>

      {/* Reviews table */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#9CA3AF]">
            No {activeTab} reviews
          </p>
        </div>
      ) : (
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#E8E2D9] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1B2E4B] text-white">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  Client / Module
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  Rating
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  Review
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {reviews.map((review) => (
                <ReviewRow key={review.id} review={review} onAction={handleAction} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
