'use client'

import { useState, useEffect } from 'react'
import OrderCard from '@/components/dashboard/order-card'
import ReviewPopup from '@/components/reviews/review-popup'

interface Props {
  order: {
    id: string
    subject_field: string
    academic_level: string
    deadline: string
    status: string
    total_amount: number
    created_at: string
    module_name?: string | null
  }
  moduleName?: string | null
}

export default function OrderCardWithReview({ order, moduleName = null }: Props) {
  const [showReviewIndicator, setShowReviewIndicator] = useState(false)
  const [showReviewPopup, setShowReviewPopup] = useState(false)
  const [checkingReview, setCheckingReview] = useState(true)

  // Check if review indicator should be shown
  useEffect(() => {
    async function checkReviewStatus() {
      console.log('========================================')
      console.log(`[OrderCard] 🔧 CHECKING REVIEW STATUS`)
      console.log(`[OrderCard] Order ID:`, order.id)
      console.log(`[OrderCard] Order status (raw):`, JSON.stringify(order.status))
      console.log(`[OrderCard] Order status === "completed":`, order.status === 'completed')
      console.log(`[OrderCard] Module name:`, order.module_name || moduleName || order.subject_field)
      console.log('========================================')

      // Only show for completed orders
      if (order.status !== 'completed') {
        console.log(`[OrderCard ${order.id}] ❌ Not completed - status is:`, order.status)
        setCheckingReview(false)
        return
      }

      console.log(`[OrderCard ${order.id}] ✅ Order is completed, checking localStorage...`)

      // Check localStorage for permanent dismissal
      const permanentlyReviewed = localStorage.getItem(`reviewed_order_${order.id}`)
      console.log(`[OrderCard ${order.id}] localStorage key:`, `reviewed_order_${order.id}`)
      console.log(`[OrderCard ${order.id}] localStorage value:`, permanentlyReviewed)

      if (permanentlyReviewed) {
        console.log(`[OrderCard ${order.id}] ✅ Already reviewed (localStorage) - hiding indicator`)
        setShowReviewIndicator(false)
        setCheckingReview(false)
        return
      }

      console.log(`[OrderCard ${order.id}] ❌ No localStorage flag, checking database...`)

      // Check database for existing review
      try {
        console.log(`[OrderCard ${order.id}] 🌐 Calling API: /api/reviews/check?orderId=${order.id}`)
        const response = await fetch(`/api/reviews/check?orderId=${order.id}`)
        console.log(`[OrderCard ${order.id}] API response status:`, response.status, response.statusText)

        if (response.ok) {
          const { hasReview } = await response.json()
          console.log(`[OrderCard ${order.id}] API returned hasReview:`, hasReview)

          if (hasReview) {
            console.log(`[OrderCard ${order.id}] ✅ Review exists - syncing localStorage and hiding indicator`)
            // Sync localStorage with database
            localStorage.setItem(`reviewed_order_${order.id}`, 'true')
            setShowReviewIndicator(false)
          } else {
            console.log(`[OrderCard ${order.id}] 🎉 NO REVIEW - SHOWING "Leave a review" INDICATOR`)
            // No review exists - show indicator
            setShowReviewIndicator(true)
          }
        } else {
          console.error(`[OrderCard ${order.id}] ⚠️ API error - response not OK`)
          setShowReviewIndicator(false)
        }
      } catch (error) {
        console.error(`[OrderCard ${order.id}] ❌ Error checking review:`, error)
        // Don't show indicator on error
        setShowReviewIndicator(false)
      } finally {
        console.log(`[OrderCard ${order.id}] Final showReviewIndicator state will be set`)
        setCheckingReview(false)
      }
    }

    checkReviewStatus()
  }, [order.id, order.status])

  const handleReviewClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('[OrderCard] Opening review popup for order:', order.id)
    setShowReviewPopup(true)
  }

  const handleReviewSubmit = async (data: {
    rating: number
    reviewText: string
    displayPreference: 'anonymous' | 'first_name_module'
  }) => {
    const response = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        rating: data.rating,
        reviewText: data.reviewText,
        displayPreference: data.displayPreference,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to submit review')
    }

    // Set permanent flag
    localStorage.setItem(`reviewed_order_${order.id}`, 'true')

    // Hide indicator
    setShowReviewIndicator(false)
    setShowReviewPopup(false)
  }

  const handleDismiss = () => {
    console.log('[OrderCard] Review popup dismissed - indicator remains visible')
    setShowReviewPopup(false)
    // Keep indicator visible - user can click it again later
  }

  return (
    <>
      <OrderCard order={{ ...order, module_name: order.module_name || moduleName }}>
        {showReviewIndicator && <button type="button" onClick={handleReviewClick} className="ui-link text-sm">Leave a review</button>}
      </OrderCard>

      {showReviewPopup && (
        <ReviewPopup
          orderId={order.id}
          moduleName={moduleName}
          onClose={handleDismiss}
          onSubmit={handleReviewSubmit}
        />
      )}
    </>
  )
}
