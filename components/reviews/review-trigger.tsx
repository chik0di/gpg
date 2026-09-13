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
  const [hasExistingReview, setHasExistingReview] = useState(false)
  const [checkingReview, setCheckingReview] = useState(true)

  // Check if user has already submitted a review for this order (database check)
  useEffect(() => {
    async function checkForExistingReview() {
      try {
        console.log('[ReviewTrigger] Checking for existing review for order:', orderId)

        const response = await fetch(`/api/reviews/check?orderId=${orderId}`)

        if (response.ok) {
          const { hasReview } = await response.json()
          console.log('[ReviewTrigger] Database review check result:', { hasReview })
          setHasExistingReview(hasReview)
        } else {
          console.warn('[ReviewTrigger] Failed to check for existing review, status:', response.status)
          // On error, fall back to localStorage check only
          const localCheck = localStorage.getItem(`reviewed_order_${orderId}`)
          setHasExistingReview(!!localCheck)
        }
      } catch (error) {
        console.error('[ReviewTrigger] Error checking for existing review:', error)
        // On error, fall back to localStorage check only
        const localCheck = localStorage.getItem(`reviewed_order_${orderId}`)
        setHasExistingReview(!!localCheck)
      } finally {
        setCheckingReview(false)
      }
    }

    if (isCompleted) {
      checkForExistingReview()
    } else {
      setCheckingReview(false)
    }
  }, [orderId, isCompleted])

  // Show review popup on page load after delay (if order is completed and no review exists)
  useEffect(() => {
    console.log('[ReviewTrigger] Component mounted:', {
      orderId,
      isCompleted,
      checkingReview,
      hasExistingReview
    })

    // Don't show popup if:
    // - Order is not completed
    // - Still checking for existing review
    // - User already reviewed this order
    if (!isCompleted) {
      console.log('[ReviewTrigger] Order not completed, skipping review popup')
      return
    }

    if (checkingReview) {
      console.log('[ReviewTrigger] Still checking for existing review, waiting...')
      return
    }

    if (hasExistingReview) {
      console.log('[ReviewTrigger] User already reviewed this order, skipping popup')
      return
    }

    // Check localStorage as additional safeguard
    const localStorageCheck = localStorage.getItem(`reviewed_order_${orderId}`)
    if (localStorageCheck) {
      console.log('[ReviewTrigger] localStorage indicates review already submitted, skipping popup')
      return
    }

    // Show popup after 2 second delay to let user see the page first
    console.log('[ReviewTrigger] Order completed and no review found - will show popup in 2 seconds')
    const timer = setTimeout(() => {
      console.log('[ReviewTrigger] SHOWING REVIEW POPUP')
      setShowReviewPopup(true)
    }, 2000)

    return () => {
      console.log('[ReviewTrigger] Cleaning up timer')
      clearTimeout(timer)
    }
  }, [orderId, isCompleted, checkingReview, hasExistingReview])

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

  console.log('[ReviewTrigger] Render check:', { showReviewPopup })

  if (!showReviewPopup) return null

  console.log('[ReviewTrigger] RENDERING REVIEW POPUP')

  return (
    <ReviewPopup
      orderId={orderId}
      moduleName={moduleName}
      onClose={() => {
        console.log('[ReviewTrigger] Review popup closed')
        setShowReviewPopup(false)
      }}
      onSubmit={handleSubmitReview}
    />
  )
}
