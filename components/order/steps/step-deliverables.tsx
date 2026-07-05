'use client'

import {
  PRACTICAL_ITEMS,
  WORDS_PER_PAGE,
  calcWrittenPrice,
  writtenBandLabel,
  calcPresentationPrice,
  presentationLabel,
  getPracticalPrice,
} from '@/lib/pricing'
import { fmtInCurrency, getCurrencyDisplayName } from '@/lib/currency'
import { makeDeliverable, type Deliverable } from '@/types/order-form'

interface Props {
  deliverables: Deliverable[]
  errors: Record<string, string>
  onChange: (updated: Deliverable[]) => void
  selectedCurrency: string
  exchangeRate: number
}

function calcPrice(d: Deliverable): number {
  if (d.type === 'written') {
    const pages =
      d.sizeMode === 'pages'
        ? d.quantity
        : Math.ceil(d.quantity / WORDS_PER_PAGE)
    return calcWrittenPrice(pages)
  }
  if (d.type === 'presentation') {
    const slideCount = d.slideInputMode === 'exact' ? d.slideCount : d.slideMax
    return calcPresentationPrice(slideCount)
  }
  if (d.type === 'practical') return getPracticalPrice(d.practicalKey)
  return 0
}

function DeliverableCard({
  d,
  index,
  canRemove,
  onChange,
  onRemove,
  error,
  selectedCurrency,
  exchangeRate,
}: {
  d: Deliverable
  index: number
  canRemove: boolean
  onChange: (changes: Partial<Deliverable>) => void
  onRemove: () => void
  error?: string
  selectedCurrency: string
  exchangeRate: number
}) {
  const price = calcPrice(d)
  const fmt = (n: number) => n > 0 ? fmtInCurrency(n, exchangeRate, selectedCurrency) : '—'

  const writtenPages =
    d.sizeMode === 'pages' ? d.quantity : Math.ceil((d.quantity || 0) / WORDS_PER_PAGE)

  function handleTypeChange(type: Deliverable['type']) {
    onChange({
      type,
      quantity: 0,
      sizeMode: 'pages',
      slideBand: '',
      slideInputMode: 'exact',
      slideCount: 0,
      slideMin: 0,
      slideMax: 0,
      practicalKey: '',
      basePrice: 0,
    })
  }

  function handleQuantityChange(raw: string) {
    const quantity = Math.max(0, parseInt(raw) || 0)
    const pages = d.sizeMode === 'pages' ? quantity : Math.ceil(quantity / WORDS_PER_PAGE)
    onChange({ quantity, basePrice: calcWrittenPrice(pages) })
  }

  function handleSlideInputMode(mode: 'exact' | 'between') {
    const slideCount = mode === 'exact' ? d.slideCount || 0 : 0
    const slideMax = mode === 'between' ? d.slideMax || 0 : 0
    onChange({
      slideInputMode: mode,
      basePrice: calcPresentationPrice(mode === 'exact' ? slideCount : slideMax),
    })
  }

  function handleSlideCount(raw: string) {
    const slideCount = Math.max(1, parseInt(raw) || 0)
    onChange({ slideCount, basePrice: calcPresentationPrice(slideCount) })
  }

  function handleSlideMin(raw: string) {
    const slideMin = Math.max(1, parseInt(raw) || 0)
    onChange({ slideMin, basePrice: calcPresentationPrice(d.slideMax) })
  }

  function handleSlideMax(raw: string) {
    const slideMax = Math.max(1, parseInt(raw) || 0)
    onChange({ slideMax, basePrice: calcPresentationPrice(slideMax) })
  }

  function handlePractical(practicalKey: string) {
    onChange({ practicalKey, basePrice: getPracticalPrice(practicalKey) })
  }

  function toggleSizeMode() {
    const next = d.sizeMode === 'pages' ? 'words' : 'pages'
    let newQty = d.quantity
    if (d.sizeMode === 'pages' && next === 'words') newQty = d.quantity * WORDS_PER_PAGE
    if (d.sizeMode === 'words' && next === 'pages') newQty = Math.ceil(d.quantity / WORDS_PER_PAGE)
    onChange({ sizeMode: next, quantity: newQty || 0 })
  }

  const inputBase =
    'px-3.5 py-2.5 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all w-full'
  const selectBase =
    'px-3.5 py-2.5 border border-[#E8E2D9] rounded-xl text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all w-full'

  return (
    <div
      className="bg-white border rounded-2xl p-5 transition-shadow"
      style={{
        borderColor: error ? '#FCA5A5' : '#E8E2D9',
        boxShadow: '0 2px 8px -2px rgba(26,26,46,0.07)',
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">
          Deliverable {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#9CA3AF] hover:bg-red-50 hover:text-red-400 transition-colors"
            aria-label="Remove deliverable"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Type selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-[#1B2E4B] mb-2">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {(['written', 'presentation', 'practical'] as const).map((t) => {
            const labels: Record<string, { full: string; short: string }> = {
              written:      { full: 'Written',              short: 'Written' },
              presentation: { full: 'Presentation',         short: 'Slides' },
              practical:    { full: 'Practical & Technical', short: 'Practical' },
            }
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className="py-2 px-2 rounded-xl border-2 text-xs font-semibold text-center transition-all duration-150"
                style={{
                  borderColor: d.type === t ? '#E8A020' : '#E8E2D9',
                  background: d.type === t ? '#FDF3DC' : '#FDFAF6',
                  color: d.type === t ? '#C4861A' : '#6B7280',
                }}
              >
                <span className="sm:hidden">{labels[t].short}</span>
                <span className="hidden sm:inline">{labels[t].full}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conditional fields */}
      {d.type === 'written' && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1B2E4B]">
                Size ({d.sizeMode === 'pages' ? 'pages' : 'words'})
              </label>
              <button
                type="button"
                onClick={toggleSizeMode}
                className="flex items-center gap-1 text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Switch to {d.sizeMode === 'pages' ? 'words' : 'pages'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={d.sizeMode === 'pages' ? 1 : WORDS_PER_PAGE}
                step={d.sizeMode === 'pages' ? 1 : WORDS_PER_PAGE}
                value={d.quantity || ''}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder={d.sizeMode === 'pages' ? 'e.g. 5' : 'e.g. 1375'}
                className={inputBase}
              />
              <span className="text-xs text-[#9CA3AF] whitespace-nowrap">
                {d.sizeMode === 'pages' ? 'pages' : 'words'}
              </span>
            </div>
            {d.quantity > 0 && (
              <p className="mt-1.5 text-xs text-[#9CA3AF]">
                {d.sizeMode === 'words'
                  ? `≈ ${writtenPages} page${writtenPages !== 1 ? 's' : ''} · `
                  : ''}
                {writtenBandLabel(writtenPages)}
              </p>
            )}
          </div>
        </div>
      )}

      {d.type === 'presentation' && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#1B2E4B] mb-2">Slide count</label>
          <div className="flex items-center gap-2">
            <select
              value={d.slideInputMode}
              onChange={(e) => handleSlideInputMode(e.target.value as 'exact' | 'between')}
              className={selectBase}
              style={{ width: '110px' }}
            >
              <option value="exact">Exactly</option>
              <option value="between">Between</option>
            </select>

            {d.slideInputMode === 'exact' ? (
              <input
                type="number"
                min={1}
                step={1}
                value={d.slideCount || ''}
                onChange={(e) => handleSlideCount(e.target.value)}
                placeholder="e.g. 15"
                className={inputBase}
              />
            ) : (
              <>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={d.slideMin || ''}
                  onChange={(e) => handleSlideMin(e.target.value)}
                  placeholder="Min"
                  className={inputBase}
                  style={{ width: '80px' }}
                />
                <span className="text-xs text-[#6B7280] font-medium">and</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={d.slideMax || ''}
                  onChange={(e) => handleSlideMax(e.target.value)}
                  placeholder="Max"
                  className={inputBase}
                  style={{ width: '80px' }}
                />
              </>
            )}
          </div>

          {/* Validation error for 'between' mode */}
          {d.slideInputMode === 'between' && d.slideMin > 0 && d.slideMax > 0 && d.slideMax <= d.slideMin && (
            <p className="text-xs text-red-500">Maximum must be greater than minimum</p>
          )}

          {/* Live price preview */}
          {((d.slideInputMode === 'exact' && d.slideCount > 0) ||
            (d.slideInputMode === 'between' && d.slideMax > 0)) && (
            <p className="text-xs text-[#9CA3AF]">
              {d.slideInputMode === 'exact'
                ? presentationLabel(d.slideCount)
                : `${d.slideMin}–${d.slideMax} slides × £2.50 (charged at ${d.slideMax})`}
            </p>
          )}
        </div>
      )}

      {d.type === 'practical' && (
        <div>
          <label className="block text-xs font-semibold text-[#1B2E4B] mb-2">Category</label>
          <select
            value={d.practicalKey}
            onChange={(e) => handlePractical(e.target.value)}
            className={selectBase}
            style={{ color: d.practicalKey ? '#1A1A2E' : '#9CA3AF' }}
          >
            <option value="" disabled>Select category…</option>
            {PRACTICAL_ITEMS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Price */}
      {d.type && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E8E2D9]">
          <span className="text-xs font-medium text-[#9CA3AF]">Base price</span>
          <span
            className="text-base font-extrabold"
            style={{ color: price > 0 ? '#1B2E4B' : '#D1D5DB' }}
          >
            {fmt(price)}
          </span>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function StepDeliverables({ deliverables, errors, onChange, selectedCurrency, exchangeRate }: Props) {
  const subtotal = deliverables.reduce((sum, d) => sum + calcPrice(d), 0)

  function updateOne(id: string, changes: Partial<Deliverable>) {
    const updated = deliverables.map((d) => {
      if (d.id !== id) return d
      const merged = { ...d, ...changes }
      return { ...merged, basePrice: calcPrice(merged) }
    })
    onChange(updated)
  }

  function addDeliverable() {
    onChange([...deliverables, makeDeliverable()])
  }

  function removeDeliverable(id: string) {
    onChange(deliverables.filter((d) => d.id !== id))
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-xl font-bold text-[#1B2E4B]">Deliverables</h2>
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
          Add up to 6 items. Prices are base rates — academic level and deadline adjustments apply at checkout.
        </p>
      </div>

      {/* Deliverable cards */}
      <div className="space-y-4">
        {deliverables.map((d, i) => (
          <DeliverableCard
            key={d.id}
            d={d}
            index={i}
            canRemove={deliverables.length > 1}
            onChange={(changes) => updateOne(d.id, changes)}
            onRemove={() => removeDeliverable(d.id)}
            error={errors[`deliverable_${d.id}`]}
            selectedCurrency={selectedCurrency}
            exchangeRate={exchangeRate}
          />
        ))}
      </div>

      {/* Add button */}
      {deliverables.length < 6 && (
        <button
          type="button"
          onClick={addDeliverable}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-[#E8E2D9] rounded-2xl text-sm font-semibold text-[#9CA3AF] hover:border-[#E8A020] hover:text-[#E8A020] transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add another deliverable
          <span className="text-xs font-normal">
            ({deliverables.length}/6)
          </span>
        </button>
      )}

      {errors.deliverables && (
        <p className="text-xs text-red-500">{errors.deliverables}</p>
      )}

      {/* Running total */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-2xl border border-[#E8E2D9]"
        style={{ background: '#F5F0E8' }}
      >
        <div>
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Subtotal</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Before academic level &amp; deadline adjustments</p>
        </div>
        <p className="text-2xl font-extrabold text-[#1B2E4B]">
          {subtotal > 0 ? fmtInCurrency(subtotal, exchangeRate, selectedCurrency) : '—'}
        </p>
      </div>
    </div>
  )
}
