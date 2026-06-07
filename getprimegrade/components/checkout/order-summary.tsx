'use client'

import { useSearchParams } from 'next/navigation'

export default function OrderSummary() {
  const params = useSearchParams()
  const orderId = params.get('orderId')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
      <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Order ID</span>
          <span className="font-mono text-gray-700">{orderId?.slice(0, 8) ?? '—'}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span className="text-gray-700">—</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span>—</span>
        </div>
      </div>

      <div className="mt-6 space-y-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secure payment via Stripe
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Money-back guarantee
        </div>
      </div>
    </div>
  )
}
