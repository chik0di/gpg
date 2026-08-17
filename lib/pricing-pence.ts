/**
 * Pricing in integer pence to avoid floating-point arithmetic errors
 * All calculations stay in pence throughout, only convert to pounds for display
 */

// ── Base rates in pence ───────────────────────────────────────────────────────

export const WORDS_PER_PAGE = 275

// Written deliverable rates (pence per page)
export const WRITTEN_RATE_AI = 500        // £5.00 per page (AI-extracted)
export const WRITTEN_RATE_MANUAL = 600    // £6.00 per page (manually added, premium)

// Presentation rates (pence per slide)
export const SLIDE_RATE_AI = 250          // £2.50 per slide (AI-extracted)
export const SLIDE_RATE_MANUAL = 300      // £3.00 per slide (manually added, premium)

// Technical/Practical deliverable rates by complexity (pence)
export const TECHNICAL_SIMPLE = 4000      // £40.00
export const TECHNICAL_MODERATE = 6500    // £65.00
export const TECHNICAL_COMPLEX = 9500     // £95.00
export const TECHNICAL_EXPERT = 13000     // £130.00

// Originality report
export const ORIGINALITY_REPORT_PENCE = 800  // £8.00

// Valid technical prices for validation
export const VALID_TECHNICAL_PRICES_PENCE = [
  TECHNICAL_SIMPLE,
  TECHNICAL_MODERATE,
  TECHNICAL_COMPLEX,
  TECHNICAL_EXPERT,
] as const

// ── Academic level multipliers (stored as integers: 80 = 0.8x, 100 = 1.0x, 130 = 1.3x) ─
export const ACADEMIC_MULTIPLIERS = {
  'College': 80,        // 0.8x
  'Undergraduate': 100, // 1.0x
  'Masters': 130,       // 1.3x
} as const

export function getAcademicMultiplierPct(level: string): number {
  return ACADEMIC_MULTIPLIERS[level as keyof typeof ACADEMIC_MULTIPLIERS] ?? 100
}

// Apply academic multiplier to pence amount
export function applyAcademicMultiplier(pence: number, level: string): number {
  const multiplierPct = getAcademicMultiplierPct(level)
  return Math.round((pence * multiplierPct) / 100)
}

// ── Deadline multipliers (stored as integers: 100 = 1.0x, 120 = 1.2x, 150 = 1.5x, 180 = 1.8x) ─
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function getDeadlineMultiplierPct(dateStr: string): number {
  if (!dateStr) return 100
  const days = daysUntil(dateStr)
  if (days >= 14) return 100  // 1.0x
  if (days >= 7) return 120   // 1.2x
  if (days >= 4) return 150   // 1.5x
  return 180                  // 1.8x (2-3 days)
}

// Apply deadline multiplier to pence amount
export function applyDeadlineMultiplier(pence: number, dateStr: string): number {
  const multiplierPct = getDeadlineMultiplierPct(dateStr)
  return Math.round((pence * multiplierPct) / 100)
}

// ── Price calculation functions (return pence) ────────────────────────────────

/**
 * Calculate written deliverable price in pence
 * @param pages - number of pages
 * @param isManual - true if manually added (premium pricing)
 * @returns price in pence
 */
export function calcWrittenPricePence(pages: number, isManual: boolean = false): number {
  if (!pages || pages <= 0) return 0

  const rate = isManual ? WRITTEN_RATE_MANUAL : WRITTEN_RATE_AI

  // AI extraction path: flat £5 per page (500 pence) for ALL page counts
  // Manual path: flat £6 per page (600 pence) premium pricing
  return pages * rate
}

/**
 * Calculate presentation deliverable price in pence
 * @param slideCount - number of slides
 * @param isManual - true if manually added (premium pricing)
 * @returns price in pence
 */
export function calcPresentationPricePence(slideCount: number, isManual: boolean = false): number {
  if (!slideCount || slideCount <= 0) return 0
  const rate = isManual ? SLIDE_RATE_MANUAL : SLIDE_RATE_AI
  return slideCount * rate
}

/**
 * Validate and get technical price in pence
 * @param pricePence - price to validate (must be one of the four valid technical prices)
 * @returns validated price, or TECHNICAL_MODERATE if invalid
 */
export function validateTechnicalPricePence(pricePence: number): number {
  if (VALID_TECHNICAL_PRICES_PENCE.includes(pricePence as any)) {
    return pricePence
  }
  // Default to moderate if invalid price sent
  console.warn(`[pricing-pence] Invalid technical price ${pricePence}, defaulting to MODERATE`)
  return TECHNICAL_MODERATE
}

/**
 * Convert pence to pounds for display
 * @param pence - amount in pence
 * @returns formatted string like "£45.50"
 */
export function formatPence(pence: number): string {
  const pounds = pence / 100
  return `£${pounds % 1 === 0 ? pounds : pounds.toFixed(2)}`
}

/**
 * Convert pounds to pence for storage/calculation
 * @param pounds - amount in pounds
 * @returns amount in pence
 */
export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100)
}
