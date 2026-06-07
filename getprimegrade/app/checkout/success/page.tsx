'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import type { OrderFormState } from '@/types/order-form'

type State = 'loading' | 'success' | 'error'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [state, setState]   = useState<State>('loading')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errMsg, setErrMsg]   = useState<string | null>(null)
  const ran = useRef(false)  // prevent double-fire in React StrictMode

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const redirectStatus = searchParams.get('redirect_status')
    const paymentIntent  = searchParams.get('payment_intent')

    if (redirectStatus !== 'succeeded' || !paymentIntent) {
      setState('error')
      setErrMsg('Payment was not completed. No charge has been made.')
      return
    }

    const raw = sessionStorage.getItem('gpg_pending_order')
    if (!raw) {
      // Likely a page refresh after order was already created
      setState('success')
      return
    }

    let orderData: OrderFormState
    try {
      orderData = JSON.parse(raw)
    } catch {
      setState('error')
      setErrMsg('Order data could not be read. Please contact support.')
      return
    }

    // Build a multipart request so the file is sent as binary (not JSON/base64)
    const form = new FormData()
    form.append('paymentIntentId', paymentIntent)
    form.append('orderData', JSON.stringify(orderData))

    const rawFile = sessionStorage.getItem('gpg_pending_file')
    if (rawFile) {
      try {
        const { data: b64, name, type } = JSON.parse(rawFile) as {
          data: string; name: string; type: string
        }
        const binary = atob(b64)
        const bytes  = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: type || 'application/octet-stream' })
        form.append('file', blob, name)
      } catch {
        // File could not be decoded — order proceeds without the file attachment
        console.error('[success] could not decode file from session storage')
      }
    }

    fetch('/api/orders/create', { method: 'POST', body: form })
      .then((r) => r.json())
      .then(({ orderId, error }) => {
        if (error || !orderId) {
          setState('error')
          setErrMsg('Your payment was successful but we couldn\'t record your order. Please contact admin@getprimegrade.com with your payment reference.')
          return
        }
        sessionStorage.removeItem('gpg_pending_order')
        sessionStorage.removeItem('gpg_pending_file')
        setOrderId(orderId)
        setState('success')
      })
      .catch(() => {
        setState('error')
        setErrMsg('Network error. Your payment may have gone through — please contact support before trying again.')
      })
  }, [searchParams])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <svg className="w-10 h-10 animate-spin text-[#E8A020]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-semibold text-[#6B7280]">Confirming your order…</p>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1B2E4B] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#6B7280] mb-6 max-w-sm mx-auto">{errMsg}</p>
        <a
          href="mailto:admin@getprimegrade.com"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#E8A020] hover:text-[#C4861A] transition-colors"
        >
          Contact support
        </a>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────
  return (
    <div className="text-center py-4">
      {/* Checkmark */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ background: '#F0FDF4' }}
      >
        <svg className="w-8 h-8 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-extrabold text-[#1B2E4B] mb-2">Order confirmed!</h1>
      <p className="text-[#6B7280] text-sm leading-relaxed mb-2 max-w-sm mx-auto">
        Your payment was successful and your order is now with our team.
        We&apos;ll get to work right away.
      </p>

      {orderId && (
        <p className="text-xs text-[#9CA3AF] mb-8 font-mono">
          Order #{orderId.slice(0, 8).toUpperCase()}
        </p>
      )}

      {/* What happens next */}
      <div
        className="text-left rounded-2xl border border-[#E8E2D9] p-5 mb-8 space-y-3"
        style={{ background: '#F5F0E8' }}
      >
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wide mb-3">What happens next</p>
        {[
          { step: '1', text: 'Our team reviews your brief and begins work immediately.' },
          { step: '2', text: 'You\'ll receive an email update when your work is ready to download.' },
          { step: '3', text: 'Download it from your dashboard. 3 free revisions if needed.' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-extrabold text-white shrink-0 mt-0.5"
              style={{ background: '#E8A020' }}
            >
              {step}
            </span>
            <p className="text-sm text-[#6B7280]">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          View my orders
        </Link>
        <Link
          href="/order"
          className="text-sm font-semibold text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors"
        >
          Place another order
        </Link>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F5F0E8' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: '#1B2E4B' }}>G</span>
            <span className="font-extrabold text-lg tracking-tight text-[#1B2E4B]">GetPrimeGrade</span>
          </Link>
        </div>

        <div
          className="bg-white rounded-3xl border border-[#E8E2D9] p-8"
          style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.10)' }}
        >
          <Suspense fallback={
            <div className="flex justify-center py-8">
              <svg className="w-8 h-8 animate-spin text-[#E8A020]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          }>
            <SuccessContent />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
