'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  calcWrittenPrice,
  calcPresentationPrice,
  presentationLabel,
  getPracticalPrice,
  getAcademicMultiplier,
  getDeadlineMultiplier,
  getAcademicLevelAdjLabel,
  getDeadlinePremiumLabel,
  PRACTICAL_ITEMS,
  WORDS_PER_PAGE,
  ORIGINALITY_REPORT_PRICE,
  PRICE_PER_SLIDE,
} from '@/lib/pricing'
import { fmtInCurrency, getCurrencyDisplayName } from '@/lib/currency'
import type { Deliverable, OrderFormState } from '@/types/order-form'

interface Props {
  data: OrderFormState
  file: File | null
  proceeding?: boolean
  onToggleReport: (val: boolean) => void
  onBack: () => void
  onProceed: () => void
}

function deliverableLabel(d: Deliverable): string {
  // For AI-extracted deliverables, use the AI description if available
  if (d.aiDescription) {
    return d.aiDescription
  }

  if (d.type === 'written') {
    const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return `Written — ${pages} page${pages !== 1 ? 's' : ''} (${d.sizeMode === 'words' ? `${d.quantity} words` : `${pages * WORDS_PER_PAGE} words`})`
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
  return 'Unknown'
}

function deliverableBasePrice(d: Deliverable): number {
  // If basePrice is already set (from AI extraction or manual premium pricing), use it
  if (d.basePrice && d.basePrice > 0) {
    return d.basePrice
  }

  // Otherwise calculate from deliverable details
  if (d.type === 'written') {
    const pages = d.sizeMode === 'pages' ? d.quantity : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return calcWrittenPrice(pages)
  }
  if (d.type === 'presentation') {
    const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
    return calcPresentationPrice(slideCount)
  }
  if (d.type === 'practical') return getPracticalPrice(d.practicalKey)
  return 0
}

export default function StepSummary({ data, file, proceeding = false, onToggleReport, onBack, onProceed }: Props) {
  const { selectedCurrency, exchangeRate } = data
  const fmt = (gbpAmt: number) => fmtInCurrency(gbpAmt, exchangeRate, selectedCurrency)

  const [isFirstTimer, setIsFirstTimer] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function checkFirstTimer() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsLoggedIn(false)
        return
      }

      setIsLoggedIn(true)

      // Check if user has any previous orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['completed', 'paid', 'pending'])
        .limit(1)

      setIsFirstTimer(!orders || orders.length === 0)
    }

    checkFirstTimer()
  }, [])

  const levelMult    = getAcademicMultiplier(data.academicLevel)
  const deadlineMult = getDeadlineMultiplier(data.deadline)
  const levelLabel   = getAcademicLevelAdjLabel(data.academicLevel)
  const urgencyLabel = getDeadlinePremiumLabel(data.deadline)
  const hasAdj       = levelMult !== 1 || deadlineMult !== 1

  const subtotal    = data.deliverables.reduce((sum, d) => sum + deliverableBasePrice(d), 0)
  const reportCost  = data.includeOriginalityReport ? ORIGINALITY_REPORT_PRICE : 0
  const grandTotal  = subtotal * levelMult * deadlineMult + reportCost

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-xl font-bold text-[#1B2E4B]">Order summary</h2>
          {selectedCurrency !== 'GBP' && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M9 21V3m9 13l3-3-3-3" />
              </svg>
              {getCurrencyDisplayName(selectedCurrency)} ({selectedCurrency})
            </span>
          )}
        </div>
        <p className="text-sm text-[#6B7280]">
          Review everything before proceeding to payment.
        </p>
      </div>

      {/* Order details chip row */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Subject', value: data.subjectField },
          { label: 'Level', value: data.academicLevel },
          {
            label: 'Deadline',
            value: data.deadline
              ? new Date(data.deadline).toLocaleDateString('en-GB', { dateStyle: 'long' })
              : '—',
          },
          { label: 'File', value: file ? file.name : (data.briefFileName || 'None uploaded') },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#F5F0E8] rounded-xl px-3 py-2">
            <p className="text-[0.65rem] font-bold text-[#9CA3AF] uppercase tracking-wide">{label}</p>
            <p className="text-xs font-semibold text-[#1B2E4B] mt-0.5 truncate max-w-[140px]">{value}</p>
          </div>
        ))}
      </div>

      {/* Deliverables breakdown */}
      <div className="border border-[#E8E2D9] rounded-2xl overflow-hidden">
        <div className="bg-[#F5F0E8] px-5 py-3">
          <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Deliverables</p>
        </div>
        <div className="divide-y divide-[#E8E2D9]">
          {data.deliverables.map((d) => {
            const base       = deliverableBasePrice(d)
            const afterLevel = base * levelMult
            const levelAdj   = base * (levelMult - 1)         // negative for A-Level
            const urgencyAdj = afterLevel * (deadlineMult - 1) // always ≥ 0
            const dTotal     = afterLevel * deadlineMult

            return (
              <div key={d.id} className="px-5 py-4">
                {/* Deliverable label + (price if no adjustments) */}
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A2E] min-w-0 flex-1">{deliverableLabel(d)}</p>
                  {!hasAdj && (
                    <span className="text-sm font-bold text-[#1B2E4B] shrink-0">{fmt(base)}</span>
                  )}
                </div>

                {/* Expanded breakdown when adjustments apply */}
                {hasAdj && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[#9CA3AF]">Base price</span>
                      <span className="text-[#6B7280] font-medium shrink-0">{fmt(base)}</span>
                    </div>

                    {levelMult !== 1 && levelLabel && (
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-[#9CA3AF] min-w-0">{levelLabel}</span>
                        <span
                          className="font-semibold shrink-0"
                          style={{ color: levelMult > 1 ? '#C4861A' : '#16A34A' }}
                        >
                          {levelMult > 1 ? '+' : '−'}{fmt(Math.abs(levelAdj))}
                        </span>
                      </div>
                    )}

                    {deadlineMult !== 1 && urgencyLabel && (
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-[#9CA3AF] min-w-0">{urgencyLabel}</span>
                        <span className="font-semibold text-[#C4861A] shrink-0">+{fmt(urgencyAdj)}</span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 text-sm pt-2 border-t border-[#F0EBE0]">
                      <span className="font-semibold text-[#1B2E4B]">Deliverable total</span>
                      <span className="font-bold text-[#1B2E4B] shrink-0">{fmt(dTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Originality report toggle */}
      <button
        type="button"
        onClick={() => onToggleReport(!data.includeOriginalityReport)}
        className="w-full flex items-center justify-between p-5 border-2 rounded-2xl transition-all duration-150"
        style={{
          borderColor: data.includeOriginalityReport ? '#E8A020' : '#E8E2D9',
          background: data.includeOriginalityReport ? '#FDF3DC' : '#FDFAF6',
        }}
      >
        <div className="flex items-center gap-3 text-left">
          <div
            className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
            style={{
              borderColor: data.includeOriginalityReport ? '#E8A020' : '#D1D5DB',
              background: data.includeOriginalityReport ? '#E8A020' : 'transparent',
            }}
          >
            {data.includeOriginalityReport && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1B2E4B]">
              Add Originality &amp; AI Detection Report
            </p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Includes a detailed plagiarism and AI content check
            </p>
          </div>
        </div>
        <span
          className="text-sm font-bold ml-4 shrink-0"
          style={{ color: data.includeOriginalityReport ? '#C4861A' : '#9CA3AF' }}
        >
          +{fmt(ORIGINALITY_REPORT_PRICE)}
        </span>
      </button>

      {/* First-time discount notice */}
      {isLoggedIn && isFirstTimer && (
        <div className="flex items-start gap-3 bg-[#D1FAE5] border border-[#86EFAC] rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#16A34A]">First order? You get 10% off!</p>
            <p className="text-xs text-[#16A34A]/80 mt-0.5">
              Your welcome discount will be applied automatically at checkout.
            </p>
          </div>
        </div>
      )}

      {/* Grand total */}
      <div
        className="flex items-center justify-between gap-4 px-5 sm:px-6 py-5 rounded-2xl"
        style={{ background: '#1B2E4B' }}
      >
        <div className="min-w-0">
          <p className="text-white/60 text-sm">Grand Total</p>
          <p className="text-white/50 text-xs mt-0.5 leading-snug">
            {selectedCurrency !== 'GBP'
              ? `Approx. ${selectedCurrency} equivalent — charged in GBP`
              : 'Secure payment via Stripe (GBP)'}
          </p>
        </div>
        <p className="text-2xl sm:text-3xl font-extrabold text-white shrink-0">{fmt(grandTotal)}</p>
      </div>

      {/* Nav row — Back left, Proceed right */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-[#E8E2D9]">
        <button
          type="button"
          onClick={onBack}
          disabled={proceeding}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#1B2E4B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>

        <button
          type="button"
          onClick={onProceed}
          disabled={proceeding}
          className="flex items-center justify-center gap-2 bg-[#E8A020] hover:bg-[#C4861A] text-white font-bold text-base px-7 py-4 rounded-2xl transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {proceeding ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              Proceed to Checkout
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
