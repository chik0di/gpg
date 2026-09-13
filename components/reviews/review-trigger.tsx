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
    console.log('[ReviewTrigger] Component mounted:', { orderId, isCompleted })

    if (!isCompleted) {
      console.log('[ReviewTrigger] Order not completed, skipping review trigger')
      return
    }

    // Check if user has already been prompted for this order
    const hasReviewed = localStorage.getItem(`reviewed_order_${orderId}`)
    console.log('[ReviewTrigger] localStorage check:', { orderId, hasReviewed })

    if (hasReviewed) {
      console.log('[ReviewTrigger] User already reviewed this order, skipping popup')
      return
    }

    // Listen for download events
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const downloadLink = target.closest('a[download]')

      console.log('[ReviewTrigger] Click detected:', {
        target: target.tagName,
        downloadLink: downloadLink ? 'found' : 'not found',
        href: downloadLink?.getAttribute('href')
      })

      if (downloadLink) {
        const href = downloadLink.getAttribute('href')
        console.log('[ReviewTrigger] Download link clicked, checking href:', {
          href,
          includesCompleted: href?.includes('completed'),
          includesOrderFiles: href?.includes('order-files')
        })

        // Check if this is the completed work download link
        // The href will be a signed Supabase URL, so we check if it contains 'order-files'
        // and look for a data attribute or check the parent element
        const isCompletedDownload = downloadLink.textContent?.toLowerCase().includes('completed work')

        console.log('[ReviewTrigger] Download link analysis:', {
          textContent: downloadLink.textContent,
          isCompletedDownload
        })

        if (isCompletedDownload) {
          console.log('[ReviewTrigger] TRIGGERING REVIEW POPUP after 1s delay')
          // Show review popup after a short delay to let download start
          setTimeout(() => {
            console.log('[ReviewTrigger] Setting showReviewPopup to true')
            setShowReviewPopup(true)
          }, 1000)
        } else {
          console.log('[ReviewTrigger] Not completed download link, ignoring')
        }
      }
    }

    console.log('[ReviewTrigger] Adding click event listener')
    document.addEventListener('click', handleClick)
    return () => {
      console.log('[ReviewTrigger] Removing click event listener')
      document.removeEventListener('click', handleClick)
    }
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
