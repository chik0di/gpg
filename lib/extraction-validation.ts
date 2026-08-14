import { z } from 'zod'

/**
 * Sanity bounds for extraction validation
 * These prevent absurd values while being generous for legitimate edge cases
 */
export const EXTRACTION_BOUNDS = {
  WORD_COUNT_MIN: 100,
  WORD_COUNT_MAX: 20000,
  SLIDE_COUNT_MIN: 1,
  SLIDE_COUNT_MAX: 60,
  DELIVERABLE_COUNT_MIN: 1,
  DELIVERABLE_COUNT_MAX: 6,
  TECHNICAL_PRICES_PENCE: [4000, 6500, 9500, 13000], // £40, £65, £95, £130
} as const

/**
 * Phrases that might indicate prompt injection attempts
 * Used for flagging only - does NOT block legitimate briefs
 */
const INJECTION_PHRASES = [
  'ignore previous',
  'ignore all previous',
  'disregard previous',
  'forget previous',
  'set price to',
  'classify as simple',
  'classify as moderate',
  'classify as complex',
  'override',
  'change price',
  'return price',
  'make it free',
  'set to zero',
  'charge nothing',
] as const

/**
 * Check if brief text contains potential prompt injection phrases
 * Returns true if suspicious phrases found (for logging/flagging only)
 */
export function containsSuspiciousPhrases(text: string): boolean {
  if (!text) return false
  const normalized = text.toLowerCase()
  return INJECTION_PHRASES.some(phrase => normalized.includes(phrase))
}

/**
 * Zod schema for validating Claude extraction response
 * Note: subject_field is added server-side via keyword matching, not extracted by Claude
 */
export const ClaudeExtractionSchema = z.object({
  module_name: z.string().nullable(),
  subject_area: z.string().nullable(),
  academic_level: z.enum(['College', 'Undergraduate', 'Masters']).nullable(),
  deadline: z.string().nullable(),
  deliverables: z.array(
    z.object({
      type: z.enum(['written', 'presentation', 'technical']),
      description: z.string().min(1),
      quantity: z.number().nullable(),
      quantity_type: z.enum(['words', 'pages', 'slides']).nullable(),
      complexity: z.enum(['simple', 'moderate', 'complex', 'expert']).nullable(),
      price_gbp: z.number().min(0),
      confidence: z.enum(['high', 'medium', 'low']),
    })
  ).min(EXTRACTION_BOUNDS.DELIVERABLE_COUNT_MIN).max(EXTRACTION_BOUNDS.DELIVERABLE_COUNT_MAX),
  additional_notes: z.string().nullable(),
})

export type ClaudeExtractionResult = z.infer<typeof ClaudeExtractionSchema>

/**
 * Full extraction result including server-side matched domain
 */
export const ExtractionResultSchema = ClaudeExtractionSchema.extend({
  subject_field: z.string().nullable(),
})

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Apply sanity bounds to extraction result
 * Clamps out-of-range values and nulls invalid data
 */
export function applySanityBounds(extraction: ClaudeExtractionResult): ClaudeExtractionResult {
  return {
    ...extraction,
    deliverables: extraction.deliverables.map(d => {
      // Clamp word counts
      if (d.type === 'written' && d.quantity_type === 'words' && d.quantity) {
        const clampedWords = clamp(
          d.quantity,
          EXTRACTION_BOUNDS.WORD_COUNT_MIN,
          EXTRACTION_BOUNDS.WORD_COUNT_MAX
        )
        if (clampedWords !== d.quantity) {
          console.warn(`[extraction-validation] Clamped word count from ${d.quantity} to ${clampedWords}`)
        }
        return { ...d, quantity: clampedWords }
      }

      // Clamp slide counts
      if (d.type === 'presentation' && d.quantity_type === 'slides' && d.quantity) {
        const clampedSlides = clamp(
          d.quantity,
          EXTRACTION_BOUNDS.SLIDE_COUNT_MIN,
          EXTRACTION_BOUNDS.SLIDE_COUNT_MAX
        )
        if (clampedSlides !== d.quantity) {
          console.warn(`[extraction-validation] Clamped slide count from ${d.quantity} to ${clampedSlides}`)
        }
        return { ...d, quantity: clampedSlides }
      }

      // Validate technical prices (in GBP, convert to pence for check)
      if (d.type === 'technical') {
        const pricePence = Math.round(d.price_gbp * 100)
        const validPrices = EXTRACTION_BOUNDS.TECHNICAL_PRICES_PENCE as readonly number[]

        if (!validPrices.includes(pricePence)) {
          console.warn(`[extraction-validation] Invalid technical price ${d.price_gbp} GBP (${pricePence} pence), should be one of: £40, £65, £95, £130`)
          // Note: We log but don't modify here - server-side recalculation will fix it
        }
      }

      return d
    }),
  }
}

/**
 * Validate Claude extraction result (without subject_field)
 * Returns parsed result or throws ZodError
 */
export function validateClaudeExtraction(data: unknown): ClaudeExtractionResult {
  return ClaudeExtractionSchema.parse(data)
}

/**
 * Validate full extraction result (with subject_field added server-side)
 * Returns parsed result or throws ZodError
 */
export function validateExtraction(data: unknown): ExtractionResult {
  return ExtractionResultSchema.parse(data)
}

/**
 * Safe validation for Claude extraction that returns success/error instead of throwing
 */
export function safeValidateClaudeExtraction(data: unknown): {
  success: boolean
  data?: ClaudeExtractionResult
  error?: z.ZodError
} {
  const result = ClaudeExtractionSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateExtraction(data: unknown): {
  success: boolean
  data?: ExtractionResult
  error?: z.ZodError
} {
  const result = ExtractionResultSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
