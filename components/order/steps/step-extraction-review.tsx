'use client'

import { useState } from 'react'
import { SUBJECT_GROUPS, ACADEMIC_LEVELS, PRACTICAL_ITEMS } from '@/lib/pricing'
import type { Deliverable } from '@/types/order-form'

const COUNTRIES = [
  'United Kingdom',
  'United States', 'Canada', 'Australia', 'Ireland',
  'Nigeria', 'Ghana', 'Kenya', 'South Africa',
  'India', 'Pakistan', 'Bangladesh',
  'Germany', 'France', 'Spain', 'Italy', 'Netherlands',
]

interface ExtractedDeliverable {
  type: 'written' | 'presentation' | 'technical'
  description: string
  quantity: number | null
  quantity_type: 'words' | 'pages' | 'slides' | null
  complexity: 'simple' | 'moderate' | 'complex' | 'expert' | null
  price_gbp: number
  confidence: 'high' | 'medium' | 'low'
}

interface ExtractionResult {
  subject_field: string | null
  academic_level: 'A-Level / College' | 'Undergraduate' | 'Masters' | null
  deadline: string | null
  deliverables: ExtractedDeliverable[]
  additional_notes: string | null
}

interface Props {
  extraction: ExtractionResult
  onConfirm: (confirmedData: {
    subjectField: string
    academicLevel: string
    deadline: string
    country: string
    deliverables: Deliverable[]
    instructions: string
  }) => void
  onBack: () => void
  selectedCurrency?: string
  exchangeRate?: number
  onCurrencyChange?: (currency: string, rate: number) => void
}

function formatPrice(gbp: number, currency: string, rate: number): string {
  const amount = gbp * rate
  if (currency === 'GBP') {
    return `£${amount % 1 === 0 ? amount : amount.toFixed(2)}`
  }
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export default function StepExtractionReview({
  extraction,
  onConfirm,
  onBack,
  selectedCurrency = 'GBP',
  exchangeRate = 1,
  onCurrencyChange,
}: Props) {
  const [subjectField, setSubjectField] = useState(extraction.subject_field || '')
  const [academicLevel, setAcademicLevel] = useState(extraction.academic_level || '')
  const [deadline, setDeadline] = useState(extraction.deadline || '')
  const [country, setCountry] = useState('United Kingdom')
  const [instructions, setInstructions] = useState('')
  const [deliverables, setDeliverables] = useState<ExtractedDeliverable[]>(extraction.deliverables)

  // Edit mode states
  const [editingSubject, setEditingSubject] = useState(!extraction.subject_field)
  const [editingLevel, setEditingLevel] = useState(!extraction.academic_level)
  const [editingDeadline, setEditingDeadline] = useState(!extraction.deadline)

  // Add deliverable modal state
  const [showAddDeliverable, setShowAddDeliverable] = useState(false)
  const [newDeliverableType, setNewDeliverableType] = useState<'written' | 'presentation' | 'practical' | ''>('')
  const [newDeliverableSizeMode, setNewDeliverableSizeMode] = useState<'pages' | 'words'>('pages')
  const [newDeliverableQuantity, setNewDeliverableQuantity] = useState(0)
  const [newDeliverableSlideCount, setNewDeliverableSlideCount] = useState(0)
  const [newDeliverablePracticalKey, setNewDeliverablePracticalKey] = useState('')

  function getMinDate() {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  }

  // Premium pricing for manually added deliverables
  function calculateManualDeliverablePrice(type: 'written' | 'presentation' | 'practical', quantity: number, practicalKey?: string): number {
    if (type === 'written') {
      const pages = newDeliverableSizeMode === 'pages' ? quantity : Math.ceil(quantity / 275)
      return pages * 6 // £6 per page (premium)
    }
    if (type === 'presentation') {
      return quantity * 3 // £3 per slide (premium)
    }
    if (type === 'practical') {
      return 95 // £95 flat rate (complex tier pricing for all)
    }
    return 0
  }

  function handleAddDeliverable() {
    if (!newDeliverableType) return

    let description = ''
    let quantity: number | null = null
    let quantityType: 'words' | 'pages' | 'slides' | null = null
    let complexity: 'simple' | 'moderate' | 'complex' | 'expert' | null = null

    if (newDeliverableType === 'written') {
      const pages = newDeliverableSizeMode === 'pages' ? newDeliverableQuantity : Math.ceil(newDeliverableQuantity / 275)
      description = `Written assignment (${pages} pages)`
      quantity = pages
      quantityType = 'pages'
    } else if (newDeliverableType === 'presentation') {
      description = `Presentation (${newDeliverableSlideCount} slides)`
      quantity = newDeliverableSlideCount
      quantityType = 'slides'
    } else if (newDeliverableType === 'practical') {
      const practicalItem = PRACTICAL_ITEMS.find(p => p.key === newDeliverablePracticalKey)
      description = practicalItem?.label || 'Practical task'
      complexity = 'complex' // Always priced at complex tier
    }

    const newDeliverable: ExtractedDeliverable = {
      type: newDeliverableType === 'practical' ? 'technical' : newDeliverableType,
      description,
      quantity,
      quantity_type: quantityType,
      complexity,
      price_gbp: calculateManualDeliverablePrice(newDeliverableType, newDeliverableType === 'presentation' ? newDeliverableSlideCount : newDeliverableQuantity, newDeliverablePracticalKey),
      confidence: 'high', // Manual additions are "high confidence"
    }

    setDeliverables(prev => [...prev, newDeliverable])

    // Reset form
    setShowAddDeliverable(false)
    setNewDeliverableType('')
    setNewDeliverableQuantity(0)
    setNewDeliverableSlideCount(0)
    setNewDeliverablePracticalKey('')
  }

  function handleConfirm() {
    // Convert extracted deliverables to order form deliverable format
    const formDeliverables: Deliverable[] = deliverables.map((d) => {
      const id = Math.random().toString(36).slice(2)

      if (d.type === 'written') {
        const quantity = d.quantity_type === 'words' && d.quantity
          ? Math.ceil(d.quantity / 275) // Convert words to pages
          : d.quantity || 0

        return {
          id,
          type: 'written',
          sizeMode: 'pages' as const,
          quantity,
          slideBand: '',
          slideInputMode: 'exact' as const,
          slideCount: 0,
          slideMin: 0,
          slideMax: 0,
          practicalKey: '',
          basePrice: d.price_gbp,
        }
      }

      if (d.type === 'presentation') {
        return {
          id,
          type: 'presentation',
          sizeMode: 'pages' as const,
          quantity: 0,
          slideBand: '',
          slideInputMode: 'exact' as const,
          slideCount: d.quantity || 0,
          slideMin: 0,
          slideMax: 0,
          practicalKey: '',
          basePrice: d.price_gbp,
        }
      }

      // Technical deliverable - map complexity to a practical key for storage
      const practicalKey = d.complexity === 'simple' ? 'flowchart'
        : d.complexity === 'moderate' ? 'database'
        : d.complexity === 'expert' ? 'security'
        : 'web_dev' // complex or default

      return {
        id,
        type: 'practical',
        sizeMode: 'pages' as const,
        quantity: 0,
        slideBand: '',
        slideInputMode: 'exact' as const,
        slideCount: 0,
        slideMin: 0,
        slideMax: 0,
        practicalKey,
        basePrice: d.price_gbp, // Use the price from AI extraction
      }
    })

    onConfirm({
      subjectField,
      academicLevel,
      deadline,
      country,
      deliverables: formDeliverables,
      instructions,
    })
  }

  function removeDeliverable(index: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCountryChange(newCountry: string) {
    setCountry(newCountry)
    if (onCurrencyChange) {
      const { getCurrencyForCountry, fetchGBPRate } = await import('@/lib/currency')
      const currency = getCurrencyForCountry(newCountry)
      if (currency === 'GBP') {
        onCurrencyChange('GBP', 1)
      } else {
        try {
          const rate = await fetchGBPRate(currency)
          onCurrencyChange(currency, rate)
        } catch {
          onCurrencyChange('GBP', 1)
        }
      }
    }
  }

  const selectClass = 'w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all'

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E4B] mb-1">Review & confirm</h2>
        <p className="text-sm text-[#6B7280]">
          Check the information we extracted from your brief
        </p>
      </div>

      {/* Basic information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-[#1B2E4B]">Basic information</h3>

        {/* Subject field */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
            Subject / Field
          </label>
          {editingSubject ? (
            <select
              value={subjectField}
              onChange={(e) => setSubjectField(e.target.value)}
              className={selectClass}
              autoFocus
            >
              <option value="">Select your subject…</option>
              {SUBJECT_GROUPS.map(({ group, subjects }) => (
                <optgroup key={group} label={group}>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 border border-[#E8E2D9] rounded-xl bg-[#FDFAF6]">
              <span className="text-sm text-[#1B2E4B] font-medium">{subjectField}</span>
              <button
                type="button"
                onClick={() => setEditingSubject(true)}
                className="text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] underline underline-offset-2 transition-colors"
              >
                edit
              </button>
            </div>
          )}
        </div>

        {/* Academic level */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
            Academic Level
          </label>
          {editingLevel ? (
            <select
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className={selectClass}
              autoFocus
            >
              <option value="">Select level...</option>
              {ACADEMIC_LEVELS.map(({ label }) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 border border-[#E8E2D9] rounded-xl bg-[#FDFAF6]">
              <span className="text-sm text-[#1B2E4B] font-medium">{academicLevel}</span>
              <button
                type="button"
                onClick={() => setEditingLevel(true)}
                className="text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] underline underline-offset-2 transition-colors"
              >
                edit
              </button>
            </div>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
            Deadline
          </label>
          {editingDeadline ? (
            <input
              type="date"
              min={getMinDate()}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={selectClass}
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-between px-4 py-3 border border-[#E8E2D9] rounded-xl bg-[#FDFAF6]">
              <span className="text-sm text-[#1B2E4B] font-medium">
                {deadline ? new Date(deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}
              </span>
              <button
                type="button"
                onClick={() => setEditingDeadline(true)}
                className="text-xs font-semibold text-[#E8A020] hover:text-[#C4861A] underline underline-offset-2 transition-colors"
              >
                edit
              </button>
            </div>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
            Country
          </label>
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={selectClass}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deliverables */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-[#1B2E4B]">Deliverables</h3>

        {deliverables.length === 0 ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-sm text-amber-800">
              No deliverables found. Add your deliverables manually below.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverables.map((d, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-xl"
                style={{
                  borderColor: d.confidence === 'low' ? '#FCD34D' : '#E8E2D9',
                  background: d.confidence === 'low' ? '#FFFBEB' : '#FDFAF6',
                }}
              >
                {/* Confidence warning for low confidence only */}
                {d.confidence === 'low' && (
                  <div className="flex items-start gap-2 mb-3 pb-3 border-b border-amber-200">
                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-amber-700">
                      We weren't certain about this — please check it looks right
                    </p>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1B2E4B]">{d.description}</p>
                    {d.quantity && (
                      <p className="text-xs text-[#9CA3AF] mt-1">
                        {d.quantity} {d.quantity_type}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold text-[#1B2E4B]">
                        {formatPrice(d.price_gbp, selectedCurrency, exchangeRate)}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">base price</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeliverable(idx)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:bg-red-50 hover:text-red-400 transition-colors"
                      aria-label="Remove deliverable"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add deliverable button */}
        {!showAddDeliverable ? (
          <button
            type="button"
            onClick={() => setShowAddDeliverable(true)}
            className="w-full py-3 px-4 border-2 border-dashed border-[#E8E2D9] rounded-xl text-sm font-semibold text-[#6B7280] hover:border-[#E8A020] hover:text-[#E8A020] hover:bg-[#FDF3DC] transition-all"
          >
            + Add another deliverable
          </button>
        ) : (
          /* Add deliverable form */
          <div className="p-5 border-2 border-[#E8A020] rounded-xl bg-[#FDF3DC]">
            <h4 className="text-sm font-semibold text-[#1B2E4B] mb-4">Add a deliverable</h4>

            {/* Type selector */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'written', label: 'Written' },
                  { key: 'presentation', label: 'Presentation' },
                  { key: 'practical', label: 'Practical' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewDeliverableType(key as any)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: newDeliverableType === key ? '#E8A020' : '#fff',
                      color: newDeliverableType === key ? '#fff' : '#1B2E4B',
                      border: `2px solid ${newDeliverableType === key ? '#E8A020' : '#E8E2D9'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Written options */}
            {newDeliverableType === 'written' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDeliverableSizeMode('pages')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${
                      newDeliverableSizeMode === 'pages' ? 'bg-[#E8A020] text-white' : 'bg-white text-[#6B7280] border border-[#E8E2D9]'
                    }`}
                  >
                    Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeliverableSizeMode('words')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${
                      newDeliverableSizeMode === 'words' ? 'bg-[#E8A020] text-white' : 'bg-white text-[#6B7280] border border-[#E8E2D9]'
                    }`}
                  >
                    Words
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  value={newDeliverableQuantity || ''}
                  onChange={(e) => setNewDeliverableQuantity(parseInt(e.target.value) || 0)}
                  placeholder={`Enter ${newDeliverableSizeMode}`}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm"
                />
                <p className="text-xs text-[#6B7280]">Premium rate: £6 per page</p>
              </div>
            )}

            {/* Presentation options */}
            {newDeliverableType === 'presentation' && (
              <div className="space-y-3">
                <input
                  type="number"
                  min="1"
                  value={newDeliverableSlideCount || ''}
                  onChange={(e) => setNewDeliverableSlideCount(parseInt(e.target.value) || 0)}
                  placeholder="Number of slides"
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm"
                />
                <p className="text-xs text-[#6B7280]">Premium rate: £3 per slide</p>
              </div>
            )}

            {/* Practical options */}
            {newDeliverableType === 'practical' && (
              <div className="space-y-3">
                <select
                  value={newDeliverablePracticalKey}
                  onChange={(e) => setNewDeliverablePracticalKey(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E2D9] rounded-lg text-sm"
                >
                  <option value="">Select category...</option>
                  {PRACTICAL_ITEMS.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
                <p className="text-xs text-[#6B7280]">Premium rate: £95 flat rate</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddDeliverable(false)
                  setNewDeliverableType('')
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-[#6B7280] bg-white border border-[#E8E2D9] hover:bg-[#F5F0E8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDeliverable}
                disabled={!newDeliverableType || (newDeliverableType === 'written' && !newDeliverableQuantity) || (newDeliverableType === 'presentation' && !newDeliverableSlideCount) || (newDeliverableType === 'practical' && !newDeliverablePracticalKey)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#E8A020] hover:bg-[#C4861A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Additional instructions */}
      <div>
        <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
          Additional instructions
          <span className="ml-2 text-xs font-normal text-[#9CA3AF]">optional</span>
        </label>
        <textarea
          rows={4}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Any specific requirements, marking criteria, preferred sources, formatting notes, or anything else we should know..."
          className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-[#E8E2D9]">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-[#6B7280] hover:text-[#1B2E4B] hover:bg-[#F5F0E8] transition-all"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!subjectField || !academicLevel || !deadline || !country || deliverables.length === 0}
          className="flex-1 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: subjectField && academicLevel && deadline && country && deliverables.length > 0
              ? '#E8A020'
              : '#9CA3AF',
          }}
        >
          Looks good — Continue to summary
        </button>
      </div>
    </div>
  )
}
