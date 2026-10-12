'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import ShareButton from '@/components/shared/share-button'

type State = 'loading' | 'success' | 'error'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [state, setState]   = useState<State>('loading')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errMsg, setErrMsg]   = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent')
    if (!paymentIntent) {
      setState('error')
      setErrMsg('No payment reference was provided. Check your orders or contact support before paying again.')
      return
    }
    const controller = new AbortController()
    setState('loading')
    async function confirm() {
      const form = new FormData()
      form.set('paymentIntentId', paymentIntent!)
      // Only older payments need this fallback. Current checkouts use the server snapshot.
      try {
        const raw = sessionStorage.getItem('gpg_pending_order')
        if (raw) form.set('orderData', raw)
        const rawFile = sessionStorage.getItem('gpg_pending_file')
        if (rawFile) {
          const file = JSON.parse(rawFile)
          const bytes = Uint8Array.from(atob(file.data), char => char.charCodeAt(0))
          form.set('file', new Blob([bytes], { type: file.type }), file.name)
        }
      } catch { /* A missing browser backup never prevents server recovery. */ }
      for (let poll = 0; poll < 12; poll++) {
        const response = await fetch('/api/orders/create', { method: 'POST', body: form, signal: controller.signal })
        const result = await response.json()
        if (response.ok && response.status !== 202 && result.orderId) {
          if (controller.signal.aborted) return
          try {
            sessionStorage.removeItem('gpg_pending_order')
            sessionStorage.removeItem('gpg_pending_file')
            sessionStorage.removeItem('gpg_checkout_session')
          } catch { /* Confirmation is independent of browser storage. */ }
          setOrderId(result.orderId)
          setState('success')
          return
        }
        if (response.status !== 202 && (response.status !== 503 || poll >= 3))
          throw new Error(result.error ?? 'Confirmation is unavailable. Check your orders or contact support before paying again.')
        await new Promise(resolve => setTimeout(resolve, 1500))
        if (controller.signal.aborted) return
      }
      throw new Error('Payment confirmation is taking longer than usual. Retry confirmation or check your orders before paying again.')
    }
    confirm().catch(error => {
      if (controller.signal.aborted) return
      setState('error')
      setErrMsg(error instanceof TypeError ? 'Connection interrupted. Retry confirmation or contact support before making another payment.' : error.message)
    })
    return () => controller.abort()
  }, [searchParams, attempt])

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
        <h2 className="text-xl font-semibold text-[#1B2E4B] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#6B7280] mb-6 max-w-sm mx-auto">{errMsg}</p>
        <p className="text-xs text-[#64748B] mb-4 break-all">Payment reference: {searchParams.get('payment_intent') ?? 'Unavailable'}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)} className="ui-button-primary mb-4">Retry confirmation</button>
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

      <h1 className="text-2xl font-bold text-[#1B2E4B] mb-2">Order confirmed!</h1>
      <p className="text-[#6B7280] text-sm leading-relaxed mb-2 max-w-sm mx-auto">
        Your payment was successful and your order is now with our team.
        We&apos;ll get to work right away.
      </p>

      {orderId && (
        <p className="text-xs text-[#64748B] mb-8 font-mono">
          Order #{orderId.slice(0, 8).toUpperCase()}
        </p>
      )}

      {/* What happens next */}
      <div
        className="text-left rounded-2xl border border-[#E8E2D9] p-5 mb-6 space-y-3"
        style={{ background: '#F5F0E8' }}
      >
        <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-3">What happens next</p>
        {[
          { step: '1', text: 'Our team reviews your brief and begins work immediately.' },
          { step: '2', text: 'You\'ll receive an email update when your work is ready to download.' },
          { step: '3', text: 'Download it from your dashboard. 3 free revisions if needed.' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold text-white shrink-0 mt-0.5"
              style={{ background: '#E8A020' }}
            >
              {step}
            </span>
            <p className="text-sm text-[#6B7280]">{text}</p>
          </div>
        ))}
      </div>

      {/* Share section */}
      <div className="text-center mb-8">
        <p className="text-sm text-[#6B7280] mb-3">Share GetPrimeGrade with a friend.</p>
        <ShareButton variant="button" />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/dashboard/orders"
          className="ui-button-primary hover:bg-[#16253d]"
        >
          View my orders
        </Link>
        <Link
          href="/order"
          className="text-sm font-semibold text-[#64748B] hover:text-[#1B2E4B] transition-colors"
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
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/gpg-logo-transparent.png"
              alt="GetPrimeGrade"
              width={40}
              height={40}
              className="w-10 h-10"
              priority
            />
            <span className="font-bold text-lg tracking-tight text-[#1B2E4B]">GetPrimeGrade</span>
          </Link>
        </div>

        <div
          className="bg-white rounded-2xl border border-[#E8E2D9] p-8"
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
