'use client'

import { useState } from 'react'
import ReviewPopup from '@/components/reviews/review-popup'

interface DownloadWithReviewProps {
  orderId: string
  moduleName: string | null
  downloadUrl: string
  onReviewSubmitted?: () => void
}

export default function DownloadWithReview({
  orderId,
  moduleName,
  downloadUrl,
  onReviewSubmitted,
}: DownloadWithReviewProps) {
  const [showReviewPopup, setShowReviewPopup] = useState(false)
  const [checkingReview, setCheckingReview] = useState(false)

  // DEBUG: Log on component mount
  console.log('========================================')
  console.log('[DownloadWithReview] 🔧 COMPONENT MOUNTED')
  console.log('[DownloadWithReview] Order ID:', orderId)
  console.log('[DownloadWithReview] Module name:', moduleName)
  console.log('[DownloadWithReview] Download URL exists:', !!downloadUrl)
  console.log('[DownloadWithReview] Download URL:', downloadUrl?.substring(0, 100) + '...')
  console.log('[DownloadWithReview] Component rendered - waiting for user to click download')
  console.log('========================================')

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    console.log('========================================')
    console.log('[DownloadWithReview] 📥 DOWNLOAD CLICKED')
    console.log('[DownloadWithReview] Order ID:', orderId)
    console.log('========================================')

    // Check if review popup should be shown
    // Don't prevent the download - let it proceed normally
    // But check if we should show the review popup after

    // Check localStorage first (quick check)
    const alreadyReviewed = localStorage.getItem(`reviewed_order_${orderId}`)
    if (alreadyReviewed) {
      console.log('[DownloadWithReview] ✅ User already reviewed this order (localStorage)')
      console.log('[DownloadWithReview] Not showing review popup')
      return // Let download proceed without popup
    }

    // Check database for existing review
    setCheckingReview(true)
    try {
      console.log('[DownloadWithReview] 🔍 Checking database for existing review...')
      const response = await fetch(`/api/reviews/check?orderId=${orderId}`)

      if (response.ok) {
        const { hasReview } = await response.json()
        console.log('[DownloadWithReview] Database check result:', { hasReview })

        if (hasReview) {
          console.log('[DownloadWithReview] ✅ Review exists in database')
          console.log('[DownloadWithReview] Not showing review popup')
          // Sync localStorage with database truth
          localStorage.setItem(`reviewed_order_${orderId}`, 'true')
        } else {
          console.log('[DownloadWithReview] ❌ No review exists')
          console.log('[DownloadWithReview] 🎉 SHOWING REVIEW POPUP')
          setShowReviewPopup(true)
        }
      } else {
        console.error('[DownloadWithReview] ⚠️ Failed to check review status')
        // Don't show popup if we can't verify - better to miss one prompt than annoy user
      }
    } catch (error) {
      console.error('[DownloadWithReview] ❌ Error checking review:', error)
      // Don't show popup on error
    } finally {
      setCheckingReview(false)
    }
  }

  const handleReviewSubmit = async (data: {
    rating: number
    reviewText: string
    displayPreference: 'anonymous' | 'first_name' | 'first_name_module'
  }) => {
    console.log('[DownloadWithReview] Submitting review for order:', orderId)

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

    console.log('[DownloadWithReview] ✅ Review submitted successfully')

    // Set permanent flag
    localStorage.setItem(`reviewed_order_${orderId}`, 'true')

    // Notify parent if callback provided
    if (onReviewSubmitted) {
      onReviewSubmitted()
    }
  }

  const handleDismiss = () => {
    console.log('[DownloadWithReview] Review popup dismissed without submission')
    console.log('[DownloadWithReview] NOT setting permanent flag')
    console.log('[DownloadWithReview] User will see "Leave a review" indicator in dashboard')
    setShowReviewPopup(false)

    // Do NOT set any localStorage flag
    // The dashboard will show a "Leave a review" link for this order
  }

  return (
    <>
      <a
        href={downloadUrl}
        download
        onClick={handleDownloadClick}
        className="flex items-center gap-3 bg-[#F0FDF4] border border-[#86EFAC] rounded-2xl px-5 py-4 hover:bg-[#DCFCE7] transition-colors"
      >
        <svg className="w-5 h-5 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <div>
          <p className="text-sm font-bold text-[#16A34A]">Download your completed work</p>
          <p className="text-xs text-[#4ADE80] mt-0.5">Your model answer is ready</p>
        </div>
      </a>

      {showReviewPopup && (
        <ReviewPopup
          orderId={orderId}
          moduleName={moduleName}
          onClose={handleDismiss}
          onSubmit={handleReviewSubmit}
        />
      )}
    </>
  )
}
