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

  // Check if user has already submitted a review for this order (database is source of truth)
  useEffect(() => {
    async function checkForExistingReview() {
      try {
        console.log('========================================')
        console.log('[ReviewTrigger] 🔍 REVIEW CHECK STARTING')
        console.log('[ReviewTrigger] Order ID:', orderId)
        console.log('[ReviewTrigger] Order ID length:', orderId.length)
        console.log('[ReviewTrigger] Order ID (hex):', Array.from(orderId).map((c: string) => c.charCodeAt(0).toString(16)).join(' '))
        console.log('[ReviewTrigger] isCompleted prop:', isCompleted)
        console.log('[ReviewTrigger] isCompleted type:', typeof isCompleted)
        console.log('========================================')

        const response = await fetch(`/api/reviews/check?orderId=${orderId}`)

        console.log('[ReviewTrigger] API response status:', response.status)

        if (response.ok) {
          const { hasReview } = await response.json()
          console.log('========================================')
          console.log('[ReviewTrigger] ✅ REVIEW CHECK COMPLETE')
          console.log('[ReviewTrigger] Has existing review in database:', hasReview)
          console.log('[ReviewTrigger] Will block popup:', hasReview ? 'YES' : 'NO')

          // Database is source of truth - verify localStorage is in sync
          const localCheck = localStorage.getItem(`reviewed_order_${orderId}`)
          if (localCheck && !hasReview) {
            console.log('[ReviewTrigger] ⚠️ MISMATCH DETECTED:')
            console.log('[ReviewTrigger]   localStorage says: reviewed')
            console.log('[ReviewTrigger]   Database says: NOT reviewed')
            console.log('[ReviewTrigger]   Clearing incorrect localStorage flag')
            localStorage.removeItem(`reviewed_order_${orderId}`)
          }
          console.log('========================================')
          setHasExistingReview(hasReview)
        } else {
          console.warn('========================================')
          console.warn('[ReviewTrigger] ⚠️ REVIEW CHECK FAILED')
          console.warn('[ReviewTrigger] Status:', response.status)
          console.warn('[ReviewTrigger] Falling back to localStorage')
          console.warn('========================================')
          // On error, fall back to localStorage check only
          const localCheck = localStorage.getItem(`reviewed_order_${orderId}`)
          console.log('[ReviewTrigger] localStorage check:', localCheck)
          setHasExistingReview(!!localCheck)
        }
      } catch (error) {
        console.error('========================================')
        console.error('[ReviewTrigger] ❌ REVIEW CHECK ERROR')
        console.error('[ReviewTrigger] Error:', error)
        console.error('========================================')
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
      console.log('========================================')
      console.log('[ReviewTrigger] ⚠️ ORDER NOT COMPLETED')
      console.log('[ReviewTrigger] isCompleted:', isCompleted)
      console.log('[ReviewTrigger] Will NOT check for reviews or show popup')
      console.log('========================================')
      setCheckingReview(false)
    }
  }, [orderId, isCompleted])

  // Show review popup on page load after delay (if order is completed and no review exists)
  useEffect(() => {
    console.log('========================================')
    console.log('[ReviewTrigger] 🎯 POPUP TRIGGER EVALUATION')
    console.log('[ReviewTrigger] State check:')
    console.log('[ReviewTrigger]   - orderId:', orderId)
    console.log('[ReviewTrigger]   - isCompleted:', isCompleted, '(type:', typeof isCompleted + ')')
    console.log('[ReviewTrigger]   - checkingReview:', checkingReview)
    console.log('[ReviewTrigger]   - hasExistingReview:', hasExistingReview)
    console.log('========================================')

    // Don't show popup if:
    // - Order is not completed
    // - Still checking for existing review
    // - User already reviewed this order
    if (!isCompleted) {
      console.log('❌ BLOCKING REASON: Order not completed')
      console.log('[ReviewTrigger] isCompleted is:', isCompleted)
      return
    }

    if (checkingReview) {
      console.log('⏳ BLOCKING REASON: Still checking for existing review, waiting...')
      return
    }

    if (hasExistingReview) {
      console.log('❌ BLOCKING REASON: Database confirms user already reviewed this order')
      console.log('[ReviewTrigger] hasExistingReview:', hasExistingReview)
      return
    }

    // Check if user dismissed popup in this session (temporary block - allows retry on next visit)
    const dismissedThisSession = sessionStorage.getItem(`review_popup_dismissed_${orderId}`)
    if (dismissedThisSession) {
      console.log('❌ BLOCKING REASON: User dismissed popup in this session (temporary)')
      console.log('[ReviewTrigger] sessionStorage flag:', dismissedThisSession)
      console.log('[ReviewTrigger] Will show again on next visit/new tab')
      return
    }

    // All checks passed - show popup (database said no review exists)
    console.log('========================================')
    console.log('[ReviewTrigger] ✅ ALL CHECKS PASSED')
    console.log('[ReviewTrigger] No database review, no session dismissal')
    console.log('[ReviewTrigger] Will show popup in 2 seconds')
    console.log('========================================')

    const timer = setTimeout(() => {
      console.log('========================================')
      console.log('[ReviewTrigger] 🎉 SHOWING REVIEW POPUP NOW')
      console.log('========================================')
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
    displayPreference: 'anonymous' | 'first_name_module'
  }) => {
    console.log('[ReviewTrigger] handleSubmitReview called')
    console.log('[ReviewTrigger] Submitting review for order:', orderId)
    console.log('[ReviewTrigger] Rating:', data.rating)

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

    console.log('[ReviewTrigger] API response status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('[ReviewTrigger] ❌ API returned error:', error)
      throw new Error(error.error || 'Failed to submit review')
    }

    console.log('[ReviewTrigger] ✅ Review submission successful')
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
