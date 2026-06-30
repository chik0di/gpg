'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function PendingOrderBanner() {
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has any pending orders
    console.log('[pending-order-banner] Fetching pending orders...')
    fetch('/api/pending-orders/check')
      .then(res => {
        console.log('[pending-order-banner] API response status:', res.status)
        return res.json()
      })
      .then(data => {
        console.log('[pending-order-banner] API response data:', data)
        if (data.hasPendingOrder) {
          console.log('[pending-order-banner] Setting pending order ID:', data.pendingOrderId)
          setPendingOrderId(data.pendingOrderId)
          console.log('[pending-order-banner] Link will be: /checkout?pending=' + data.pendingOrderId)
        } else {
          console.log('[pending-order-banner] No pending order found')
        }
      })
      .catch(err => {
        console.error('[pending-order-banner] Failed to check pending orders:', err)
      })
  }, [])

  if (!pendingOrderId || dismissed) {
    return null
  }

  return (
    <div
      className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6"
      style={{ boxShadow: '0 2px 8px -2px rgba(251, 191, 36, 0.15)' }}
    >
      <div className="shrink-0 mt-0.5">
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-amber-900 text-sm mb-1">
          You have an order in progress
        </h3>
        <p className="text-sm text-amber-700 mb-3">
          It looks like you started an order but didn't complete the payment. Your order details have been saved for you.
        </p>
        <Link
          href={`/checkout?pending=${pendingOrderId}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
        >
          Continue to checkout
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
