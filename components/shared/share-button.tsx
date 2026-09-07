'use client'

import { useState } from 'react'

interface ShareButtonProps {
  variant?: 'button' | 'link'
  className?: string
}

export default function ShareButton({ variant = 'button', className = '' }: ShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleShare = async () => {
    const shareData = {
      title: 'GetPrimeGrade',
      text: 'Need help with your assignment? Check out GetPrimeGrade — expert study materials delivered before your deadline.',
      url: 'https://getprimegrade.com'
    }

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled or share failed — do nothing
        console.log('Share cancelled or failed')
      }
    } else {
      // Fallback to clipboard (desktop)
      try {
        await navigator.clipboard.writeText(shareData.url)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy to clipboard', err)
      }
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B2E4B] hover:text-[#E8A020] transition-colors ${className}`}
      >
        {isCopied ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Link copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share with a friend
          </>
        )}
      </button>
    )
  }

  // Button variant
  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 bg-transparent border-2 border-[#E8A020] text-[#E8A020] hover:bg-[#E8A020] hover:text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors ${className}`}
    >
      {isCopied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Link copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </>
      )}
    </button>
  )
}
