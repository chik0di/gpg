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
      const downloadLink = target.closest('a[download]') as HTMLAnchorElement | null

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
        const isCompletedDownload = downloadLink.textContent?.toLowerCase().includes('completed work')

        console.log('[ReviewTrigger] Download link analysis:', {
          textContent: downloadLink.textContent,
          isCompletedDownload
        })

        if (isCompletedDownload) {
          console.log('[ReviewTrigger] TRIGGERING REVIEW POPUP immediately (preventing default download)')

          // Prevent the default download behavior
          e.preventDefault()
          e.stopPropagation()

          // Store the download URL to trigger after popup is shown
          const downloadUrl = href

          // Show popup immediately
          console.log('[ReviewTrigger] Setting showReviewPopup to true NOW')
          setShowReviewPopup(true)

          // Trigger the download after a small delay to ensure popup renders
          if (downloadUrl) {
            setTimeout(() => {
              console.log('[ReviewTrigger] Starting download programmatically:', downloadUrl)
              const a = document.createElement('a')
              a.href = downloadUrl
              a.download = ''
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              console.log('[ReviewTrigger] Download initiated')
            }, 500)
          }
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
