'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Client component that tracks referral codes from URL parameters
 * Checks for ?ref=XXXXXX and stores it in a cookie via API call
 */
export default function ReferralTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const refCode = searchParams.get('ref')

    if (refCode && refCode.length === 6) {
      // Track the referral by setting cookie via API
      fetch('/api/referral/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: refCode }),
      }).catch((err) => {
        console.error('[referral-tracker] failed to track referral:', err)
      })
    }
  }, [searchParams])

  return null // This component renders nothing
}
