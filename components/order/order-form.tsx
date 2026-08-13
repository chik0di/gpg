'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StepIndicator from './step-indicator'
import StepUploadBrief from './steps/step-upload-brief'
import StepExtractionReview from './steps/step-extraction-review'
import StepBasicInfo from './steps/step-basic-info'
import StepDeliverables from './steps/step-deliverables'
import StepUpload from './steps/step-upload'
import StepSummary from './steps/step-summary'
import { INITIAL_FORM_STATE, type OrderFormState, type Deliverable } from '@/types/order-form'
import { daysUntil } from '@/lib/pricing'
import { createClient } from '@/lib/supabase/client'

// AI path: Upload Brief → Review → Summary
// Manual path: Basic Info → Deliverables → Upload & Instructions → Summary
const AI_STEPS = ['Upload Brief', 'Review', 'Summary']
const MANUAL_STEPS = ['Basic Info', 'Deliverables', 'Upload & Instructions', 'Summary']

interface ExtractionResult {
  subject_field: string | null
  academic_level: 'College' | 'Undergraduate' | 'Masters' | null
  deadline: string | null
  deliverables: Array<{
    type: 'written' | 'presentation' | 'technical'
    description: string
    quantity: number | null
    quantity_type: 'words' | 'pages' | 'slides' | null
    complexity: 'simple' | 'moderate' | 'complex' | 'expert' | null
    price_gbp: number
    confidence: 'high' | 'medium' | 'low'
  }>
  additional_notes: string | null
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function validateStep(
  step: number,
  data: OrderFormState,
  file: File | null,
  usedAIExtraction: boolean
): Record<string, string> {
  const err: Record<string, string> = {}

  // Step 0: Upload Brief - no validation needed (handled in component)
  // Step 1: Extraction Review - no validation needed (handled in component)

  // Step 2: Basic Info
  if (step === 2) {
    if (!data.subjectField) err.subjectField = 'Please select a subject.'
    if (!data.academicLevel) err.academicLevel = 'Please select your academic level.'
    if (!data.deadline) {
      err.deadline = 'Please choose a deadline.'
    } else if (daysUntil(data.deadline) < 2) {
      err.deadline = 'Deadline must be at least 2 days from today.'
    }
  }

  // Step 3: Instructions (Upload) - file is required
  if (step === 3) {
    if (!file) err.file = 'Please upload your assignment document.'
  }

  // Step 4: Summary - no validation needed

  return err
}

export default function OrderForm() {
  const [step, setStep]           = useState(0)
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [formData, setFormData]   = useState<OrderFormState>(INITIAL_FORM_STATE)
  const [file, setFile]           = useState<File | null>(null)
  const [proceeding, setProceeding] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [usedAIExtraction, setUsedAIExtraction] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null) // Scenario A: upload failed
  const [extractionFailed, setExtractionFailed] = useState(false) // Scenario B: extraction returned nothing
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const [briefTempPath, setBriefTempPath] = useState<string | null>(null)
  const router = useRouter()
  const topRef = useRef<HTMLDivElement>(null)

  // Generate session ID on mount
  useEffect(() => {
    const id = crypto.randomUUID()
    setSessionId(id)
    // Store in sessionStorage for access during order creation
    sessionStorage.setItem('gpg_brief_session_id', id)
  }, [])

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

  async function handleBriefUpload(briefFile: File) {
    setExtracting(true)
    setUploadError(null)
    setExtractionFailed(false)

    try {
      const formData = new FormData()
      formData.append('file', briefFile)
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/extract-brief', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        // Check error code to distinguish scenarios
        if (result.code === 'NO_FILE' || result.code === 'INVALID_FILE_TYPE' ||
            result.code === 'FILE_TOO_LARGE' || result.code === 'STORAGE_ERROR') {
          // SCENARIO A: File upload failed
          setUploadError(result.error || 'Failed to upload file')
          setExtracting(false)
          return
        }

        if (result.code === 'NO_DELIVERABLES' || result.code === 'EXTRACTION_ERROR' || result.code === 'EXTRACTION_FAILED') {
          // SCENARIO B: Upload OK but extraction failed - proceed to review with manual entry
          setExtractionResult({
            subject_field: null,
            academic_level: null,
            deadline: null,
            deliverables: [],
            additional_notes: null,
          })
          setBriefTempPath(result.tempFilePath || null)
          setUsedAIExtraction(true)
          setExtractionFailed(true)
          setExtracting(false)
          // Store brief filename even when extraction fails
          setFormData((prev) => ({ ...prev, briefFileName: briefFile.name }))
          setStep(1)
          scrollTop()
          return
        }

        // Unknown error - treat as upload failure
        throw new Error(result.error || 'Failed to process brief')
      }

      // Success - extraction returned data
      setExtractionResult(result.extraction)
      setBriefTempPath(result.tempFilePath)
      setUsedAIExtraction(true)
      setExtractionFailed(false)
      setExtracting(false)

      // Store brief filename in form state for display in summary
      setFormData((prev) => ({ ...prev, briefFileName: briefFile.name }))

      // Advance to review step
      setStep(1)
      scrollTop()
    } catch (error) {
      console.error('Brief extraction error:', error)
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
      )
      setExtracting(false)
    }
  }

  function handleRetryUpload() {
    setUploadError(null)
    setExtractionFailed(false)
  }

  function handleExtractionConfirm(confirmedData: {
    moduleName: string | null
    subjectField: string
    academicLevel: string
    academicLevelRaw: string | null
    deadline: string
    country: string
    deliverables: Deliverable[]
    instructions: string
    isOutsideStandardFields: boolean
  }) {
    // Populate form data with confirmed extraction
    setFormData((prev) => ({
      ...prev,
      moduleName: confirmedData.moduleName || undefined,
      subjectField: confirmedData.subjectField,
      academicLevel: confirmedData.academicLevel,
      deadline: confirmedData.deadline,
      country: confirmedData.country,
      deliverables: confirmedData.deliverables,
      instructions: confirmedData.instructions,
      isOutsideStandardFields: confirmedData.isOutsideStandardFields,
    }))

    // Store brief temp path and academic level raw for later
    if (briefTempPath) {
      sessionStorage.setItem('gpg_brief_temp_path', briefTempPath)
    }
    if (confirmedData.academicLevelRaw) {
      sessionStorage.setItem('gpg_academic_level_raw', confirmedData.academicLevelRaw)
    }

    // AI path: go directly to Summary (step 2 in AI flow)
    setStep(2)
    scrollTop()
  }

  function advance() {
    const err = validateStep(step, formData, file, usedAIExtraction)
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

    // Get academic_level_raw from sessionStorage if it was set
    const academicLevelRaw = sessionStorage.getItem('gpg_academic_level_raw')

    // Prepare order data
    const orderData = {
      ...formData,
      academicLevelRaw: academicLevelRaw || null,
      fileName: file?.name ?? null,
      fileSize: file?.size ?? null,
      usedAIExtraction,
      briefTempPath: briefTempPath || null,
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

  // Determine which flow we're in and map steps accordingly
  const isAIPath = usedAIExtraction || step === 0 || step === 1
  const steps = isAIPath ? AI_STEPS : MANUAL_STEPS
  const currentStepIndex = step

  return (
    <div ref={topRef}>
      {/* Form card */}
      <div
        className="bg-white rounded-3xl border border-[#E8E2D9] p-6 sm:p-8"
        style={{ boxShadow: '0 8px 32px -4px rgba(26,26,46,0.10)' }}
      >
        <StepIndicator steps={steps} current={currentStepIndex} />

        {/* AI PATH */}
        {isAIPath && (
          <>
            {/* AI Step 0: Upload Brief */}
            {step === 0 && (
              <StepUploadBrief
                onFileSelect={handleBriefUpload}
                loading={extracting}
                uploadError={uploadError}
                extractionFailed={extractionFailed}
                onRetry={handleRetryUpload}
              />
            )}

            {/* AI Step 1: Extraction Review */}
            {step === 1 && extractionResult && (
              <StepExtractionReview
                extraction={extractionResult}
                extractionFailed={extractionFailed}
                onConfirm={handleExtractionConfirm}
                onBack={back}
                selectedCurrency={formData.selectedCurrency}
                exchangeRate={formData.exchangeRate}
                onCurrencyChange={handleCurrencyChange}
              />
            )}

            {/* AI Step 2: Summary */}
            {step === 2 && (
              <StepSummary
                data={formData}
                file={null} // No file in AI path - brief was already uploaded
                proceeding={proceeding}
                onToggleReport={(val) =>
                  setFormData((prev) => ({ ...prev, includeOriginalityReport: val }))
                }
                onBack={back}
                onProceed={handleProceed}
              />
            )}
          </>
        )}

        {/* MANUAL PATH */}
        {!isAIPath && (
          <>
            {/* Manual Step 0: Basic Info */}
            {step === 0 && (
              <StepBasicInfo
                data={formData}
                errors={errors}
                onChange={updateField}
                onCurrencyChange={handleCurrencyChange}
              />
            )}

            {/* Manual Step 1: Deliverables */}
            {step === 1 && (
              <StepDeliverables
                deliverables={formData.deliverables}
                errors={errors}
                onChange={updateDeliverables}
                selectedCurrency={formData.selectedCurrency}
                exchangeRate={formData.exchangeRate}
              />
            )}

            {/* Manual Step 2: Upload & Instructions */}
            {step === 2 && (
              <StepUpload
                file={file}
                instructions={formData.instructions}
                errors={errors}
                onFileChange={setFile}
                onInstructionsChange={(val) => updateField('instructions', val)}
              />
            )}

            {/* Manual Step 3: Summary */}
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

            {/* Nav buttons for manual path (not shown on summary step) */}
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
          </>
        )}
      </div>
    </div>
  )
}
