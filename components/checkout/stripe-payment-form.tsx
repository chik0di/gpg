'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setProcessing(false)
    }
    // On success Stripe redirects to /checkout/success
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <h2 className="font-semibold text-gray-900">Payment details</h2>
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        {processing ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  )
}

export default function StripePaymentForm() {
  const params = useSearchParams()
  const orderId = params.get('orderId')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  async function initPayment() {
    if (fetched || !orderId) return
    setLoading(true)
    const res = await fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
    const { clientSecret: secret } = await res.json()
    setClientSecret(secret)
    setFetched(true)
    setLoading(false)
  }

  if (!orderId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
        No order found. Please start a new order.
      </div>
    )
  }

  if (!fetched) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <button
          onClick={initPayment}
          disabled={loading}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Proceed to payment'}
        </button>
      </div>
    )
  }

  if (!clientSecret) return null

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm />
    </Elements>
  )
}
