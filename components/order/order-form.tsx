'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import StepIndicator from './step-indicator'
import StepBasicInfo from './steps/step-basic-info'
import StepDeliverables from './steps/step-deliverables'
import StepUpload from './steps/step-upload'
import StepSummary from './steps/step-summary'
import { INITIAL_FORM_STATE, type OrderFormState, type Deliverable } from '@/types/order-form'
import { daysUntil } from '@/lib/pricing'
import { createClient } from '@/lib/supabase/client'

const STEPS = ['Basic Info', 'Deliverables', 'Upload', 'Summary']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function validateStep(step: number, data: OrderFormState, file: File | null): Record<string, string> {
  const err: Record<string, string> = {}

  if (step === 0) {
    if (!data.subjectField) err.subjectField = 'Please select a subject.'
    if (!data.academicLevel) err.academicLevel = 'Please select your academic level.'
    if (!data.deadline) {
      err.deadline = 'Please choose a deadline.'
    } else if (daysUntil(data.deadline) < 2) {
      err.deadline = 'Deadline must be at least 2 days from today.'
    }
  }

  if (step === 1) {
    if (data.deliverables.length === 0) {
      err.deliverables = 'Add at least one deliverable.'
    }
    data.deliverables.forEach((d) => {
      if (!d.type) {
        err[`deliverable_${d.id}`] = 'Please select a type.'
      } else if (d.type === 'written' && (!d.quantity || d.quantity <= 0)) {
        err[`deliverable_${d.id}`] = 'Please enter a page or word count.'
      } else if (d.type === 'presentation' && !d.slideBand) {
        err[`deliverable_${d.id}`] = 'Please select a slide count.'
      } else if (d.type === 'practical' && !d.practicalKey) {
        err[`deliverable_${d.id}`] = 'Please select a category.'
      }
    })
  }

  if (step === 2) {
    if (!file) err.file = 'Please upload your assignment document.'
  }

  return err
}

export default function OrderForm() {
  const [step, setStep]           = useState(0)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [formData, setFormData]   = useState<OrderFormState>(INITIAL_FORM_STATE)
  const [file, setFile]           = useState<File | null>(null)
  const [proceeding, setProceeding] = useState(false)
  const router = useRouter()
  const topRef = useRef<HTMLDivElement>(null)

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function updateField(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function updateDeliverables(deliverables: Deliverable[]) {
    setFormData((prev) => ({ ...prev, deliverables }))
  }

  function handleCurrencyChange(selectedCurrency: string, exchangeRate: number) {
    setFormData((prev) => ({ ...prev, selectedCurrency, exchangeRate }))
  }

  function advance() {
    const err = validateStep(step, formData, file)
    if (Object.keys(err).length > 0) {
      setErrors(err)
      return
    }
    setErrors({})
    setStep((s) => s + 1)
    scrollTop()
  }

  function back() {
    setErrors({})
    setStep((s) => s - 1)
    scrollTop()
  }

  async function handleProceed() {
    setProceeding(true)

    // Check authentication status first
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Prepare order data
    const orderData = {
      ...formData,
      fileName: file?.name ?? null,
      fileSize: file?.size ?? null,
    }

    let fileDataBase64: string | null = null

    // Encode file as base64 if present
    if (file) {
      try {
        fileDataBase64 = await fileToBase64(file)
        console.log('[order-form] Encoded file to base64:', file.name, file.size, 'bytes')
      } catch (err) {
        console.error('[order-form] Failed to encode file:', err)
      }
    }

    // Always save to sessionStorage as redundant backup
    sessionStorage.setItem('gpg_pending_order', JSON.stringify(orderData))
    if (fileDataBase64) {
      sessionStorage.setItem('gpg_pending_file', JSON.stringify({
        data: fileDataBase64,
        name: file!.name,
        type: file!.type || 'application/octet-stream',
        size: file!.size,
      }))
    }
    console.log('[order-form] Saved to sessionStorage as backup')

    if (user) {
      // User is authenticated - go straight to checkout
      console.log('[order-form] User authenticated, redirecting to /checkout')
      router.push('/checkout')
    } else {
      // User NOT authenticated - save to database BEFORE redirecting to login
      // This ensures order data survives any auth redirect failures

      // We need the user's email - get it from the order form if available,
      // otherwise we'll need to ask for it
      // For now, we'll extract from sessionStorage or require it in the form
      // Let's get email from the current user session or form

      // Since we don't have email in the order form, we'll save to DB after they enter it on login
      // For now, redirect to login and handle DB save there
      // Actually, let's add email to the order form or handle it differently

      // SIMPLER: Save pending order with a placeholder and update after login
      // OR: Just redirect and handle on login page

      // Let's redirect to login with pending data in sessionStorage for now
      // and enhance login page to save to DB
      console.log('[order-form] User not authenticated, redirecting to /login?next=/checkout')
      router.push('/login?next=/checkout')
    }

    setProceeding(false)
  }

  return (
    <div ref={topRef}>
      {/* Form card */}
      <div
        className="bg-white rounded-3xl border border-[#E8E2D9] p-6 sm:p-8"
        style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.10)' }}
      >
        <StepIndicator steps={STEPS} current={step} />

        {step === 0 && (
          <StepBasicInfo
            data={formData}
            errors={errors}
            onChange={updateField}
            onCurrencyChange={handleCurrencyChange}
          />
        )}

        {step === 1 && (
          <StepDeliverables
            deliverables={formData.deliverables}
            errors={errors}
            onChange={updateDeliverables}
            selectedCurrency={formData.selectedCurrency}
            exchangeRate={formData.exchangeRate}
          />
        )}

        {step === 2 && (
          <StepUpload
            file={file}
            instructions={formData.instructions}
            errors={errors}
            onFileChange={setFile}
            onInstructionsChange={(val) => updateField('instructions', val)}
          />
        )}

        {step === 3 && (
          <StepSummary
            data={formData}
            file={file}
            proceeding={proceeding}
            onToggleReport={(val) =>
              setFormData((prev) => ({ ...prev, includeOriginalityReport: val }))
            }
            onBack={back}
            onProceed={handleProceed}
          />
        )}

        {/* Nav buttons (not shown on summary step — it has its own CTA) */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E8E2D9]">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#6B7280] hover:text-[#1B2E4B] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Back
            </button>

            <button
              type="button"
              onClick={advance}
              className="flex items-center gap-2 bg-[#1B2E4B] hover:bg-[#16253d] text-white font-bold text-sm px-7 py-3 rounded-xl transition-colors"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
