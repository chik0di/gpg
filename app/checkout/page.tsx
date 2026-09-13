'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  calcOrderTotal,
  calcWrittenPrice,
  calcPresentationPrice,
  presentationLabel,
  getPracticalPrice,
  getAcademicMultiplier,
  getDeadlineMultiplier,
  getAcademicLevelAdjLabel,
  getDeadlinePremiumLabel,
  WORDS_PER_PAGE,
  ORIGINALITY_REPORT_PRICE,
  PRACTICAL_ITEMS,
  PRICE_PER_SLIDE,
} from '@/lib/pricing'
import { fmtInCurrency, getCurrencyDisplayName } from '@/lib/currency'
import type { OrderFormState, Deliverable } from '@/types/order-form'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ── Helpers ────────────────────────────────────────────────────────────────

function deliverableBasePrice(d: Deliverable): number {
  if (d.type === 'written') {
    const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return calcWrittenPrice(pages)
  }
  if (d.type === 'presentation') {
    const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
    return calcPresentationPrice(slideCount)
  }
  if (d.type === 'practical')    return getPracticalPrice(d.practicalKey)
  return 0
}

function deliverableLabel(d: Deliverable): string {
  if (d.type === 'written') {
    const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return `Written — ${pages} page${pages !== 1 ? 's' : ''}`
  }
  if (d.type === 'presentation') {
    if (d.slideInputMode === 'exact') {
      return `Presentation — ${presentationLabel(d.slideCount)}`
    } else {
      return `Presentation — ${d.slideMin}–${d.slideMax} slides × £${PRICE_PER_SLIDE.toFixed(2)} (charged at ${d.slideMax})`
    }
  }
  if (d.type === 'practical') {
    return `Practical — ${PRACTICAL_ITEMS.find((p) => p.key === d.practicalKey)?.label ?? ''}`
  }
  return 'Deliverable'
}

// GBP formatter for pay button (always charged in GBP)
function fmtGBP(n: number): string {
  return `£${n % 1 === 0 ? n : n.toFixed(2)}`
}

// ── Stripe inner form ──────────────────────────────────────────────────────

function StripeForm({ grandTotalGBP }: { grandTotalGBP: number }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || processing) return // Prevent double-click

    setProcessing(true)
    setError(null)

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    })

    // Only reaches here on error — success causes a browser redirect
    if (stripeErr) {
      setError(stripeErr.message ?? 'Payment failed. Please try again.')
      setProcessing(false) // Re-enable button on error
    }
    // On success, browser redirects - button stays disabled
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
        <h2 className="text-base font-bold text-[#1B2E4B] mb-5">Payment details</h2>
        <PaymentElement />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold text-base py-4 rounded-2xl transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing…
          </>
        ) : (
          <>
            Pay {fmtGBP(grandTotalGBP)}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>

      <p className="text-center text-xs text-[#9CA3AF] mt-2">Charged in GBP</p>

      <div className="flex items-center justify-center gap-2 text-xs text-[#9CA3AF]">
        <svg className="w-3.5 h-3.5 text-[#9CA3AF]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Secure payment processed by Stripe
      </div>
    </form>
  )
}

// ── Order summary sidebar ──────────────────────────────────────────────────

function OrderSummary({ data }: {
  data: OrderFormState
}) {
  const selectedCurrency = data.selectedCurrency ?? 'GBP'
  const exchangeRate     = data.exchangeRate ?? 1
  const fmt = (gbpAmt: number) => fmtInCurrency(gbpAmt, exchangeRate, selectedCurrency)

  const subtotal     = data.deliverables.reduce((s, d) => s + deliverableBasePrice(d), 0)
  const levelMult    = getAcademicMultiplier(data.academicLevel)
  const deadlineMult = getDeadlineMultiplier(data.deadline)
  const levelLabel   = getAcademicLevelAdjLabel(data.academicLevel)
  const urgencyLabel = getDeadlinePremiumLabel(data.deadline)

  const levelAdjTotal   = subtotal * (levelMult - 1)               // negative for A-Level
  const urgencyAdjTotal = subtotal * levelMult * (deadlineMult - 1) // always ≥ 0
  const { total }       = calcOrderTotal({
    deliverableSubtotal:      subtotal,
    academicLevel:            data.academicLevel,
    deadline:                 data.deadline,
    includeOriginalityReport: data.includeOriginalityReport,
  })

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden lg:sticky top-24" style={{ boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)' }}>
      <div className="bg-[#F5F0E8] px-5 py-3 border-b border-[#E8E2D9]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Order summary</p>
          {selectedCurrency !== 'GBP' && (
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
              {getCurrencyDisplayName(selectedCurrency)} ({selectedCurrency})
            </span>
          )}
        </div>
      </div>

      {/* Deliverables at base price */}
      <div className="divide-y divide-[#F5F0E8] px-5">
        {data.deliverables.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 py-2.5 min-w-0">
            <p className="text-sm text-[#1A1A2E] min-w-0 flex-1 truncate">{deliverableLabel(d)}</p>
            <p className="text-sm font-bold text-[#1B2E4B] shrink-0">{fmt(deliverableBasePrice(d))}</p>
          </div>
        ))}
      </div>

      {/* Adjustment lines */}
      {(levelMult !== 1 || deadlineMult !== 1) && (
        <div className="border-t border-[#E8E2D9] px-5 py-2 space-y-1.5">
          {levelMult !== 1 && levelLabel && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9CA3AF]">{levelLabel}</p>
              <p
                className="text-xs font-semibold ml-3 shrink-0"
                style={{ color: levelMult > 1 ? '#C4861A' : '#16A34A' }}
              >
                {levelMult > 1 ? '+' : '−'}{fmt(Math.abs(levelAdjTotal))}
              </p>
            </div>
          )}
          {deadlineMult !== 1 && urgencyLabel && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#9CA3AF]">{urgencyLabel}</p>
              <p className="text-xs font-semibold text-[#C4861A] ml-3 shrink-0">+{fmt(urgencyAdjTotal)}</p>
            </div>
          )}
        </div>
      )}

      {/* Originality report */}
      {data.includeOriginalityReport && (
        <div className="border-t border-[#E8E2D9] px-5 py-2.5 flex items-center justify-between">
          <p className="text-sm text-[#1A1A2E]">Originality &amp; AI Detection Report</p>
          <p className="text-sm font-bold text-[#1B2E4B] ml-3 shrink-0">+{fmt(ORIGINALITY_REPORT_PRICE)}</p>
        </div>
      )}

      {/* Grand total */}
      <div className="border-t border-[#E8E2D9] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#1B2E4B]">Total</p>
            {selectedCurrency !== 'GBP' && (
              <p className="text-[0.65rem] text-[#9CA3AF] mt-0.5">Approx. {selectedCurrency} equivalent</p>
            )}
          </div>
          <p className="text-xl font-extrabold text-[#1B2E4B]">{fmt(total)}</p>
        </div>

        {/* GBP charge amount for non-GBP currencies */}
        {selectedCurrency !== 'GBP' && (
          <div className="mt-3 pt-3 border-t border-[#F5F0E8]">
            <p className="text-xs font-semibold text-[#1B2E4B]">
              You will be charged {fmtGBP(total)} GBP
            </p>
            <p className="text-[0.65rem] text-[#9CA3AF] mt-0.5">
              This is the amount that will appear on your bank statement
            </p>
          </div>
        )}
      </div>

      {/* Order meta */}
      <div className="border-t border-[#F5F0E8] px-5 py-4 space-y-1.5">
        {[
          { label: 'Subject', value: data.subjectField },
          { label: 'Level', value: data.academicLevel },
          {
            label: 'Deadline',
            value: data.deadline
              ? new Date(data.deadline).toLocaleDateString('en-GB', { dateStyle: 'medium' })
              : '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]">{label}</span>
            <span className="text-[#6B7280] font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main checkout page ─────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const pendingOrderId = searchParams.get('pending')

  const [orderData, setOrderData]         = useState<OrderFormState | null>(null)
  const [clientSecret, setClientSecret]   = useState<string | null>(null)
  const [initError, setInitError]         = useState<string | null>(null)
  // Decoded File held in memory — the actual upload happens after payment succeeds
  const [pendingFile, setPendingFile]     = useState<File | null>(null)

  useEffect(() => {
    console.log('========================================')
    console.log('[checkout] 🚀 CHECKOUT PAGE LOADED')
    console.log('[checkout] Full URL:', window.location.href)
    console.log('[checkout] Search params:', window.location.search)
    console.log('[checkout] Pending order ID from URL:', pendingOrderId)
    console.log('========================================')

    async function loadOrderData() {
      let data: OrderFormState | null = null
      let fileData: string | null = null

      // PRIORITY 1: Fetch from database if pending order ID is provided
      if (pendingOrderId) {
        console.log('----------------------------------------')
        console.log('[checkout] 📡 FETCHING PENDING ORDER FROM DATABASE')
        console.log('[checkout] Pending order ID:', pendingOrderId)
        console.log('[checkout] Full API URL:', `/api/pending-orders/${pendingOrderId}`)
        console.log('[checkout] Request timestamp:', new Date().toISOString())
        console.log('----------------------------------------')

        try {
          const apiUrl = `/api/pending-orders/${pendingOrderId}`
          const res = await fetch(apiUrl)

          console.log('----------------------------------------')
          console.log('[checkout] 📥 API RESPONSE RECEIVED')
          console.log('[checkout] Status code:', res.status)
          console.log('[checkout] Status text:', res.statusText)
          console.log('[checkout] Response OK:', res.ok)
          console.log('[checkout] Response headers:', Object.fromEntries(res.headers.entries()))
          console.log('----------------------------------------')

          if (res.ok) {
            const responseData = await res.json()
            console.log('----------------------------------------')
            console.log('[checkout] ✅ SUCCESS - Order data retrieved')
            console.log('[checkout] Response data:', JSON.stringify(responseData, null, 2))
            console.log('[checkout] Order data keys:', responseData.orderData ? Object.keys(responseData.orderData) : 'null')
            console.log('[checkout] File data present:', !!responseData.fileData)
            console.log('----------------------------------------')

            data = responseData.orderData
            fileData = responseData.fileData

            // Save to sessionStorage as backup
            sessionStorage.setItem('gpg_pending_order', JSON.stringify(data))
            if (fileData) {
              sessionStorage.setItem('gpg_pending_file', fileData)
            }
          } else {
            // Capture full error details
            const errorText = await res.text()
            let errorJson: any = null
            try {
              errorJson = JSON.parse(errorText)
            } catch {
              // Not JSON, just text
            }

            console.error('========================================')
            console.error('[checkout] ❌ FAILED TO FETCH PENDING ORDER')
            console.error('[checkout] Status code:', res.status)
            console.error('[checkout] Status text:', res.statusText)
            console.error('[checkout] Error response body (text):', errorText)
            console.error('[checkout] Error response body (parsed JSON):', errorJson)
            console.error('[checkout] Pending order ID that failed:', pendingOrderId)
            console.error('[checkout] Full request URL:', apiUrl)
            console.error('[checkout] Current user authentication status: checking...')
            console.error('[checkout] Timestamp:', new Date().toISOString())
            console.error('========================================')
            console.error('[checkout] ⚠️  Will now fallback to sessionStorage...')
          }
        } catch (err) {
          console.error('========================================')
          console.error('[checkout] ❌ EXCEPTION WHILE FETCHING PENDING ORDER')
          console.error('[checkout] Error type:', err instanceof Error ? err.constructor.name : typeof err)
          console.error('[checkout] Error message:', err instanceof Error ? err.message : String(err))
          console.error('[checkout] Error stack:', err instanceof Error ? err.stack : 'N/A')
          console.error('[checkout] Pending order ID:', pendingOrderId)
          console.error('[checkout] Timestamp:', new Date().toISOString())
          console.error('========================================')
        }
      } else {
        console.log('----------------------------------------')
        console.log('[checkout] ⚠️  No pending order ID in URL - skipping database fetch')
        console.log('[checkout] This means user is authenticated and went directly to /checkout')
        console.log('[checkout] Will use sessionStorage data only')
        console.log('----------------------------------------')
      }

      // FALLBACK: Try sessionStorage if database fetch failed
      if (!data) {
        console.log('----------------------------------------')
        console.log('[checkout] 🔄 FALLBACK TO SESSIONSTORAGE')
        console.log('[checkout] No data from database - checking sessionStorage')
        console.log('----------------------------------------')

        const raw = sessionStorage.getItem('gpg_pending_order')
        console.log('[checkout] sessionStorage gpg_pending_order:', raw ? `found (${raw.length} chars)` : 'NOT FOUND')

        if (!raw) {
          console.error('========================================')
          console.error('[checkout] ❌ CRITICAL ERROR - NO ORDER DATA ANYWHERE')
          console.error('[checkout] Database fetch result: FAILED or EMPTY')
          console.error('[checkout] sessionStorage result: EMPTY')
          console.error('[checkout] Pending order ID from URL:', pendingOrderId || 'NONE')
          console.error('[checkout] Full URL:', window.location.href)
          console.error('[checkout] User flow breakdown:')
          console.error('[checkout]   1. User came from order form → login → checkout')
          console.error('[checkout]   2. Order should have been saved during login')
          console.error('[checkout]   3. Pending ID should be in URL: /checkout?pending=XXX')
          console.error('[checkout]   4. API should fetch from database with that ID')
          console.error('[checkout]   5. THIS IS WHERE IT FAILED')
          console.error('[checkout] Timestamp:', new Date().toISOString())
          console.error('========================================')

          // Show detailed error to user
          if (pendingOrderId) {
            setInitError(
              `We couldn't find your order details. Your order may have expired or there was an issue loading it. Please contact support or start a new order.\n\nError details: Pending order ID ${pendingOrderId} not found in database. This error has been logged.`
            )
          } else {
            setInitError(
              'No order data found. Please start a new order.\n\nError details: No pending order ID in URL and no data in session storage.'
            )
          }
          return
        }

        try {
          data = JSON.parse(raw)
          console.log('[checkout] Successfully parsed order data from sessionStorage:', data ? Object.keys(data) : 'null')
        } catch (err) {
          console.error('[checkout] Failed to parse gpg_pending_order:', err)
          setInitError(
            'Your order data appears to be corrupted. Please start a new order or contact support.'
          )
          return
        }
      }

      if (!data) {
        console.error('[checkout] Order data is still null after all attempts')
        setInitError(
          'We couldn\'t load your order details. Please try again or contact support.'
        )
        return
      }

      console.log('[checkout] ✅ Order data loaded successfully - proceeding with checkout')

      setOrderData(data)

      // Decode the file from database or sessionStorage
      // Priority: use fileData from database if available, otherwise fall back to sessionStorage
      let fileSource = fileData
      if (!fileSource) {
        const rawFile = sessionStorage.getItem('gpg_pending_file')
        if (rawFile) {
          fileSource = rawFile
        }
      }

      if (fileSource) {
        try {
          const { data: b64, name, type } = JSON.parse(fileSource) as {
            data: string; name: string; type: string
          }
          const binary = atob(b64)
          const bytes  = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: type || 'application/octet-stream' })
          setPendingFile(new File([blob], name, { type }))
          console.log('[checkout] Successfully restored file:', name)
        } catch (err) {
          console.error('[checkout] Failed to restore file:', err)
        }
      } else {
        console.log('[checkout] No file data found')
      }

      // Compute total and create payment intent
      const subtotal = data.deliverables.reduce((s, d) => s + deliverableBasePrice(d), 0)
      const { total } = calcOrderTotal({
        deliverableSubtotal:      subtotal,
        academicLevel:            data.academicLevel,
        deadline:                 data.deadline,
        includeOriginalityReport: data.includeOriginalityReport,
      })

      const amountPence = Math.round(total * 100)

      // Pass orderData to payment intent metadata as safety net for webhook
      fetch('/api/stripe/create-payment-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          amountPence,
          orderData: {
            subjectField: data.subjectField,
            academicLevel: data.academicLevel,
            deadline: data.deadline,
            deliverables: data.deliverables,
            instructions: data.instructions || '',
            includeOriginalityReport: data.includeOriginalityReport,
            fileName: null, // File name not needed for webhook safety net
          },
        }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (!json) return
          const { clientSecret, error } = json
          if (error || !clientSecret) {
            setInitError('Could not initialise payment. Please try again.')
            return
          }
          setClientSecret(clientSecret)
        })
        .catch(() => setInitError('Could not connect. Check your connection and try again.'))
    }

    loadOrderData()
  }, [router, pendingOrderId])

  // Loading skeleton
  if (!orderData || !clientSecret) {
    return (
      <main className="min-h-screen py-12 px-4" style={{ background: '#F5F0E8' }}>
        <div className="max-w-4xl mx-auto">
          {initError ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1B2E4B] mb-2">Order Not Found</h2>
              <p className="text-sm text-[#6B7280] mb-6 max-w-md mx-auto">{initError}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/order"
                  className="inline-flex items-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Start New Order
                </Link>
                <a
                  href="mailto:admin@getprimegrade.com"
                  className="text-sm font-semibold text-[#6B7280] hover:text-[#1B2E4B] transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-32">
              <svg className="w-8 h-8 animate-spin text-[#E8A020]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
      </main>
    )
  }

  const subtotal  = orderData.deliverables.reduce((s, d) => s + deliverableBasePrice(d), 0)
  const { total } = calcOrderTotal({
    deliverableSubtotal:      subtotal,
    academicLevel:            orderData.academicLevel,
    deadline:                 orderData.deadline,
    includeOriginalityReport: orderData.includeOriginalityReport,
  })

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary:     '#1B2E4B',
        colorBackground:  '#ffffff',
        colorText:        '#1A1A2E',
        colorDanger:      '#ef4444',
        fontFamily:       'Plus Jakarta Sans, system-ui, sans-serif',
        borderRadius:     '12px',
        spacingUnit:      '4px',
      },
    },
  }

  return (
    <main className="min-h-screen py-12 px-4" style={{ background: '#F5F0E8' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/order" className="text-[#9CA3AF] hover:text-[#1B2E4B] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-extrabold text-[#1B2E4B]">Complete your order</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Order summary — shown first on mobile, second on desktop */}
          <div className="order-first lg:order-last lg:col-span-2">
            <OrderSummary data={orderData} />
          </div>

          {/* Payment form */}
          <div className="order-last lg:order-first lg:col-span-3">
            <Elements stripe={stripePromise} options={stripeOptions}>
              <StripeForm grandTotalGBP={total} />
            </Elements>
          </div>
        </div>
      </div>
    </main>
  )
}
