'use client'

import { useState } from 'react'
import type { Deliverable } from '@/types/order-form'

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
    deliverables: Deliverable[]
    additionalNotes: string
  }) => void
  onBack: () => void
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

export default function StepExtractionReview({ extraction, onConfirm, onBack }: Props) {
  const [subjectField, setSubjectField] = useState(extraction.subject_field || '')
  const [academicLevel, setAcademicLevel] = useState(extraction.academic_level || '')
  const [deadline, setDeadline] = useState(extraction.deadline || '')
  const [deliverables, setDeliverables] = useState<ExtractedDeliverable[]>(extraction.deliverables)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

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

      // Technical deliverable
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
        practicalKey: d.complexity || 'python', // Default to simplest option
        basePrice: d.price_gbp,
      }
    })

    onConfirm({
      subjectField,
      academicLevel,
      deadline,
      deliverables: formDeliverables,
      additionalNotes: extraction.additional_notes || '',
    })
  }

  function removeDeliverable(index: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-xl font-bold text-[#1B2E4B] mb-1">Review what we found</h2>
        <p className="text-sm text-[#6B7280]">
          Check the information we extracted from your brief and make any changes
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
          <input
            type="text"
            value={subjectField}
            onChange={(e) => setSubjectField(e.target.value)}
            placeholder="e.g. Computer Science"
            className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
          />
        </div>

        {/* Academic level */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
            Academic Level
          </label>
          <select
            value={academicLevel}
            onChange={(e) => setAcademicLevel(e.target.value)}
            className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
          >
            <option value="">Select level...</option>
            <option value="A-Level / College">A-Level / College</option>
            <option value="Undergraduate">Undergraduate</option>
            <option value="Masters">Masters</option>
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-sm font-semibold text-[#1B2E4B] mb-1.5">
            Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-4 py-3 border border-[#E8E2D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8A020]/40 focus:border-[#E8A020] transition-all"
          />
        </div>
      </div>

      {/* Deliverables */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-[#1B2E4B]">Deliverables we found</h3>

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
                        {formatPrice(d.price_gbp, 'GBP', 1)}
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

        {/* Add deliverable button - to be implemented */}
        <button
          type="button"
          className="w-full py-3 px-4 border-2 border-dashed border-[#E8E2D9] rounded-xl text-sm font-semibold text-[#6B7280] hover:border-[#E8A020] hover:text-[#E8A020] hover:bg-[#FDF3DC] transition-all"
        >
          + Add another deliverable
        </button>
      </div>

      {/* Additional notes */}
      {extraction.additional_notes && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-semibold text-blue-900 mb-1">Additional notes from your brief:</p>
          <p className="text-sm text-blue-800">{extraction.additional_notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
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
          disabled={!subjectField || !academicLevel || !deadline || deliverables.length === 0}
          className="flex-1 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: subjectField && academicLevel && deadline && deliverables.length > 0
              ? '#E8A020'
              : '#9CA3AF',
          }}
        >
          Looks good — Continue
        </button>
      </div>
    </div>
  )
}
