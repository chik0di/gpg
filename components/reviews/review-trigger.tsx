'use client'

import { useEffect, useState } from 'react'
import ReviewPopup from './review-popup'

interface ReviewTriggerProps {
  orderId: string
  moduleName: string | null
  isCompleted: boolean
}

export default function ReviewTrigger({ orderId, moduleName, isCompleted }: ReviewTriggerProps) {
  const [showReviewPopup, setShowReviewPopup] = useState(false)

  useEffect(() => {
    if (!isCompleted) return

    // Check if user has already been prompted for this order
    const hasReviewed = localStorage.getItem(`reviewed_order_${orderId}`)
    if (hasReviewed) return

    // Listen for download events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const downloadLink = target.closest('a[download]')

      if (downloadLink && downloadLink.getAttribute('href')?.includes('completed')) {
        // Show review popup after a short delay to let download start
        setTimeout(() => {
          setShowReviewPopup(true)
        }, 1000)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [orderId, isCompleted])

  const handleSubmitReview = async (data: {
    rating: number
    reviewText: string
    displayPreference: 'anonymous' | 'first_name' | 'first_name_module'
  }) => {
    const response = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        rating: data.rating,
        reviewText: data.reviewText,
        displayPreference: data.displayPreference,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to submit review')
    }
  }

  if (!showReviewPopup) return null

  return (
    <ReviewPopup
      orderId={orderId}
      moduleName={moduleName}
      onClose={() => setShowReviewPopup(false)}
      onSubmit={handleSubmitReview}
    />
  )
}
