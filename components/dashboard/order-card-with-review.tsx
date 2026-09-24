'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types/order'
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

  const label = ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status
  const color = ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? 'bg-gray-100 text-gray-600'

  const deadline = new Date(order.deadline).toLocaleDateString('en-GB', { dateStyle: 'medium' })
  const placed   = new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })
  const total    = `£${order.total_amount % 1 === 0 ? order.total_amount : order.total_amount.toFixed(2)}`

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
    displayPreference: 'anonymous' | 'first_name' | 'first_name_module'
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
      <Link href={`/dashboard/orders/${order.id}`} className="block group">
        <div
          className="bg-white rounded-2xl border border-[#E8E2D9] px-5 py-4 flex items-center gap-4 group-hover:border-[#E8A020]/40 group-hover:shadow-[0_4px_16px_-2px_rgba(26,26,46,0.08)] transition-all duration-200"
        >
          {/* Status dot */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
            style={{
              background:
                order.status === 'completed' ? '#16A34A'
                : order.status === 'in_progress' ? '#3B82F6'
                : '#E8A020',
            }}
          />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1B2E4B] truncate">
              {order.module_name || moduleName || order.subject_field}
              <span className="font-normal text-[#9CA3AF] ml-2">· {order.academic_level}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-[#9CA3AF]">
                Placed {placed} · Due {deadline}
              </p>

              {/* Review indicator - only shown if completed, no review, not permanently dismissed */}
              {showReviewIndicator && (
                <button
                  onClick={handleReviewClick}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Leave a review
                </button>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-sm font-extrabold text-[#1B2E4B]">{total}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold ${color}`}>
              {label}
            </span>
          </div>

          {/* Arrow */}
          <svg className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#E8A020] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

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
